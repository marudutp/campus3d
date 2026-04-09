// src/client/main.ts
import { loginWithGoogle } from "./auth/AuthManager.js";
import { createPioneerScene } from "./scene";
import { AvatarManager } from "./managers/AvatarManager.js";
import { VoiceManager } from "./managers/VoiceManager.js";
import { NetworkManager } from "./network/NetworkManager.js";
import * as BABYLON from "@babylonjs/core";
import { WhiteboardManager } from "./managers/WhiteboardManager.js";
import { WhiteboardUI } from "./managers/WhiteboardUI.js";
import { User } from "firebase/auth";
import { TEACHER_EMAILS } from '@shared/admin.config';
// import { ROLES } from "./shared/constants";
import { ROLES, NETWORK_EVENTS } from '@shared/constants';
import "@babylonjs/loaders/glTF";

// ============================================
// KONFIGURASI DRACO & KTX2
// ============================================
BABYLON.DracoCompression.Configuration = {
    decoder: {
        wasmUrl: "https://cdn.babylonjs.com/draco_wasm_wrapper_gltf.js",
        wasmBinaryUrl: "https://cdn.babylonjs.com/draco_decoder_gltf.wasm",
        fallbackUrl: "https://cdn.babylonjs.com/draco_decoder_gltf.js"
    }
};

(BABYLON.KhronosTextureContainer2 as any).URLConfig = {
    jsDecoderModule: "https://cdn.babylonjs.com/babylon.ktx2Decoder.js",
    wasmUASTCToASTC: "https://cdn.babylonjs.com/wasm/uastc_astc.wasm",
    wasmUASTCToBC7: "https://cdn.babylonjs.com/wasm/uastc_bc7.wasm",
    wasmUASTCToRGBA_UNORM: "https://cdn.babylonjs.com/wasm/uastc_rgba8_unorm.wasm",
    wasmUASTCToRGBA_SRGB: "https://cdn.babylonjs.com/wasm/uastc_rgba8_srgb.wasm",
    wasmMSCTranscoder: "https://cdn.babylonjs.com/wasm/msc_basis_transcoder.wasm",
    jsMSCTranscoder: "https://cdn.babylonjs.com/babylon.msc_basis_transcoder.js"
};

export async function startEngine(config: {
    sessionId: string;
    user: {
        uid: string;
        displayName: string;
        role: string;
    };
}) {
    await bootstrap(config);
}

// ============================================
// INTERFACE & KONFIGURASI
// ============================================
interface AppUser extends User {
    role: string;
}

// Server URLs - Sesuaikan dengan environment
const MOVEMENT_SERVER_URL = import.meta.env.VITE_MOVEMENT_SERVER_URL ||
    `${window.location.protocol}//${window.location.hostname}:8080`;
const AUDIO_SERVER_URL = import.meta.env.VITE_AUDIO_SERVER_URL ||
    `${window.location.protocol}//${window.location.hostname}:8081`;

let isStarted = false;

// ============================================
// MAIN BOOTSTRAP FUNCTION
// ============================================
async function bootstrap(config: {
    sessionId: string;
    user: {
        uid: string;
        displayName: string;
        role: string;
    };
}) {
    if (isStarted) return;

    console.log("🚀 Pioneer Portal V3 - Starting...");
    console.log(`📡 Movement Server: ${MOVEMENT_SERVER_URL}`);
    console.log(`🎧 Audio Server: ${AUDIO_SERVER_URL}`);

    // 1. UI Overlay
    const overlay = document.getElementById("ui-overlay");
    if (overlay) {
        overlay.style.opacity = "0";
        setTimeout(() => {
            if (overlay) overlay.style.display = "none";
        }, 500);
    }

    // 2. Google Authentication
    console.log("🔐 Authenticating with Google...");
    const googleUser = await loginWithGoogle();
    if (!googleUser) {
        console.error("❌ Google authentication failed");
        return;
    }
    const user = googleUser as AppUser;

    // 3. Determine Role
    const myRole = TEACHER_EMAILS.includes(user.email || "") ? ROLES.TEACHER : ROLES.STUDENT;
    user.role = myRole;
    console.log(`👤 User: ${user.displayName} (${user.email}) - Role: ${myRole}`);

    // 4. Initialize Babylon.js Scene & Managers
    console.log("🎮 Creating Babylon.js scene...");
    const { scene, engine, canvas } = await createPioneerScene("renderCanvas");

    const avatarManager = new AvatarManager(scene);
    const voiceManager = new VoiceManager(scene);

    // NetworkManager dengan dual server
    const networkManager = new NetworkManager(MOVEMENT_SERVER_URL, AUDIO_SERVER_URL, avatarManager);

    const wbManager = new WhiteboardManager(scene, networkManager, user.role);

    // Setup connections
    (networkManager as any).voiceManager = voiceManager;
    networkManager.setWhiteboardManager(wbManager);

    // Set local user ID
    avatarManager.setLocalUserId(user.uid);
    networkManager.localUid = user.uid;

    // 5. Start Voice Chat (Request Microphone)
    console.log("🎤 Requesting microphone access...");
    await networkManager.startVoiceChat();

    // 6. Join Class (Connect to both servers)
    console.log("📡 Joining class...");
    networkManager.joinClass(user.uid, user.displayName || "User", myRole);

    // 7. Create Local Avatar
    console.log("🎨 Creating local avatar...");
    await avatarManager.createAvatar({
        uid: user.uid,
        displayName: user.displayName || "Saya",
        role: myRole
    });

    // Wait for local avatar to be ready
    await new Promise<void>(resolve => {
        const checkInterval = setInterval(() => {
            if (avatarManager.localAvatar) {
                clearInterval(checkInterval);
                console.log("✅ Local avatar ready!");
                resolve();
            }
        }, 100);
    });

    // 8. Setup Input Controls (Keyboard or Mobile)
    // const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) || (navigator.maxTouchPoints > 0);
    // if (isMobile) {
    //     console.log("📱 Mobile mode detected - Using touch controls");
    //     setupMobileInput(scene, avatarManager, canvas, networkManager);
    // } else {
    //     console.log("⌨️ Desktop mode detected - Using keyboard controls");
    //     setupKeyboardInput(scene, avatarManager, scene.activeCamera as BABYLON.Camera, networkManager);
    // }

    // main.ts - Di dalam bootstrap, panggil seperti ini:
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) || (navigator.maxTouchPoints > 0);
    if (isMobile) {
        console.log("📱 Mobile mode detected - Using touch controls");
        setupMobileInput(scene, avatarManager, canvas, networkManager);  // ← Kirim networkManager, BUKAN socket
    } else {
        console.log("⌨️ Desktop mode detected - Using keyboard controls");
        setupKeyboardInput(scene, avatarManager, scene.activeCamera as BABYLON.Camera, networkManager);
    }

    // 9. Setup Whiteboard UI
    console.log("📝 Setting up whiteboard...");
    new WhiteboardUI(wbManager, user.role);

    // Mark network as ready
    networkManager.setReady();

    // 10. Start Render Loop
    isStarted = true;
    engine.runRenderLoop(() => {
        scene.render();
    });

    // 11. Audio Unlocker (Browser policy)
    window.addEventListener("click", () => {
        if (BABYLON.Engine.audioEngine) {
            BABYLON.Engine.audioEngine.unlock();
            console.log("🔓 Audio engine unlocked");
        }
    }, { once: true });

    // 12. Handle Window Resize
    window.addEventListener("resize", () => {
        engine.resize();
    });

    console.log("✅ Pioneer Portal V3 - Ready!");
}

// ============================================
// KEYBOARD INPUT HANDLER
// ============================================
// function setupKeyboardInput(
//     scene: BABYLON.Scene,
//     avatarManager: AvatarManager,
//     camera: BABYLON.Camera,
//     networkManager: NetworkManager
// ) {
//     const inputMap: Record<string, boolean> = {};

//     // Register keyboard actions
//     scene.actionManager = new BABYLON.ActionManager(scene);

//     scene.actionManager.registerAction(
//         new BABYLON.ExecuteCodeAction(BABYLON.ActionManager.OnKeyDownTrigger, evt => {
//             const key = evt.sourceEvent.key.toLowerCase();
//             inputMap[key] = true;

//             // Debug: log key presses
//             if (key === 'w' || key === 's' || key === 'a' || key === 'd') {
//                 console.log(`⌨️ Key pressed: ${key}`);
//             }
//         })
//     );

//     scene.actionManager.registerAction(
//         new BABYLON.ExecuteCodeAction(BABYLON.ActionManager.OnKeyUpTrigger, evt => {
//             const key = evt.sourceEvent.key.toLowerCase();
//             inputMap[key] = false;
//         })
//     );

//     // Movement update on every frame
//     scene.onBeforeRenderObservable.add(() => {
//         if (!avatarManager.localAvatar) return;

//         let dx = 0, dz = 0;
//         if (inputMap["w"]) dz += 1;
//         if (inputMap["s"]) dz -= 1;
//         if (inputMap["a"]) dx -= 1;
//         if (inputMap["d"]) dx += 1;

//         // Handle movement (pass movement socket)
//         avatarManager.handleAvatarMovement(dx, dz, camera, networkManager.movementSocket);
//     });
// }
// src/client/main.ts
// Update fungsi setupKeyboardInput

// src/client/main.ts
// src/client/main.ts
// function setupKeyboardInput(// src/client/main.ts
// src/client/main.ts

// function setupKeyboardInput(
//     scene: BABYLON.Scene,
//     avatarManager: AvatarManager,
//     camera: BABYLON.Camera,
//     networkManager: NetworkManager
// ) {
//     const keys: Record<string, boolean> = {
//         w: false, a: false, s: false, d: false
//     };

//     window.addEventListener('keydown', (e) => {
//         const key = e.key.toLowerCase();
//         if (keys.hasOwnProperty(key)) {
//             keys[key] = true;
//             e.preventDefault();
//             console.log(`🔽 Key pressed: ${key}`);
//         }
//     });

//     window.addEventListener('keyup', (e) => {
//         const key = e.key.toLowerCase();
//         if (keys.hasOwnProperty(key)) {
//             keys[key] = false;
//             console.log(`🔼 Key released: ${key}`);
//         }
//     });

//     scene.onBeforeRenderObservable.add(() => {
//         if (!avatarManager.localAvatar) return;

//         // PERBAIKAN: Mapping yang benar
//         // W = maju = deltaZ positif
//         // S = mundur = deltaZ negatif
//         // A = kiri = deltaX negatif
//         // D = kanan = deltaX positif
//         let dx = 0, dz = 0;

//         if (keys.w) dz = 1;      // Maju
//         if (keys.s) dz = -1;     // Mundur
//         if (keys.a) dx = -1;     // Kiri
//         if (keys.d) dx = 1;      // Kanan

//         if (dx !== 0 || dz !== 0) {
//             console.log(`🎮 Movement: dx=${dx}, dz=${dz}`);
//         }

//         avatarManager.handleAvatarMovement(dx, dz, camera, networkManager.movementSocket);
//     });

//     console.log("⌨️ Keyboard: W=Forward, S=Backward, A=Left, D=Right");
// }
// main.ts - setupKeyboardInput juga pakai networkManager

function setupKeyboardInput(
    scene: BABYLON.Scene,
    avatarManager: AvatarManager,
    camera: BABYLON.Camera,
    networkManager: NetworkManager  // ← terima NetworkManager, bukan socket
) {
    const keys: Record<string, boolean> = {
        w: false, a: false, s: false, d: false
    };

    window.addEventListener('keydown', (e) => {
        const key = e.key.toLowerCase();
        if (keys.hasOwnProperty(key)) {
            keys[key] = true;
            e.preventDefault();
        }
    });

    window.addEventListener('keyup', (e) => {
        const key = e.key.toLowerCase();
        if (keys.hasOwnProperty(key)) {
            keys[key] = false;
        }
    });

    scene.onBeforeRenderObservable.add(() => {
        if (!avatarManager.localAvatar) return;

        let dx = 0, dz = 0;
        if (keys.w) dz = 1;
        if (keys.s) dz = -1;
        if (keys.a) dx = -1;
        if (keys.d) dx = 1;

        if (dx !== 0 || dz !== 0) {
            console.log(`🎮 Movement: dx=${dx}, dz=${dz}`);
        }

        // ← pakai networkManager.movementSocket
        avatarManager.handleAvatarMovement(dx, dz, camera, networkManager.movementSocket);
    });

    console.log("⌨️ Keyboard controls ready");
}

// ============================================
// MOBILE INPUT HANDLER (Virtual Joystick)
// ============================================
// function setupMobileInput(
//     scene: BABYLON.Scene,
//     avatarManager: AvatarManager,
//     canvas: HTMLCanvasElement,
//     networkManager: NetworkManager
// ) {
//     // Show mobile UI
//     const mobileUI = document.getElementById("mobile-controls");
//     if (mobileUI) mobileUI.style.display = "flex";

//     // Setup virtual joysticks
//     BABYLON.VirtualJoystick.Canvas = canvas;
//     const leftJoy = new BABYLON.VirtualJoystick(true);  // Movement joystick
//     const rightJoy = new BABYLON.VirtualJoystick(false); // Rotation joystick

//     scene.onBeforeRenderObservable.add(() => {
//         if (!avatarManager.localAvatar) return;

//         // Handle movement
//         if (leftJoy.pressed) {
//             avatarManager.handleAvatarMovement(
//                 leftJoy.deltaPosition.x,
//                 leftJoy.deltaPosition.y,
//                 scene.activeCamera,
//                 networkManager.movementSocket
//             );
//         }

//         // Handle rotation
//         if (rightJoy.pressed) {
//             avatarManager.localAvatar.rotation.y += rightJoy.deltaPosition.x * 0.05;
//         }
//     });
// }


// function setupMobileInput(
//     scene: BABYLON.Scene,
//     avatarManager: AvatarManager,
//     canvas: HTMLCanvasElement,
//     networkManager: NetworkManager
// ) {
//     const mobileUI = document.getElementById("mobile-controls");
//     if (mobileUI) mobileUI.style.display = "flex";

//     // ❌ HAPUS BARIS INI!
//     // BABYLON.VirtualJoystick.Canvas = canvas;

//     const leftJoy = new BABYLON.VirtualJoystick(true);
//     const rightJoy = new BABYLON.VirtualJoystick(false);

//     scene.onBeforeRenderObservable.add(() => {
//         if (!avatarManager.localAvatar) return;

//         if (leftJoy.pressed) {
//             avatarManager.handleAvatarMovement(
//                 leftJoy.deltaPosition.x,
//                 leftJoy.deltaPosition.y,
//                 scene.activeCamera,
//                 networkManager.movementSocket  // ✅ Tetap pakai movementSocket
//             );
//         }

//         if (rightJoy.pressed) {
//             avatarManager.localAvatar.rotation.y += rightJoy.deltaPosition.x * 0.05;
//         }
//     });
// }

// main.ts - Ganti fungsi setupMobileInput dengan ini

function setupMobileInput(
    scene: BABYLON.Scene,
    avatarManager: AvatarManager,
    canvas: HTMLCanvasElement,
    networkManager: NetworkManager
) {
    console.log("📱 Setting up mobile joystick controls...");

    // Show mobile UI
    const mobileUI = document.getElementById("mobile-controls");
    if (mobileUI) mobileUI.style.display = "flex";

    // ❌ HAPUS baris ini (penyebab error clearRect)
    // BABYLON.VirtualJoystick.Canvas = canvas;

    // Setup virtual joysticks
    const leftJoy = new BABYLON.VirtualJoystick(true);   // Movement joystick
    const rightJoy = new BABYLON.VirtualJoystick(false); // Rotation joystick

    // Simpan ke window untuk debugging
    (window as any).leftJoy = leftJoy;
    (window as any).rightJoy = rightJoy;

    scene.onBeforeRenderObservable.add(() => {
        if (!avatarManager.localAvatar) return;

        // Handle movement - pakai movementSocket dari NetworkManager
        if (leftJoy.pressed) {
            avatarManager.handleAvatarMovement(
                leftJoy.deltaPosition.x,
                leftJoy.deltaPosition.y,
                scene.activeCamera,           // ← camera di sini, pastikan tidak null
                networkManager.movementSocket // ← pakai movementSocket
            );
        }

        // Handle rotation
        if (rightJoy.pressed) {
            avatarManager.localAvatar.rotation.y += rightJoy.deltaPosition.x * 0.05;
        }
    });

    console.log("✅ Mobile joystick ready - Movement socket connected:", !!networkManager.movementSocket);
}

// ============================================
// EXPORT FOR DEBUGGING
// ============================================
// Make managers available in console for debugging
if (typeof window !== 'undefined') {
    (window as any).debug = {
        version: '3.0.0',
        movementServer: MOVEMENT_SERVER_URL,
        audioServer: AUDIO_SERVER_URL
    };
}

// Start the application
// window.addEventListener("DOMContentLoaded", bootstrap);