// src/legacy-engine/managers/WhiteboardUI.ts
import { WhiteboardManager } from "./WhiteboardManager";
import { ROLES } from "@shared/constants";

export class WhiteboardUI {
    private wbManager: WhiteboardManager;
    private container: HTMLDivElement;
    private role: string;

    constructor(wbManager: WhiteboardManager, role: string) {
        this.wbManager = wbManager;
        this.role = role;
        console.log("🔍 WHITEBOARD UI - Role received in constructor:", role);  // ← TAMBAHKAN
        // 1. Buat Container UI di Layar
        this.container = document.createElement("div");
        this.container.id = "whiteboard-controls";
        this.styleContainer();
        document.body.appendChild(this.container);

        // 2. LOGIKA ROLE: Hanya GURU yang dapat spidol & penghapus
        if (role === ROLES.TEACHER) {
            this.createTeacherTools();
        } else {
            this.createStudentTools();
        }
    }

    private createTeacherTools() {
        // --- TOMBOL WARNA HITAM ---
        this.createButton("⚫", "black", () => {
            console.log("🎨 Ganti Spidol: HITAM");
            this.wbManager.setSpidolColor("black");
        });

        // --- TOMBOL WARNA MERAH ---
        this.createButton("🔴", "red", () => {
            console.log("🎨 Ganti Spidol: MERAH");
            this.wbManager.setSpidolColor("red");
        });

        // --- TOMBOL WARNA BIRU ---
        this.createButton("🔵", "blue", () => {
            console.log("🎨 Ganti Spidol: BIRU");
            this.wbManager.setSpidolColor("blue");
        });

        // --- TOMBOL WARNA HIJAU ---
        this.createButton("🟢", "green", () => {
            console.log("🎨 Ganti Spidol: HIJAU");
            this.wbManager.setSpidolColor("green");
        });

        // --- TOMBOL HAPUS PAPAN (CLEAR) ---
        this.createButton("🧹 Hapus Papan", "#ff4444", () => {
            if (confirm("Hapus semua coretan di kelas?")) {
                this.wbManager.clearBoard(true);
            }
        });

        // --- Alat Presentasi (Upload Slide) ---
        this.createButton("🖼️ Upload Slide", "#8e44ad", () => {
            const fileInput = document.createElement("input");
            fileInput.type = "file";
            fileInput.accept = "image/*";

            fileInput.onchange = async (e: any) => {
                const file = e.target.files[0];
                if (!file) return;

                const formData = new FormData();
                formData.append('slide', file);

                try {
                    // const baseUrl = import.meta.env.VITE_MOVEMENT_SERVER_URL?.replace(/\/$/, "");
                    // const uploadUrl = `${baseUrl}/upload-material`;
                    // const movementUrl = import.meta.env.VITE_MOVEMENT_SERVER_URL || "https://localhost:8080";

                    const movementUrl =
                        "https://1afea8ad-162f-4618-911d-a6c3182136eb-00-2vhud3fqxj7rx.pike.replit.dev";



                    const uploadUrl = `${movementUrl}/upload-material`;

                    // console.log("🚀 Upload URL:", uploadUrl); // ← TAMBAHKAN
                    console.log("🚀 Mengirim materi ke:", uploadUrl);

                    const response = await fetch(uploadUrl, {
                        method: 'POST',
                        body: formData
                    });

                    const data = await response.json();

                    if (data.success) {
                        console.log("✅ Berhasil upload, URL:", data.url);

                        // 1. Tampilkan di Whiteboard lokal (Guru)
                        await this.wbManager.displaySlide(data.url);

                        // 2. 🔥 PERBAIKAN: Gunakan movementSocket, BUKAN socket biasa
                        const network = this.wbManager.getNetwork();
                        if (network && network.movementSocket) {
                            network.movementSocket.emit("admin-change-slide", { slideUrl: data.url });
                            console.log("📡 Sinyal slide dikirim ke semua siswa via movementSocket!");
                        } else {
                            console.error("❌ Movement socket tidak tersedia!");
                        }
                    } else {
                        console.error("❌ Server nolak upload:", data.message);
                        alert("Server menolak file: " + (data.message || "Unknown error"));
                    }

                } catch (error) {
                    console.error("❌ Gagal upload slide:", error);
                    alert("Gagal mengupload materi!");
                }
            };
            fileInput.click();
        });
    }

    private createStudentTools() {
        this.createButton("💾 Simpan Catatan", "#4CAF50", () => {
            const rawDataUrl = this.wbManager.getCanvasSnapshot();

            const img = new Image();
            img.onload = () => {
                const tempCanvas = document.createElement("canvas");
                tempCanvas.width = img.width;
                tempCanvas.height = img.height;
                const ctx = tempCanvas.getContext("2d");

                if (ctx) {
                    ctx.translate(img.width, img.height);
                    ctx.scale(-1, -1);
                    ctx.drawImage(img, 0, 0);

                    const flippedDataUrl = tempCanvas.toDataURL("image/png");

                    const link = document.createElement("a");
                    link.download = `catatan-pioneer-${Date.now()}.png`;
                    link.href = flippedDataUrl;
                    link.click();

                    console.log("✅ Gambar sudah tegak lurus!");
                }
            };
            img.src = rawDataUrl;
        });
    }

    private createButton(text: string, bgColor: string, onClick: () => void) {
        const btn = document.createElement("button");
        btn.innerText = text;
        btn.style.margin = "5px";
        btn.style.padding = "10px";
        btn.style.cursor = "pointer";
        btn.style.border = "none";
        btn.style.borderRadius = "5px";
        btn.style.backgroundColor = bgColor;
        btn.style.color = "white";
        btn.style.fontWeight = "bold";
        btn.style.fontSize = "14px";

        btn.onclick = onClick;
        this.container.appendChild(btn);
    }

    private styleContainer() {
        this.container.style.position = "fixed";
        this.container.style.bottom = "20px";
        this.container.style.left = "50%";
        this.container.style.transform = "translateX(-50%)";
        this.container.style.zIndex = "1000";
        this.container.style.backgroundColor = "rgba(0,0,0,0.7)";
        this.container.style.padding = "10px 15px";
        this.container.style.borderRadius = "15px";
        this.container.style.display = "flex";
        this.container.style.gap = "10px";
        this.container.style.backdropFilter = "blur(10px)";
    }
}