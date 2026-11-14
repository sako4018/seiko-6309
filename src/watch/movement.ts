import * as THREE from 'three';
import type { Materials } from '../core/materials';
import {
  cylZ, escapeWheelShape, extrude, gearShape, internalRingShape, ratchetShape, ringShape, roundedHull, sectorRingShape,
} from '../core/geometry';
import { DATE_SLOTS, dateRingTexture, dayDiscTexture } from '../core/textures';
import type { Kinematics } from '../sim/simulation';
import { Part, PartRegistry, mesh } from './parts';

/**
 * Calibre 6309-family movement, schematic.
 * Architecture (rotor → magic lever → barrel → centre/third/fourth → escape → pallet → balance)
 * follows the 6309; exact wheel positions are NOT taken from a service manual (none in the pack).
 * Coordinates: dial faces +Z, 3 o'clock = +X, millimetres. Train side is -Z.
 */

const D2R = Math.PI / 180;
type V2 = { x: number; y: number };
const polar = (o: V2, d: number, deg: number): V2 => ({ x: o.x + d * Math.cos(deg * D2R), y: o.y + d * Math.sin(deg * D2R) });

export const MOVEMENT_R = 13.5;

export const L = (() => {
  const center = { x: 0, y: 0 };
  const barrel = polar(center, 6.2, 120); // barrel teeth (r 5.4) + centre pinion (0.8)
  const third = polar(center, 5.3, 230);
  const fourth = polar(third, 4.8, 300);
  const escape = polar(fourth, 4.3, 15);
  const balance = { x: 8.6, y: -2.8 };
  const v = { x: balance.x - escape.x, y: balance.y - escape.y };
  const len = Math.hypot(v.x, v.y);
  const pallet = { x: escape.x + (v.x * 3.25) / len, y: escape.y + (v.y * 3.25) / len };
  const firstRed = polar(center, 3.1, 50);
  const secondRed = polar(barrel, 4.1, 20);
  const minuteWheel = polar(center, 3.1, 150);
  const dateDriver = polar(center, 6.4, 20);
  return { center, barrel, third, fourth, escape, balance, pallet, firstRed, secondRed, minuteWheel, dateDriver };
})();

/** Pallet fork axis points at the balance staff. */
const PALLET_ANGLE = Math.atan2(L.balance.y - L.pallet.y, L.balance.x - L.pallet.x);
/** Direction from balance to pallet (impulse pin rests here at balance angle 0). */
const PIN_ANGLE = Math.atan2(L.pallet.y - L.balance.y, L.pallet.x - L.balance.x);

export interface MovementHandles {
  update(k: Kinematics, reserve: number): void;
}

export function buildMovement(reg: PartRegistry, m: Materials, parent: THREE.Object3D): MovementHandles {
  const add = (id: string, cat: Part['category'], at: V2, explodeZ: number, rotZ = 0, explodeX = 0) =>
    reg.add(id, { category: cat, pos: [at.x, at.y, 0], rotZ, explode: [explodeX, 0, explodeZ] }, parent);

  // ---------- Main plate ----------
  const plate = add('mainPlate', 'movement', L.center, 0);
  plate.spin.add(mesh(cylZ(MOVEMENT_R, 0, 1.0, 128), m.plate));
  plate.spin.add(mesh(cylZ(MOVEMENT_R - 0.6, -0.35, 0, 128), m.plate));

  // ---------- Keyless works: winding stem (sets the hands; 6309 has no hand-winding) ----------
  const stem = add('stem', 'movement', L.center, 0, 0, 10);
  const stemGeo = new THREE.CylinderGeometry(0.45, 0.45, 8.0, 16);
  stemGeo.rotateZ(Math.PI / 2);
  stemGeo.translate(15.2, 0, 0.5);
  stem.spin.add(mesh(stemGeo, m.steelPart));

  // ---------- Barrel & mainspring ----------
  const barrel = add('barrel', 'movement', L.barrel, -6);
  barrel.spin.add(mesh(extrude(gearShape({ r: 5.4, teeth: 90, depth: 0.22, hole: 4.9 }), 0.28), m.gilt, -1.15));
  barrel.spin.add(mesh(extrude(ringShape(5.15, 4.85), 1.5), m.gilt, -1.85));
  barrel.spin.add(mesh(cylZ(5.0, -1.12, -1.0, 64), m.gilt));

  const mainspring = add('mainspring', 'movement', L.barrel, -6);
  const msGeo = new THREE.BufferGeometry();
  msGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(600 * 3), 3));
  const msLine = new THREE.Line(msGeo, m.mainspring);
  msLine.frustumCulled = false;
  mainspring.spin.add(msLine);
  mainspring.spin.add(mesh(cylZ(0.9, -2.9, -0.4, 24), m.steelPart));
  // Invisible pick target so the spring can be clicked.
  mainspring.spin.add(mesh(cylZ(4.6, -2.45, -2.35, 32), m.pick));

  // ---------- Going train ----------
  const wheel = (
    id: string, at: V2, explodeZ: number,
    o: { r: number; teeth: number; z: number; spokes: number; pinR: number; pinT: number; pinZ: [number, number]; arbor: [number, number]; escape?: boolean },
  ) => {
    const p = add(id, 'movement', at, explodeZ);
    const shape = o.escape ? escapeWheelShape(o.r) : gearShape({ r: o.r, teeth: o.teeth, spokes: o.spokes });
    p.spin.add(mesh(extrude(shape, o.escape ? 0.18 : 0.22), o.escape ? m.steelPart : m.gilt, o.z));
    const pin = new THREE.ExtrudeGeometry(gearShape({ r: o.pinR, teeth: o.pinT, depth: 0.14 }), { depth: o.pinZ[1] - o.pinZ[0], bevelEnabled: false });
    pin.translate(0, 0, o.pinZ[0]);
    p.spin.add(mesh(pin, m.steelPart));
    p.spin.add(mesh(cylZ(0.18, o.arbor[0], o.arbor[1], 12), m.steelPart));
    p.spin.add(mesh(cylZ(Math.max(0.45, o.r * 0.18), o.z - 0.16, o.z + 0.16, 24), m.steelPart));
    return p;
  };
  wheel('centerWheel', L.center, -4, { r: 4.6, teeth: 80, z: -0.6, spokes: 4, pinR: 0.8, pinT: 12, pinZ: [-1.35, -0.95], arbor: [-2.9, 1.0] });
  wheel('thirdWheel', L.third, -5, { r: 3.6, teeth: 75, z: -1.2, spokes: 4, pinR: 0.7, pinT: 10, pinZ: [-0.75, -0.45], arbor: [-2.9, 0] });
  wheel('fourthWheel', L.fourth, -5.5, { r: 3.8, teeth: 70, z: -0.85, spokes: 4, pinR: 0.6, pinT: 8, pinZ: [-1.35, -1.05], arbor: [-2.9, 0] });
  wheel('escapeWheel', L.escape, -7, { r: 2.4, teeth: 15, z: -1.5, spokes: 4, pinR: 0.5, pinT: 7, pinZ: [-1.0, -0.7], arbor: [-2.6, 0], escape: true });

  // ---------- Pallet fork (local +X points at the balance) ----------
  const pallet = add('palletFork', 'movement', L.pallet, -8.5, PALLET_ANGLE);
  const lever = new THREE.Shape([
    [-0.4, -0.25], [2.4, -0.18], [2.45, -0.55], [3.05, -0.45], [3.05, -0.17], [2.65, -0.17],
    [2.65, 0.17], [3.05, 0.17], [3.05, 0.45], [2.45, 0.55], [2.4, 0.18], [-0.4, 0.25],
  ].map(([x, y]) => new THREE.Vector2(x, y)));
  pallet.spin.add(mesh(extrude(lever, 0.2), m.steelPart, -1.5));
  const escRel = { x: -3.25, y: 0 };
  for (const sgn of [1, -1]) {
    const tip = { x: escRel.x + 2.4 * Math.cos(30 * D2R), y: sgn * 2.4 * Math.sin(30 * D2R) };
    const arm = new THREE.Shape([
      [0.1, 0.15 * sgn], [tip.x + 0.25, tip.y + 0.15 * sgn], [tip.x - 0.1, tip.y + 0.45 * sgn], [-0.3, 0.45 * sgn],
    ].map(([x, y]) => new THREE.Vector2(x, y)));
    pallet.spin.add(mesh(extrude(arm, 0.2), m.steelPart, -1.5));
    const stone = mesh(new THREE.BoxGeometry(0.26, 0.7, 0.22), m.ruby, -1.5);
    stone.position.set(tip.x, tip.y, -1.5);
    stone.rotation.z = Math.atan2(escRel.y - tip.y, escRel.x - tip.x) - Math.PI / 2;
    pallet.spin.add(stone);
  }
  pallet.spin.add(mesh(cylZ(0.42, -1.65, -1.35, 24), m.steelPart));
  pallet.spin.add(mesh(cylZ(0.15, -2.4, 0, 12), m.steelPart));
  const guard = mesh(cylZ(0.08, -1.9, -1.4, 8), m.steelPart);
  guard.position.x = 2.55;
  pallet.spin.add(guard);

  // ---------- Balance wheel ----------
  const balance = add('balance', 'movement', L.balance, -10);
  balance.spin.add(mesh(extrude(ringShape(3.9, 3.42), 0.45), m.gilt, -1.95));
  for (let i = 0; i < 3; i++) {
    const a = mesh(new THREE.BoxGeometry(0.34, 3.5, 0.22), m.gilt, -1.95);
    a.rotation.z = (i * 120 + 90) * D2R;
    a.position.set(1.75 * Math.cos((i * 120 + 90 + 90) * D2R), 1.75 * Math.sin((i * 120 + 90 + 90) * D2R), -1.95);
    balance.spin.add(a);
  }
  balance.spin.add(mesh(cylZ(0.5, -2.15, -1.75, 24), m.gilt));
  balance.spin.add(mesh(cylZ(0.15, -3.0, -0.3, 12), m.steelPart));
  balance.spin.add(mesh(cylZ(0.75, -1.6, -1.42, 32), m.steelPart));
  const pin = mesh(cylZ(0.13, -1.62, -1.3, 10), m.ruby);
  pin.position.set(0.62 * Math.cos(PIN_ANGLE), 0.62 * Math.sin(PIN_ANGLE), 0);
  balance.spin.add(pin);

  const hairspring = add('hairspring', 'movement', L.balance, -10);
  const hsN = 420;
  const hsGeo = new THREE.BufferGeometry();
  hsGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(hsN * 3), 3));
  const hsLine = new THREE.Line(hsGeo, m.hairspring);
  hsLine.frustumCulled = false;
  hairspring.spin.add(hsLine);
  hairspring.spin.add(mesh(cylZ(2.9, -2.3, -2.2, 32), m.pick));
  const stud = mesh(cylZ(0.18, -2.6, -2.15, 10), m.steelPart);
  stud.position.set(2.75 * Math.cos(-30 * D2R), 2.75 * Math.sin(-30 * D2R), 0);
  hairspring.spin.add(stud);

  // ---------- Bridges ----------
  const jewel = (p: Part, at: V2, z: number) => {
    const j = mesh(cylZ(0.42, z - 0.04, z + 0.04, 20), m.ruby, 0, 'jewels');
    j.position.set(at.x - p.home.x, at.y - p.home.y, 0);
    p.spin.add(j);
    const hole = mesh(cylZ(0.62, z - 0.02, z + 0.02, 24), m.steelPart, 0, 'jewels');
    hole.position.copy(j.position);
    hole.position.z += z > -2 ? 0.01 : -0.01;
    p.spin.add(hole);
  };
  const screw = (p: Part, at: V2, z: number) => {
    const s = mesh(cylZ(0.55, z - 0.15, z, 24), m.screw, 0, 'screws');
    s.position.set(at.x - p.home.x, at.y - p.home.y, 0);
    p.spin.add(s);
    const slot = mesh(new THREE.BoxGeometry(1.0, 0.14, 0.06), m.dark, 0, 'screws');
    slot.position.set(s.position.x, s.position.y, z - 0.16);
    slot.rotation.z = (at.x * 37 + at.y * 11) % Math.PI;
    p.spin.add(slot);
  };
  const bridge = (id: string, circles: { x: number; y: number; r: number }[], zTop: number, thick: number, explodeZ: number) => {
    const p = add(id, 'bridge', L.center, explodeZ);
    p.spin.add(mesh(extrude(roundedHull(circles), thick), m.bridge, zTop + thick / 2));
    return p;
  };

  const trainFoot = { x: -7.6, y: -5.6 };
  const train = bridge('trainBridge', [
    { ...L.center, r: 1.6 }, { ...L.third, r: 1.3 }, { ...L.fourth, r: 1.3 }, { ...L.escape, r: 1.2 }, { ...trainFoot, r: 1.4 },
  ], -2.95, 0.6, -14);
  for (const at of [L.center, L.third, L.fourth, L.escape]) jewel(train, at, -2.97);
  screw(train, trainFoot, -2.95);
  screw(train, { x: 1.6, y: -6.2 }, -2.95);

  const barrelFoot = { x: -8.6, y: 7.0 };
  const barrelBr = bridge('barrelBridge', [
    { ...L.barrel, r: 3.6 }, { ...L.secondRed, r: 1.2 }, { ...barrelFoot, r: 1.4 },
  ], -3.0, 0.6, -15);
  screw(barrelBr, barrelFoot, -3.0);
  screw(barrelBr, { x: -0.6, y: 8.6 }, -3.0);
  // Click (stops the ratchet wheel running back).
  const click = mesh(extrude(new THREE.Shape([
    [0, 0], [1.6, 0.25], [2.0, 0.0], [1.6, -0.25],
  ].map(([x, y]) => new THREE.Vector2(x, y))), 0.15), m.steelPart, -3.1);
  click.position.set(L.barrel.x - 5.8, L.barrel.y - 1.0, -3.1);
  click.rotation.z = 0.35;
  barrelBr.spin.add(click);

  const palletFoot = { x: 4.4, y: -9.2 };
  const palletBr = bridge('palletBridge', [{ ...L.pallet, r: 0.95 }, { ...palletFoot, r: 0.95 }], -2.5, 0.4, -13);
  jewel(palletBr, L.pallet, -2.52);
  screw(palletBr, palletFoot, -2.5);

  const balanceFoot = { x: 9.6, y: -7.4 };
  const balanceBr = bridge('balanceBridge', [{ ...L.balance, r: 1.7 }, { ...balanceFoot, r: 1.3 }], -3.0, 0.5, -17);
  jewel(balanceBr, L.balance, -3.02);
  screw(balanceBr, balanceFoot, -3.0);
  const diashock = mesh(new THREE.TorusGeometry(0.85, 0.07, 8, 32), m.steelPolished, 0, 'balanceBridge');
  diashock.position.set(L.balance.x - L.center.x, L.balance.y - L.center.y, -3.06);
  balanceBr.spin.add(diashock);

  // ---------- Automatic winding works ----------
  const autoFoot = { x: 3.6, y: -0.6 };
  const autoBr = bridge('autoBridge', [{ ...L.center, r: 1.9 }, { ...L.firstRed, r: 1.3 }, { ...autoFoot, r: 1.1 }], -3.3, 0.35, -21);
  screw(autoBr, autoFoot, -3.3);

  const ratchet = add('ratchetWheel', 'auto', L.barrel, -19);
  ratchet.spin.add(mesh(extrude(ratchetShape(3.6, 60, 0.6), 0.3), m.steelPart, -3.2));
  ratchet.spin.add(mesh(cylZ(1.0, -3.45, -3.35, 24), m.screw, 0, 'screws'));

  const first = add('firstReduction', 'auto', L.firstRed, -24);
  first.spin.add(mesh(extrude(gearShape({ r: 2.4, teeth: 48, spokes: 3 }), 0.2), m.steelPart, -3.47));
  first.spin.add(mesh(cylZ(0.4, -3.75, -3.35, 16), m.steelPart));
  const ecc = mesh(cylZ(0.38, -3.85, -3.55, 20), m.steelPolished);
  ecc.position.x = 0.5;
  first.spin.add(ecc);

  const second = add('secondReduction', 'auto', L.secondRed, -24);
  second.spin.add(mesh(extrude(ratchetShape(1.9, 30), 0.2), m.steelPart, -3.75));
  const spin2 = new THREE.ExtrudeGeometry(gearShape({ r: 0.5, teeth: 8, depth: 0.12 }), { depth: 0.55, bevelEnabled: false });
  spin2.translate(0, 0, -3.65);
  second.spin.add(mesh(spin2, m.steelPart));
  second.spin.add(mesh(cylZ(0.15, -3.9, -3.0, 10), m.steelPart));

  // Magic lever: rides on the eccentric, hooks pull/push the second reduction wheel.
  const magic = add('magicLever', 'auto', L.firstRed, -27);
  const dLever = Math.hypot(L.secondRed.x - L.firstRed.x, L.secondRed.y - L.firstRed.y);
  const leverShape = new THREE.Shape();
  leverShape.absarc(0, 0, 0.6, Math.PI * 0.6, Math.PI * 1.4, false);
  leverShape.lineTo(dLever - 1.0, -2.05);
  leverShape.lineTo(dLever + 0.15, -1.75);
  leverShape.lineTo(dLever - 0.6, -1.55);
  leverShape.lineTo(1.4, -0.25);
  leverShape.lineTo(1.4, 0.25);
  leverShape.lineTo(dLever - 0.6, 1.55);
  leverShape.lineTo(dLever + 0.15, 1.75);
  leverShape.lineTo(dLever - 1.0, 2.05);
  leverShape.closePath();
  magic.spin.add(mesh(extrude(leverShape, 0.12), m.steelPart, -3.92));
  magic.spin.add(mesh(cylZ(0.45, -4.0, -3.85, 20), m.steelPart));

  // ---------- Rotor (oscillating weight): mass hangs toward -Y at angle 0 ----------
  const rotor = add('rotor', 'rotor', L.center, -31);
  const rotorPlate = new THREE.Shape();
  rotorPlate.moveTo(12.9, 0);
  rotorPlate.absarc(0, 0, 12.9, 0, -Math.PI, true);
  rotorPlate.lineTo(-2.3, 0);
  rotorPlate.absarc(0, 0, 2.3, Math.PI, 0, true);
  rotorPlate.closePath();
  rotor.spin.add(mesh(extrude(rotorPlate, 0.35), m.rotor, -4.2));
  rotor.spin.add(mesh(extrude(sectorRingShape(12.9, 10.6, -Math.PI, 0), 0.8, 48), m.rotor, -4.55));
  rotor.spin.add(mesh(cylZ(1.6, -4.45, -4.0, 32), m.steelPart));
  rotor.spin.add(mesh(cylZ(0.9, -4.55, -4.4, 24), m.screw, 0, 'screws'));
  const rPin = new THREE.ExtrudeGeometry(gearShape({ r: 0.7, teeth: 12, depth: 0.14 }), { depth: 0.6, bevelEnabled: false });
  rPin.translate(0, 0, -4.0);
  rotor.spin.add(mesh(rPin, m.steelPart));

  // ---------- Dial side: motion works ----------
  const cannon = add('cannonPinion', 'motion', L.center, 5);
  const cp = new THREE.ExtrudeGeometry(gearShape({ r: 0.9, teeth: 14, depth: 0.15 }), { depth: 0.3, bevelEnabled: false });
  cp.translate(0, 0, 1.1);
  cannon.spin.add(mesh(cp, m.steelPart));
  cannon.spin.add(mesh(cylZ(0.55, 1.0, 3.1, 20), m.steelPart));

  const minuteW = add('minuteWheel', 'motion', L.minuteWheel, 6);
  minuteW.spin.add(mesh(extrude(gearShape({ r: 2.2, teeth: 36, spokes: 0 }), 0.2), m.gilt, 1.25));
  const mwp = new THREE.ExtrudeGeometry(gearShape({ r: 0.55, teeth: 10, depth: 0.12 }), { depth: 0.25, bevelEnabled: false });
  mwp.translate(0, 0, 1.35);
  minuteW.spin.add(mesh(mwp, m.steelPart));

  const hourW = add('hourWheel', 'motion', L.center, 7);
  hourW.spin.add(mesh(extrude(gearShape({ r: 3.0, teeth: 40, spokes: 0, hole: 0.75 }), 0.2), m.gilt, 1.5));
  hourW.spin.add(mesh(extrude(ringShape(1.05, 0.75), 1.35), m.gilt, 2.25));

  const driver = add('dateDriver', 'motion', L.dateDriver, 9);
  driver.spin.add(mesh(extrude(gearShape({ r: 3.4, teeth: 46, spokes: 3 }), 0.2), m.gilt, 1.5));
  const finger = mesh(new THREE.BoxGeometry(1.2, 0.3, 0.2), m.steelPart, 1.7);
  finger.position.set(3.2, 0, 1.7);
  driver.spin.add(finger);

  // ---------- Calendar: date dial (31) and day disc (14 positions) ----------
  const dateDial = add('dateDial', 'calendar', L.center, 11);
  dateDial.spin.add(mesh(new THREE.RingGeometry(10.0, 12.9, DATE_SLOTS * 6, 1), new THREE.MeshStandardMaterial({ map: dateRingTexture(12.9, 10.0), roughness: 0.7 }), 1.92));
  dateDial.spin.add(mesh(extrude(internalRingShape(12.9, 9.7, DATE_SLOTS), 0.12), m.discWhite, 1.84));

  const dayDisc = add('dayDisc', 'calendar', L.center, 13);
  dayDisc.spin.add(mesh(new THREE.CircleGeometry(9.9, 96), new THREE.MeshStandardMaterial({ map: dayDiscTexture(9.9), roughness: 0.7 }), 1.92));
  dayDisc.spin.add(mesh(extrude(gearShape({ r: 2.4, teeth: 7, depth: 0.7, hole: 1.15 }), 0.18), m.steelPart, 1.78));


  // ---------- Per-frame update ----------
  const msPos = msGeo.getAttribute('position') as THREE.BufferAttribute;
  const hsPos = hsGeo.getAttribute('position') as THREE.BufferAttribute;
  let lastReserve = -1;

  const g = (id: string) => reg.get(id).spin;
  const parts = {
    barrel: g('barrel'), mainspring: g('mainspring'), center: g('centerWheel'), third: g('thirdWheel'), fourth: g('fourthWheel'),
    escape: g('escapeWheel'), pallet: g('palletFork'), balance: g('balance'), rotor: g('rotor'), first: g('firstReduction'),
    second: g('secondReduction'), magic: g('magicLever'), ratchet: g('ratchetWheel'), cannon: g('cannonPinion'),
    minuteW: g('minuteWheel'), hourW: g('hourWheel'), driver: g('dateDriver'), dateDial: g('dateDial'), dayDisc: g('dayDisc'),
  };

  return {
    update(k: Kinematics, reserve: number) {
      parts.barrel.rotation.z = k.barrel;
      parts.mainspring.rotation.z = k.ratchet;
      parts.ratchet.rotation.z = k.ratchet;
      parts.center.rotation.z = k.center;
      parts.cannon.rotation.z = k.center;
      parts.third.rotation.z = k.third;
      parts.fourth.rotation.z = k.fourth;
      parts.escape.rotation.z = k.escape;
      parts.pallet.rotation.z = k.fork;
      parts.balance.rotation.z = k.balance;
      parts.rotor.rotation.z = k.rotor;
      parts.first.rotation.z = k.firstRed;
      parts.second.rotation.z = k.secondRed;
      parts.minuteW.rotation.z = k.minuteWheel;
      parts.hourW.rotation.z = k.hourWheel;
      parts.driver.rotation.z = k.dateDriver;
      parts.dateDial.rotation.z = k.dateDial;
      parts.dayDisc.rotation.z = k.dayDisc;

      // Magic lever rides the eccentric and always points at the second reduction wheel.
      const ex = 0.5 * Math.cos(k.firstRed);
      const ey = 0.5 * Math.sin(k.firstRed);
      parts.magic.position.set(ex, ey, 0);
      parts.magic.rotation.z = Math.atan2(L.secondRed.y - (L.firstRed.y + ey), L.secondRed.x - (L.firstRed.x + ex));

      // Hairspring: inner end turns with the balance, outer end fixed at the stud.
      const turns = 11;
      for (let i = 0; i < hsN; i++) {
        const u = i / (hsN - 1);
        const r = 0.55 + 2.2 * u;
        const a = -30 * D2R - turns * Math.PI * 2 * (1 - u) + k.balance * (1 - u);
        hsPos.setXYZ(i, r * Math.cos(a), r * Math.sin(a), -2.25);
      }
      hsPos.needsUpdate = true;

      // Mainspring: coils pack around the arbor when wound, against the wall when let down.
      if (Math.abs(reserve - lastReserve) > 0.002) {
        lastReserve = reserve;
        const n = 600;
        const coils = 6 + 7 * reserve;
        const pw = 0.45 + 1.6 * reserve;
        for (let i = 0; i < n; i++) {
          const u = i / (n - 1);
          const r = 1.0 + 3.7 * u ** pw;
          const a = coils * Math.PI * 2 * u;
          msPos.setXYZ(i, r * Math.cos(a), r * Math.sin(a), -2.4);
        }
        msPos.needsUpdate = true;
      }
    },
  };
}
