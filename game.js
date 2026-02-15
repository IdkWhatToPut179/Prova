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

// ======================================================
// CONTROLLI
// ======================================================
const controls = new PointerLockControls(camera, document.body);
const player = controls.getObject();
player.position.copy(CONFIG.player.spawn);
scene.add(player);

overlay.addEventListener("click", () => {
  controls.lock();
});

controls.addEventListener("lock", () => {
  overlay.classList.add("hidden");
});

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
// INTERFACE INTERACTABLE (contratto)
// ======================================================

/**
 * Contratto Interactable (informale, stile JS):
 * - getRaycastObject(): THREE.Object3D
 * - getPrompt(): string
 * - interact(): void
 * - update(delta): void (opzionale, default no-op)
 *
 * Per mappare hit -> interactable usiamo WeakMap<Object3D, Interactable>
 */
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

// Registro centralizzato
const interactables = [];
const interactableByObject = new WeakMap();

function registerInteractable(interactable) {
  interactables.push(interactable);
  interactableByObject.set(interactable.getRaycastObject(), interactable);
}

// ======================================================
// INTERACTABLE: CHEST
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

// mesh cassa
const chestMesh = new THREE.Mesh(
  new THREE.BoxGeometry(1.2, 0.8, 0.8),
  new THREE.MeshStandardMaterial({ color: 0x8b4513 })
);
chestMesh.position.set(2, 0.4, -3);
scene.add(chestMesh);
addStaticCollider(chestMesh);
registerInteractable(new ChestInteractable(chestMesh));

// ======================================================
// INTERACTABLE: DOOR
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
    const isOpenTarget = Math.abs(this.targetAngle - CONFIG.door.openAngle) < 0.01;
    return isOpenTarget
      ? "Premi E per chiudere porta"
      : "Premi E per aprire porta";
  }

  interact() {
    // toggle sul target, non sul current (più robusto durante animazione)
    const isClosedTarget = Math.abs(this.targetAngle) < 0.01;
    this.targetAngle = isClosedTarget ? CONFIG.door.openAngle : 0;
  }

  update(delta) {
    // animazione fluida
    const t = 1 - Math.exp(-CONFIG.door.animSpeed * delta);
    this.currentAngle += (this.targetAngle - this.currentAngle) * t;
    this.pivot.rotation.y = this.currentAngle;

    // collider SEMPRE aggiornato alla posa corrente del battente
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

// costruzione porta
const doorPivot = new THREE.Object3D();
doorPivot.position.set(-2, 0, -4);
scene.add(doorPivot);

const doorMesh = new THREE.Mesh(
  new THREE.BoxGeometry(1, 2, 0.15),
  new THREE.MeshStandardMaterial({ color: 0x6b7280 })
);
// cardine laterale
doorMesh.position.set(0.5, 1, 0);
doorPivot.add(doorMesh);

// collider invisibile della porta
const doorColliderMesh = new THREE.Mesh(
  new THREE.BoxGeometry(1, 2, 0.25),
  new THREE.MeshBasicMaterial({ transparent: true, opacity: 0 })
);
scene.add(doorColliderMesh);

// box dinamico porta (entra nel sistema collisioni)
const doorColliderBox = new THREE.Box3();
worldColliders.push(doorColliderBox);

const doorInteractable = new DoorInteractable(
  doorMesh,
  doorPivot,
  doorColliderMesh,
  doorColliderBox
);
registerInteractable(doorInteractable);
// sync iniziale collider
doorInteractable.refreshCollider();

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

    // testa
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
// INTERAZIONE (RAYCAST + E)
// ======================================================
const raycaster = new THREE.Raycaster();
let currentInteractable = null;
let eConsumed = false;

function updateInteractionTarget() {
  // aggiorna prima tutti gli interactable (es. porta animata/collider)
  // Nota: update generale viene già chiamato nel loop principale, qui facciamo solo raycast.

  raycaster.setFromCamera(new THREE.Vector2(0, 0), camera);

  // oggetti raycastabili dal registro
  const raycastObjects = interactables.map((it) => it.getRaycastObject());
  const hits = raycaster.intersectObjects(raycastObjects, false);

  currentInteractable = null;
  if (hits.length > 0 && hits[0].distance <= CONFIG.interaction.maxDistance) {
    currentInteractable = interactableByObject.get(hits[0].object) ?? null;
  }

  if (controls.isLocked && currentInteractable) {
    hint.textContent = currentInteractable.getPrompt();
    hint.style.display = "block";
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

    // update di tutti gli interactable (porta animata qui)
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
