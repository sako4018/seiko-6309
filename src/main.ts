import './style.css';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { createMaterials } from './core/materials';
import { CameraRig } from './core/camera';
import { PartRegistry, type Part } from './watch/parts';
import { buildExterior } from './watch/exterior';
import { buildMovement, type MovementHandles } from './watch/movement';
import { MovementSim } from './sim/simulation';
import { ASSEMBLY } from './data/components';
import { UI } from './ui/ui';
import type { Mode } from './modes';

export type Preset = 'front' | 'side' | 'rear' | 'reset';

interface View { dir: [number, number, number]; dist: number; target: [number, number, number] }
const MODE_VIEW: Record<Mode, View> = {
  WATCH: { dir: [0.35, 0.28, 0.9], dist: 135, target: [0, -2, 0] },
  CASE: { dir: [0.62, 0.25, 0.74], dist: 115, target: [0, 0, 0] },
  MOVEMENT: { dir: [0.25, 0.3, -0.92], dist: 72, target: [0, 0, -1.5] },
  EXPLODED: { dir: [0.78, 0.42, 0.46], dist: 180, target: [0, 0, -2] },
  ASSEMBLY: { dir: [0.7, 0.45, -0.55], dist: 105, target: [0, 0, -1] },
  SIMULATION: { dir: [0.1, 0.16, -0.98], dist: 82, target: [0, 0, -1.5] },
};

export class App {
  readonly renderer: THREE.WebGLRenderer;
  readonly scene = new THREE.Scene();
  readonly camera: THREE.PerspectiveCamera;
  readonly controls: OrbitControls;
  readonly rig: CameraRig;
  readonly reg = new PartRegistry();
  readonly sim = new MovementSim();
  readonly movement: MovementHandles;
  readonly ui: UI;

  mode: Mode = 'WATCH';
  selected: string | null = null;
  st = {
    casebackOpen: false, crystal: true, bracelet: true, bridges: true, rotor: true,
    explode: 0.65, autoRotate: false,
  };
  assemblyStep = 0;
  assemblyProgress = 1;
  assemblyPlaying = false;
  private assemblyTimer = 0;

  private explodeNow = 0;
  private caseOpenNow = 0;
  private readonly pickables: THREE.Mesh[] = [];
  private readonly raycaster = new THREE.Raycaster();
  private down: { x: number; y: number; t: number } | null = null;
  private rotorDrag: { last: number } | null = null;
  private timer = new THREE.Timer();
  private highlighted: THREE.MeshStandardMaterial[] = [];

  constructor(canvas: HTMLCanvasElement) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;

    this.camera = new THREE.PerspectiveCamera(32, 1, 1, 2000);
    this.camera.position.set(35, 28, 90);
    this.controls = new OrbitControls(this.camera, canvas);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;
    this.controls.minDistance = 10;
    this.controls.maxDistance = 260;
    this.controls.autoRotateSpeed = 1.2;
    this.rig = new CameraRig(this.camera, this.controls);

    // Studio lighting: neutral room reflections + warm key + subtle gold rim.
    const pmrem = new THREE.PMREMGenerator(this.renderer);
    this.scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    this.scene.environmentIntensity = 0.95;
    const key = new THREE.DirectionalLight(0xfff1dc, 1.9);
    key.position.set(40, 60, 80);
    const rim = new THREE.DirectionalLight(0xd9b26a, 1.4);
    rim.position.set(-70, 25, -60);
    const fill = new THREE.DirectionalLight(0xcfd8ff, 0.5);
    fill.position.set(-60, -30, 50);
    this.scene.add(key, rim, fill, new THREE.AmbientLight(0xffffff, 0.12));

    const m = createMaterials();
    const watch = new THREE.Group();
    this.scene.add(watch);
    buildExterior(this.reg, m, watch);
    this.movement = buildMovement(this.reg, m, watch);

    ASSEMBLY.forEach((s, i) => s.parts.forEach((id) => (this.reg.get(id).step = i + 1)));
    for (const p of this.reg.all()) {
      if (p.category === 'bracelet') p.step = 999;
      p.finalize();
      this.pickables.push(...p.meshes);
    }

    this.ui = new UI(this);
    this.bindPointer(canvas);
    window.addEventListener('resize', () => this.resize());
    this.resize();
    this.setMode('WATCH', true);
    this.renderer.setAnimationLoop(() => this.frame());
  }

  // ---------------- Modes & actions ----------------

  setMode(mode: Mode, instant = false): void {
    this.mode = mode;
    this.select(null);
    if (mode === 'ASSEMBLY') {
      this.assemblyStep = 0;
      this.assemblyProgress = 0;
      this.assemblyPlaying = false;
    }
    if (mode !== 'CASE') this.st.casebackOpen = false;
    this.controls.autoRotate = mode === 'WATCH' && this.st.autoRotate;
    this.preset('reset', instant ? 0.01 : 1.3);
    this.ui.renderMode();
  }

  preset(p: Preset, dur = 1.2): void {
    const v = MODE_VIEW[this.mode];
    const target = new THREE.Vector3(...v.target);
    const dist = v.dist;
    let dir: THREE.Vector3;
    if (p === 'front') dir = new THREE.Vector3(0, 0.02, 1);
    else if (p === 'side') dir = new THREE.Vector3(1, 0.05, 0.02);
    else if (p === 'rear') dir = new THREE.Vector3(0, 0.02, -1);
    else dir = new THREE.Vector3(...v.dir);
    this.rig.go(target.clone().addScaledVector(dir.normalize(), p === 'reset' ? dist : dist * 0.9), target, dur);
  }

  focusSelected(): void {
    if (!this.selected) return;
    const box = new THREE.Box3();
    for (const me of this.meshesFor(this.selected)) if (this.visibleChain(me)) box.expandByObject(me);
    if (box.isEmpty()) return;
    const size = box.getSize(new THREE.Vector3()).length();
    this.rig.focus(box.getCenter(new THREE.Vector3()), Math.max(16, size * 2.2));
  }

  select(id: string | null): void {
    this.selected = id;
    for (const mat of this.highlighted) {
      mat.emissive.copy(mat.userData.baseEmissive as THREE.Color);
      mat.emissiveIntensity = mat.userData.baseIntensity as number;
    }
    this.highlighted = [];
    if (id) {
      const set = new Set<THREE.MeshStandardMaterial>();
      for (const me of this.meshesFor(id)) {
        for (const mat of Array.isArray(me.material) ? me.material : [me.material]) {
          const sm = mat as THREE.MeshStandardMaterial;
          if (!sm.isMeshStandardMaterial) continue;
          if (!sm.userData.baseEmissive) {
            sm.userData.baseEmissive = sm.emissive.clone();
            sm.userData.baseIntensity = sm.emissiveIntensity;
          }
          set.add(sm);
        }
      }
      this.highlighted = [...set];
    }
    this.ui.renderInfo();
  }

  /** Makes a part visible in the current mode if needed, then selects it. */
  selectFromList(id: string): void {
    this.select(id);
  }

  action(name: string, arg?: string): void {
    const s = this.sim;
    switch (name) {
      case 'preset': this.preset(arg as Preset); break;
      case 'focus': this.focusSelected(); break;
      case 'deselect': this.select(null); break;
      case 'toggle': {
        const k = arg as keyof App['st'];
        (this.st as Record<string, unknown>)[k] = !this.st[k];
        if (k === 'autoRotate') this.controls.autoRotate = this.st.autoRotate;
        break;
      }
      case 'explodeTo': this.st.explode = Number(arg); break;
      case 'run': s.running = !s.running; break;
      case 'simReset': s.reset(); break;
      case 'speed': s.speed = Number(arg); s.running = true; break;
      case 'autoWrist': s.autoWrist = !s.autoWrist; break;
      case 'advanceDate': s.dateOffset++; break;
      case 'advanceDay': s.dayOffset++; break;
      case 'setNow': s.setToNow(); break;
      case 'stepNext': this.goStep(this.assemblyStep + 1); break;
      case 'stepPrev': this.goStep(this.assemblyStep - 1); break;
      case 'stepGo': this.goStep(Number(arg)); break;
      case 'stepPlay':
        if (this.assemblyStep >= ASSEMBLY.length - 1) this.goStep(0);
        this.assemblyPlaying = !this.assemblyPlaying;
        this.assemblyTimer = 0;
        break;
    }
    this.ui.renderMode();
  }

  goStep(i: number): void {
    const n = Math.max(0, Math.min(ASSEMBLY.length - 1, i));
    if (n === this.assemblyStep) return;
    this.assemblyProgress = n > this.assemblyStep ? 0 : 1;
    this.assemblyStep = n;
    const first = ASSEMBLY[n].parts[0];
    this.select(first);
  }

  // ---------------- Visibility ----------------

  private isVisible(p: Part): boolean {
    const c = p.category;
    const mode = this.mode;
    if (c === 'bracelet') return (mode === 'WATCH' || (mode === 'CASE' && !this.st.casebackOpen)) && this.st.bracelet;
    if (p.id === 'crystal' && !this.st.crystal && (mode === 'WATCH' || mode === 'CASE' || mode === 'SIMULATION')) return false;
    switch (mode) {
      case 'WATCH':
      case 'CASE':
      case 'EXPLODED':
        return true;
      case 'ASSEMBLY':
        return p.step <= this.assemblyStep + 1;
      case 'MOVEMENT':
        if (c === 'case' || c === 'dial') return false;
        break;
      case 'SIMULATION':
        if (p.id === 'caseback') return false;
        break;
    }
    if ((c === 'bridge' || c === 'auto') && !this.st.bridges) return false;
    if (c === 'rotor' && !this.st.rotor) return false;
    return true;
  }

  private visibleChain(o: THREE.Object3D | null): boolean {
    for (; o; o = o.parent) if (!o.visible) return false;
    return true;
  }

  private meshesFor(id: string): THREE.Mesh[] {
    return this.pickables.filter((me) => (me.userData.infoId ?? me.userData.partId) === id);
  }

  // ---------------- Pointer ----------------

  private ndc(e: PointerEvent): THREE.Vector2 {
    const r = this.renderer.domElement.getBoundingClientRect();
    return new THREE.Vector2(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
  }

  private pick(e: PointerEvent): string | null {
    this.raycaster.setFromCamera(this.ndc(e), this.camera);
    const hits = this.raycaster.intersectObjects(this.pickables, false).filter((h) => this.visibleChain(h.object));
    const solid = hits.filter((h) => h.object.userData.partId !== 'crystal');
    const h = solid[0] ?? hits[0];
    if (!h) return null;
    return (h.object.userData.infoId ?? h.object.userData.partId) as string;
  }

  private rotorAngle(e: PointerEvent): number | null {
    this.raycaster.setFromCamera(this.ndc(e), this.camera);
    const rotor = this.reg.get('rotor').root;
    const plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), -(rotor.position.z - 4.4));
    const p = this.raycaster.ray.intersectPlane(plane, new THREE.Vector3());
    if (!p) return null;
    return Math.atan2(p.y - rotor.position.y, p.x - rotor.position.x);
  }

  private bindPointer(canvas: HTMLCanvasElement): void {
    canvas.addEventListener('pointerdown', (e) => {
      this.down = { x: e.clientX, y: e.clientY, t: performance.now() };
      if ((this.mode === 'SIMULATION' || this.mode === 'MOVEMENT') && this.pick(e) === 'rotor') {
        const a = this.rotorAngle(e);
        if (a !== null) {
          this.rotorDrag = { last: a };
          this.controls.enabled = false;
          this.sim.beginDrag();
          canvas.setPointerCapture(e.pointerId);
        }
      }
    });
    canvas.addEventListener('pointermove', (e) => {
      if (!this.rotorDrag) return;
      const a = this.rotorAngle(e);
      if (a === null) return;
      let d = a - this.rotorDrag.last;
      if (d > Math.PI) d -= Math.PI * 2;
      if (d < -Math.PI) d += Math.PI * 2;
      this.rotorDrag.last = a;
      this.sim.dragBy(d);
    });
    const up = (e: PointerEvent) => {
      const wasDrag = this.rotorDrag;
      if (this.rotorDrag) {
        this.rotorDrag = null;
        this.controls.enabled = true;
        this.sim.endDrag();
      }
      if (this.down) {
        const moved = Math.hypot(e.clientX - this.down.x, e.clientY - this.down.y);
        if (moved < 5 && e.type === 'pointerup') this.select(wasDrag ? 'rotor' : this.pick(e));
      }
      this.down = null;
    };
    canvas.addEventListener('pointerup', up);
    canvas.addEventListener('pointercancel', up);
  }

  private resize(): void {
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }

  // ---------------- Frame ----------------

  private frame(): void {
    this.timer.update();
    const dt = this.timer.getDelta();
    const t = this.timer.getElapsed();
    this.sim.update(dt);

    const k = Math.min(1, dt * 4);
    this.explodeNow += ((this.mode === 'EXPLODED' ? this.st.explode : 0) - this.explodeNow) * k;
    this.caseOpenNow += ((this.st.casebackOpen ? 1 : 0) - this.caseOpenNow) * k;

    if (this.mode === 'ASSEMBLY') {
      this.assemblyProgress = Math.min(1, this.assemblyProgress + dt / 1.3);
      if (this.assemblyPlaying) {
        this.assemblyTimer += dt;
        if (this.assemblyTimer > 2.8) {
          this.assemblyTimer = 0;
          if (this.assemblyStep >= ASSEMBLY.length - 1) this.assemblyPlaying = false;
          else this.goStep(this.assemblyStep + 1);
          this.ui.renderMode();
        }
      }
    }

    const off = new THREE.Vector3();
    const ap = this.assemblyProgress;
    const easeOut = 1 - (1 - ap) ** 3;
    for (const p of this.reg.all()) {
      p.root.visible = this.isVisible(p);
      off.copy(p.explode).multiplyScalar(this.explodeNow);
      if (this.mode === 'ASSEMBLY' && p.step === this.assemblyStep + 1) off.addScaledVector(p.assemble, 1 - easeOut);
      if (p.id === 'caseback') {
        off.z -= 16 * this.caseOpenNow;
        off.x += 14 * this.caseOpenNow;
        p.root.rotation.y = -0.9 * this.caseOpenNow;
      }
      p.root.position.copy(p.home).add(off);
    }

    const kin = this.sim.kinematics();
    this.movement.update(kin, this.sim.reserve);
    this.reg.get('secondHand').spin.rotation.z = kin.secHand;
    this.reg.get('minuteHand').spin.rotation.z = kin.minHand;
    this.reg.get('hourHand').spin.rotation.z = kin.hourHand;

    const pulse = 0.55 + 0.3 * Math.sin(t * 4);
    for (const mat of this.highlighted) {
      mat.emissive.setHex(0xc8962e);
      mat.emissiveIntensity = pulse;
    }

    this.rig.update();
    this.renderer.render(this.scene, this.camera);
    this.ui.tick();
  }
}

const canvas = document.querySelector<HTMLCanvasElement>('#scene');
if (!canvas) throw new Error('Missing canvas');
try {
  new App(canvas);
} catch (err) {
  console.error(err);
  document.body.classList.add('no-webgl');
}
