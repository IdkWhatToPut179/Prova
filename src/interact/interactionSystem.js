import * as THREE from "three";

export class InteractionSystem {
  constructor({ camera, maxDistance, hintApi }) {
    this.camera = camera;
    this.maxDistance = maxDistance;
    this.hintApi = hintApi;

    this.raycaster = new THREE.Raycaster();
    this.interactables = [];
    this.byObject = new WeakMap();
    this.current = null;
  }

  register(interactable) {
    this.interactables.push(interactable);
    this.byObject.set(interactable.getRaycastObject(), interactable);
  }

  update(delta, canShowHint = true) {
    for (const it of this.interactables) it.update(delta);

    const raycastObjects = [];
    for (const it of this.interactables) {
      if (!it.isAvailable()) continue;
      const obj = it.getRaycastObject();
      if (obj && obj.visible) raycastObjects.push(obj);
    }

    this.raycaster.setFromCamera(new THREE.Vector2(0, 0), this.camera);
    const hits = this.raycaster.intersectObjects(raycastObjects, false);

    this.current = null;
    if (hits.length > 0 && hits[0].distance <= this.maxDistance) {
      this.current = this.byObject.get(hits[0].object) ?? null;
    }

    if (canShowHint && this.current) {
      const p = this.current.getPrompt();
      if (p) this.hintApi.show(p);
      else this.hintApi.hide();
    } else {
      this.hintApi.hide();
    }
  }

  interactCurrent() {
    if (this.current) this.current.interact();
  }
}
