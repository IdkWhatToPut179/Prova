import * as THREE from "three";
import { PointerLockControls } from "three/addons/controls/PointerLockControls.js";

// ---------------------------
// SCENA BASE
// ---------------------------
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87ceeb); // cielo

const camera = new THREE.PerspectiveCamera(
  75,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);
camera.position.set(0, 1.7, 5); // altezza occhi

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
document.body.appendChild(renderer.domElement);

// ---------------------------
// LUCI
// ---------------------------
const ambientLight = new THREE.HemisphereLight(0xffffff, 0x444444, 0.8);
scene.add(ambientLight);

const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
dirLight.position.set(5, 10, 2);
scene.add(dirLight);

// ---------------------------
// PIATTAFORMA (terreno)
// ---------------------------
const groundGeo = new THREE.BoxGeometry(40, 1, 40);
const groundMat = new THREE.MeshStandardMaterial({ color: 0x2d7a2d });
const ground = new THREE.Mesh(groundGeo, groundMat);
ground.position.y = -0.5; // top del box a y=0
scene.add(ground);

// Qualche cubo per riferimento visivo
const boxGeo = new THREE.BoxGeometry(1, 1, 1);
const boxMat = new THREE.MeshStandardMaterial({ color: 0x8888ff });
for (let i = 0; i < 20; i++) {
  const b = new THREE.Mesh(boxGeo, boxMat);
  b.position.set(
    (Math.random() - 0.5) * 30,
    0.5,
    (Math.random() - 0.5) * 30
  );
  scene.add(b);
}

// ---------------------------
// CONTROLLI PRIMA PERSONA
// ---------------------------
const controls = new PointerLockControls(camera, document.body);
scene.add(controls.getObject());

const overlay = document.getElementById("overlay");

overlay.addEventListener("click", () => {
  controls.lock();
});

controls.addEventListener("lock", () => {
  overlay.classList.add("hidden");
});

controls.addEventListener("unlock", () => {
  overlay.classList.remove("hidden");
});

// ---------------------------
// INPUT TASTIERA
// ---------------------------
const keys = {
  w: false,
  a: false,
  s: false,
  d: false
};

window.addEventListener("keydown", (e) => {
  if (e.code === "KeyW") keys.w = true;
  if (e.code === "KeyA") keys.a = true;
  if (e.code === "KeyS") keys.s = true;
  if (e.code === "KeyD") keys.d = true;
});

window.addEventListener("keyup", (e) => {
  if (e.code === "KeyW") keys.w = false;
  if (e.code === "KeyA") keys.a = false;
  if (e.code === "KeyS") keys.s = false;
  if (e.code === "KeyD") keys.d = false;
});

// ---------------------------
// MOVIMENTO
// ---------------------------
const velocity = new THREE.Vector3();
const direction = new THREE.Vector3();
const moveSpeed = 6; // metri al secondo

const clock = new THREE.Clock();

function updateMovement(delta) {
  // Smorzamento leggero
  velocity.x *= 0.85;
  velocity.z *= 0.85;

  // Direzione input locale (rispetto a dove guardi)
  direction.set(0, 0, 0);
  if (keys.w) direction.z -= 1;
  if (keys.s) direction.z += 1;
  if (keys.a) direction.x -= 1;
  if (keys.d) direction.x += 1;

  if (direction.lengthSq() > 0) {
    direction.normalize();
    velocity.x += direction.x * moveSpeed * delta * 10;
    velocity.z += direction.z * moveSpeed * delta * 10;
  }

  // Queste funzioni muovono in base all'orientamento della camera:
  // forward = dove stai guardando, right = laterale relativo allo sguardo
  controls.moveRight(velocity.x * delta);
  controls.moveForward(-velocity.z * delta);


  // Mantieni altezza fissa (niente salto/gravità per ora)
  controls.getObject().position.y = 1.7;
}

function animate() {
  const delta = clock.getDelta();

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
