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

// Luci
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

// Importante: pointer lock solo su gesto utente
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
// MONDO + COLLISIONI
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

// Terreno
const ground = new THREE.Mesh(
  new THREE.BoxGeometry(40, 1, 40),
  new THREE.MeshStandardMaterial({ color: 0x2d7a2d })
);
ground.position.y = -0.5; // top = 0
scene.add(ground);
addStaticCollider(ground);

// Cubi scenario
for (let i = 0; i < 16; i++) {
  const box = new THREE.Mesh(
    new THREE.BoxGeometry(1, 1, 1),
    new THREE.MeshStandardMaterial({ color: 0x8888ff })
  );
  box.position.set((Math.random() - 0.5) * 30, 0.5, (Math.random() - 0.5) * 30);
  scene.add(box);
  addStaticCollider(box);
}

// ======================================================
// INTERAGIBILI
// ======================================================
const interactables = [];

// Cassa
const chest = new THREE.Mesh(
  new THREE.BoxGeometry(1.2, 0.8, 0.8),
  new THREE.MeshStandardMaterial({ color: 0x8b4513 })
);
chest.position.set(2, 0.4, -3);
chest.userData = {
  type: "chest",
  opened: false,
  labelClosed: "Premi E per aprire cassa",
  labelOpen: "Premi E per chiudere cassa",
  get label() {
    return this.opened ? this.labelOpen : this.labelClosed;
  }
};
scene.add(chest);
interactables.push(chest);
addStaticCollider(chest);

// Porta con pivot
const doorPivot = new THREE.Object3D();
doorPivot.position.set(-2, 0, -4);
scene.add(doorPivot);

const door = new THREE.Mesh(
  new THREE.BoxGeometry(1, 2, 0.15),
  new THREE.MeshStandardMaterial({ color: 0x6b7280 })
);
// cardine laterale sinistro del battente
door.position.set(0.5, 1, 0);
doorPivot.add(door);

door.userData = {
  type: "door",
  opened: false,
  labelClosed: "Premi E per aprire porta",
  labelOpen: "Premi E per chiudere porta",
  get label() {
    return this.opened ? this.labelOpen : this.labelClosed;
  }
};
interactables.push(door);

// Mesh collider porta (invisibile) che segue il battente
const doorColliderMesh = new THREE.Mesh(
  new THREE.BoxGeometry(1, 2, 0.25),
  new THREE.MeshBasicMaterial({ transparent: true, opacity: 0 })
);
scene.add(doorColliderMesh);

// Box collider porta dinamico
const doorColliderBox = new THREE.Box3();
worldColliders.push(doorColliderBox);

// Angoli porta
let doorCurrentAngle = 0;
let doorTargetAngle = 0;

function refreshDoorCollider() {
  // Posizione + rotazione mondiali del battente
  const pos = door.getWorldPosition(new THREE.Vector3());
  const quat = door.getWorldQuaternion(new THREE.Quaternion());

  doorColliderMesh.position.copy(pos);
  doorColliderMesh.quaternion.copy(quat);
  doorColliderMesh.updateMatrixWorld(true);

  doorColliderBox.setFromObject(doorColliderMesh);
}

// Stato iniziale porta
doorPivot.rotation.y = 0;
doorCurrentAngle = 0;
doorTargetAngle = 0;
door.userData.opened = false;
refreshDoorCollider();

// ======================================================
// FISICA PLAYER
// ======================================================
const velocity = new THREE.Vector3();
const wishDir = new THREE.Vector3();
let isGrounded = false;

function resolveHorizontalCollisions(position) {
  const playerMinY = position.y - CONFIG.player.height;
  const playerMaxY = position.y;

  for (const box of worldColliders) {
    if (box.isEmpty()) continue;

    // filtro verticale
    if (playerMaxY <= box.min.y || playerMinY >= box.max.y) continue;

    // nearest point nel piano XZ
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

    // overlap XZ
    const closestX = clamp(position.x, box.min.x, box.max.x);
    const closestZ = clamp(position.z, box.min.z, box.max.z);
    const dx = position.x - closestX;
    const dz = position.z - closestZ;
    if (dx * dx + dz * dz > CONFIG.player.radius * CONFIG.player.radius) continue;

    // Atterraggio su top box
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

    // Testa sotto soffitto
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

function updatePlayerMovement(delta) {
  const speed = keys.shift ? CONFIG.player.sprintSpeed : CONFIG.player.walkSpeed;

  // Input direzionale locale
  wishDir.set(0, 0, 0);
  if (keys.w) wishDir.z -= 1;
  if (keys.s) wishDir.z += 1;
  if (keys.a) wishDir.x -= 1;
  if (keys.d) wishDir.x += 1;
  if (wishDir.lengthSq() > 0) wishDir.normalize();

  // Accelerazione orizzontale
  const control = isGrounded ? 1.0 : CONFIG.player.airControl;
  const targetVX = wishDir.x * speed;
  const targetVZ = wishDir.z * speed;

  const blend = Math.min(1, CONFIG.player.accel * control * delta);
  velocity.x += (targetVX - velocity.x) * blend;
  velocity.z += (targetVZ - velocity.z) * blend;

  // Salto
  if (keys.space && isGrounded) {
    velocity.y = CONFIG.player.jumpSpeed;
    isGrounded = false;
  }

  // Gravità
  velocity.y -= CONFIG.player.gravity * delta;

  // Movimento orizzontale rispetto alla camera
  const prevY = player.position.y;
  controls.moveRight(velocity.x * delta);
  controls.moveForward(-velocity.z * delta); // W = avanti
  resolveHorizontalCollisions(player.position);

  // Movimento verticale + collisioni verticali
  player.position.y += velocity.y * delta;
  resolveVerticalCollisions(prevY, player.position);

  // Respawn safety
  if (player.position.y < -50) {
    player.position.copy(CONFIG.player.spawn);
    velocity.set(0, 0, 0);
  }
}

// ======================================================
// PORTA ANIMAZIONE + COLLIDER
// ======================================================
function updateDoor(delta) {
  const t = 1 - Math.exp(-CONFIG.door.animSpeed * delta);
  doorCurrentAngle += (doorTargetAngle - doorCurrentAngle) * t;
  doorPivot.rotation.y = doorCurrentAngle;

  // Aggiorna collider SEMPRE (anche porta aperta)
  refreshDoorCollider();

  // stato logico
  door.userData.opened = Math.abs(doorCurrentAngle - CONFIG.door.openAngle) < 0.12;
}

// ======================================================
// INTERAZIONE
// ======================================================
const raycaster = new THREE.Raycaster();
let currentTarget = null;
let eConsumed = false;

function updateInteractionTarget() {
  raycaster.setFromCamera(new THREE.Vector2(0, 0), camera);
  const hits = raycaster.intersectObjects(interactables, false);

  currentTarget = null;
  if (hits.length > 0 && hits[0].distance <= CONFIG.interaction.maxDistance) {
    currentTarget = hits[0].object;
  }

  if (controls.isLocked && currentTarget) {
    hint.textContent = currentTarget.userData.label ?? "Premi E per interagire";
    hint.style.display = "block";
  } else {
    hint.style.display = "none";
    hint.textContent = "";
  }
}

function interactWith(target) {
  if (!target || !target.userData) return;

  if (target.userData.type === "chest") {
    target.userData.opened = !target.userData.opened;
    target.material.color.set(target.userData.opened ? 0xd4af37 : 0x8b4513);
    return;
  }

  if (target.userData.type === "door") {
    // toggle in base al target corrente, non allo stato istantaneo
    const currentlyClosedTarget = Math.abs(doorTargetAngle) < 0.01;
    doorTargetAngle = currentlyClosedTarget ? CONFIG.door.openAngle : 0;
  }
}

// ======================================================
// LOOP
// ======================================================
const clock = new THREE.Clock();

function animate() {
  const delta = Math.min(clock.getDelta(), 0.05);

  if (controls.isLocked) {
    updatePlayerMovement(delta);
    updateDoor(delta);
    updateInteractionTarget();

    if (keys.e && !eConsumed) {
      interactWith(currentTarget);
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

// Resize
window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
