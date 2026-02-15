export class Input {
  constructor() {
    this.keys = {
      w: false, a: false, s: false, d: false,
      shift: false, space: false, e: false, q: false
    };
    this.onToggleInventory = null;
    this.onSelectHotbar = null;
  }

  init(getInventoryOpen) {
    window.addEventListener("keydown", (e) => {
      if (e.repeat) return;

      if (e.code === "Tab") {
        e.preventDefault();
        if (this.onToggleInventory) this.onToggleInventory();
        return;
      }

      if (getInventoryOpen()) return;

      if (e.code === "KeyW") this.keys.w = true;
      if (e.code === "KeyA") this.keys.a = true;
      if (e.code === "KeyS") this.keys.s = true;
      if (e.code === "KeyD") this.keys.d = true;
      if (e.code === "ShiftLeft" || e.code === "ShiftRight") this.keys.shift = true;
      if (e.code === "Space") this.keys.space = true;
      if (e.code === "KeyE") this.keys.e = true;
      if (e.code === "KeyQ") this.keys.q = true;

      if (e.code === "Digit1" && this.onSelectHotbar) this.onSelectHotbar(0);
      if (e.code === "Digit2" && this.onSelectHotbar) this.onSelectHotbar(1);
      if (e.code === "Digit3" && this.onSelectHotbar) this.onSelectHotbar(2);
      if (e.code === "Digit4" && this.onSelectHotbar) this.onSelectHotbar(3);
      if (e.code === "Digit5" && this.onSelectHotbar) this.onSelectHotbar(4);
    });

    window.addEventListener("keyup", (e) => {
      if (e.code === "KeyW") this.keys.w = false;
      if (e.code === "KeyA") this.keys.a = false;
      if (e.code === "KeyS") this.keys.s = false;
      if (e.code === "KeyD") this.keys.d = false;
      if (e.code === "ShiftLeft" || e.code === "ShiftRight") this.keys.shift = false;
      if (e.code === "Space") this.keys.space = false;
      if (e.code === "KeyE") this.keys.e = false;
      if (e.code === "KeyQ") this.keys.q = false;
    });
  }
}
