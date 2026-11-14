import * as THREE from 'three';
import type { OrbitControls } from 'three/addons/controls/OrbitControls.js';

const ease = (u: number) => (u < 0.5 ? 4 * u * u * u : 1 - (-2 * u + 2) ** 3 / 2);

/** Smooth camera moves that orbit around the target instead of cutting through the watch. */
export class CameraRig {
  private tw: {
    s0: THREE.Spherical; s1: THREE.Spherical; t0: THREE.Vector3; t1: THREE.Vector3; start: number; dur: number;
  } | null = null;

  constructor(readonly camera: THREE.PerspectiveCamera, readonly controls: OrbitControls) {
    controls.addEventListener('start', () => (this.tw = null));
  }

  go(pos: THREE.Vector3, target: THREE.Vector3, dur = 1.2): void {
    const s0 = new THREE.Spherical().setFromVector3(this.camera.position.clone().sub(this.controls.target));
    const s1 = new THREE.Spherical().setFromVector3(pos.clone().sub(target));
    let dTheta = s1.theta - s0.theta;
    while (dTheta > Math.PI) dTheta -= Math.PI * 2;
    while (dTheta < -Math.PI) dTheta += Math.PI * 2;
    s1.theta = s0.theta + dTheta;
    this.tw = { s0, s1, t0: this.controls.target.clone(), t1: target.clone(), start: performance.now(), dur: dur * 1000 };
  }

  /** Keep the current viewing direction, change distance and target. */
  focus(target: THREE.Vector3, distance: number, dur = 1.0): void {
    const dir = this.camera.position.clone().sub(this.controls.target).normalize();
    this.go(target.clone().addScaledVector(dir, distance), target, dur);
  }

  update(): void {
    if (this.tw) {
      const u = Math.min(1, (performance.now() - this.tw.start) / this.tw.dur);
      const e = ease(u);
      const { s0, s1 } = this.tw;
      const s = new THREE.Spherical(
        THREE.MathUtils.lerp(s0.radius, s1.radius, e),
        THREE.MathUtils.lerp(s0.phi, s1.phi, e),
        THREE.MathUtils.lerp(s0.theta, s1.theta, e),
      );
      this.controls.target.lerpVectors(this.tw.t0, this.tw.t1, e);
      this.camera.position.setFromSpherical(s).add(this.controls.target);
      if (u >= 1) this.tw = null;
    }
    this.controls.update();
  }
}
