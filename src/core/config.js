import * as THREE from "three";

export const CONFIG = {
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
    hotbarSlots: 5,
    bagSlots: 20,
    maxStack: 99
  },
  droppedItem: {
    gravity: 24.0,
    pickupDelay: 0.25
  }
};
