import * as THREE from "three";
import { PointerLockControls } from "three/addons/controls/PointerLockControls.js";

// ======================================================
// CONFIG
// ======================================================
const CONFIG = {
  player: {
    height: 1.7,
    radius: 0.35,
    walkSpeed: 5.0,
    sprintSpeed: 8.5,
    accel: 30.0,
    airControl: 0.35,
    gravity: 24.0,
    jumpSpeed: 8.8,
    spawn: new THREE.Vector3(0, 1.7, 5)
  },
  interaction: {
    maxDistance: 3.0
  },
  door: {
    openAngle: -Math.PI / 2,
    animSpeed: 4.5
  },
  inventory: {
    slots: 5,
    maxStack: 99
  }
};

// ======================================================
// SCENA
// ======================================================
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87ceeb);

const camera = new THREE.PerspectiveCamera(
  75,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
document.body.appendChild(renderer.domElement);

// luci
scene.add(new THREE.HemisphereLight(0xffffff, 0x444444, 0.8));
const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
dirLight.position.set(5, 10, 2);
scene.add(dirLight);

// UI
const overlay = document.getElementById("overlay");
const hint = document.getElementById("hint");
const inventoryEl = document.getElementById("inventory");

// ======================================================
// CONTROLLI
// ======================================================
const controls = new PointerLockControls(camera, document.body);
const player = controls.getObject();
player.position.copy(CONFIG.player.spawn);
scene.add(player);

overlay.addEventListener("click", () => controls.lock());
controls.addEventListener("lock", () => overlay.classList.add("hidden"));
controls.addEventListener("unlock", () => {
  overlay.classList.remove("hidden");
  hint.style.display = "none";
});

// ======================================================
// INPUT
// ======================================================
const keys = {
  w: false, a: false, s: false, d: false,
  shift: false, space: false, e: false
};

window.addEventListener("keydown", (e) => {
  if (e.repeat) return;

  if (e.code === "KeyW") keys.w = true;
  if (e.code === "KeyA") keys.a = true;
  if (e.code === "KeyS") keys.s = true;
  if (e.code === "KeyD") keys.d = true;
  if (e.code === "ShiftLeft" || e.code === "ShiftRight") keys.shift = true;
  if (e.code === "Space") keys.space = true;
  if (e.code === "KeyE") keys.e = true;

  // Selezione slot 1..5
  if (e.code === "Digit1") inventory.selectSlot(0);
  if (e.code === "Digit2") inventory.selectSlot(1);
  if (e.code === "Digit3") inventory.selectSlot(2);
  if (e.code === "Digit4") inventory.selectSlot(3);
  if (e.code === "Digit5") inventory.selectSlot(4);
});

window.addEventListener("keyup", (e) => {
  if (e.code === "KeyW") keys.w = false;
  if (e.code === "KeyA") keys.a = false;
  if (e.code === "KeyS") keys.s = false;
  if (e.code === "KeyD") keys.d = false;
  if (e.code === "ShiftLeft" || e.code === "ShiftRight") keys.shift = false;
  if (e.code === "Space") keys.space = false;
  if (e.code === "KeyE") keys.e = false;
});

// ======================================================
// INVENTARIO
// ======================================================
class Inventory {
  constructor(slotCount, maxStack, rootEl) {
    this.slotCount = slotCount;
    this.maxStack = maxStack;
    this.rootEl = rootEl;
    this.selectedSlot = 0;
    this.slots = Array.from({ length: slotCount }, () => null);
    this.render();
  }

  // item = { id, name, count }
  addItem(itemId, itemName, count = 1) {
    let remaining = count;

    // 1) prova a stackare
    for (let i = 0; i < this.slots.length; i++) {
      const s = this.slots[i];
      if (!s) continue;
      if (s.id !== itemId) continue;
      if (s.count >= this.maxStack) continue;

      const space = this.maxStack - s.count;
      const toAdd = Math.min(space, remaining);
      s.count += toAdd;
      remaining -= toAdd;
      if (remaining <= 0) {
        this.render();
        return true;
      }
    }

    // 2) usa slot vuoti
    for (let i = 0; i < this.slots.length; i++) {
      if (this.slots[i] !== null) continue;
      const toAdd = Math.min(this.maxStack, remaining);
      this.slots[i] = { id: itemId, name: itemName, count: toAdd };
      remaining -= toAdd;
      if (remaining <= 0) {
        this.render();
        return true;
      }
    }

    // pieno
    this.render();
    return false;
  }

  selectSlot(index) {
    if (index < 0 || index >= this.slotCount) return;
    this.selectedSlot = index;
    this.render();
  }

  getSelectedItem() {
    return this.slots[this.selectedSlot];
  }

  render() {
    this.rootEl.innerHTML = "";

    for (let i = 0; i < this.slotCount; i++) {
      const slot = this.slots[i];
      const div = document.createElement("div");
      div.className = "inv-slot" + (i === this.selectedSlot ? " active" : "");

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
      this.rootEl.appendChild(div);
    }
  }
}

const inventory = new Inventory(
  CONFIG.inventory.slots,
  CONFIG.inventory.maxStack,
  inventoryEl
);

// ======================================================
// COLLISIONI MONDO
// ======================================================
const worldColliders = []; // array<Box3>

function addStaticCollider(mesh) {
  mesh.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(mesh);
  worldColliders.push(box);
  return box;
}

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

// terreno
const ground = new THREE.Mesh(
  new THREE.BoxGeometry(40, 1, 40),
  new THREE.MeshStandardMaterial({ color: 0x2d7a2d })
);
ground.position.y = -0.5;
scene.add(ground);
addStaticCollider(ground);

// cubi ambiente
for (let i = 0; i < 16; i++) {
  const b = new THREE.Mesh(
    new THREE.BoxGeometry(1, 1, 1),
    new THREE.MeshStandardMaterial({ color: 0x8888ff })
  );
  b.position.set((Math.random() - 0.5) * 30, 0.5, (Math.random() - 0.5) * 30);
  scene.add(b);
  addStaticCollider(b);
}

// ======================================================
// INTERACTABLE SYSTEM
// ======================================================
class BaseInteractable {
  constructor() {
    if (new.target === BaseInteractable) {
      throw new Error("BaseInteractable è astratta.");
    }
  }

  getRaycastObject() {
    throw new Error("getRaycastObject() non implementato");
  }

  getPrompt() {
    return "Premi E per interagire";
  }

  interact() {}
  update(_delta) {}
}

const interactables = [];
const interactableByObject = new WeakMap();

function registerInteractable(interactable) {
  interactables.push(interactable);
  interactableByObject.set(interactable.getRaycastObject(), interactable);
}

// ======================================================
// CHEST INTERACTABLE
// ======================================================
class ChestInteractable extends BaseInteractable {
  constructor(mesh) {
    super();
    this.mesh = mesh;
    this.opened = false;
  }

  getRaycastObject() {
    return this.mesh;
  }

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

const chestMesh = new THREE.Mesh(
  new THREE.BoxGeometry(1.2, 0.8, 0.8),
  new THREE.MeshStandardMaterial({ color: 0x8b4513 })
);
chestMesh.position.set(2, 0.4, -3);
scene.add(chestMesh);
addStaticCollider(chestMesh);
registerInteractable(new ChestInteractable(chestMesh));

// ======================================================
// DOOR INTERACTABLE
// ======================================================
class DoorInteractable extends BaseInteractable {
  constructor(doorMesh, pivot, colliderMesh, colliderBox) {
    super();
    this.doorMesh = doorMesh;
    this.pivot = pivot;
    this.colliderMesh = colliderMesh;
    this.colliderBox = colliderBox;
    this.currentAngle = 0;
    this.targetAngle = 0;
  }

  getRaycastObject() {
    return this.doorMesh;
  }

  getPrompt() {
    const openTarget = Math.abs(this.targetAngle - CONFIG.door.openAngle) < 0.01;
    return openTarget
      ? "Premi E per chiudere porta"
      : "Premi E per aprire porta";
  }

  interact() {
    const isClosedTarget = Math.abs(this.targetAngle) < 0.01;
    this.targetAngle = isClosedTarget ? CONFIG.door.openAngle : 0;
  }

  update(delta) {
    const t = 1 - Math.exp(-CONFIG.door.animSpeed * delta);
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

const doorPivot = new THREE.Object3D();
doorPivot.position.set(-2, 0, -4);
scene.add(doorPivot);

const doorMesh = new THREE.Mesh(
  new THREE.BoxGeometry(1, 2, 0.15),
  new THREE.MeshStandardMaterial({ color: 0x6b7280 })
);
doorMesh.position.set(0.5, 1, 0);
doorPivot.add(doorMesh);

const doorColliderMesh = new THREE.Mesh(
  new THREE.BoxGeometry(1, 2, 0.25),
  new THREE.MeshBasicMaterial({ transparent: true, opacity: 0 })
);
scene.add(doorColliderMesh);

const doorColliderBox = new THREE.Box3();
worldColliders.push(doorColliderBox);

const doorInteractable = new DoorInteractable(
  doorMesh,
  doorPivot,
  doorColliderMesh,
  doorColliderBox
);
registerInteractable(doorInteractable);
doorInteractable.refreshCollider();

// ======================================================
// PICKUP INTERACTABLE (NUOVO)
// ======================================================
class PickupInteractable extends BaseInteractable {
  constructor(mesh, itemId, itemName, amount = 1) {
    super();
    this.mesh = mesh;
    this.itemId = itemId;
    this.itemName = itemName;
    this.amount = amount;
    this.collected = false;
  }

  getRaycastObject() {
    return this.mesh;
  }

  getPrompt() {
    if (this.collected) return "";
    return `Premi E per raccogliere ${this.itemName}`;
  }

  interact() {
    if (this.collected) return;

    const ok = inventory.addItem(this.itemId, this.itemName, this.amount);
    if (!ok) {
      // inventario pieno
      hint.textContent = "Inventario pieno";
      hint.style.display = "block";
      return;
    }

    // raccolto: rimuovo mesh dalla scena e disabilito
    this.collected = true;
    this.mesh.visible = false;
    this.mesh.parent?.remove(this.mesh);
  }

  update(delta) {
    if (this.collected) return;
    // piccola animazione pickup
    this.mesh.rotation.y += 1.5 * delta;
    this.mesh.position.y += Math.sin(performance.now() * 0.003) * 0.0008;
  }
}

// crea alcuni pickup esempio
function createPickup({ x, y, z, color, itemId, itemName, amount }) {
  const mesh = new THREE.Mesh(
    new THREE.IcosahedronGeometry(0.25, 0),
    new THREE.MeshStandardMaterial({ color })
  );
  mesh.position.set(x, y, z);
  scene.add(mesh);

  registerInteractable(new PickupInteractable(mesh, itemId, itemName, amount));
}

createPickup({ x: 0, y: 0.6, z: -2, color: 0xff4444, itemId: "apple", itemName: "Mela", amount: 1 });
createPickup({ x: 1.5, y: 0.6, z: -1.2, color: 0x44ccff, itemId: "gem", itemName: "Gemma", amount: 1 });
createPickup({ x: -1.2, y: 0.6, z: -2.8, color: 0xffcc33, itemId: "coin", itemName: "Moneta", amount: 5 });

// ======================================================
// FISICA PLAYER
// ======================================================
const velocity = new THREE.Vector3();
const wishDir = new THREE.Vector3();
let isGrounded = false;

function resolveHorizontalCollisions(position) {
  const minY = position.y - CONFIG.player.height;
  const maxY = position.y;

  for (const box of worldColliders) {
    if (box.isEmpty()) continue;
    if (maxY <= box.min.y || minY >= box.max.y) continue;

    const closestX = clamp(position.x, box.min.x, box.max.x);
    const closestZ = clamp(position.z, box.min.z, box.max.z);

    const dx = position.x - closestX;
    const dz = position.z - closestZ;
    const distSq = dx * dx + dz * dz;
    const rSq = CONFIG.player.radius * CONFIG.player.radius;

    if (distSq < rSq) {
      const dist = Math.sqrt(distSq) || 0.0001;
      const push = CONFIG.player.radius - dist;
      position.x += (dx / dist) * push;
      position.z += (dz / dist) * push;
    }
  }
}

function resolveVerticalCollisions(prevY, position) {
  isGrounded = false;

  let footY = position.y - CONFIG.player.height;
  let headY = position.y;

  for (const box of worldColliders) {
    if (box.isEmpty()) continue;

    const closestX = clamp(position.x, box.min.x, box.max.x);
    const closestZ = clamp(position.z, box.min.z, box.max.z);
    const dx = position.x - closestX;
    const dz = position.z - closestZ;
    if (dx * dx + dz * dz > CONFIG.player.radius * CONFIG.player.radius) continue;

    // atterraggio
    if (
      velocity.y <= 0 &&
      footY <= box.max.y &&
      (prevY - CONFIG.player.height) >= box.max.y - 0.001
    ) {
      footY = box.max.y;
      position.y = footY + CONFIG.player.height;
      velocity.y = 0;
      isGrounded = true;
      headY = position.y;
    }

    // soffitto
    if (
      velocity.y > 0 &&
      headY >= box.min.y &&
      prevY <= box.min.y + 0.001
    ) {
      position.y = box.min.y;
      velocity.y = 0;
      footY = position.y - CONFIG.player.height;
      headY = position.y;
    }
  }
}

function updatePlayer(delta) {
  const speed = keys.shift ? CONFIG.player.sprintSpeed : CONFIG.player.walkSpeed;

  wishDir.set(0, 0, 0);
  if (keys.w) wishDir.z -= 1;
  if (keys.s) wishDir.z += 1;
  if (keys.a) wishDir.x -= 1;
  if (keys.d) wishDir.x += 1;
  if (wishDir.lengthSq() > 0) wishDir.normalize();

  const control = isGrounded ? 1.0 : CONFIG.player.airControl;
  const targetVX = wishDir.x * speed;
  const targetVZ = wishDir.z * speed;
  const blend = Math.min(1, CONFIG.player.accel * control * delta);

  velocity.x += (targetVX - velocity.x) * blend;
  velocity.z += (targetVZ - velocity.z) * blend;

  if (keys.space && isGrounded) {
    velocity.y = CONFIG.player.jumpSpeed;
    isGrounded = false;
  }

  velocity.y -= CONFIG.player.gravity * delta;

  const prevY = player.position.y;

  controls.moveRight(velocity.x * delta);
  controls.moveForward(-velocity.z * delta); // W avanti
  resolveHorizontalCollisions(player.position);

  player.position.y += velocity.y * delta;
  resolveVerticalCollisions(prevY, player.position);

  if (player.position.y < -50) {
    player.position.copy(CONFIG.player.spawn);
    velocity.set(0, 0, 0);
  }
}

// ======================================================
// INTERAZIONE
// ======================================================
const raycaster = new THREE.Raycaster();
let currentInteractable = null;
let eConsumed = false;

function updateInteractionTarget() {
  const raycastObjects = [];

  for (const it of interactables) {
    const obj = it.getRaycastObject();
    if (obj && obj.visible) raycastObjects.push(obj);
  }

  raycaster.setFromCamera(new THREE.Vector2(0, 0), camera);
  const hits = raycaster.intersectObjects(raycastObjects, false);

  currentInteractable = null;
  if (hits.length > 0 && hits[0].distance <= CONFIG.interaction.maxDistance) {
    currentInteractable = interactableByObject.get(hits[0].object) ?? null;
  }

  if (controls.isLocked && currentInteractable) {
    const p = currentInteractable.getPrompt();
    if (p && p.length > 0) {
      hint.textContent = p;
      hint.style.display = "block";
    } else {
      hint.style.display = "none";
      hint.textContent = "";
    }
  } else {
    hint.style.display = "none";
    hint.textContent = "";
  }
}

// ======================================================
// LOOP
// ======================================================
const clock = new THREE.Clock();

function animate() {
  const delta = Math.min(clock.getDelta(), 0.05);

  if (controls.isLocked) {
    updatePlayer(delta);

    // update interactables (porta + pickup animati)
    for (const it of interactables) {
      it.update(delta);
    }

    updateInteractionTarget();

    if (keys.e && !eConsumed) {
      if (currentInteractable) {
        currentInteractable.interact();
      }
      eConsumed = true;
    }
    if (!keys.e) eConsumed = false;
  } else {
    hint.style.display = "none";
  }

  renderer.render(scene, camera);
  requestAnimationFrame(animate);
}
animate();

// resize
window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
