import { BaseInteractable } from "./interactable.js";

export class PickupInteractable extends BaseInteractable {
  constructor({ mesh, itemId, itemName, amount, inventory, gravity, pickupDelay }) {
    super();
    this.mesh = mesh;
    this.itemId = itemId;
    this.itemName = itemName;
    this.amount = amount;
    this.inventory = inventory;

    this.gravity = gravity;
    this.pickupCooldown = pickupDelay;

    this.collected = false;
    this.velY = 0;
  }

  getRaycastObject() { return this.mesh; }

  isAvailable() {
    return !this.collected && this.mesh.visible;
  }

  getPrompt() {
    if (!this.isAvailable()) return "";
    return `Premi E per raccogliere ${this.itemName}`;
  }

  interact() {
    if (!this.isAvailable()) return;
    if (this.pickupCooldown > 0) return;

    const ok = this.inventory.addItem(this.itemId, this.itemName, this.amount);
    if (!ok) return;

    this.collected = true;
    this.mesh.visible = false;
    if (this.mesh.parent) this.mesh.parent.remove(this.mesh);
  }

  update(delta) {
    if (this.collected) return;

    if (this.pickupCooldown > 0) this.pickupCooldown -= delta;

    this.velY -= this.gravity * delta;
    this.mesh.position.y += this.velY * delta;

    // terreno semplice top y=0, mesh radius ~0.25
    const groundY = 0.25;
    if (this.mesh.position.y <= groundY) {
      this.mesh.position.y = groundY;
      if (Math.abs(this.velY) > 1.0) this.velY = -this.velY * 0.25;
      else this.velY = 0;
    }

    this.mesh.rotation.y += 1.2 * delta;
  }
}
