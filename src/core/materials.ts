import * as THREE from 'three';
import { brushedMap, circularGrainMap } from './textures';

/** PBR material library. Units: 1 = 1 mm. */
export function createMaterials() {
  const brushedMM = brushedMap(1 / 18);
  const brushedUnit = brushedMap(1);
  const grain = circularGrainMap();
  const grainMM = grain.clone();
  grainMM.repeat.set(1 / 27.6, 1 / 27.6);
  grainMM.offset.set(0.5, 0.5);
  grainMM.needsUpdate = true;

  return {
    steelPolished: new THREE.MeshPhysicalMaterial({
      color: 0xe4e7eb, metalness: 1, roughness: 0.09, clearcoat: 0.35, clearcoatRoughness: 0.08,
    }),
    steelBrushed: new THREE.MeshStandardMaterial({
      color: 0xd3d6da, metalness: 1, roughness: 0.62, roughnessMap: brushedMM,
    }),
    braceletSteel: new THREE.MeshStandardMaterial({
      color: 0xd0d3d7, metalness: 1, roughness: 0.6, roughnessMap: brushedUnit,
    }),
    casebackSteel: new THREE.MeshStandardMaterial({
      color: 0xd6d9dc, metalness: 1, roughness: 0.3, side: THREE.DoubleSide,
    }),
    crystal: new THREE.MeshPhysicalMaterial({
      color: 0xffffff, metalness: 0, roughness: 0.02, transparent: true, opacity: 0.13,
      clearcoat: 1, clearcoatRoughness: 0.02, envMapIntensity: 2.2, depthWrite: false,
    }),
    inlay: new THREE.MeshStandardMaterial({ color: 0x111113, metalness: 0.3, roughness: 0.32 }),
    plate: new THREE.MeshStandardMaterial({
      color: 0xc6c9cd, metalness: 0.9, roughness: 0.6, roughnessMap: grain,
    }),
    bridge: new THREE.MeshStandardMaterial({
      color: 0xd5d8db, metalness: 0.95, roughness: 0.55, roughnessMap: brushedMM,
    }),
    gilt: new THREE.MeshStandardMaterial({ color: 0xdbb562, metalness: 1, roughness: 0.28 }),
    steelPart: new THREE.MeshStandardMaterial({ color: 0xc2c6cb, metalness: 1, roughness: 0.2 }),
    screw: new THREE.MeshStandardMaterial({ color: 0x9aa3ae, metalness: 1, roughness: 0.16 }),
    ruby: new THREE.MeshPhysicalMaterial({
      color: 0xc0123a, metalness: 0, roughness: 0.06, clearcoat: 1, clearcoatRoughness: 0.03,
      emissive: 0x3a0010, emissiveIntensity: 0.7,
    }),
    rotor: new THREE.MeshStandardMaterial({
      color: 0xd8dbdf, metalness: 1, roughness: 0.5, roughnessMap: grainMM,
    }),
    discWhite: new THREE.MeshStandardMaterial({ color: 0xf0ede6, metalness: 0, roughness: 0.7 }),
    dark: new THREE.MeshStandardMaterial({ color: 0x2b2d31, metalness: 0.6, roughness: 0.4 }),
    hairspring: new THREE.LineBasicMaterial({ color: 0x9db4d8 }),
    mainspring: new THREE.LineBasicMaterial({ color: 0xc4cad2 }),
    pick: new THREE.MeshBasicMaterial({ colorWrite: false, depthWrite: false }),
  };
}

export type Materials = ReturnType<typeof createMaterials>;
