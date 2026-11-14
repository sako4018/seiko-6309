import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import type { Materials } from '../core/materials';
import { addCircleHole, cylZ, extrude, gearShape, roundedHull } from '../core/geometry';
import { DIAL, casebackTexture, dialTexture } from '../core/textures';
import { PartRegistry, mesh } from './parts';

/**
 * Exterior of the 6309-8060 (from the owner's photo collage):
 * rounded case with broad integrated lugs, polished bezel + sides, brushed lug tops,
 * ivory/champagne dial, applied markers with dark inlay, baton hands, day-date at 3,
 * crown at 3, multi-row bracelet with fold-over clasp, circular engraved caseback.
 */

const D2R = Math.PI / 180;
export const Z_EXT = {
  caseTop: 4.0,
  caseBottom: -5.0,
  dialFront: 2.3,
  dialBack: 2.0,
  hour: 2.95,
  minute: 3.2,
  second: 3.45,
  crownZ: 0.5,
};

/**
 * Case outline from the photos: round around the dial, with the flanks running
 * straight (tangent) from the case circle to the flat, wide lug ends. This is the
 * convex hull of the case circle and the four lug corners. (+0.8 mm bevel all round.)
 */
function caseOutline(): THREE.Shape {
  const s = roundedHull([
    { x: 0, y: 0, r: 17.3 },
    { x: 9.1, y: 19.4, r: 0.7 }, { x: -9.1, y: 19.4, r: 0.7 },
    { x: 9.1, y: -19.4, r: 0.7 }, { x: -9.1, y: -19.4, r: 0.7 },
  ], 96);
  addCircleHole(s, 0, 0, 16.2);
  return s;
}

function lathe(profile: [number, number][], seg = 128): THREE.LatheGeometry {
  const g = new THREE.LatheGeometry(profile.map(([r, z]) => new THREE.Vector2(r, z)), seg);
  g.rotateX(Math.PI / 2);
  return g;
}

function batonHand(len: number, tail: number, wBase: number, wTip: number): THREE.Shape {
  const s = new THREE.Shape();
  s.moveTo(-wBase / 2, -tail);
  s.lineTo(wBase / 2, -tail);
  s.lineTo(wTip / 2, len - wTip * 0.7);
  s.lineTo(0, len);
  s.lineTo(-wTip / 2, len - wTip * 0.7);
  s.closePath();
  return s;
}

export function buildExterior(reg: PartRegistry, m: Materials, parent: THREE.Object3D): void {
  // ---- Case middle ----
  const caseGeo = new THREE.ExtrudeGeometry(caseOutline(), {
    depth: 7, bevelEnabled: true, bevelThickness: 1.0, bevelSize: 0.8, bevelSegments: 6, curveSegments: 64,
  });
  caseGeo.translate(0, 0, -4);
  const casePart = reg.add('case', { category: 'case', assemble: [0, 0, -40] }, parent);
  // Group 0 = flat faces (brushed lug tops), group 1 = sides & bevels (polished).
  casePart.spin.add(mesh(caseGeo, [m.steelBrushed, m.steelPolished]));

  // ---- Bezel (polished, rounded) ----
  const bezel = reg.add('bezel', { category: 'case', explode: [0, 0, 26] }, parent);
  bezel.spin.add(mesh(lathe([
    [15.0, 3.7], [15.0, 4.45], [15.3, 4.78], [16.0, 4.86], [16.7, 4.62], [17.1, 4.2], [17.15, 3.7],
  ]), m.steelPolished));

  // ---- Crystal (domed) ----
  const crystal = reg.add('crystal', { category: 'case', explode: [0, 0, 32] }, parent);
  const dome: [number, number][] = [];
  for (let i = 0; i <= 16; i++) {
    const r = (i / 16) * 15.4;
    dome.push([r, 5.45 - 0.6 * (r / 15.4) ** 2]);
  }
  dome.push([15.4, 4.2]);
  crystal.spin.add(mesh(lathe(dome, 96), m.crystal));

  // ---- Dial ----
  const dial = reg.add('dial', { category: 'dial', explode: [0, 0, 17] }, parent);
  const dialMat = new THREE.MeshStandardMaterial({
    map: dialTexture(), roughness: 0.42, metalness: 0.22, alphaTest: 0.5,
  });
  dial.spin.add(mesh(new THREE.CircleGeometry(DIAL.R, 128), dialMat, Z_EXT.dialFront));
  const back = new THREE.CircleGeometry(DIAL.R, 96);
  back.rotateY(Math.PI);
  dial.spin.add(mesh(back, m.gilt, Z_EXT.dialBack));
  const edge = new THREE.CylinderGeometry(DIAL.R, DIAL.R, Z_EXT.dialFront - Z_EXT.dialBack, 128, 1, true);
  edge.rotateX(Math.PI / 2);
  edge.translate(0, 0, (Z_EXT.dialFront + Z_EXT.dialBack) / 2);
  dial.spin.add(mesh(edge, m.gilt));

  // Applied hour markers: polished frame with black centre and a small pip outboard;
  // a single wide block at 12; omitted at 3 (day-date window).
  const addMarker = (angle: number, wide: boolean) => {
    const g = new THREE.Group();
    g.rotation.z = angle - Math.PI / 2;
    const w = wide ? 2.9 : 1.55;
    const block = mesh(new THREE.BoxGeometry(w, 2.3, 0.45), m.steelPolished, 0, 'markers');
    block.position.set(0, 12.75, Z_EXT.dialFront + 0.22);
    const inl = mesh(new THREE.BoxGeometry(w - 0.75, 1.55, 0.04), m.inlay, 0, 'markers');
    inl.position.set(0, 12.75, Z_EXT.dialFront + 0.46);
    const pip = mesh(new THREE.BoxGeometry(0.55, 0.55, 0.2), m.steelPolished, 0, 'markers');
    pip.position.set(0, 14.45, Z_EXT.dialFront + 0.1);
    g.add(block, inl, pip);
    dial.spin.add(g);
  };
  for (let h = 0; h < 12; h++) {
    if (h === 3) continue;
    addMarker(Math.PI / 2 - h * 30 * D2R, h === 0);
  }

  // Day-date window frame (polished).
  const frame = new THREE.Shape();
  const fb = 0.45;
  const fy = DIAL.winHalfH + fb;
  frame.moveTo(DIAL.dayWin[0] - fb, -fy);
  frame.lineTo(DIAL.dateWin[1] + fb, -fy);
  frame.lineTo(DIAL.dateWin[1] + fb, fy);
  frame.lineTo(DIAL.dayWin[0] - fb, fy);
  frame.closePath();
  for (const [x0, x1] of [DIAL.dayWin, DIAL.dateWin]) {
    const h = new THREE.Path();
    h.moveTo(x0, -DIAL.winHalfH);
    h.lineTo(x0, DIAL.winHalfH);
    h.lineTo(x1, DIAL.winHalfH);
    h.lineTo(x1, -DIAL.winHalfH);
    h.closePath();
    frame.holes.push(h);
  }
  dial.spin.add(mesh(extrude(frame, 0.3), m.steelPolished, Z_EXT.dialFront + 0.15, 'dayDateWindow'));

  // ---- Hands ----
  const hand = (id: string, z: number, explodeZ: number, shape: THREE.Shape, inlay: [number, number, number] | null, hubR: number) => {
    const p = reg.add(id, { category: 'dial', explode: [0, 0, explodeZ] }, parent);
    p.spin.add(mesh(extrude(shape, 0.12), m.steelPolished, z));
    if (inlay) {
      const [y0, y1, w] = inlay;
      const ig = new THREE.BoxGeometry(w, y1 - y0, 0.03);
      const im = mesh(ig, m.inlay, z + 0.07);
      im.position.y = (y0 + y1) / 2;
      p.spin.add(im);
    }
    p.spin.add(mesh(cylZ(hubR, Z_EXT.dialFront + 0.3, z + 0.08, 24), m.steelPolished));
    return p;
  };
  hand('hourHand', Z_EXT.hour, 21, batonHand(8.8, 1.0, 1.7, 1.4), [1.6, 7.8, 0.6], 1.05);
  hand('minuteHand', Z_EXT.minute, 23, batonHand(12.9, 1.4, 1.35, 1.05), [2.2, 12.0, 0.46], 0.8);
  hand('secondHand', Z_EXT.second, 25, batonHand(13.7, 3.4, 0.26, 0.2), null, 0.5);

  // ---- Crown at 3 o'clock ----
  const crown = reg.add('crown', { category: 'case', explode: [12, 0, 0] }, parent);
  const knurl = new THREE.ExtrudeGeometry(gearShape({ r: 2.3, teeth: 36, depth: 0.16 }), { depth: 2.3, bevelEnabled: false });
  knurl.rotateY(Math.PI / 2);
  knurl.translate(19.25, 0, Z_EXT.crownZ);
  crown.spin.add(mesh(knurl, m.steelPolished));
  const cap = new THREE.CylinderGeometry(2.05, 2.15, 0.45, 48);
  cap.rotateZ(Math.PI / 2);
  cap.translate(21.75, 0, Z_EXT.crownZ);
  crown.spin.add(mesh(cap, m.steelPolished));
  const tube = new THREE.CylinderGeometry(1.15, 1.15, 1.2, 32);
  tube.rotateZ(Math.PI / 2);
  tube.translate(18.7, 0, Z_EXT.crownZ);
  crown.spin.add(mesh(tube, m.steelPolished));

  // ---- Caseback ----
  const caseback = reg.add('caseback', { category: 'case', explode: [0, 0, -36] }, parent);
  caseback.spin.add(mesh(lathe([
    [0, -6.35], [12.6, -6.35], [14.4, -6.2], [15.3, -5.9], [15.8, -5.45], [15.8, -5.0], [15.2, -5.0],
  ]), m.casebackSteel));
  const face = new THREE.CircleGeometry(12.5, 96);
  face.rotateY(Math.PI);
  const faceMat = new THREE.MeshStandardMaterial({ map: casebackTexture(12.5), metalness: 1, roughness: 0.38 });
  caseback.spin.add(mesh(face, faceMat, -6.37));

  buildBracelet(reg, m, parent);
}

function buildBracelet(reg: PartRegistry, m: Materials, parent: THREE.Object3D): void {
  const part = reg.add('bracelet', { category: 'bracelet' }, parent);
  const zc = -13.0;
  const lugY = 21.1;
  const lugZ = -0.9;
  const R = Math.hypot(lugY, lugZ - zc);
  const beta0 = Math.atan2(lugZ - zc, lugY);
  const linkLen = 3.5;
  const betaEnd = -72 * D2R;
  const n = Math.floor(((beta0 - betaEnd) * R) / linkLen);

  const centre = new RoundedBoxGeometry(8.2, linkLen - 0.35, 1.9, 2, 0.25);
  const side = new RoundedBoxGeometry(4.75, linkLen - 0.35, 1.75, 2, 0.25);
  const cm = new THREE.InstancedMesh(centre, m.braceletSteel, n * 2);
  const sm = new THREE.InstancedMesh(side, m.braceletSteel, n * 4);

  const mtx = new THREE.Matrix4();
  const place = (beta: number, sign: number, x: number) => {
    const pos = new THREE.Vector3(x, sign * R * Math.cos(beta), zc + R * Math.sin(beta));
    const t = new THREE.Vector3(0, -sign * Math.sin(beta), Math.cos(beta)).normalize();
    const xAxis = new THREE.Vector3(1, 0, 0);
    const zAxis = new THREE.Vector3().crossVectors(xAxis, t);
    mtx.makeBasis(xAxis, t, zAxis).setPosition(pos);
    return mtx;
  };
  let ci = 0;
  let si = 0;
  for (const sign of [1, -1]) {
    for (let i = 0; i < n; i++) {
      const b = beta0 - ((i + 0.5) * linkLen) / R;
      cm.setMatrixAt(ci++, place(b, sign, 0));
      const bs = b - (0.5 * linkLen) / R; // outer rows staggered by half a link
      sm.setMatrixAt(si++, place(bs, sign, 6.6));
      sm.setMatrixAt(si++, place(bs, sign, -6.6));
    }
  }
  cm.instanceMatrix.needsUpdate = true;
  sm.instanceMatrix.needsUpdate = true;
  part.spin.add(cm, sm);

  // End pieces against the lugs.
  const endGeo = new RoundedBoxGeometry(19.8, 2.4, 2.2, 2, 0.3);
  for (const sign of [1, -1]) {
    const e = new THREE.Mesh(endGeo, m.braceletSteel);
    e.applyMatrix4(place(beta0 - 0.9 / R, sign, 0));
    part.spin.add(e);
  }

  // Fold-over clasp at the bottom of the loop.
  const clasp = new RoundedBoxGeometry(17.8, 17, 1.4, 2, 0.4);
  const c1 = new THREE.Mesh(clasp, m.braceletSteel);
  c1.position.set(0, 0, zc - R + 0.2);
  const c2 = new THREE.Mesh(new RoundedBoxGeometry(17.2, 15, 0.8, 2, 0.35), m.steelPolished);
  c2.position.set(0, 0.6, zc - R - 0.9);
  part.spin.add(c1, c2);
}
