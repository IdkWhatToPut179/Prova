import * as THREE from "three";
import { PickupInteractable } from "../interact/pickupInteractable.js";

export function dropSelectedItem({
  inventory,
  camera,
  player,
  scene,
  registerInteractable,
  pickupConfig
}) {
  const dropped = inventory.removeOneFromSelected();
  if (!dropped) return false;

  const forward = new THREE.Vector3();
  camera.getWorldDirection(forward);

  const spawn = player.position.clone().add(forward.multiplyScalar(1.2));
  spawn.y = Math.max(spawn.y - 0.7, 1.0);

  const colorMap = {
    apple: 0xff4444,
    gem: 0x44ccff,
    coin: 0xffcc33
  };
  const color = colorMap[dropped.id] ?? 0xffffff;

  const mesh = new THREE.Mesh(
    new THREE.IcosahedronGeometry(0.25, 0),
    new THREE.MeshStandardMaterial({ color })
  );
  mesh.position.copy(spawn);
  scene.add(mesh);

  const pickup = new PickupInteractable({
    mesh,
    itemId: dropped.id,
    itemName: dropped.name,
    amount: 1,
    inventory,
    gravity: pickupConfig.gravity,
    pickupDelay: pickupConfig.pickupDelay
  });
  pickup.velY = 3.5;

  registerInteractable(pickup);
  return true;
}
