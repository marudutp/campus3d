// import { NetworkManager } from "./NetworkManager";

// export class PeerVoice {
//     public peerConnection: RTCPeerConnection;
//     private networkManager: NetworkManager;
//     private remoteUid: string;

//     constructor(networkManager: NetworkManager, remoteUid: string) {
//         this.networkManager = networkManager;
//         this.remoteUid = remoteUid;

//         // Gunakan STUN Google agar bisa tembus firewall
//         this.peerConnection = new RTCPeerConnection({
//             iceServers: [{ urls: "stun:stun.l.google.com:19302" }]
//         });

//         this.setupHandlers();
//     }

//     private setupHandlers() {
//         // Kirim alamat ICE ke kawan sebelah
//         this.peerConnection.onicecandidate = (event) => {
//             if (event.candidate) {
//                 this.networkManager.sendIceCandidate(this.remoteUid, event.candidate);
//             }
//         };

//         // SAAT SUARA DITERIMA (Output ke Speaker)
//         this.peerConnection.ontrack = (event) => {
//             console.log(`🔊 Suara dari ${this.remoteUid} masuk!`);
//             const audio = new Audio();
//             audio.srcObject = event.streams[0];
//             audio.autoplay = true; // Langsung nyala
            
//             // Masukkan ke body agar tidak di-garbage collect oleh browser
//             document.body.appendChild(audio);
            
//             // Paksa putar jika tertahan browser
//             audio.play().catch(() => {
//                 console.warn("⚠️ Audio ditahan, butuh interaksi user di layar!");
//             });
//         };
//     }
// }

import { NetworkManager } from "./NetworkManager";

export class PeerVoice {
    public peerConnection: RTCPeerConnection;

    private networkManager: NetworkManager;
    private remoteUid: string;

    private audioElement: HTMLAudioElement | null = null;

    // posisi player remote
    private currentPosition = {
        x: 0,
        y: 0,
        z: 0
    };

    // posisi local player
    private listenerPosition = {
        x: 0,
        y: 0,
        z: 0
    };

    constructor(networkManager: NetworkManager, remoteUid: string) {
        this.networkManager = networkManager;
        this.remoteUid = remoteUid;

        // STUN Google
        this.peerConnection = new RTCPeerConnection({
            iceServers: [
                {
                    urls: "stun:stun.l.google.com:19302"
                }
            ]
        });

        this.setupHandlers();
    }

    private setupHandlers() {

        // =========================
        // ICE CANDIDATE
        // =========================
        this.peerConnection.onicecandidate = (event) => {

            if (event.candidate) {

                this.networkManager.sendIceCandidate(
                    this.remoteUid,
                    event.candidate
                );
            }
        };

        // =========================
        // AUDIO TRACK RECEIVED
        // =========================
        this.peerConnection.ontrack = (event) => {

            console.log(`🔊 Voice masuk dari ${this.remoteUid}`);

            const audio = new Audio();

            audio.srcObject = event.streams[0];

            audio.autoplay = true;

            audio.volume = 1;

            // simpan reference
            this.audioElement = audio;

            // append supaya browser tidak garbage collect
            document.body.appendChild(audio);

            audio.play().catch((err) => {
                console.warn(
                    "⚠️ Browser menahan autoplay audio:",
                    err
                );
            });

            // update spatial volume pertama kali
            this.updateSpatialAudio();
        };
    }

    // =========================================
    // UPDATE POSITION REMOTE PLAYER
    // =========================================
    public updatePosition(position: any) {

        this.currentPosition = {
            x: position.x || 0,
            y: position.y || 0,
            z: position.z || 0
        };

        this.updateSpatialAudio();
    }

    // =========================================
    // UPDATE POSITION LOCAL PLAYER
    // =========================================
    public updateListenerPosition(position: any) {

        this.listenerPosition = {
            x: position.x || 0,
            y: position.y || 0,
            z: position.z || 0
        };

        this.updateSpatialAudio();
    }

    // =========================================
    // SPATIAL AUDIO SIMULATION
    // =========================================
    private updateSpatialAudio() {

        if (!this.audioElement) return;

        const dx =
            this.currentPosition.x -
            this.listenerPosition.x;

        const dy =
            this.currentPosition.y -
            this.listenerPosition.y;

        const dz =
            this.currentPosition.z -
            this.listenerPosition.z;

        const distance = Math.sqrt(
            dx * dx +
            dy * dy +
            dz * dz
        );

        // =========================
        // CONFIG
        // =========================
        const MAX_DISTANCE = 40;

        const MIN_VOLUME = 0;

        const MAX_VOLUME = 1;

        // =========================
        // NORMALIZED DISTANCE
        // =========================
        let volume =
            1 - (distance / MAX_DISTANCE);

        volume = Math.max(
            MIN_VOLUME,
            Math.min(MAX_VOLUME, volume)
        );

        this.audioElement.volume = volume;

        // debug
        // console.log(
        //     `[VOICE] ${this.remoteUid} distance=${distance.toFixed(2)} volume=${volume.toFixed(2)}`
        // );
    }

    // =========================================
    // CLEANUP
    // =========================================
    public dispose() {

        if (this.audioElement) {

            this.audioElement.pause();

            this.audioElement.srcObject = null;

            this.audioElement.remove();

            this.audioElement = null;
        }

        this.peerConnection.close();
    }
}