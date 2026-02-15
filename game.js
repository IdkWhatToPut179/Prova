import * as THREE from "three";
import { PointerLockControls } from "three/addons/controls/PointerLockControls.js";

// --------------------------------------------------
// SCENA BASE
// --------------------------------------------------
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

// --------------------------------------------------
// UI
// --------------------------------------------------
const overlay = document.getElementById("overlay");
const hint = document.getElementById("hint");

// --------------------------------------------------
// CONTROLLI FPS
// --------------------------------------------------
const controls = new PointerLockControls(camera, document.body);
const controlsObject = controls.getObject();
scene.add(controlsObject);

// Player
const playerHeight = 1.7;
const playerRadius = 0.35;
controlsObject.position.set(0, playerHeight, 5);

// Pointer lock
overlay.addEventListener("click", () => {
  controls.lock();
});

controls.addEventListener("lock", () => {
  overlay.classList.add("hidden");
});

controls.addEventListener("unlock", () => {
  overlay.classList.remove("hidden");
});

// --------------------------------------------------
// INPUT
// --------------------------------------------------
const keys = {
  w: false,
  a: false,
  s: false,
  d: false,
  shift: false,
  space: false,
  e: false
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

// --------------------------------------------------
// MONDO + COLLISIONI
// --------------------------------------------------
const worldColliders = []; // array di THREE.Box3

function addStaticColliderFromMesh(mesh) {
  mesh.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(mesh);
  worldColliders.push(box);
  return box;
}

const ground = new THREE.Mesh(
  new THREE.BoxGeometry(40, 1, 40),
  new THREE.MeshStandardMaterial({ color: 0x2d7a2d })
);
ground.position.y = -0.5;
scene.add(ground);
addStaticColliderFromMesh(ground);

// cubi random
for (let i = 0; i < 16; i++) {
  const box = new THREE.Mesh(
    new THREE.BoxGeometry(1, 1, 1),
    new THREE.MeshStandardMaterial({ color: 0x8888ff })
  );
  box.position.set((Math.random() - 0.5) * 30, 0.5, (Math.random() - 0.5) * 30);
  scene.add(box);
  addStaticColliderFromMesh(box);
}

// --------------------------------------------------
// INTERAGIBILI
// --------------------------------------------------
const interactables = [];

// Cassa
const chest = new THREE.Mesh(
  new THREE.BoxGeometry(1.2, 0.8, 0.8),
  new THREE.MeshStandardMaterial({ color: 0x8b4513 })
);
chest.position.set(2, 0.4, -3);
chest.userData = {
  type: "chest",
  label: "Premi E per aprire/chiudere cassa",
  opened: false
};
scene.add(chest);
interactables.push(chest);
addStaticColliderFromMesh(chest);

// Porta (pivot)
const doorPivot = new THREE.Object3D();
doorPivot.position.set(-2, 0, -4);
scene.add(doorPivot);

const door = new THREE.Mesh(
  new THREE.BoxGeometry(1, 2, 0.15),
  new THREE.MeshStandardMaterial({ color: 0x6b7280 })
);
door.position.set(0.5, 1, 0);
doorPivot.add(door);

door.userData = {
  type: "door",
  label: "Premi E per aprire porta",
  opened: false,
  pivot: doorPivot

};
interactables.push(door);

// Collider dinamico porta
const doorColliderMesh = new THREE.Mesh(
  new THREE.BoxGeometry(1, 2, 0.25),
  new THREE.MeshBasicMaterial({ transparent: true, opacity: 0 })
);
doorColliderMesh.position.set(-1.5, 1, -4);
scene.add(doorColliderMesh);

const doorColliderBox = new THREE.Box3();
worldColliders.push(doorColliderBox);

function refreshDoorCollider() {
  if (door.userData.opened) {
    // collider disattivo
    doorColliderBox.makeEmpty();
  } else {
    // collider attivo (porta chiusa)
    doorColliderMesh.position.set(-1.5, 1, -4);
    doorColliderMesh.rotation.set(0, 0, 0);
    doorColliderMesh.updateMatrixWorld(true);
    doorColliderBox.setFromObject(doorColliderMesh);
  }
}
refreshDoorCollider();

// Animazione porta
let doorCurrentAngle = 0;
let doorTargetAngle = 0;
const doorOpenAngle = -Math.PI / 2;
const doorAnimSpeed = 4.5; // più alto = più veloce


// --------------------------------------------------
// FISICA
// --------------------------------------------------
const velocity = new THREE.Vector3();
const direction = new THREE.Vector3();

const walkSpeed = 5.0;
const sprintSpeed = 8.5;
const accel = 30.0;
const airControlFactor = 0.35;

const gravity = 24.0;
const jumpSpeed = 8.8;

let isGrounded = false;

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

function resolveHorizontalCollisions(position) {
  for (const box of worldColliders) {
    if (box.isEmpty()) continue;

    const playerMinY = position.y - playerHeight;
    const playerMaxY = position.y;
    if (playerMaxY <= box.min.y || playerMinY >= box.max.y) continue;

    const closestX = clamp(position.x, box.min.x, box.max.x);
    const closestZ = clamp(position.z, box.min.z, box.max.z);

    const dx = position.x - closestX;
    const dz = position.z - closestZ;
    const distSq = dx * dx + dz * dz;
    const rSq = playerRadius * playerRadius;

    if (distSq < rSq) {
      const dist = Math.sqrt(distSq) || 0.0001;
      const overlap = playerRadius - dist;
      position.x += (dx / dist) * overlap;
      position.z += (dz / dist) * overlap;
    }
  }
}

function resolveVerticalCollisions(prevY, position) {
  isGrounded = false;

  let footY = position.y - playerHeight;
  let headY = position.y;

  for (const box of worldColliders) {
    if (box.isEmpty()) continue;

    const closestX = clamp(position.x, box.min.x, box.max.x);
    const closestZ = clamp(position.z, box.min.z, box.max.z);
    const dx = position.x - closestX;
    const dz = position.z - closestZ;
    if (dx * dx + dz * dz > playerRadius * playerRadius) continue;

    // atterraggio
    if (
      velocity.y <= 0 &&
      footY <= box.max.y &&
      (prevY - playerHeight) >= box.max.y - 0.001
    ) {
      footY = box.max.y;
      position.y = footY + playerHeight;
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
      footY = position.y - playerHeight;
      headY = position.y;
    }
  }
}

function updateMovement(delta) {
  const currentSpeed = keys.shift ? sprintSpeed : walkSpeed;

  direction.set(0, 0, 0);
  if (keys.w) direction.z -= 1;
  if (keys.s) direction.z += 1;
  if (keys.a) direction.x -= 1;
  if (keys.d) direction.x += 1;
  if (direction.lengthSq() > 0) direction.normalize();

  const control = isGrounded ? 1.0 : airControlFactor;
  const targetVX = direction.x * currentSpeed;
  const targetVZ = direction.z * currentSpeed;

  velocity.x += (targetVX - velocity.x) * Math.min(1, accel * control * delta);
  velocity.z += (targetVZ - velocity.z) * Math.min(1, accel * control * delta);

  if (keys.space && isGrounded) {
    velocity.y = jumpSpeed;
    isGrounded = false;
  }

  velocity.y -= gravity * delta;

  const prevY = controlsObject.position.y;

  // W avanti
  controls.moveRight(velocity.x * delta);
  controls.moveForward(-velocity.z * delta);

  resolveHorizontalCollisions(controlsObject.position);

  controlsObject.position.y += velocity.y * delta;
  resolveVerticalCollisions(prevY, controlsObject.position);

  if (controlsObject.position.y < -50) {
    controlsObject.position.set(0, playerHeight, 5);
    velocity.set(0, 0, 0);
  }
}

// --------------------------------------------------
// INTERAZIONE (raycast dal centro)
// --------------------------------------------------
const raycaster = new THREE.Raycaster();
const maxInteractDistance = 3.0;
let currentTarget = null;
let eConsumed = false;

function updateInteractTarget() {
  raycaster.setFromCamera(new THREE.Vector2(0, 0), camera);
  const hits = raycaster.intersectObjects(interactables, false);

  currentTarget = null;
  if (hits.length > 0 && hits[0].distance <= maxInteractDistance) {
    currentTarget = hits[0].object;
  }

  if (currentTarget && controls.isLocked) {
    hint.style.display = "block";
    hint.textContent = currentTarget.userData.label || "Premi E per interagire";
  } else {
    hint.style.display = "none";
    hint.textContent = "";
  }
}

function interactWithTarget(target) {
  if (!target || !target.userData) return;

  const data = target.userData;

  if (data.type === "chest") {
    data.opened = !data.opened;
    target.material.color.set(data.opened ? 0xd4af37 : 0x8b4513);
  }

  if (data.type === "door") {
  data.opened = !data.opened;
  doorTargetAngle = data.opened ? doorOpenAngle : 0;

  // label dinamica
  data.label = data.opened
    ? "Premi E per chiudere porta"
    : "Premi E per aprire porta";
}

}

// --------------------------------------------------
// LOOP
// --------------------------------------------------
const clock = new THREE.Clock();

function animate() {
  const delta = Math.min(clock.getDelta(), 0.05);

  if (controls.isLocked) {
    updateMovement(delta);
    updateInteractTarget();

    if (keys.e && !eConsumed) {
      interactWithTarget(currentTarget);
      eConsumed = true;
    }
    if (!keys.e) {
      eConsumed = false;
    }
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
