// src/client/network/NetworkManager.ts
import { io, Socket } from "socket.io-client";
import { NETWORK_EVENTS, ROLES } from "@shared/constants";
import { AvatarManager } from "../managers/AvatarManager.js";
import { PeerVoice } from "./PeerVoice.js";
import { WhiteboardManager } from "../managers/WhiteboardManager.js";

export class NetworkManager {
    public movementSocket: any;
    public audioSocket: any;
    private avatarManager: AvatarManager;
    private peerVoices: Map<string, PeerVoice> = new Map();
    private localStream: MediaStream | null = null;

    private isSceneReady: boolean = false;
    private savedOffer: any = null;
    private whiteboardManager: WhiteboardManager | null = null;
    public localUid: string = "";
    public role: string = "";
    
    // Server URLs
    private movementServerUrl: string;
    private audioServerUrl: string;

    constructor(movementServerUrl: string, audioServerUrl: string, avatarManager: AvatarManager) {
        this.avatarManager = avatarManager;
        this.movementServerUrl = movementServerUrl;
        this.audioServerUrl = audioServerUrl;
        
        console.log(`🔌 Connecting to Movement Server: ${movementServerUrl}`);
        console.log(`🎧 Connecting to Audio Server: ${audioServerUrl}`);
        
        // Connect ke Movement Server
        this.movementSocket = io(movementServerUrl, {
            transports: ['websocket', 'polling'],
            reconnection: true,
            reconnectionAttempts: 10,
            reconnectionDelay: 1000,
            timeout: 10000
        });
        
        // Connect ke Audio Server
        this.audioSocket = io(audioServerUrl, {
            transports: ['websocket', 'polling'],
            reconnection: true,
            reconnectionAttempts: 10,
            reconnectionDelay: 1000,
            timeout: 10000
        });
        
        this.setupMovementSocketListeners();
        this.setupAudioSocketListeners();
        
        // Heartbeat untuk movement server
        setInterval(() => {
            if (this.movementSocket && this.movementSocket.connected && this.localUid) {
                this.movementSocket.emit('heartbeat', { uid: this.localUid, timestamp: Date.now() });
            }
        }, 5000);
        
        // Heartbeat untuk audio server
        setInterval(() => {
            if (this.audioSocket && this.audioSocket.connected && this.localUid) {
                this.audioSocket.emit('audio_heartbeat', { uid: this.localUid, timestamp: Date.now() });
            }
        }, 5000);
    }
    
    public setWhiteboardManager(wb: WhiteboardManager) {
        this.whiteboardManager = wb;
        console.log("📡 NetworkManager connected to Whiteboard");
    }

    public joinClass(uid: string, displayName: string, role: string) {
        this.localUid = uid;
        this.role = role;
        
        console.log(`📡 Joining class as ${displayName} (${role})`);
        
        // Join movement server
        this.movementSocket.emit(NETWORK_EVENTS.AUTH_JOIN, { uid, displayName, role });
        
        // Register ke audio server
        this.audioSocket.emit('register_audio', { 
            uid, 
            displayName, 
            role,
            movementSocketId: this.movementSocket.id 
        });
        
        // Beri tahu movement server tentang audio socket ID
        this.movementSocket.emit('register_audio_socket', { 
            uid, 
            audioSocketId: this.audioSocket.id 
        });
    }

    public async startVoiceChat() {
        try {
            this.localStream = await navigator.mediaDevices.getUserMedia({ 
                audio: true,
                video: false 
            });
            console.log("🎤 Microphone access granted!");

            this.peerVoices.forEach(pv => {
                this.addLocalTracksToPeer(pv);
            });
        } catch (e) {
            console.error("❌ Failed to access microphone:", e);
        }
    }

    public sendMovement(position: any, rotation: any) {
        if (this.movementSocket && this.movementSocket.connected) {
            this.movementSocket.emit(NETWORK_EVENTS.AVATAR_UPDATE, {
                uid: this.localUid,
                position: { x: position.x, y: position.y, z: position.z },
                rotation: { x: rotation.x, y: rotation.y, z: rotation.z }
            });
        }
        
        // Also send position to audio server for spatial audio
        if (this.audioSocket && this.audioSocket.connected) {
            this.audioSocket.emit('audio_position_update', {
                uid: this.localUid,
                position: { x: position.x, y: position.y, z: position.z }
            });
        }
    }

    public sendDrawData(data: any) {
        if (this.movementSocket && this.movementSocket.connected) {
            this.movementSocket.emit("drawData", data);
        }
    }

    public sendClearBoard() {
        if (this.movementSocket && this.movementSocket.connected) {
            this.movementSocket.emit("clearBoard");
            console.log("🧹 Clear board command sent");
        }
    }

    public setReady() {
        this.isSceneReady = true;
        if (this.savedOffer) {
            this.handleRemoteOffer(this.savedOffer);
            this.savedOffer = null;
        }
    }

    private setupMovementSocketListeners() {
        this.movementSocket.on('connect', () => {
            console.log('✅ Connected to Movement Server');
        });

        this.movementSocket.on('disconnect', () => {
            console.log('❌ Disconnected from Movement Server');
        });

        this.movementSocket.on('announcement', (message: string) => {
            console.log("📢 Announcement:", message);
            alert("📢 PENGUMUMAN GURU:\n\n" + message);
        });

        this.movementSocket.on('currentPlayers', (players: any) => {
            console.log("📡 Received current players:", Object.keys(players).length);
            
            Object.keys(players).forEach((id) => {
                const p = players[id];
                if (p.uid !== this.localUid) {
                    this.avatarManager.createAvatar(p);
                    this.initWebRTC(p.uid, true);
                }
            });
        });

        this.movementSocket.on(NETWORK_EVENTS.USER_JOINED, (player:any) => {
            console.log(`👋 User joined: ${player.displayName}`);
            if (player.uid !== this.localUid) {
                this.avatarManager.createAvatar(player);
                this.initWebRTC(player.uid, false);
            }
        });

        this.movementSocket.on(NETWORK_EVENTS.USER_LEFT, (uid: string) => {
            console.log(`👋 User left: ${uid}`);
            this.avatarManager.removeAvatar(uid);
            this.peerVoices.delete(uid);
        });

        this.movementSocket.on(NETWORK_EVENTS.AVATAR_UPDATE, (data: any) => {
            if (!data || !data.uid) return;
            if (data.uid === this.localUid) return;
            if (!data.position || !data.rotation) return;

            const payload = {
                x: data.position.x,
                y: data.position.y,
                z: data.position.z,
                ry: data.rotation.y || data.rotation.ry || 0
            };

            this.avatarManager.updateAvatar(data.uid, payload);
        });

        this.movementSocket.on("update-whiteboard-slide", (data: { slideUrl: string }) => {
            if (this.whiteboardManager && data && data.slideUrl) {
                this.whiteboardManager.displaySlide(data.slideUrl);
            }
        });

        this.movementSocket.on("remoteDraw", (data: any) => {
            if (this.whiteboardManager) {
                this.whiteboardManager.drawLocally(
                    data.x1, data.y1,
                    data.x2, data.y2,
                    data.color,
                    data.size
                );
            }
        });

        this.movementSocket.on("clearBoard", () => {
            if (this.whiteboardManager) {
                console.log("🧼 Clear board command received!");
                this.whiteboardManager.clearBoard(false);
            }
        });

        this.movementSocket.on('capacityUpdate', (data: { current: number, max: number }) => {
            console.log("📊 Capacity update:", data);
            const currentEl = document.getElementById('current-cap');
            const maxEl = document.getElementById('max-cap');
            if (currentEl) currentEl.innerText = data.current.toString();
            if (maxEl) maxEl.innerText = data.max.toString();
        });

        this.movementSocket.on('error_message', (data: { title: string, message: string }) => {
            alert(`${data.title}\n\n${data.message}`);
        });
    }
    
    private setupAudioSocketListeners() {
        this.audioSocket.on('connect', () => {
            console.log('✅ Connected to Audio Server');
        });

        this.audioSocket.on('disconnect', () => {
            console.log('❌ Disconnected from Audio Server');
        });

        this.audioSocket.on('audio_current_users', (users: any) => {
            console.log("🎧 Audio current users:", Object.keys(users).length);
            Object.keys(users).forEach((uid) => {
                if (uid !== this.localUid) {
                    this.initWebRTC(uid, true);
                }
            });
        });
        
        this.audioSocket.on('audio_user_joined', (user: { uid: string, displayName: string, role: string }) => {
            console.log(`🎤 Audio user joined: ${user.displayName}`);
            if (user.uid !== this.localUid) {
                this.initWebRTC(user.uid, false);
            }
        });
        
        this.audioSocket.on('audio_user_left', (uid: string) => {
            console.log(`🔇 Audio user left: ${uid}`);
            this.peerVoices.delete(uid);
        });
        
        // WebRTC signaling via audio server
        this.audioSocket.on('audio_offer', (data: any) => {
            if (!this.isSceneReady) {
                this.savedOffer = data;
            } else {
                this.handleRemoteOffer(data);
            }
        });
        
        this.audioSocket.on('audio_answer', (data: any) => {
            const pv = this.peerVoices.get(data.from);
            if (pv) {
                pv.peerConnection.setRemoteDescription(new RTCSessionDescription(data.answer));
            }
        });
        
        this.audioSocket.on('audio_ice_candidate', (data: any) => {
            const pv = this.peerVoices.get(data.from);
            if (pv && data.candidate) {
                pv.peerConnection.addIceCandidate(new RTCIceCandidate(data.candidate));
            }
        });
        
        // Spatial audio position updates
        this.audioSocket.on('audio_position_update', (data: { uid: string, position: { x: number, y: number, z: number } }) => {
            const pv = this.peerVoices.get(data.uid);
            if (pv) {
                pv.updatePosition(data.position);
            }
        });
    }

    private addLocalTracksToPeer(pv: PeerVoice) {
        if (!this.localStream) {
            console.warn("⚠️ Microphone not ready, requesting again...");
            this.startVoiceChat();
            return;
        }

        this.localStream.getTracks().forEach(track => {
            const senders = pv.peerConnection.getSenders();
            const alreadyExists = senders.find(s => s.track === track);
            if (!alreadyExists) {
                pv.peerConnection.addTrack(track, this.localStream!);
                console.log("🎤 Audio track added to peer");
            }
        });
    }

    private async initWebRTC(remoteUid: string, isCaller: boolean) {
        const pv = new PeerVoice(this, remoteUid);
        this.peerVoices.set(remoteUid, pv);

        this.addLocalTracksToPeer(pv);

        if (isCaller) {
            const offer = await pv.peerConnection.createOffer();
            await pv.peerConnection.setLocalDescription(offer);
            this.audioSocket.emit('audio_offer', { offer, toUid: remoteUid });
            console.log(`📞 Sent offer to ${remoteUid}`);
        }
    }

    private async handleRemoteOffer(data: any) {
        let pv = this.peerVoices.get(data.from);
        if (!pv) {
            pv = new PeerVoice(this, data.from);
            this.peerVoices.set(data.from, pv);
        }

        await pv.peerConnection.setRemoteDescription(new RTCSessionDescription(data.offer));

        this.addLocalTracksToPeer(pv);

        const answer = await pv.peerConnection.createAnswer();
        await pv.peerConnection.setLocalDescription(answer);
        this.audioSocket.emit('audio_answer', { answer, toUid: data.from });
        console.log(`📞 Sent answer to ${data.from}`);
    }

    public sendIceCandidate(toUid: string, candidate: RTCIceCandidate) {
        this.audioSocket.emit('audio_ice_candidate', { candidate, toUid });
    }
}