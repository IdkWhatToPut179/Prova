import * as THREE from "three";

export class ColliderStore {
  constructor() {
    this.worldColliders = [];
  }

  addStaticCollider(mesh) {
    mesh.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(mesh);
    this.worldColliders.push(box);
    return box;
  }

  addDynamicBox(box) {
    this.worldColliders.push(box);
    return box;
  }
}
