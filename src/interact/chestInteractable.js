import { BaseInteractable } from "./interactable.js";

export class ChestInteractable extends BaseInteractable {
  constructor(mesh) {
    super();
    this.mesh = mesh;
    this.opened = false;
  }

  getRaycastObject() { return this.mesh; }

  getPrompt() {
    return this.opened
      ? "Premi E per chiudere cassa"
      : "Premi E per aprire cassa";
  }

  interact() {
    this.opened = !this.opened;
    this.mesh.material.color.set(this.opened ? 0xd4af37 : 0x8b4513);
  }
}
