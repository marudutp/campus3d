// src/client/managers/WhiteboardManager.ts
import * as BABYLON from "@babylonjs/core";
import { ROLES } from "@shared/constants";

export class WhiteboardManager {
    private scene: BABYLON.Scene;
    private texture: BABYLON.DynamicTexture;
    private context: CanvasRenderingContext2D;
    private mesh: BABYLON.AbstractMesh;
    private network: any;
    private isDrawing = false;
    private lastX: number | null = null;
    private lastY: number | null = null;
    private currentColor: string = "black";
    private currentSize: number = 8;
    private role: string;

    // Untuk tracking state whiteboard
    private isWhiteboardVisible: boolean = true;
    private whiteboardMaterial: BABYLON.StandardMaterial;

    constructor(scene: BABYLON.Scene, network: any, role: string) {
        this.scene = scene;
        this.network = network;
        this.role = role;

        console.log("📝 Initializing WhiteboardManager...");

        // 1. Buat whiteboard mesh (box tipis)
        this.mesh = BABYLON.MeshBuilder.CreateBox("whiteboard", {
            width: 16,
            height: 9,
            depth: 0.1
        }, this.scene);

        // 2. Posisikan whiteboard
        this.mesh.position = new BABYLON.Vector3(0, 5, -14.5);
        this.mesh.rotation.y = 0;

        // 3. Setup untuk interaksi
        this.mesh.renderingGroupId = 1;
        this.mesh.isPickable = true;
        this.mesh.checkCollisions = false;

        // 4. Setup texture
        this.texture = new BABYLON.DynamicTexture("wb-tex", {
            width: 2048,
            height: 1024
        }, this.scene);
        this.context = this.texture.getContext() as CanvasRenderingContext2D;

        // 5. Inisialisasi background putih
        this.clearBoard(false);

        // 6. Setup material
        this.whiteboardMaterial = new BABYLON.StandardMaterial("wb-mat", this.scene);
        this.whiteboardMaterial.diffuseTexture = this.texture;
        this.whiteboardMaterial.emissiveColor = new BABYLON.Color3(1, 1, 1);
        this.whiteboardMaterial.specularColor = new BABYLON.Color3(0, 0, 0);
        this.mesh.material = this.whiteboardMaterial;

        console.log("✅ Whiteboard created at position:", this.mesh.position);

        // 7. Setup drawing hanya untuk GURU
        if (role === ROLES.TEACHER) {
            this.setupDrawing();
            console.log("✏️ Drawing mode enabled for TEACHER");
        } else {
            console.log("👀 Student mode - drawing disabled");
        }
    }

    // ============================================
    // SETUP DRAWING (Hanya untuk Guru)
    // ============================================
    private setupDrawing() {
        this.scene.onPointerObservable.add((pointerInfo) => {
            // POINTER DOWN - Mulai menggambar
            if (pointerInfo.type === BABYLON.PointerEventTypes.POINTERDOWN) {
                const pick = this.scene.pick(
                    this.scene.pointerX,
                    this.scene.pointerY
                );

                if (pick?.hit && pick.pickedMesh === this.mesh) {
                    this.isDrawing = true;

                    // Detach camera control saat menggambar
                    if (this.scene.activeCamera) {
                        const canvas = this.scene.getEngine().getRenderingCanvas();
                        this.scene.activeCamera.detachControl(canvas);
                    }

                    const uv = pick.getTextureCoordinates();
                    if (uv) {
                        this.lastX = uv.x * 2048;
                        this.lastY = (1 - uv.y) * 1024;
                        console.log(`✏️ Drawing started at (${this.lastX}, ${this.lastY})`);
                    }
                }
            }

            // POINTER MOVE - Menggambar
            if (pointerInfo.type === BABYLON.PointerEventTypes.POINTERMOVE && this.isDrawing) {
                const pick = this.scene.pick(
                    this.scene.pointerX,
                    this.scene.pointerY
                );

                if (!pick?.hit || pick.pickedMesh !== this.mesh) return;

                const uv = pick.getTextureCoordinates();
                if (!uv) return;

                const currentX = uv.x * 2048;
                const currentY = (1 - uv.y) * 1024;

                if (this.lastX !== null && this.lastY !== null) {
                    // Gambar garis dari last position ke current position
                    this.drawLocally(
                        this.lastX, this.lastY,
                        currentX, currentY,
                        this.currentColor,
                        this.currentSize
                    );

                    // Kirim ke semua client via movement server
                    if (this.network && this.network.movementSocket) {
                        this.network.sendDrawData({
                            x1: this.lastX, y1: this.lastY,
                            x2: currentX, y2: currentY,
                            color: this.currentColor,
                            size: this.currentSize
                        });
                    }
                }

                this.lastX = currentX;
                this.lastY = currentY;
            }

            // POINTER UP - Berhenti menggambar
            if (pointerInfo.type === BABYLON.PointerEventTypes.POINTERUP) {
                if (this.isDrawing) {
                    this.isDrawing = false;
                    this.lastX = null;
                    this.lastY = null;

                    // Re-attach camera control
                    if (this.scene.activeCamera) {
                        const canvas = this.scene.getEngine().getRenderingCanvas();
                        this.scene.activeCamera.attachControl(canvas, true);
                    }
                    console.log("✏️ Drawing stopped");
                }
            }
        });
    }

    public getNetwork() {
        return this.network;
    }
    // ============================================
    // DRAW FUNCTIONS
    // ============================================

    /**
     * Gambar garis dari titik (x1,y1) ke (x2,y2)
     */
    public drawLocally(x1: number, y1: number, x2: number, y2: number, color: string, size: number) {
        if (!this.context) return;

        // Pastikan koordinat dalam batas texture
        x1 = Math.max(0, Math.min(2048, x1));
        y1 = Math.max(0, Math.min(1024, y1));
        x2 = Math.max(0, Math.min(2048, x2));
        y2 = Math.max(0, Math.min(1024, y2));

        this.context.strokeStyle = color;
        this.context.lineWidth = size;
        this.context.lineCap = "round";
        this.context.lineJoin = "round";

        this.context.beginPath();
        this.context.moveTo(x1, y1);
        this.context.lineTo(x2, y2);
        this.context.stroke();

        this.texture.update();
    }

    /**
     * Gambar titik (untuk single point)
     */
    public drawPoint(x: number, y: number, color: string, shouldBroadcast: boolean = false) {
        if (!this.context) return;

        x = Math.max(0, Math.min(2048, x));
        y = Math.max(0, Math.min(1024, y));

        this.context.fillStyle = color;
        this.context.fillRect(x - 2, y - 2, 5, 5);
        this.texture.update();

        if (shouldBroadcast && this.network && this.network.movementSocket) {
            this.network.sendDrawData({ x, y, color });
        }
    }

    /**
     * Clear seluruh whiteboard
     */
    public clearBoard(shouldBroadcast: boolean = true) {
        if (!this.context) return;

        this.context.fillStyle = "white";
        this.context.fillRect(0, 0, 2048, 1024);

        // Tambahkan garis tepi tipis
        this.context.strokeStyle = "#cccccc";
        this.context.lineWidth = 2;
        this.context.strokeRect(0, 0, 2048, 1024);

        this.texture.update();

        if (shouldBroadcast && this.network && this.network.movementSocket) {
            this.network.sendClearBoard();
        }

        console.log("🧹 Whiteboard cleared");
    }

    /**
     * Set warna spidol
     */
    public setSpidolColor(color: string) {
        this.currentColor = color;
        console.log("🎨 Pen color changed to:", this.currentColor);
    }

    /**
     * Set ukuran spidol
     */
    public setPenSize(size: number) {
        this.currentSize = Math.max(1, Math.min(20, size));
        console.log("✏️ Pen size changed to:", this.currentSize);
    }

    // ============================================
    // SLIDE MANAGEMENT
    // ============================================

    /**
     * Tampilkan slide/image di whiteboard
     */
    public async displaySlide(url: string): Promise<boolean> {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.crossOrigin = "anonymous";

            img.onload = () => {
                // Clear dan tampilkan slide
                this.context.fillStyle = "white";
                this.context.fillRect(0, 0, 2048, 1024);

                // Gambar slide dengan aspect ratio yang sesuai
                const aspectRatio = img.width / img.height;
                let drawWidth = 2048;
                let drawHeight = 1024;

                if (aspectRatio > 2) {
                    // Landscape wide
                    drawHeight = 2048 / aspectRatio;
                    this.context.drawImage(img, 0, (1024 - drawHeight) / 2, drawWidth, drawHeight);
                } else if (aspectRatio < 0.5) {
                    // Portrait
                    drawWidth = 1024 * aspectRatio;
                    this.context.drawImage(img, (2048 - drawWidth) / 2, 0, drawWidth, 1024);
                } else {
                    // Normal
                    this.context.drawImage(img, 0, 0, 2048, 1024);
                }

                this.texture.update();
                console.log("✅ Slide displayed:", url);
                resolve(true);
            };

            img.onerror = (err) => {
                console.error("❌ Failed to load slide:", url, err);
                reject(err);
            };

            img.src = url;
        });
    }

    /**
     * Capture whiteboard sebagai image (untuk sync)
     */
    public getCanvasSnapshot(): string {
        return this.context.canvas.toDataURL("image/png");
    }

    /**
     * Apply snapshot dari teacher (untuk sync)
     */
    public applySnapshot(base64Img: string) {
        const img = new Image();
        img.onload = () => {
            this.context.clearRect(0, 0, 2048, 1024);
            this.context.drawImage(img, 0, 0, 2048, 1024);
            this.texture.update();
            console.log("📸 Whiteboard snapshot applied");
        };
        img.src = base64Img;
    }

    // ============================================
    // UTILITY FUNCTIONS
    // ============================================

    /**
     * Get current pen color
     */
    public getCurrentColor(): string {
        return this.currentColor;
    }

    /**
     * Get current pen size
     */
    public getCurrentSize(): number {
        return this.currentSize;
    }

    /**
     * Get whiteboard mesh (for UI positioning)
     */
    public getMesh(): BABYLON.AbstractMesh {
        return this.mesh;
    }

    /**
     * Toggle whiteboard visibility
     */
    public toggleVisibility() {
        this.isWhiteboardVisible = !this.isWhiteboardVisible;
        this.mesh.isVisible = this.isWhiteboardVisible;
        console.log(`👁️ Whiteboard visibility: ${this.isWhiteboardVisible}`);
    }

    /**
     * Check if user is teacher (can draw)
     */
    public canDraw(): boolean {
        return this.role === ROLES.TEACHER;
    }
}