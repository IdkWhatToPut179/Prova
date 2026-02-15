export function renderHotbarUI(hotbarEl, hotbar, selectedIndex) {
  hotbarEl.innerHTML = "";
  for (let i = 0; i < hotbar.length; i++) {
    const slot = hotbar[i];
    const div = document.createElement("div");
    div.className = "inv-slot" + (i === selectedIndex ? " active" : "");

    const key = document.createElement("div");
    key.className = "inv-key";
    key.textContent = `${i + 1}`;

    const name = document.createElement("div");
    name.className = "inv-name";
    name.textContent = slot ? slot.name : "Vuoto";

    const count = document.createElement("div");
    count.className = "inv-count";
    count.textContent = slot ? `x${slot.count}` : "";

    div.appendChild(key);
    div.appendChild(name);
    div.appendChild(count);
    hotbarEl.appendChild(div);
  }
}

export function renderGrid(gridEl, data, selectedIndex, onClick, type) {
  gridEl.innerHTML = "";
  for (let i = 0; i < data.length; i++) {
    const stack = data[i];
    const cell = document.createElement("div");
    cell.className = "inv-cell" + (selectedIndex === i && type === "hotbar" ? " selected" : "");

    const name = document.createElement("div");
    name.className = "name";
    name.textContent = stack ? stack.name : "Vuoto";

    const meta = document.createElement("div");
    meta.className = "meta";
    meta.textContent = stack ? `x${stack.count}` : "";

    cell.appendChild(name);
    cell.appendChild(meta);

    cell.addEventListener("click", () => onClick(type, i));
    gridEl.appendChild(cell);
  }
}
