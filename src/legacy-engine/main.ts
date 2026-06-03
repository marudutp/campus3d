// src/legacy-engine/main.ts
import { loginWithGoogle } from "./auth/AuthManager.js";
import { createPioneerScene } from "./scene";
import { AvatarManager } from "./managers/AvatarManager.js";
import { VoiceManager } from "./managers/VoiceManager.js";
import { NetworkManager } from "./network/NetworkManager.js";
import * as BABYLON from "@babylonjs/core";
import { WhiteboardManager } from "./managers/WhiteboardManager.js";
import { WhiteboardUI } from "./managers/WhiteboardUI.js";
import { User } from "firebase/auth";

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

// Disable KTX2 dengan timeout untuk avoid freezing
try {
    (BABYLON.KhronosTextureContainer2 as any).URLConfig = {
        jsDecoderModule: "https://cdn.babylonjs.com/babylon.ktx2Decoder.js",
        wasmUASTCToASTC: "https://cdn.babylonjs.com/wasm/uastc_astc.wasm",
        wasmUASTCToBC7: "https://cdn.babylonjs.com/wasm/uastc_bc7.wasm",
        wasmUASTCToRGBA_UNORM: "https://cdn.babylonjs.com/wasm/uastc_rgba8_unorm.wasm",
        wasmUASTCToRGBA_SRGB: "https://cdn.babylonjs.com/wasm/uastc_rgba8_srgb.wasm",
        wasmMSCTranscoder: "https://cdn.babylonjs.com/wasm/msc_basis_transcoder.wasm",
        jsMSCTranscoder: "https://cdn.babylonjs.com/babylon.msc_basis_transcoder.js"
    };
    // Disable KTX2 engine
    (BABYLON as any).Engine.prototype._createImageProcessingConfiguration = function() {};
} catch(e) {
    console.warn("⚠️ KTX2 config error (non-critical):", e);
}

export async function startEngine(config: {
    sessionId: string;
    user: {
        uid: string;
        displayName: string;
        role: string;
    };
    classroomType?: string;
}) {
    await bootstrap(config);
}

// ============================================
// INTERFACE & KONFIGURASI
// ============================================
interface AppUser extends User {
    role: string;
}

// Server URLs dan localhost
// const MOVEMENT_SERVER_URL = import.meta.env.VITE_MOVEMENT_SERVER_URL ||
//     `${window.location.protocol}//${window.location.hostname}:8080`;
// const AUDIO_SERVER_URL = import.meta.env.VITE_AUDIO_SERVER_URL ||
//     `${window.location.protocol}//${window.location.hostname}:8081`;

const MOVEMENT_SERVER_URL =
  "https://1afea8ad-162f-4618-911d-a6c3182136eb-00-2vhud3fqxj7rx.pike.replit.dev";

const AUDIO_SERVER_URL =
  "https://a6ff6328-ac1a-434c-8648-5f94b4ecd722-00-3l2kandciggi2.sisko.replit.dev";


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
    classroomType?: string;
}) {
    if (isStarted) return;

    console.log("🚀 Pioneer Portal V3 - Starting...");
    console.log(`📡 Movement Server: ${MOVEMENT_SERVER_URL}`);
    console.log(`🎧 Audio Server: ${AUDIO_SERVER_URL}`);
    console.log(`👤 User from config: ${config.user.displayName} (${config.user.role})`);

    // 1. UI Overlay
    const overlay = document.getElementById("ui-overlay");
    if (overlay) {
        overlay.style.opacity = "0";
        setTimeout(() => {
            if (overlay) overlay.style.display = "none";
        }, 500);
    }

    // ============================================
    // 🔥 PERBAIKAN: Pake user dari config, BUKAN login ulang
    // ============================================
    const myRole = config.user.role;
    const user = {
        uid: config.user.uid,
        displayName: config.user.displayName,
        email: config.user.uid + "@temp.com",
        role: myRole
    } as any;

    console.log(`👤 User: ${user.displayName} - Role: ${myRole}`);

    // 4. Initialize Babylon.js Scene & Managers
    console.log("🎮 Creating Babylon.js scene...");
    const classroomType = config.classroomType || "classroom.glb";
    const { scene, engine, canvas } = await createPioneerScene("renderCanvas", classroomType);

    const avatarManager = new AvatarManager(scene);
    // 🔥 TAMBAHKAN INI
    (window as any).avatarManager = avatarManager;
    const voiceManager = new VoiceManager(scene);

    // NetworkManager dengan dual server
    const networkManager = new NetworkManager(MOVEMENT_SERVER_URL, AUDIO_SERVER_URL, avatarManager);
    // 🔥 TAMBAHKAN INI - Simpan ke global window untuk debugging
    (window as any).networkManager = networkManager;
    (window as any).movementSocket = networkManager.movementSocket;
    
    const wbManager = new WhiteboardManager(scene, networkManager, user.role);
    // Setelah membuat wbManager
    (window as any).whiteboardManager = wbManager;
    console.log("✅ WhiteboardManager saved to window");

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
    // networkManager.joinClass(user.uid, user.displayName || "User", myRole);
    networkManager.joinClass(user.uid, user.displayName, myRole, config.sessionId);

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

    // 8. Setup Input Controls
    // const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) || (navigator.maxTouchPoints > 0);
    // if (isMobile) {
    //     console.log("📱 Mobile mode detected - Using touch controls");
    //     setupMobileInput(scene, avatarManager, canvas, networkManager);
    // } else {
    //     console.log("⌨️ Desktop mode detected - Using keyboard controls");
    //     setupKeyboardInput(scene, avatarManager, scene.activeCamera as BABYLON.Camera, networkManager);
    // }

    // src/legacy-engine/main.ts - Di dalam bootstrap function

    // Deteksi mobile yang lebih akurat
    const userAgent = navigator.userAgent.toLowerCase();
    const isMobile = /android|webos|iphone|ipad|ipod|blackberry|windows phone/i.test(userAgent);

    console.log("📱 Mobile detection - UserAgent:", userAgent);
    console.log("📱 Is mobile?", isMobile);

    if (isMobile) {
        console.log("📱 Mobile mode detected - Using touch controls");
        setupMobileInput(scene, avatarManager, canvas, networkManager);
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

    // 11. Audio Unlocker
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
function setupKeyboardInput(
    scene: BABYLON.Scene,
    avatarManager: AvatarManager,
    camera: BABYLON.Camera,
    networkManager: NetworkManager
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

        avatarManager.handleAvatarMovement(dx, dz, camera, networkManager.movementSocket);
    });

    console.log("⌨️ Keyboard controls ready");
}

// ============================================
// MOBILE INPUT HANDLER
// ============================================
function setupMobileInput(
    scene: BABYLON.Scene,
    avatarManager: AvatarManager,
    canvas: HTMLCanvasElement,
    networkManager: NetworkManager
) {
    console.log("📱 Setting up mobile joystick controls...");

    const mobileUI = document.getElementById("mobile-controls");
    if (mobileUI) mobileUI.style.display = "flex";

    const leftJoy = new BABYLON.VirtualJoystick(true);
    const rightJoy = new BABYLON.VirtualJoystick(false);

    (window as any).leftJoy = leftJoy;
    (window as any).rightJoy = rightJoy;

    scene.onBeforeRenderObservable.add(() => {
        if (!avatarManager.localAvatar) return;

        if (leftJoy.pressed) {
            avatarManager.handleAvatarMovement(
                leftJoy.deltaPosition.x,
                leftJoy.deltaPosition.y,
                scene.activeCamera,
                networkManager.movementSocket
            );
        }

        if (rightJoy.pressed) {
            avatarManager.localAvatar.rotation.y += rightJoy.deltaPosition.x * 0.05;
        }
    });

    console.log("✅ Mobile joystick ready");
}

// ============================================
// EXPORT FOR DEBUGGING
// ============================================
if (typeof window !== 'undefined') {
    (window as any).debug = {
        version: '3.0.0',
        movementServer: MOVEMENT_SERVER_URL,
        audioServer: AUDIO_SERVER_URL
    };
}