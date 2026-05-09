// export class PeerVoice {
//     private pc: RTCPeerConnection;

//     constructor(private network: any, private onRemote: (stream: MediaStream) => void) {
//         this.pc = new RTCPeerConnection({
//             // Port 19302 adalah port standar Google STUN
//             iceServers: [{ urls: "stun:stun.l.google.com:19302" }]
//         });

//         this.pc.ontrack = (e) => {
//             console.log("🔊 Track audio diterima dari peer!");
//             if (e.streams && e.streams[0]) {
//                 // Jangan buat elemen audio di sini, biarkan VoiceManager yang urus
//                 // agar Spatial Audio (Volume jarak) berfungsi!
//                 this.onRemote(e.streams[0]);
//             }
//         };

//         this.pc.onicecandidate = (e) => {
//             if (e.candidate) {
//                 // Pastikan struktur pengiriman ICE sesuai dengan listener di server
//                 this.network.socket.emit('voice-ice', { 
//                     candidate: e.candidate 
//                 });
//             }
//         };
//     }

//     attachLocalStream(stream: MediaStream) {
//         // Tambahkan track lokal (Mic kita) ke koneksi untuk dikirim ke orang lain
//         stream.getTracks().forEach(track => this.pc.addTrack(track, stream));
//     }

//     async createOffer() {
//         const offer = await this.pc.createOffer();
//         await this.pc.setLocalDescription(offer);
//         // Pastikan struktur pengiriman Offer sesuai dengan listener di server
//         this.network.socket.emit('voice-offer', { offer: offer });
//     }

//     async handleOffer(offer: any) {
//         await this.pc.setRemoteDescription(new RTCSessionDescription(offer));
//         const answer = await this.pc.createAnswer();
//         await this.pc.setLocalDescription(answer);
//         // Pastikan struktur pengiriman Answer sesuai dengan listener di server
//         this.network.socket.emit('voice-answer', { answer: answer });
//     }

//     async handleAnswer(answer: any) {
//         await this.pc.setRemoteDescription(new RTCSessionDescription(answer));
//     }

//     async addIce(candidate: any) {
//         try {
//             await this.pc.addIceCandidate(new RTCIceCandidate(candidate));
//         } catch (e) {
//             console.warn("⚠️ Gagal menambahkan ICE Candidate:", e);
//         }
//     }
// }

// export class PeerVoice {
//     private pc: RTCPeerConnection;
//     public onRemoteStream?: (stream: MediaStream) => void;
//     constructor(private network: any, private onRemote: (stream: MediaStream) => void) {
//         this.pc = new RTCPeerConnection({
//             iceServers: [{ urls: "stun:stun.l.google.com:19302" }]
//         });

//         this.pc.ontrack = (e) => {
//             if (e.streams && e.streams[0]) this.onRemote(e.streams[0]);
//         };

//         this.pc.onicecandidate = (e) => {
//             if (e.candidate) this.network.socket.emit('voice-ice', { candidate: e.candidate });
//         };
//     }

//     attachLocalStream(stream: MediaStream) {
//         stream.getTracks().forEach(track => this.pc.addTrack(track, stream));
//     }

//     async createOffer() {
//         const offer = await this.pc.createOffer();
//         await this.pc.setLocalDescription(offer);
//         this.network.socket.emit('voice-offer', { offer });
//     }

//     async handleOffer(offer: any) {
//         await this.pc.setRemoteDescription(new RTCSessionDescription(offer));
//         const answer = await this.pc.createAnswer();
//         await this.pc.setLocalDescription(answer);
//         this.network.socket.emit('voice-answer', { answer });
//     }

//     async handleAnswer(answer: any) {
//         await this.pc.setRemoteDescription(new RTCSessionDescription(answer));
//     }

//     async addIce(candidate: any) {
//         await this.pc.addIceCandidate(new RTCIceCandidate(candidate));
//     }
// }

// export class PeerVoice {
//     private pc: RTCPeerConnection;
//     // TAMBAHKAN INI: Properti publik agar bisa diisi dari main.ts
//     public onRemoteStream?: (stream: MediaStream) => void;

//     constructor(private network: any) { // Hapus argument onRemote di constructor
//         this.pc = new RTCPeerConnection({
//             iceServers: [{ urls: "stun:stun.l.google.com:19302" }]
//         });

//         this.pc.ontrack = (e) => {
//             if (e.streams && e.streams[0]) {
//                 console.log("🔊 Track audio diterima!");
//                 // Panggil onRemoteStream jika sudah diisi
//                 if (this.onRemoteStream) {
//                     this.onRemoteStream(e.streams[0]);
//                 }
//             }
//         };

//         this.pc.onicecandidate = (e) => {
//             if (e.candidate) {
//                 this.network.socket.emit('voice-ice', { candidate: e.candidate });
//             }
//         };
//     }

//     attachLocalStream(stream: MediaStream) {
//         stream.getTracks().forEach(track => this.pc.addTrack(track, stream));
//     }

//     async createOffer() {
//         const offer = await this.pc.createOffer();
//         await this.pc.setLocalDescription(offer);
//         this.network.socket.emit('voice-offer', { offer });
//     }

//     async handleOffer(offer: any) {
//         await this.pc.setRemoteDescription(new RTCSessionDescription(offer));
//         const answer = await this.pc.createAnswer();
//         await this.pc.setLocalDescription(answer);
//         this.network.socket.emit('voice-answer', { answer });
//     }

//     async handleAnswer(answer: any) {
//         await this.pc.setRemoteDescription(new RTCSessionDescription(answer));
//     }

//     async addIce(candidate: any) {
//         try {
//             await this.pc.addIceCandidate(new RTCIceCandidate(candidate));
//         } catch (e) { console.warn("ICE Error:", e); }
//     }
// }

import { NetworkManager } from "../network/NetworkManager";

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