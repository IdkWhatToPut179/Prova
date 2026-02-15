import * as THREE from "three";
import { BaseInteractable } from "./interactable.js";

export class DoorInteractable extends BaseInteractable {
  constructor({ doorMesh, pivot, colliderMesh, colliderBox, openAngle, animSpeed }) {
    super();
    this.doorMesh = doorMesh;
    this.pivot = pivot;
    this.colliderMesh = colliderMesh;
    this.colliderBox = colliderBox;
    this.openAngle = openAngle;
    this.animSpeed = animSpeed;

    this.currentAngle = 0;
    this.targetAngle = 0;
  }

  getRaycastObject() { return this.doorMesh; }

  getPrompt() {
    const openTarget = Math.abs(this.targetAngle - this.openAngle) < 0.01;
    return openTarget ? "Premi E per chiudere porta" : "Premi E per aprire porta";
  }

  interact() {
    const isClosedTarget = Math.abs(this.targetAngle) < 0.01;
    this.targetAngle = isClosedTarget ? this.openAngle : 0;
  }

  update(delta) {
    const t = 1 - Math.exp(-this.animSpeed * delta);
    this.currentAngle += (this.targetAngle - this.currentAngle) * t;
    this.pivot.rotation.y = this.currentAngle;
    this.refreshCollider();
  }

  refreshCollider() {
    const pos = this.doorMesh.getWorldPosition(new THREE.Vector3());
    const quat = this.doorMesh.getWorldQuaternion(new THREE.Quaternion());
    this.colliderMesh.position.copy(pos);
    this.colliderMesh.quaternion.copy(quat);
    this.colliderMesh.updateMatrixWorld(true);
    this.colliderBox.setFromObject(this.colliderMesh);
  }
}
