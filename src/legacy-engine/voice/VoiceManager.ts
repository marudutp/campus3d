import * as BABYLON from "@babylonjs/core";
import { AUDIO_CONFIG } from "@shared/constants";
import { io, Socket } from "socket.io-client";

export class VoiceManager {
    private scene: BABYLON.Scene;
    private remoteSounds: Map<string, BABYLON.Sound> = new Map();
    private isUnlocked: boolean = false;

    private localStream: MediaStream | null = null;
    private isMuted: boolean = false;

    private socket: Socket | null = null;
    private classId: string = "";
    private userId: string = "";

    constructor(scene: BABYLON.Scene) {
        this.scene = scene;
        this.setupAudioUnlocker();
    }

    // =====================================
    // 🔓 AUDIO UNLOCK
    // =====================================
    private setupAudioUnlocker() {
        const unlock = () => {
            if (this.isUnlocked) return;

            if (BABYLON.Engine.audioEngine) {
                BABYLON.Engine.audioEngine.unlock();
                console.log("🔊 Audio Engine Unlocked!");
                this.isUnlocked = true;

                window.removeEventListener("pointerdown", unlock);
                window.removeEventListener("keydown", unlock);
            }
        };

        window.addEventListener("pointerdown", unlock);
        window.addEventListener("keydown", unlock);
    }

    // =====================================
    // 🎤 INIT LOCAL MIC + CONNECT SERVER
    // =====================================
    public async init(
        classId: string,
        userId: string,
        audioServerUrl: string
    ) {
        this.classId = classId;
        this.userId = userId;

        try {
            this.localStream = await navigator.mediaDevices.getUserMedia({
                audio: true
            });

            console.log("🎤 Mic ready");

        } catch (err) {
            console.error("❌ Mic error:", err);
        }

        // CONNECT SOCKET
        this.socket = io(audioServerUrl);

        this.socket.emit("join-room", {
            classId,
            userId
        });

        console.log("🎧 Connected to audio server");

        // LISTEN CONTROL (MUTE / UNMUTE)
        this.socket.on("audio-control", (data: any) => {
            const { action, scope, targetUserId } = data;

            if (scope === "all") {
                if (action === "mute") this.muteLocal();
                if (action === "unmute") this.unmuteLocal();
            }

            if (scope === "user" && targetUserId === this.userId) {
                if (action === "mute") this.muteLocal();
                if (action === "unmute") this.unmuteLocal();
            }
        });
    }

    // =====================================
    // 🔇 LOCAL MUTE CONTROL
    // =====================================
    public muteLocal() {
        if (!this.localStream) return;

        this.localStream.getAudioTracks().forEach(track => {
            track.enabled = false;
        });

        this.isMuted = true;
        console.log("🔇 Mic muted");
    }

    public unmuteLocal() {
        if (!this.localStream) return;

        this.localStream.getAudioTracks().forEach(track => {
            track.enabled = true;
        });

        this.isMuted = false;
        console.log("🔊 Mic unmuted");
    }

    public toggleMute() {
        if (this.isMuted) {
            this.unmuteLocal();
        } else {
            this.muteLocal();
        }
    }

    // =====================================
    // 🎧 REMOTE AUDIO (SPATIAL)
    // =====================================
    public addRemoteStream(
        uid: string,
        stream: MediaStream,
        mesh: BABYLON.AbstractMesh
    ) {
        if (this.remoteSounds.has(uid)) {
            this.remoteSounds.get(uid)?.dispose();
        }

        console.log(`🎧 Attach audio: ${uid}`);

        const remoteSound = new BABYLON.Sound(
            `voice-${uid}`,
            stream,
            this.scene,
            null,
            {
                streaming: true,
                autoplay: true,
                spatialSound: true,
                maxDistance: AUDIO_CONFIG.MAX_DISTANCE,
                refDistance: AUDIO_CONFIG.REF_DISTANCE,
                // rolloffFactor: AUDIO_CONFIG.ROLLOFF_FACTOR,
                rolloffFactor: AUDIO_CONFIG.ROLLOFF,
                distanceModel: "exponential"
            }
        );

        remoteSound.attachToMesh(mesh);

        this.remoteSounds.set(uid, remoteSound);
    }

    // =====================================
    // 🧹 CLEANUP
    // =====================================
    public removeRemoteStream(uid: string) {
        if (this.remoteSounds.has(uid)) {
            this.remoteSounds.get(uid)?.dispose();
            this.remoteSounds.delete(uid);
            console.log(`🔕 Removed audio: ${uid}`);
        }
    }

    public dispose() {
        this.remoteSounds.forEach(s => s.dispose());
        this.remoteSounds.clear();

        if (this.socket) {
            this.socket.disconnect();
        }
    }
}