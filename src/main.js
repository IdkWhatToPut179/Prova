import { CONFIG } from "./core/config.js";
import { gameState } from "./core/gameState.js";
import { Input } from "./core/input.js";

import { createScene } from "./engine/scene.js";
import { ColliderStore } from "./engine/colliders.js";

import { getDom } from "./ui/dom.js";
import { showOverlay, hideOverlay } from "./ui/overlayUI.js";
import { showHint, hideHint } from "./ui/hintUI.js";

import { Inventory } from "./inventory/inventory.js";
import { dropSelectedItem } from "./inventory/dropSystem.js";

import { InteractionSystem } from "./interact/interactionSystem.js";
import { setupWorld } from "./world/worldSetup.js";
import { PlayerController } from "./player/playerController.js";

// DOM
const dom = getDom();

// Scene
const { scene, camera, renderer } = createScene();
const colliders = new ColliderStore();

// Hint API
const hintApi = {
  show: (t) => showHint(dom.hint, t),
  hide: () => hideHint(dom.hint)
};

// Inventory
const inventory = new Inventory({
  hotbarSlots: CONFIG.inventory.hotbarSlots,
  bagSlots: CONFIG.inventory.bagSlots,
  maxStack: CONFIG.inventory.maxStack,
  dom,
  hintApi
});

// Interaction
const interactionSystem = new InteractionSystem({
  camera,
  maxDistance: CONFIG.interaction.maxDistance,
  hintApi
});

// Player
const playerController = new PlayerController({
  camera,
  scene,
  config: CONFIG,
  colliderStore: colliders
});

// Overlay + pointer lock
dom.overlay.addEventListener("click", () => {
  playerController.controls.lock();
});

playerController.controls.addEventListener("lock", () => {
  hideOverlay(dom.overlay);
  if (gameState.inventoryOpen) toggleInventory(false);
});

playerController.controls.addEventListener("unlock", () => {
  if (!gameState.inventoryOpen) showOverlay(dom.overlay);
  hideHint(dom.hint);
});

// World setup
setupWorld({
  scene,
  colliders,
  interactionSystem,
  inventory,
  config: CONFIG
});

// Input
const input = new Input();
input.onToggleInventory = () => toggleInventory(!gameState.inventoryOpen);
input.onSelectHotbar = (idx) => inventory.selectHotbar(idx);
input.init(() => gameState.inventoryOpen);

function toggleInventory(open) {
  gameState.inventoryOpen = open;

  if (open) {
    dom.inventoryPanel.classList.remove("hidden");
    hideOverlay(dom.overlay);
    playerController.controls.unlock();
    inventory.renderAll(true);
  } else {
    dom.inventoryPanel.classList.add("hidden");
    if (!playerController.controls.isLocked) showOverlay(dom.overlay);
    inventory.heldStack = null;
    inventory.renderAll(false);
    hideHint(dom.hint);
  }
}

let eConsumed = false;
let qConsumed = false;

function animate() {
  const delta = Math.min(0.05, clock.getDelta());

  const canRunGameplay = !gameState.inventoryOpen && playerController.controls.isLocked;

  interactionSystem.update(delta, canRunGameplay);

  if (canRunGameplay) {
    playerController.update(delta, input.keys);

    if (input.keys.e && !eConsumed) {
      interactionSystem.interactCurrent();
      eConsumed = true;
    }
    if (!input.keys.e) eConsumed = false;

    if (input.keys.q && !qConsumed) {
      const ok = dropSelectedItem({
        inventory,
        camera,
        player: playerController.player,
        scene,
        registerInteractable: (it) => interactionSystem.register(it),
        pickupConfig: CONFIG.droppedItem
      });
      if (!ok) hintApi.show("Nessun oggetto nello slot selezionato");
      qConsumed = true;
    }
    if (!input.keys.q) qConsumed = false;
  }

  renderer.render(scene, camera);
  requestAnimationFrame(animate);
}

const clock = { last: performance.now(), getDelta() {
  const now = performance.now();
  const d = (now - this.last) / 1000;
  this.last = now;
  return d;
}};

window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

animate();
