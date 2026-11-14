import * as THREE from 'three';

export type Category =
  | 'case' | 'bracelet' | 'dial' | 'calendar' | 'motion' | 'movement' | 'bridge' | 'auto' | 'rotor';

export interface PartOptions {
  category: Category;
  pos?: [number, number, number];
  rotZ?: number;
  /** Offset at 100 % exploded. */
  explode?: [number, number, number];
  /** Offset a part flies in from during assembly (defaults to 1.5 × explode). */
  assemble?: [number, number, number];
}

/**
 * A selectable component. `root` carries placement + explode/assembly offsets,
 * `spin` carries the mechanical animation, so the two never interfere.
 */
export class Part {
  readonly root = new THREE.Group();
  readonly spin = new THREE.Group();
  readonly home: THREE.Vector3;
  readonly explode: THREE.Vector3;
  readonly assemble: THREE.Vector3;
  readonly category: Category;
  step = 0;
  meshes: THREE.Mesh[] = [];

  constructor(readonly id: string, opts: PartOptions) {
    this.category = opts.category;
    this.home = new THREE.Vector3(...(opts.pos ?? [0, 0, 0]));
    this.explode = new THREE.Vector3(...(opts.explode ?? [0, 0, 0]));
    const a = opts.assemble ?? (opts.explode ? opts.explode.map((v) => v * 1.5) : [0, 0, 30]);
    this.assemble = new THREE.Vector3(...(a as [number, number, number]));
    this.root.position.copy(this.home);
    this.root.rotation.z = opts.rotZ ?? 0;
    this.root.name = id;
    this.root.add(this.spin);
  }

  /** Clone materials per part so highlighting one part never bleeds into another. */
  finalize(): void {
    const cache = new Map<THREE.Material, THREE.Material>();
    const cloneMat = (m: THREE.Material) => {
      let c = cache.get(m);
      if (!c) {
        c = m.clone();
        cache.set(m, c);
      }
      return c;
    };
    this.root.traverse((o) => {
      o.userData.partId = this.id;
      const mesh = o as THREE.Mesh;
      if (!mesh.isMesh) return;
      this.meshes.push(mesh);
      mesh.material = Array.isArray(mesh.material) ? mesh.material.map(cloneMat) : cloneMat(mesh.material);
    });
  }
}

export class PartRegistry {
  private readonly map = new Map<string, Part>();

  add(id: string, opts: PartOptions, parent: THREE.Object3D): Part {
    const p = new Part(id, opts);
    parent.add(p.root);
    this.map.set(id, p);
    return p;
  }

  get(id: string): Part {
    const p = this.map.get(id);
    if (!p) throw new Error(`Unknown part ${id}`);
    return p;
  }

  has(id: string): boolean {
    return this.map.has(id);
  }

  all(): Part[] {
    return [...this.map.values()];
  }
}

export function mesh(g: THREE.BufferGeometry, m: THREE.Material | THREE.Material[], z = 0, infoId?: string): THREE.Mesh {
  const me = new THREE.Mesh(g, m);
  me.position.z = z;
  if (infoId) me.userData.infoId = infoId;
  return me;
}
