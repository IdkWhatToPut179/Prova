import { renderHotbarUI, renderGrid } from "../ui/inventoryUI.js";

function cloneStack(s) {
  return s ? { id: s.id, name: s.name, count: s.count } : null;
}
function makeStack(id, name, count) {
  return { id, name, count };
}

export class Inventory {
  constructor({ hotbarSlots, bagSlots, maxStack, dom, hintApi }) {
    this.maxStack = maxStack;
    this.hotbar = Array.from({ length: hotbarSlots }, () => null);
    this.bag = Array.from({ length: bagSlots }, () => null);
    this.selectedHotbar = 0;

    this.heldStack = null;

    this.dom = dom;
    this.hintApi = hintApi;

    this.renderAll(false);
  }

  selectHotbar(index) {
    if (index < 0 || index >= this.hotbar.length) return;
    this.selectedHotbar = index;
    this.renderHotbar();
  }

  getSelectedStack() {
    return this.hotbar[this.selectedHotbar];
  }

  removeOneFromSelected() {
    const s = this.getSelectedStack();
    if (!s) return null;
    s.count -= 1;
    const out = makeStack(s.id, s.name, 1);
    if (s.count <= 0) this.hotbar[this.selectedHotbar] = null;
    this.renderHotbar();
    return out;
  }

  addItem(id, name, count = 1) {
    let remaining = count;
    const lists = [this.hotbar, this.bag];

    for (const list of lists) {
      for (let i = 0; i < list.length; i++) {
        const s = list[i];
        if (!s || s.id !== id || s.count >= this.maxStack) continue;
        const free = this.maxStack - s.count;
        const add = Math.min(free, remaining);
        s.count += add;
        remaining -= add;
        if (remaining <= 0) {
          this.renderHotbar();
          return true;
        }
      }
    }

    for (const list of lists) {
      for (let i = 0; i < list.length; i++) {
        if (list[i] !== null) continue;
        const add = Math.min(this.maxStack, remaining);
        list[i] = makeStack(id, name, add);
        remaining -= add;
        if (remaining <= 0) {
          this.renderHotbar();
          return true;
        }
      }
    }

    this.renderHotbar();
    return false;
  }

  clickCell(type, index, inventoryOpen) {
    const arr = type === "hotbar" ? this.hotbar : this.bag;
    const target = arr[index];

    if (this.heldStack === null) {
      if (target === null) return;
      this.heldStack = cloneStack(target);
      arr[index] = null;
      this.renderAll(inventoryOpen);
      return;
    }

    if (target === null) {
      arr[index] = cloneStack(this.heldStack);
      this.heldStack = null;
      this.renderAll(inventoryOpen);
      return;
    }

    if (target.id === this.heldStack.id && target.count < this.maxStack) {
      const free = this.maxStack - target.count;
      const add = Math.min(free, this.heldStack.count);
      target.count += add;
      this.heldStack.count -= add;
      if (this.heldStack.count <= 0) this.heldStack = null;
      this.renderAll(inventoryOpen);
      return;
    }

    const tmp = cloneStack(target);
    arr[index] = cloneStack(this.heldStack);
    this.heldStack = tmp;
    this.renderAll(inventoryOpen);
  }

  renderHotbar() {
    renderHotbarUI(this.dom.inventoryHotbar, this.hotbar, this.selectedHotbar);
  }

  renderBigInventory(inventoryOpen) {
    if (!inventoryOpen) return;
    renderGrid(
      this.dom.hotbarGrid,
      this.hotbar,
      this.selectedHotbar,
      (type, index) => this.clickCell(type, index, true),
      "hotbar"
    );
    renderGrid(
      this.dom.bagGrid,
      this.bag,
      -1,
      (type, index) => this.clickCell(type, index, true),
      "bag"
    );

    if (this.heldStack) {
      this.hintApi.show(`In mano: ${this.heldStack.name} x${this.heldStack.count}`);
    } else {
      this.hintApi.hide();
    }
  }

  renderAll(inventoryOpen) {
    this.renderHotbar();
    this.renderBigInventory(inventoryOpen);
  }
}
