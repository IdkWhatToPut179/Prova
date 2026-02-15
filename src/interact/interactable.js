export class BaseInteractable {
  getRaycastObject() {
    throw new Error("getRaycastObject() non implementato");
  }
  getPrompt() {
    return "Premi E per interagire";
  }
  interact() {}
  update(_delta) {}
  isAvailable() { return true; }
}
