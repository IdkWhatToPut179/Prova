import * as THREE from "three";
import { ChestInteractable } from "../interact/chestInteractable.js";
import { DoorInteractable } from "../interact/doorInteractable.js";
import { PickupInteractable } from "../interact/pickupInteractable.js";

export function setupWorld({
  scene,
  colliders,
  interactionSystem,
  inventory,
  config
}) {
  // terreno
  const ground = new THREE.Mesh(
    new THREE.BoxGeometry(40, 1, 40),
    new THREE.MeshStandardMaterial({ color: 0x2d7a2d })
  );
  ground.position.y = -0.5;
  scene.add(ground);
  colliders.addStaticCollider(ground);

  // cubi ambiente
  for (let i = 0; i < 16; i++) {
    const b = new THREE.Mesh(
      new THREE.BoxGeometry(1, 1, 1),
      new THREE.MeshStandardMaterial({ color: 0x8888ff })
    );
    b.position.set((Math.random() - 0.5) * 30, 0.5, (Math.random() - 0.5) * 30);
    scene.add(b);
    colliders.addStaticCollider(b);
  }

  // cassa
  const chestMesh = new THREE.Mesh(
    new THREE.BoxGeometry(1.2, 0.8, 0.8),
    new THREE.MeshStandardMaterial({ color: 0x8b4513 })
  );
  chestMesh.position.set(2, 0.4, -3);
  scene.add(chestMesh);
  colliders.addStaticCollider(chestMesh);
  interactionSystem.register(new ChestInteractable(chestMesh));

  // porta
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
  colliders.addDynamicBox(doorColliderBox);

  const doorInteractable = new DoorInteractable({
    doorMesh,
    pivot: doorPivot,
    colliderMesh: doorColliderMesh,
    colliderBox: doorColliderBox,
    openAngle: config.door.openAngle,
    animSpeed: config.door.animSpeed
  });
  doorInteractable.refreshCollider();
  interactionSystem.register(doorInteractable);

  // pickup iniziali
  function spawnPickup({ x, y, z, color, itemId, itemName, amount }) {
    const mesh = new THREE.Mesh(
      new THREE.IcosahedronGeometry(0.25, 0),
      new THREE.MeshStandardMaterial({ color })
    );
    mesh.position.set(x, y, z);
    scene.add(mesh);

    const pickup = new PickupInteractable({
      mesh,
      itemId,
      itemName,
      amount,
      inventory,
      gravity: config.droppedItem.gravity,
      pickupDelay: config.droppedItem.pickupDelay
    });

    interactionSystem.register(pickup);
  }

  spawnPickup({ x: 0, y: 2.2, z: -2, color: 0xff4444, itemId: "apple", itemName: "Mela", amount: 1 });
  spawnPickup({ x: 1.5, y: 2.2, z: -1.2, color: 0x44ccff, itemId: "gem", itemName: "Gemma", amount: 1 });
  spawnPickup({ x: -1.2, y: 2.2, z: -2.8, color: 0xffcc33, itemId: "coin", itemName: "Moneta", amount: 5 });
}
