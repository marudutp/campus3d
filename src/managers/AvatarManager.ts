// src/client/managers/AvatarManager.ts
import * as BABYLON from "@babylonjs/core";
import * as GUI from "@babylonjs/gui";
import { ROLES } from "@shared/constants";
import { Vector3, Scalar, AnimationGroup } from "@babylonjs/core";
import { NETWORK_EVENTS } from "@shared/constants";

export interface UserData {
    uid: string;
    displayName: string;
    role: string;
    x?: number;
    z?: number;
    ry?: number;
}

export class AvatarManager {
    // Maps untuk menyimpan data avatar
    private animations: Map<string, Map<string, AnimationGroup>> = new Map();
    private avatars: Map<string, BABYLON.AbstractMesh> = new Map();
    private guiElements: Map<string, GUI.Rectangle> = new Map();
    private loadingAvatars: Set<string> = new Set();

    // Properties untuk local avatar
    public localAvatar: BABYLON.AbstractMesh | null = null;
    public localUserId: string = "";

    // State management
    private currentAnim: string = "";
    private lastServerUpdate: number = 0;
    private lastMovementState: boolean = false;
    private activeAvatarUid: string | null = null;

    // Tracking untuk movement & animation
    private lastKnownPositions: Map<string, BABYLON.Vector3> = new Map();
    private currentAnimNames: Map<string, string> = new Map();
    private lastKnownRotations: Map<string, number> = new Map();
    private movementHistory: Map<string, { positions: BABYLON.Vector3[], timestamps: number[] }> = new Map();
    private lastUpdateTime: Map<string, number> = new Map();

    // Konstanta
    private readonly GROUND_Y = 0.9;
    private readonly MOVEMENT_SPEED = 0.15;
    private readonly ROTATION_SPEED = 0.15;
    private readonly BOUNDARY_LIMIT = 18; // Batas area gerak

    private scene: BABYLON.Scene;
    private uiManager: GUI.AdvancedDynamicTexture;

    constructor(scene: BABYLON.Scene) {
        this.scene = scene;
        this.uiManager = GUI.AdvancedDynamicTexture.CreateFullscreenUI("GlobalUI");
        this.setupVisibilityListener();
        console.log("🎮 AvatarManager initialized");
    }

    // ============================================
    // SETUP & LISTENERS
    // ============================================

    public setLocalUserId(uid: string) {
        this.localUserId = uid;
        console.log(`👤 Local user ID set: ${uid}`);
    }

    private setupVisibilityListener() {
        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'visible' && this.localUserId) {
                console.log(`🟢 Tab aktif: ${this.localUserId}`);
                this.activeAvatarUid = this.localUserId;

                if (this.localAvatar) {
                    this.broadcastActiveState();
                }
            }
        });
    }

    private broadcastActiveState() {
        if (this.localAvatar && this.localUserId) {
            setTimeout(() => {
                // Trigger movement update untuk memberi tahu server
                this.handleAvatarMovement(0, 0, null, null);
            }, 100);
        }
    }

    // ============================================
    // ANIMATION HANDLING
    // ============================================

    private playLocalAnimation(name: string) {
        if (!this.localUserId) return;

        const animMap = this.animations.get(this.localUserId);
        if (!animMap) return;

        const targetKey = name.toLowerCase();
        const anim = animMap.get(targetKey);

        if (!anim || (this.currentAnim === targetKey && anim.isPlaying)) return;

        // Stop all other animations
        animMap.forEach(a => {
            if (a !== anim && a.isPlaying) a.stop();
        });

        anim.start(true);
        this.currentAnim = targetKey;
    }

    private getCurrentAnimName(uid: string): string {
        return this.currentAnimNames.get(uid) || "idle";
    }

    private setCurrentAnimName(uid: string, animName: string) {
        this.currentAnimNames.set(uid, animName);
    }

    // ============================================
    // MOVEMENT HANDLING
    // ============================================

    // /**
    //  * Handle avatar movement dengan dynamic throttle
    //  */
    // public handleAvatarMovement(deltaX: number, deltaZ: number, camera: any, socket: any) {
    //     // Validasi dasar
    //     if (!this.localAvatar || !camera) return;

    //     // Hanya tab aktif yang bisa gerak
    //     if (document.visibilityState !== 'visible') return;

    //     const now = Date.now();
    //     if (!this.lastServerUpdate) this.lastServerUpdate = now;
    //     if (!this.lastMovementState) this.lastMovementState = false;

    //     // Hitung arah gerakan berdasarkan kamera
    //     let forward = camera.getForwardRay().direction;
    //     let moveDir = new BABYLON.Vector3(forward.x, 0, forward.z).normalize();
    //     let rightDir = BABYLON.Vector3.Cross(BABYLON.Vector3.Up(), moveDir).normalize();
    //     const moveVector = moveDir.scale(deltaZ).add(rightDir.scale(-deltaX));

    //     const isMoving = Math.abs(deltaX) > 0.01 || Math.abs(deltaZ) > 0.01;

    //     if (isMoving) {
    //         // Update posisi
    //         this.localAvatar.position.addInPlace(moveVector.scale(this.MOVEMENT_SPEED));
    //         this.applyBoundary();
    //         this.localAvatar.position.y = this.GROUND_Y;

    //         // Update rotasi (face movement direction)
    //         const targetRot = Math.atan2(moveVector.x, moveVector.z);
    //         this.localAvatar.rotation.y = Scalar.LerpAngle(
    //             this.localAvatar.rotation.y,
    //             targetRot,
    //             this.ROTATION_SPEED
    //         );

    //         // Play walk animation
    //         this.playLocalAnimation("walk");

    //         // Dynamic throttle: kirim update saat bergerak (50ms interval = 20 fps)
    //         if (socket && socket.connected && (now - this.lastServerUpdate >= 50)) {
    //             this.sendPositionUpdate(socket);
    //             this.lastServerUpdate = now;
    //             this.lastMovementState = true;
    //         }
    //     } else {
    //         // Tidak bergerak
    //         this.playLocalAnimation("idle");
    //         this.localAvatar.position.y = this.GROUND_Y;

    //         // Dynamic throttle: update lebih jarang saat idle
    //         const justStopped = this.lastMovementState === true;
    //         const throttleTime = justStopped ? 100 : 500;

    //         if (socket && socket.connected && (now - this.lastServerUpdate >= throttleTime)) {
    //             this.sendPositionUpdate(socket);
    //             this.lastServerUpdate = now;
    //             this.lastMovementState = false;
    //         }
    //     }
    // }
    /**
 * Handle avatar movement dengan kontrol yang benar
 */
    // src/client/managers/AvatarManager.ts
    // Perbaiki method handleAvatarMovement

    /**
     * Handle avatar movement dengan kontrol yang benar
     */
    public handleAvatarMovement(deltaX: number, deltaZ: number, camera: any, socket: any) {
        // Validasi
        if (!this.localAvatar) return;
        if (document.visibilityState !== 'visible') return;

        // ============================================
        // KONSTANTA YANG SUDAH DIKALIBRASI
        // ============================================
        const SPEED = 0.08;  // Kecepatan yang lebih lambat dan terkontrol
        const ROTATION_SPEED = 0.15;

        // ============================================
        // HITUNG PERGERAKAN DENGAN NORMALISASI
        // ============================================
        let moveX = 0;
        let moveZ = 0;

        // Mapping input ke arah gerakan yang benar
        // W (deltaZ positif) = maju = Z negatif
        // W = maju
        if (deltaZ > 0) moveZ = SPEED;

        // S = mundur
        if (deltaZ < 0) moveZ = -SPEED;

        // A = kiri
        if (deltaX < 0) moveX = -SPEED;

        // D = kanan
        if (deltaX > 0) moveX = SPEED;

        // Normalisasi untuk gerakan diagonal (biar kecepatan tetap konsisten)
        if (moveX !== 0 && moveZ !== 0) {
            const factor = SPEED / Math.sqrt(moveX * moveX + moveZ * moveZ);
            moveX *= factor;
            moveZ *= factor;
        }

        const isMoving = moveX !== 0 || moveZ !== 0;

        if (isMoving) {
            // Update posisi
            this.localAvatar.position.x += moveX;
            this.localAvatar.position.z += moveZ;

            // Batasi area
            this.applyBoundary();

            // Pastikan di ground
            this.localAvatar.position.y = this.GROUND_Y;

            // Update rotasi berdasarkan arah gerakan
            if (moveX !== 0 || moveZ !== 0) {
                const targetRot = Math.atan2(moveX, -moveZ);
                // Smooth rotation
                this.localAvatar.rotation.y = BABYLON.Scalar.LerpAngle(
                    this.localAvatar.rotation.y,
                    targetRot,
                    ROTATION_SPEED
                );
            }

            // Play animation
            this.playLocalAnimation("walk");

            // Kirim update ke server (throttle)
            const now = Date.now();
            if (socket && socket.connected && (now - this.lastServerUpdate >= 50)) {
                this.sendPositionUpdate(socket);
                this.lastServerUpdate = now;
            }

            // Debug (optional)
            if (Math.random() < 0.1) {
                console.log(`🚶 Move: (${moveX.toFixed(3)}, ${moveZ.toFixed(3)}) | Pos: (${this.localAvatar.position.x.toFixed(2)}, ${this.localAvatar.position.z.toFixed(2)})`);
            }

        } else {
            // Idle
            this.playLocalAnimation("idle");
            this.localAvatar.position.y = this.GROUND_Y;

            // Update posisi idle ke server (lebih jarang)
            const now = Date.now();
            if (socket && socket.connected && (now - this.lastServerUpdate >= 1000)) {
                this.sendPositionUpdate(socket);
                this.lastServerUpdate = now;
            }
        }
        // if (isMoving) {
        //     // Update posisi
        //     this.localAvatar.position.x += moveX * speed;
        //     this.localAvatar.position.z += moveZ * speed;

        //     // Batasi posisi
        //     this.applyBoundary();

        //     // Pastikan avatar tetap di ground
        //     this.localAvatar.position.y = this.GROUND_Y;

        //     // Update rotasi: avatar menghadap arah gerakan
        //     if (moveX !== 0 || moveZ !== 0) {
        //         const targetRot = Math.atan2(moveX, moveZ);
        //         this.localAvatar.rotation.y = BABYLON.Scalar.LerpAngle(
        //             this.localAvatar.rotation.y,
        //             targetRot,
        //             rotationSpeed
        //         );
        //     }

        //     // Play walk animation
        //     this.playLocalAnimation("walk");

        //     // Debug
        //     if (Math.random() < 0.05) { // Log occasionally to avoid spam
        //         console.log(`🚶 Moving: (${moveX.toFixed(2)}, ${moveZ.toFixed(2)}) - Pos: (${this.localAvatar.position.x.toFixed(2)}, ${this.localAvatar.position.z.toFixed(2)})`);
        //     }

        //     // Kirim update ke server (throttle)
        //     if (socket && socket.connected && (now - this.lastServerUpdate >= 50)) {
        //         this.sendPositionUpdate(socket);
        //         this.lastServerUpdate = now;
        //         this.lastMovementState = true;
        //     }
        // } else {
        //     // Idle state
        //     this.playLocalAnimation("idle");
        //     this.localAvatar.position.y = this.GROUND_Y;

        //     // Update ke server saat idle (lebih jarang)
        //     const justStopped = this.lastMovementState === true;
        //     const throttleTime = justStopped ? 100 : 500;

        //     if (socket && socket.connected && (now - this.lastServerUpdate >= throttleTime)) {
        //         this.sendPositionUpdate(socket);
        //         this.lastServerUpdate = now;
        //         this.lastMovementState = false;
        //     }
        // }

    }

    // private applyBoundary() {
    //     if (!this.localAvatar) return;

    //     // Batasi area gerak
    //     if (Math.abs(this.localAvatar.position.x) > this.BOUNDARY_LIMIT) {
    //         this.localAvatar.position.x = Math.sign(this.localAvatar.position.x) * this.BOUNDARY_LIMIT;
    //     }
    //     if (Math.abs(this.localAvatar.position.z) > this.BOUNDARY_LIMIT) {
    //         this.localAvatar.position.z = Math.sign(this.localAvatar.position.z) * this.BOUNDARY_LIMIT;
    //     }
    // }

    // src/client/managers/AvatarManager.ts
    // Tambahkan method ini

    // private applyBoundary() {
    //     if (!this.localAvatar) return;

    //     // Batasi area gerak (sesuaikan dengan ukuran scene)
    //     const BOUNDARY = 14; // Area gerak dari -14 sampai 14

    //     if (Math.abs(this.localAvatar.position.x) > BOUNDARY) {
    //         this.localAvatar.position.x = Math.sign(this.localAvatar.position.x) * BOUNDARY;
    //     }
    //     if (Math.abs(this.localAvatar.position.z) > BOUNDARY) {
    //         this.localAvatar.position.z = Math.sign(this.localAvatar.position.z) * BOUNDARY;
    //     }
    // }

    // src/client/managers/AvatarManager.ts
    // src/client/managers/AvatarManager.ts
    private applyBoundary() {
        if (!this.localAvatar) return;

        // Batas area gerak (sesuaikan dengan scene Anda)
        const MIN_X = -12;
        const MAX_X = 12;
        const MIN_Z = -12;
        const MAX_Z = 12;

        if (this.localAvatar.position.x > MAX_X) this.localAvatar.position.x = MAX_X;
        if (this.localAvatar.position.x < MIN_X) this.localAvatar.position.x = MIN_X;
        if (this.localAvatar.position.z > MAX_Z) this.localAvatar.position.z = MAX_Z;
        if (this.localAvatar.position.z < MIN_Z) this.localAvatar.position.z = MIN_Z;
    }

    private sendPositionUpdate(socket: any) {
        if (!socket || !socket.connected) return;
        if (!this.localAvatar) return;

        // Validasi posisi
        const posX = isFinite(this.localAvatar.position.x) ? this.localAvatar.position.x : 0;
        const posY = isFinite(this.localAvatar.position.y) ? this.localAvatar.position.y : this.GROUND_Y;
        const posZ = isFinite(this.localAvatar.position.z) ? this.localAvatar.position.z : 0;
        const rotY = isFinite(this.localAvatar.rotation.y) ? this.localAvatar.rotation.y : 0;

        socket.emit(NETWORK_EVENTS.AVATAR_UPDATE, {
            uid: this.localUserId,
            position: { x: posX, y: posY, z: posZ },
            rotation: { y: rotY }
        });
    }

    // ============================================
    // AVATAR CREATION
    // ============================================

    /**
     * Create avatar untuk user (local atau remote)
     */
    public createAvatar(user: UserData): BABYLON.AbstractMesh {
        // Cek apakah avatar sudah ada atau sedang loading
        if (this.avatars.has(user.uid) || this.loadingAvatars.has(user.uid)) {
            return this.avatars.get(user.uid) || this.scene.getMeshByName("ctrl-" + user.uid)!;
        }

        this.loadingAvatars.add(user.uid);

        // const fileName = user.role === ROLES.TEACHER ? "final_yeti.glb" : "final_frog.glb";
const fileName = user.role === ROLES.TEACHER ? "kumisMixamo.glb" : "muridSiKumis.glb";
        // Create temporary dummy
        const dummy = BABYLON.MeshBuilder.CreateBox("temp_" + user.uid, { size: 0.1 }, this.scene);
        dummy.isVisible = false;

        // Load model
        BABYLON.SceneLoader.ImportMeshAsync("", "/assets/avatar/", fileName, this.scene).then((result) => {
            const root = result.meshes[0];

            // Create controller capsule
            const controller = BABYLON.MeshBuilder.CreateCapsule("ctrl-" + user.uid, {
                height: 1.8,
                radius: 0.4
            }, this.scene);
            controller.isVisible = false;
            controller.checkCollisions = false;

            // Set initial position
            const startX = user.x !== undefined ? user.x : (Math.random() * 8 - 4);
            const startZ = user.z !== undefined ? user.z : (Math.random() * 8 - 4);
            const startRY = user.ry !== undefined ? user.ry : 0;

            controller.position.set(startX, this.GROUND_Y, startZ);
            controller.rotation.y = startRY;

            // Attach model to controller
            root.parent = controller;
            root.position.y = -0.9;
            root.scaling = new BABYLON.Vector3(1, 1, 1);

            // Store animations
            const animMap = new Map<string, AnimationGroup>();
            result.animationGroups.forEach(anim => {
                anim.stop();
                anim.enableBlending = true;
                animMap.set(anim.name.toLowerCase(), anim);
            });

            this.animations.set(user.uid, animMap);
            this.avatars.set(user.uid, controller);
            this.addNameTag(controller, user.uid, user.displayName);
            this.loadingAvatars.delete(user.uid);

            // Handle local avatar
            if (user.uid === this.localUserId) {
                this.localAvatar = controller;
                this.activeAvatarUid = user.uid;
                this.playLocalAnimation("idle");
                console.log("🌟 Local avatar ready at:", controller.position.toString());
                this.broadcastActiveState();
            } else {
                // Remote avatar - start idle animation
                setTimeout(() => {
                    const animMap = this.animations.get(user.uid);
                    if (animMap) {
                        const idleAnim = animMap.get("idle");
                        if (idleAnim) {
                            animMap.forEach(anim => {
                                if (anim !== idleAnim && anim.isPlaying) anim.stop();
                            });
                            idleAnim.start(true);
                            this.setCurrentAnimName(user.uid, "idle");
                        }
                    }
                }, 100);
            }

            dummy.dispose();
        }).catch(err => {
            console.error(`❌ Failed to load avatar for ${user.uid}:`, err);
            this.loadingAvatars.delete(user.uid);
            dummy.dispose();
        });

        return dummy;
    }

    // ============================================
    // AVATAR UPDATE (Remote)
    // ============================================

    /**
     * Update avatar remote (dari network)
     */
    public updateAvatar(uid: string, data: any) {
        // Jangan update avatar lokal
        if (uid === this.localUserId) return;

        const avatar = this.avatars.get(uid);
        if (!avatar || !data) return;

        const targetPos = new BABYLON.Vector3(data.x, this.GROUND_Y, data.z);
        const targetRot = data.ry !== undefined ? data.ry : avatar.rotation.y;

        // Deteksi pergerakan
        let isReallyMoving = false;
        let averageSpeed = 0;

        // Track movement history
        let history = this.movementHistory.get(uid);
        if (!history) {
            history = { positions: [], timestamps: [] };
            this.movementHistory.set(uid, history);
        }

        const now = Date.now();
        history.positions.push(targetPos.clone());
        history.timestamps.push(now);

        // Keep only last 5 positions
        if (history.positions.length > 5) {
            history.positions.shift();
            history.timestamps.shift();
        }

        // Calculate average speed
        if (history.positions.length >= 2) {
            let totalDistance = 0;
            let totalTime = 0;

            for (let i = 1; i < history.positions.length; i++) {
                const dist = BABYLON.Vector3.Distance(history.positions[i - 1], history.positions[i]);
                const timeDiff = (history.timestamps[i] - history.timestamps[i - 1]) / 1000;
                totalDistance += dist;
                totalTime += timeDiff;
            }

            averageSpeed = totalTime > 0 ? totalDistance / totalTime : 0;
            isReallyMoving = averageSpeed > 0.3;
        }

        // Update position with lerp
        const currentPos = avatar.position.clone();
        const distanceToTarget = BABYLON.Vector3.Distance(currentPos, targetPos);

        if (isReallyMoving) {
            const lerpFactor = Math.min(0.4, distanceToTarget * 0.1);
            avatar.position = BABYLON.Vector3.Lerp(currentPos, targetPos, lerpFactor);
        } else {
            avatar.position = targetPos;
        }

        // Update rotation
        const rotDiff = Math.abs(avatar.rotation.y - targetRot);
        const isRotating = rotDiff > 0.05;

        if (isRotating && isReallyMoving) {
            avatar.rotation.y = Scalar.LerpAngle(avatar.rotation.y, targetRot, 0.3);
        } else if (isRotating && !isReallyMoving) {
            avatar.rotation.y = Scalar.LerpAngle(avatar.rotation.y, targetRot, 0.5);
        } else if (!isRotating) {
            avatar.rotation.y = targetRot;
        }

        // Update animation
        const animMap = this.animations.get(uid);
        if (animMap) {
            let currentAnim = this.getCurrentAnimName(uid);
            let targetAnimName = isReallyMoving ? "walk" : "idle";

            if (targetAnimName !== currentAnim) {
                const targetKey = Array.from(animMap.keys()).find(key =>
                    key.toLowerCase().includes(targetAnimName) ||
                    targetAnimName.includes(key.toLowerCase())
                );

                if (targetKey) {
                    const targetAnim = animMap.get(targetKey);
                    if (targetAnim) {
                        animMap.forEach((anim, key) => {
                            if (anim !== targetAnim && anim.isPlaying) anim.stop();
                        });
                        targetAnim.start(true, 1.0, 1.0, 0);
                        this.setCurrentAnimName(uid, targetAnimName);
                    }
                }
            }
        }

        // Store for reference
        this.lastKnownPositions.set(uid, targetPos.clone());
        this.lastKnownRotations.set(uid, targetRot);
        this.lastUpdateTime.set(uid, now);
    }

    // ============================================
    // AVATAR REMOVAL
    // ============================================

    /**
     * Remove avatar dari scene
     */
    public removeAvatar(uid: string) {
        // Hapus mesh avatar
        const avatar = this.avatars.get(uid);
        if (avatar) {
            avatar.dispose();
        }

        // Hapus GUI element
        const guiElement = this.guiElements.get(uid);
        if (guiElement) {
            guiElement.dispose();
        }

        // Hapus semua data tracking
        this.avatars.delete(uid);
        this.guiElements.delete(uid);
        this.animations.delete(uid);
        this.lastKnownPositions.delete(uid);
        this.lastKnownRotations.delete(uid);
        this.currentAnimNames.delete(uid);
        this.movementHistory.delete(uid);
        this.lastUpdateTime.delete(uid);
        this.loadingAvatars.delete(uid);

        console.log(`🗑️ Avatar removed: ${uid}`);
    }

    // ============================================
    // UI ELEMENTS
    // ============================================

    private addNameTag(parent: BABYLON.AbstractMesh, uid: string, name: string) {
        const rect = new GUI.Rectangle();
        rect.width = "160px";
        rect.height = "40px";
        rect.cornerRadius = 8;
        rect.color = "white";
        rect.background = "rgba(0,0,0,0.6)";
        rect.thickness = 1;
        this.uiManager.addControl(rect);

        const label = new GUI.TextBlock();
        label.text = name;
        label.fontSize = 14;
        label.color = "white";
        label.fontWeight = "bold";
        rect.addControl(label);

        rect.linkWithMesh(parent);
        rect.linkOffsetY = -110;

        this.guiElements.set(uid, rect);
    }

    // ============================================
    // UTILITY FUNCTIONS
    // ============================================

    /**
     * Get avatar by UID
     */
    public getAvatar(uid: string): BABYLON.AbstractMesh | undefined {
        return this.avatars.get(uid);
    }

    /**
     * Get all avatars
     */
    public getAllAvatars(): Map<string, BABYLON.AbstractMesh> {
        return this.avatars;
    }

    /**
     * Check if avatar exists
     */
    public hasAvatar(uid: string): boolean {
        return this.avatars.has(uid);
    }

    /**
     * Set local avatar position (for initial spawn)
     */
    public setLocalPosition(x: number, z: number) {
        if (this.localAvatar) {
            this.localAvatar.position.set(x, this.GROUND_Y, z);
        }
    }

    /**
     * Get ground Y position
     */
    public getGroundY(): number {
        return this.GROUND_Y;
    }
}