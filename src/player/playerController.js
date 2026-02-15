import { PointerLockControls } from "three/addons/controls/PointerLockControls.js";
import { clamp } from "../engine/physics.js";

export class PlayerController {
  constructor({ camera, scene, config, colliderStore }) {
    this.config = config;
    this.colliderStore = colliderStore;

    this.controls = new PointerLockControls(camera, document.body);
    this.player = this.controls.getObject();
    this.player.position.copy(config.player.spawn);
    scene.add(this.player);

    this.velocity = { x: 0, y: 0, z: 0 };
    this.isGrounded = false;
  }

  resolveHorizontal() {
    const position = this.player.position;
    const minY = position.y - this.config.player.height;
    const maxY = position.y;

    for (const box of this.colliderStore.worldColliders) {
      if (box.isEmpty()) continue;
      if (maxY <= box.min.y || minY >= box.max.y) continue;

      const closestX = clamp(position.x, box.min.x, box.max.x);
      const closestZ = clamp(position.z, box.min.z, box.max.z);

      const dx = position.x - closestX;
      const dz = position.z - closestZ;
      const distSq = dx * dx + dz * dz;
      const r = this.config.player.radius;
      const rSq = r * r;

      if (distSq < rSq) {
        const dist = Math.sqrt(distSq) || 0.0001;
        const push = r - dist;
        position.x += (dx / dist) * push;
        position.z += (dz / dist) * push;
      }
    }
  }

  resolveVertical(prevY) {
    const position = this.player.position;
    this.isGrounded = false;

    let footY = position.y - this.config.player.height;
    let headY = position.y;

    for (const box of this.colliderStore.worldColliders) {
      if (box.isEmpty()) continue;

      const closestX = clamp(position.x, box.min.x, box.max.x);
      const closestZ = clamp(position.z, box.min.z, box.max.z);
      const dx = position.x - closestX;
      const dz = position.z - closestZ;
      const r = this.config.player.radius;
      if (dx * dx + dz * dz > r * r) continue;

      if (
        this.velocity.y <= 0 &&
        footY <= box.max.y &&
        (prevY - this.config.player.height) >= box.max.y - 0.001
      ) {
        footY = box.max.y;
        position.y = footY + this.config.player.height;
        this.velocity.y = 0;
        this.isGrounded = true;
        headY = position.y;
      }

      if (
        this.velocity.y > 0 &&
        headY >= box.min.y &&
        prevY <= box.min.y + 0.001
      ) {
        position.y = box.min.y;
        this.velocity.y = 0;
        footY = position.y - this.config.player.height;
        headY = position.y;
      }
    }
  }

  update(delta, keys) {
    const speed = keys.shift ? this.config.player.sprintSpeed : this.config.player.walkSpeed;

    let dirX = 0;
    let dirZ = 0;
    if (keys.w) dirZ -= 1;
    if (keys.s) dirZ += 1;
    if (keys.a) dirX -= 1;
    if (keys.d) dirX += 1;

    const len = Math.hypot(dirX, dirZ);
    if (len > 0) {
      dirX /= len;
      dirZ /= len;
    }

    const control = this.isGrounded ? 1.0 : this.config.player.airControl;
    const targetVX = dirX * speed;
    const targetVZ = dirZ * speed;
    const blend = Math.min(1, this.config.player.accel * control * delta);

    this.velocity.x += (targetVX - this.velocity.x) * blend;
    this.velocity.z += (targetVZ - this.velocity.z) * blend;

    if (keys.space && this.isGrounded) {
      this.velocity.y = this.config.player.jumpSpeed;
      this.isGrounded = false;
    }

    this.velocity.y -= this.config.player.gravity * delta;

    const prevY = this.player.position.y;

    this.controls.moveRight(this.velocity.x * delta);
    this.controls.moveForward(-this.velocity.z * delta); // W avanti
    this.resolveHorizontal();

    this.player.position.y += this.velocity.y * delta;
    this.resolveVertical(prevY);

    if (this.player.position.y < -50) {
      this.player.position.copy(this.config.player.spawn);
      this.velocity.x = this.velocity.y = this.velocity.z = 0;
    }
  }
}
