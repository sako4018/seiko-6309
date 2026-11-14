import * as THREE from 'three';

/** Shared 2D profiles for the movement and case. Units are millimetres. */

export interface GearOpts {
  r: number;
  teeth: number;
  depth?: number;
  spokes?: number;
  rim?: number;
  hub?: number;
  spokeW?: number;
  hole?: number;
}

export function addCircleHole(s: THREE.Shape, x: number, y: number, r: number): void {
  const h = new THREE.Path();
  h.absarc(x, y, r, 0, Math.PI * 2, true);
  s.holes.push(h);
}

function addSpokeHoles(s: THREE.Shape, rimIn: number, hub: number, spokes: number, w: number): void {
  if (spokes <= 0 || rimIn < hub + 0.3) return;
  const step = (Math.PI * 2) / spokes;
  const ho = Math.asin(Math.min(0.9, w / 2 / rimIn));
  const hi = Math.asin(Math.min(0.9, w / 2 / hub));
  for (let k = 0; k < spokes; k++) {
    const a0 = k * step + Math.PI / 2;
    const a1 = a0 + step;
    const h = new THREE.Path();
    h.absarc(0, 0, rimIn, a0 + ho, a1 - ho, false);
    h.absarc(0, 0, hub, a1 - hi, a0 + hi, true);
    h.closePath();
    s.holes.push(h);
  }
}

/** Toothed profile: `prof` lists [radius fraction 0=root 1=tip, angle fraction of pitch]. */
function toothed(r: number, rr: number, teeth: number, prof: [number, number][]): THREE.Shape {
  const s = new THREE.Shape();
  const p = (Math.PI * 2) / teeth;
  for (let i = 0; i < teeth; i++) {
    prof.forEach(([k, f], j) => {
      const rad = rr + (r - rr) * k;
      const a = (i + f) * p;
      const x = rad * Math.cos(a);
      const y = rad * Math.sin(a);
      if (i === 0 && j === 0) s.moveTo(x, y);
      else s.lineTo(x, y);
    });
  }
  s.closePath();
  return s;
}

export function gearShape(o: GearOpts): THREE.Shape {
  const depth = o.depth ?? Math.max(0.12, Math.min(0.3, o.r * 0.07));
  const rr = o.r - depth;
  const s = toothed(o.r, rr, o.teeth, [
    [0, 0], [0.55, 0.17], [1, 0.27], [1, 0.37], [0.55, 0.47], [0, 0.62],
  ]);
  if (o.spokes) {
    addSpokeHoles(
      s,
      rr - (o.rim ?? Math.max(0.3, o.r * 0.11)),
      o.hub ?? Math.max(0.45, o.r * 0.2),
      o.spokes,
      o.spokeW ?? Math.max(0.22, o.r * 0.07),
    );
  }
  if (o.hole) addCircleHole(s, 0, 0, o.hole);
  return s;
}

/** Saw-tooth ratchet wheel. */
export function ratchetShape(r: number, teeth: number, hole = 0): THREE.Shape {
  const s = toothed(r, r - 0.28, teeth, [[0, 0], [1, 0.86], [0, 0.9]]);
  if (hole) addCircleHole(s, 0, 0, hole);
  return s;
}

/** Club-tooth escape wheel (Swiss lever type). */
export function escapeWheelShape(r: number, teeth = 15): THREE.Shape {
  const rr = r * 0.78;
  const s = toothed(r, rr, teeth, [
    [0, 0], [0.7, 0.36], [1, 0.45], [0.92, 0.53], [0.2, 0.58], [0, 0.7],
  ]);
  addSpokeHoles(s, rr - 0.22, 0.42, 4, 0.18);
  return s;
}

/** Ring with internal teeth (date dial). */
export function internalRingShape(rOuter: number, rTip: number, teeth: number): THREE.Shape {
  const s = new THREE.Shape();
  s.absarc(0, 0, rOuter, 0, Math.PI * 2, false);
  const h = new THREE.Path();
  const p = (Math.PI * 2) / teeth;
  const root = rTip + 0.3;
  const prof: [number, number][] = [[root, 0], [rTip, 0.3], [rTip, 0.5], [root, 0.8]];
  for (let i = 0; i < teeth; i++) {
    prof.forEach(([rad, f], j) => {
      const a = (i + f) * p;
      if (i === 0 && j === 0) h.moveTo(rad * Math.cos(a), rad * Math.sin(a));
      else h.lineTo(rad * Math.cos(a), rad * Math.sin(a));
    });
  }
  h.closePath();
  s.holes.push(h);
  return s;
}

export function ringShape(ro: number, ri: number): THREE.Shape {
  const s = new THREE.Shape();
  s.absarc(0, 0, ro, 0, Math.PI * 2, false);
  addCircleHole(s, 0, 0, ri);
  return s;
}

export function sectorRingShape(ro: number, ri: number, a0: number, a1: number): THREE.Shape {
  const s = new THREE.Shape();
  s.absarc(0, 0, ro, a0, a1, false);
  s.absarc(0, 0, ri, a1, a0, true);
  s.closePath();
  return s;
}

interface Circle { x: number; y: number; r: number }

function convexHull(pts: THREE.Vector2[]): THREE.Vector2[] {
  const p = [...pts].sort((a, b) => (a.x === b.x ? a.y - b.y : a.x - b.x));
  const cross = (o: THREE.Vector2, a: THREE.Vector2, b: THREE.Vector2) =>
    (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);
  const lower: THREE.Vector2[] = [];
  for (const q of p) {
    while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], q) <= 0) lower.pop();
    lower.push(q);
  }
  const upper: THREE.Vector2[] = [];
  for (let i = p.length - 1; i >= 0; i--) {
    const q = p[i];
    while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], q) <= 0) upper.pop();
    upper.push(q);
  }
  upper.pop();
  lower.pop();
  return lower.concat(upper);
}

/** Rounded convex outline around a set of circles: used for bridges. */
export function roundedHull(circles: Circle[], seg = 32): THREE.Shape {
  const pts: THREE.Vector2[] = [];
  for (const c of circles) {
    for (let i = 0; i < seg; i++) {
      const a = (i / seg) * Math.PI * 2;
      pts.push(new THREE.Vector2(c.x + c.r * Math.cos(a), c.y + c.r * Math.sin(a)));
    }
  }
  return new THREE.Shape(convexHull(pts));
}

/** Extrude along Z, centred on z = 0. */
export function extrude(shape: THREE.Shape, thickness: number, curveSegments = 16): THREE.ExtrudeGeometry {
  const g = new THREE.ExtrudeGeometry(shape, { depth: thickness, bevelEnabled: false, curveSegments });
  g.translate(0, 0, -thickness / 2);
  return g;
}

/** Cylinder whose axis is Z, spanning z0..z1. */
export function cylZ(r: number, z0: number, z1: number, seg = 24): THREE.CylinderGeometry {
  const g = new THREE.CylinderGeometry(r, r, Math.abs(z1 - z0), seg);
  g.rotateX(Math.PI / 2);
  g.translate(0, 0, (z0 + z1) / 2);
  return g;
}
