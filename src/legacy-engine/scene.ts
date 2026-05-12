// import { Engine, Scene, ArcRotateCamera, Vector3, HemisphericLight, MeshBuilder, SceneLoader } from "@babylonjs/core";
// import "@babylonjs/loaders/glTF";

// async function loadEnvironment(scene: Scene) {
//     try {
//         // Kita hapus pembuatan lampu di sini karena sudah ada di createPioneerScene
//         // const fileName = "classroom.glb";

//         const fileName = "classroom.glb";

//         const result = await SceneLoader.ImportMeshAsync(
//             "",
//             "/assets/rooms/",
//             fileName,
//             scene
//         );

//         const root = result.meshes[0];

//         // ==========================================
//         // 1. AKTIFKAN COLLISION PADA TIAP MESH GEDUNG
//         // ==========================================
//         // result.meshes.forEach(mesh => {
//         //     // Hanya aktifkan collision untuk mesh yang punya bentuk (vertices)
//         //     if (mesh.getTotalVertices() > 0) {
//         //         mesh.checkCollisions = true;
//         //     }
//         // });
//         // Di dalam file scene.ts bagian loadEnvironment
//         result.meshes.forEach(mesh => {
//             // 1. Cek apakah mesh punya data visual (vertices)
//             if (mesh.getTotalVertices() > 0) {
//                 const name = mesh.name.toLowerCase();

//                 // 2. 🔥 PROTEKSI: Abaikan mesh transparan atau pembatas yang sering bikin macet
//                 if (name.includes("physics") || name.includes("boundary") || name.includes("limit")) {
//                     mesh.checkCollisions = false;
//                     mesh.isVisible = false; // Pastikan dia gak ganggu
//                 } else {
//                     mesh.checkCollisions = true;
//                 }
//             }
//         });

//         // ==========================================
//         // 2. SCALING & POSITIONING (PENTING!)
//         // ==========================================
//         const bounding = root.getHierarchyBoundingVectors(true);
//         const height = bounding.max.y - bounding.min.y;

//         const targetHeight = 10;
//         const scaleFactor = targetHeight / height;

//         root.scaling.setAll(scaleFactor);

//         // Paksa hitung ulang posisi setelah scaling
//         root.computeWorldMatrix(true);

//         // 🔥 FIX TENGGELAM: Pastikan lantai gedung tepat di Y = 0
//         // Kita geser root-nya supaya titik terendah (lantai) ada di nol
//         const newBounding = root.getHierarchyBoundingVectors(true);
//         root.position.y = -newBounding.min.y;

//         // 3. SETUP KAMERA
//         const camera = scene.activeCamera as ArcRotateCamera;
//         if (camera) {
//             camera.setTarget(new Vector3(0, 1.5, 0)); // Fokus ke level mata avatar
//             camera.radius = 8;
//             camera.beta = Math.PI / 2.5;
//             camera.lowerRadiusLimit = 2;
//             camera.upperRadiusLimit = 20;
//         }

//         console.log("🏛️ Environment loaded & Collisions activated!");

//     } catch (error) {
//         console.error("❌ Load environment gagal:", error);
//     }
// }

// export async function createPioneerScene(canvasId: string) {
//     // ==========================================
//     // 🔥 VALIDASI CANVAS YANG ROBUST (TAMBAHAN)
//     // ==========================================

//     // 1. Coba cari canvas dengan id yang dikirim
//     let canvasElement = document.getElementById(canvasId);

//     // 2. Jika tidak ditemukan, coba cari dengan id "renderCanvas"
//     if (!canvasElement) {
//         console.warn(`⚠️ Canvas dengan id "${canvasId}" tidak ditemukan, mencoba "renderCanvas"...`);
//         canvasElement = document.getElementById("renderCanvas");
//     }

//     // 3. Jika tetap tidak ditemukan, BUAT CANVAS BARU
//     if (!canvasElement) {
//         console.warn("⚠️ Canvas tidak ditemukan, membuat canvas baru...");
//         canvasElement = document.createElement('canvas');
//         canvasElement.id = canvasId;
//         canvasElement.style.position = 'fixed';
//         canvasElement.style.top = '0';
//         canvasElement.style.left = '0';
//         canvasElement.style.width = '100%';
//         canvasElement.style.height = '100%';
//         canvasElement.style.outline = 'none';
//         canvasElement.style.zIndex = '1';
//         document.body.appendChild(canvasElement);
//         console.log("✅ Canvas baru berhasil dibuat");
//     }

//     // 4. Pastikan element adalah HTMLCanvasElement
//     let canvas: HTMLCanvasElement;

//     if (canvasElement instanceof HTMLCanvasElement) {
//         canvas = canvasElement;
//     } else {
//         // Jika element bukan canvas (misalnya div), buat canvas baru dan ganti
//         console.warn("⚠️ Element found but not a canvas, replacing with new canvas...");
//         const newCanvas = document.createElement('canvas');
//         newCanvas.id = canvasId;
//         newCanvas.style.position = 'fixed';
//         newCanvas.style.top = '0';
//         newCanvas.style.left = '0';
//         newCanvas.style.width = '100%';
//         newCanvas.style.height = '100%';
//         newCanvas.style.outline = 'none';
//         newCanvas.style.zIndex = '1';
//         canvasElement.parentNode?.replaceChild(newCanvas, canvasElement);
//         canvas = newCanvas;
//     }

//     console.log("✅ Canvas ready for Babylon.js");

//     // ==========================================
//     // KODE ASLI MULAI DARI SINI (TIDAK BERUBAH)
//     // ==========================================

//     const engine = new Engine(canvas, true);
//     const scene = new Scene(engine);

//     // ==========================================
//     // 🔥 FITUR SAKTI: GLOBAL COLLISION & GRAVITY
//     // ==========================================
//     scene.collisionsEnabled = true; // WAJIB: Tanpa ini, checkCollisions di mesh tidak guna
//     scene.gravity = new Vector3(0, -0.15, 0); // Gravitasi biar avatar tetap napak

//     // Setup Dasar
//     const camera = new ArcRotateCamera("camera", -Math.PI / 2, Math.PI / 2.5, 10, new Vector3(0, 0, 0), scene);
//     camera.attachControl(canvas, true);

//     // Lampu Tunggal (Cukup satu saja agar tidak terlalu terang)
//     new HemisphericLight("light", new Vector3(0, 1, 0), scene);

//     //debug
//     // Panggil Load Environment
//     await loadEnvironment(scene);
//     engine.runRenderLoop(() => {
//         scene.render();
//     });

//     window.addEventListener("resize", () => {
//         engine.resize();
//     });
//     return { scene, engine, camera, canvas };
// }

// function spawnParticipants(scene: Scene, participants: any[]) {
//     let studentIndex = 0;

//     participants.forEach(p => {
//         let position;

//         if (p.role === "teacher") {
//             position = new Vector3(0, 0, -3); // panggung
//         } else {
//             const x = (studentIndex % 5) * 2 - 4;
//             const z = Math.floor(studentIndex / 5) * 2 + 3;
//             position = new Vector3(x, 0, z);
//             studentIndex++;
//         }

//         const avatar = MeshBuilder.CreateCapsule(p.userId, { height: 2 }, scene);
//         avatar.position = position;

//         avatar.metadata = {
//             userId: p.userId,
//             role: p.role
//         };
//     });
// }

import { Engine, Scene, ArcRotateCamera, Vector3, HemisphericLight, MeshBuilder, SceneLoader } from "@babylonjs/core";
import "@babylonjs/loaders/glTF";

async function loadEnvironment(scene: Scene) {
    try {
        const fileName = "classroom.glb";

        const result = await SceneLoader.ImportMeshAsync(
            "",
            "/assets/rooms/",
            fileName,
            scene
        );

        const root = result.meshes[0];

        result.meshes.forEach(mesh => {
            if (mesh.getTotalVertices() > 0) {
                const name = mesh.name.toLowerCase();

                if (name.includes("physics") || name.includes("boundary") || name.includes("limit")) {
                    mesh.checkCollisions = false;
                    mesh.isVisible = false;
                } else {
                    mesh.checkCollisions = true;
                }
            }
        });

        const bounding = root.getHierarchyBoundingVectors(true);
        const height = bounding.max.y - bounding.min.y;

        const targetHeight = 10;
        const scaleFactor = targetHeight / height;

        root.scaling.setAll(scaleFactor);
        root.computeWorldMatrix(true);

        const newBounding = root.getHierarchyBoundingVectors(true);
        root.position.y = -newBounding.min.y;

        const camera = scene.activeCamera as ArcRotateCamera;
        if (camera) {
            camera.setTarget(new Vector3(0, 1.5, 0));
            camera.radius = 8;
            camera.beta = Math.PI / 2.5;
            camera.lowerRadiusLimit = 2;
            camera.upperRadiusLimit = 20;
        }

        console.log("🏛️ Environment loaded & Collisions activated!");

    } catch (error) {
        console.error("❌ Load environment gagal:", error);
    }
}

export async function createPioneerScene(canvasId: string) {
    // ==========================================
    // 🔥 VALIDASI CANVAS - VERSION FINAL (NO ERROR)
    // ==========================================

    // 1. Coba cari canvas dengan id yang dikirim
    let canvas: HTMLCanvasElement | null = document.getElementById(canvasId) as HTMLCanvasElement | null;

    // 2. Jika tidak ditemukan, coba cari dengan id "renderCanvas"
    if (!canvas) {
        console.warn(`⚠️ Canvas dengan id "${canvasId}" tidak ditemukan, mencoba "renderCanvas"...`);
        canvas = document.getElementById("renderCanvas") as HTMLCanvasElement | null;
    }

    // 3. Jika tetap tidak ditemukan, BUAT CANVAS BARU
    if (!canvas) {
        console.warn("⚠️ Canvas tidak ditemukan, membuat canvas baru...");
        const newCanvas = document.createElement('canvas');
        newCanvas.id = canvasId;
        newCanvas.style.position = 'fixed';
        newCanvas.style.top = '0';
        newCanvas.style.left = '0';
        newCanvas.style.width = '100%';
        newCanvas.style.height = '100%';
        newCanvas.style.outline = 'none';
        newCanvas.style.zIndex = '1';

        if (document.body) {
            document.body.appendChild(newCanvas);
        }

        canvas = newCanvas;
        console.log("✅ Canvas baru berhasil dibuat");
    }

    console.log("✅ Canvas ready for Babylon.js");

    // ==========================================
    // KODE ASLI MULAI DARI SINI (TIDAK BERUBAH)
    // ==========================================

    const engine = new Engine(canvas, true);
    const scene = new Scene(engine);

    scene.collisionsEnabled = true;
    scene.gravity = new Vector3(0, -0.15, 0);

    const camera = new ArcRotateCamera("camera", -Math.PI / 2, Math.PI / 2.5, 10, new Vector3(0, 0, 0), scene);
    camera.attachControl(canvas, true);

    new HemisphericLight("light", new Vector3(0, 1, 0), scene);

    await loadEnvironment(scene);

    engine.runRenderLoop(() => {
        scene.render();
    });

    window.addEventListener("resize", () => {
        engine.resize();
    });

    return { scene, engine, camera, canvas };
}

function spawnParticipants(scene: Scene, participants: any[]) {
    let studentIndex = 0;

    participants.forEach(p => {
        let position;

        if (p.role === "teacher") {
            position = new Vector3(0, 0, -3);
        } else {
            const x = (studentIndex % 5) * 2 - 4;
            const z = Math.floor(studentIndex / 5) * 2 + 3;
            position = new Vector3(x, 0, z);
            studentIndex++;
        }

        const avatar = MeshBuilder.CreateCapsule(p.userId, { height: 2 }, scene);
        avatar.position = position;

        avatar.metadata = {
            userId: p.userId,
            role: p.role
        };
    });
}