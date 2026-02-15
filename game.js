import * as THREE from "three";
import { PointerLockControls } from "three/addons/controls/PointerLockControls.js";

// ---------------------------
// SCENA BASE
// ---------------------------
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87ceeb);

const camera = new THREE.PerspectiveCamera(
  75,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);

// WebGL
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
document.body.appendChild(renderer.domElement);

// ---------------------------
// LUCI
// ---------------------------
scene.add(new THREE.HemisphereLight(0xffffff, 0x444444, 0.8));
const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
dirLight.position.set(5, 10, 2);
scene.add(dirLight);

// ---------------------------
// WORLD + COLLISIONI
// ---------------------------
// Rappresentiamo il player come capsula verticale semplificata:
// - altezza totale: playerHeight
// - collisione orizzontale: playerRadius
const playerHeight = 1.7;
const playerRadius = 0.35;

// Posizione player (useremo controls.getObject().position)
const playerObject = new THREE.Object3D();
playerObject.position.set(0, playerHeight, 5);
scene.add(playerObject);

// Piattaforma
const worldColliders = []; // array di Box3

const groundGeo = new THREE.BoxGeometry(40, 1, 40);
const groundMat = new THREE.MeshStandardMaterial({ color: 0x2d7a2d });
const ground = new THREE.Mesh(groundGeo, groundMat);
ground.position.y = -0.5; // top a y = 0
scene.add(ground);

// AABB del terreno
ground.updateMatrixWorld(true);
worldColliders.push(new THREE.Box3().setFromObject(ground));

// Cubi ostacolo
const boxGeo = new THREE.BoxGeometry(1, 1, 1);
const boxMat = new THREE.MeshStandardMaterial({ color: 0x8888ff });

for (let i = 0; i < 25; i++) {
  const b = new THREE.Mesh(boxGeo, boxMat);
  b.position.set(
    (Math.random() - 0.5) * 30,
    0.5,
    (Math.random() - 0.5) * 30
  );
  scene.add(b);

  b.updateMatrixWorld(true);
  worldColliders.push(new THREE.Box3().setFromObject(b));
}

// ---------------------------
// CONTROLLI PRIMA PERSONA
// ---------------------------
const controls = new PointerLockControls(camera, document.body);

// In PointerLockControls, l'oggetto che si muove è controls.getObject()
const controlsObject = controls.getObject();
controlsObject.position.copy(playerObject.position);
scene.add(controlsObject);

const overlay = document.getElementById("overlay");

overlay.addEventListener("click", () => controls.lock());
controls.addEventListener("lock", () => overlay.classList.add("hidden"));
controls.addEventListener("unlock", () => overlay.classList.remove("hidden"));

// ---------------------------
// INPUT
// ---------------------------
const keys = {
  w: false,
  a: false,
  s: false,
  d: false,
  shift: false,
  space: false
};

window.addEventListener("keydown", (e) => {
  if (e.code === "KeyW") keys.w = true;
  if (e.code === "KeyA") keys.a = true;
  if (e.code === "KeyS") keys.s = true;
  if (e.code === "KeyD") keys.d = true;
  if (e.code === "ShiftLeft" || e.code === "ShiftRight") keys.shift = true;
  if (e.code === "Space") keys.space = true;
});

window.addEventListener("keyup", (e) => {
  if (e.code === "KeyW") keys.w = false;
  if (e.code === "KeyA") keys.a = false;
  if (e.code === "KeyS") keys.s = false;
  if (e.code === "KeyD") keys.d = false;
  if (e.code === "ShiftLeft" || e.code === "ShiftRight") keys.shift = false;
  if (e.code === "Space") keys.space = false;
});

// ---------------------------
// FISICA MOVIMENTO
// ---------------------------
const velocity = new THREE.Vector3(0, 0, 0);
const direction = new THREE.Vector3();

const walkSpeed = 5.0;
const sprintSpeed = 8.5;
const accel = 30.0;
const airControlFactor = 0.35;

// Gravità e salto (m/s^2 e m/s)
const gravity = 24.0;
const jumpSpeed = 8.8;

let isGrounded = false;

// Utility: clamp
function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

// Controlla se il player (sfera ai piedi + altezza) collide con un Box3
function resolveHorizontalCollisions(position) {
  // Risoluzione semplice su X e Z separati
  for (const box of worldColliders) {
    // Intervallo verticale del player
    const playerMinY = position.y - playerHeight;
    const playerMaxY = position.y;

    // Se non c'è overlap verticale, ignora
    if (playerMaxY <= box.min.y || playerMinY >= box.max.y) continue;

    // Punto player nel piano XZ
    const px = position.x;
    const pz = position.z;

    // Punto più vicino del box al player sul piano XZ
    const closestX = clamp(px, box.min.x, box.max.x);
    const closestZ = clamp(pz, box.min.z, box.max.z);

    const dx = px - closestX;
    const dz = pz - closestZ;
    const distSq = dx * dx + dz * dz;
    const rSq = playerRadius * playerRadius;

    if (distSq < rSq) {
      const dist = Math.sqrt(distSq) || 0.0001;
      const overlap = playerRadius - dist;

      // Spingi fuori in direzione del normale
      const nx = dx / dist;
      const nz = dz / dist;

      position.x += nx * overlap;
      position.z += nz * overlap;
    }
  }
}

function resolveVerticalCollisions(prevY, position) {
  isGrounded = false;

  // partendo dalla y occhi, il "piede" è y - playerHeight
  let footY = position.y - playerHeight;
  let headY = position.y;

  for (const box of worldColliders) {
    // Overlap orizzontale (cilindro approssimato -> cerchio XZ)
    const closestX = clamp(position.x, box.min.x, box.max.x);
    const closestZ = clamp(position.z, box.min.z, box.max.z);
    const dx = position.x - closestX;
    const dz = position.z - closestZ;
    const distSq = dx * dx + dz * dz;
    if (distSq > playerRadius * playerRadius) continue;

    // --- Collisione dal basso verso l'alto (atterraggio) ---
    // piede attraversa top del box
    if (velocity.y <= 0 && footY <= box.max.y && (prevY - playerHeight) >= box.max.y - 0.001) {
      footY = box.max.y;
      position.y = footY + playerHeight;
      velocity.y = 0;
      isGrounded = true;
      headY = position.y;
    }

    // --- Collisione testa contro soffitto ---
    if (velocity.y > 0 && headY >= box.min.y && prevY <= box.min.y + 0.001) {
      position.y = box.min.y;
      velocity.y = 0;
      footY = position.y - playerHeight;
      headY = position.y;
    }
  }
}

function updateMovement(delta) {
  const currentSpeed = keys.shift ? sprintSpeed : walkSpeed;

  // Input locale
  direction.set(0, 0, 0);
  if (keys.w) direction.z -= 1;
  if (keys.s) direction.z += 1;
  if (keys.a) direction.x -= 1;
  if (keys.d) direction.x += 1;
  if (direction.lengthSq() > 0) direction.normalize();

  // Accelerazione orizzontale (a terra più forte, in aria ridotta)
  const control = isGrounded ? 1.0 : airControlFactor;
  const targetVX = direction.x * currentSpeed;
  const targetVZ = direction.z * currentSpeed;

  velocity.x += (targetVX - velocity.x) * Math.min(1, accel * control * delta);
  velocity.z += (targetVZ - velocity.z) * Math.min(1, accel * control * delta);

  // Salto
  if (keys.space && isGrounded) {
    velocity.y = jumpSpeed;
    isGrounded = false;
  }

  // Gravità
  velocity.y -= gravity * delta;

  // Salva y precedente per capire attraversamenti verticali
  const prevY = controlsObject.position.y;

  // Muovi orizzontale in base a dove guardi
  // forward locale: z negativo -> per far andare W avanti usiamo -velocity.z
  controls.moveRight(velocity.x * delta);
  controls.moveForward(-velocity.z * delta);

  // Risolvi collisioni orizzontali
  resolveHorizontalCollisions(controlsObject.position);

  // Muovi verticale
  controlsObject.position.y += velocity.y * delta;

  // Risolvi collisioni verticali (pavimento/soffitto)
  resolveVerticalCollisions(prevY, controlsObject.position);

  // Safety net: se cadi fuori mondo, reset
  if (controlsObject.position.y < -50) {
    controlsObject.position.set(0, playerHeight, 5);
    velocity.set(0, 0, 0);
  }
}

// ---------------------------
// LOOP
// ---------------------------
const clock = new THREE.Clock();

function animate() {
  const delta = Math.min(clock.getDelta(), 0.05); // evita salti enormi di frame

  if (controls.isLocked) {
    updateMovement(delta);
  }

  renderer.render(scene, camera);
  requestAnimationFrame(animate);
}
animate();

// ---------------------------
// RESIZE
// ---------------------------
window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
