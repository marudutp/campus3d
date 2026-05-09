import { doc, setDoc, getDoc } from "firebase/firestore";
import { db } from "../firebase/config";
import { currentUser } from "../firebase/auth";

import { createPioneerScene } from "../legacy-engine/scene";
import { io } from "socket.io-client";
import { Vector3, Mesh, MeshBuilder } from "@babylonjs/core";
import { VoiceManager } from "../legacy-engine/voice/VoiceManager";
import { updateDoc, deleteField } from "firebase/firestore";
import { startEngine } from "../legacy-engine/main.js"; // ✅ Perbaiki path ke legacy-engine
// optional nanti:
/// import { NetworkManager } from "../network/NetworkManager";

export async function loadClassroom() {
  const app = document.getElementById("app")!;
  const params = new URLSearchParams(window.location.search);
  const classId = params.get("classId");

  if (!classId) {
    app.innerHTML = errorBox("Class ID tidak ditemukan");
    return;
  }

  const user = currentUser;
  if (!user) {
    window.location.href = "/";
    return;
  }

  // ====================================
  // CEK SESSION LIVE
  // ====================================
  const sessionRef = doc(db, "sessions", classId);

  await setDoc(
    sessionRef,
    {
      participants: {
        [user.uid]: {
          uid: user.uid,
          role: localStorage.getItem("role") || "student",
          joinedAt: Date.now()
        }
      }
    },
    { merge: true }
  );

  await updateDoc(sessionRef, {
    [`participants.${user.uid}`]: deleteField()
  });

  const sessionSnap = await getDoc(sessionRef);

  if (!sessionSnap.exists()) {
    window.location.href = `/waiting-room.html?classId=${classId}`;
    return;
  }

  const session: any = sessionSnap.data();

  if (session.status !== "live") {
    window.location.href = `/waiting-room.html?classId=${classId}`;
    return;
  }

  // ====================================
  // UI SHELL
  // ====================================
  app.innerHTML = `
    <div class="w-screen h-screen relative bg-black">
      <canvas id="renderCanvas" class="w-full h-full touch-none"></canvas>
      <div class="absolute top-4 left-4 bg-black/50 text-white px-4 py-2 rounded-xl text-sm">
        🎓 Class: ${classId}
      </div>
      <div class="absolute top-4 right-4 flex gap-2">
        <button id="leaveBtn" class="bg-red-500 px-4 py-2 rounded-lg text-white">
          Leave
        </button>
      </div>
      <div id="loadingText" class="absolute inset-0 flex items-center justify-center text-white text-xl bg-black z-10">
        Loading Classroom...
      </div>
    </div>
  `;

  // ====================================
  // 🔥 PAKAI startEngine TAPI TETAP GUNAKAN user DARI currentUser
  // ====================================
  try {
    const role = localStorage.getItem("role") || "student";
    
    console.log("🎮 Starting engine with user:", user.uid, role);
    
    await startEngine({
      sessionId: classId,
      user: {
        uid: user.uid,                    // ✅ user dari currentUser
        displayName: user.displayName || "User",
        role: role
      }
    });

    console.log("✅ Engine started - Avatar should appear");

    const loading = document.getElementById("loadingText");
    if (loading) loading.remove();

  } catch (err) {
    console.error("❌ startEngine error:", err);
    app.innerHTML = errorBox("Gagal memuat classroom: " + (err instanceof Error ? err.message : String(err)));
  }

  // ====================================
  // LEAVE BUTTON
  // ====================================
  const leaveBtn = document.getElementById("leaveBtn");
  if (leaveBtn) {
    leaveBtn.onclick = () => {
      window.location.href = "/dashboard.html";
    };
  }
}

// function errorBox(text: string) {
//   return `
//     <div class="min-h-screen bg-[#020617] text-white flex items-center justify-center">
//       <div class="text-center">
//         <p class="text-red-400 text-xl mb-4">❌ Error</p>
//         <p>${text}</p>
//         <button onclick="window.location.href='/dashboard.html'" class="mt-4 bg-[#00CED1] text-black px-4 py-2 rounded-lg">
//           Back to Dashboard
//         </button>
//       </div>
//     </div>
//   `;
// }

// ====================================
// HELPER
// ====================================
function spawnAvatar(scene: any, data: any) {
  let avatar = scene.getMeshByName(data.uid);

  if (avatar) return;

  avatar = MeshBuilder.CreateCapsule(
    data.uid,
    { height: 2 },
    scene
  );

  avatar.position = new Vector3(
    data.x || 0,
    data.y || 0,
    data.z || 0
  );

  console.log("🧍 Spawn avatar:", data.uid);
}

function errorBox(
  text: string
) {
  return `
    <div class="min-h-screen bg-[#020617] text-white flex items-center justify-center">
      ${text}
    </div>
  `;
}
function initMovement(
  scene: any,
  classId: string,
  user: any
) {
  const socket = io("https://localhost:8080");

  // ====================================
  // JOIN ROOM
  // ====================================
  // socket.emit("join-room", {
  //   classId,
  //   userId
  // });
  socket.emit("auth_join", {
    uid: user.uid,
    displayName: user.displayName || "Guest",
    role: localStorage.getItem("role") || "student"
  });
  console.log("🚀 Connected to movement server");

  socket.on("currentPlayers", (players: any) => {
    console.log("👥 currentPlayers:", players);

    Object.values(players).forEach((p: any) => {
      if (p.uid === user.uid) return;

      spawnAvatar(scene, p);
    });
  });
  // ====================================
  // LOCAL PLAYER (CAMERA TARGET)
  // ====================================
  const camera = scene.activeCamera;

  // ====================================
  // SEND POSITION LOOP
  // ====================================
  scene.onBeforeRenderObservable.add(() => {
    if (!camera) return;

    const pos = camera.target;

    socket.emit("move", {
      classId,
      user,
      position: {
        x: pos.x,
        y: pos.y,
        z: pos.z
      }
    });
  });

  // ====================================
  // RECEIVE PLAYER MOVEMENT
  // ====================================
  // socket.on("player-move", (data: any) => {
  //   const { userId: otherId, position } = data;

  //   if (otherId === userId) return;

  //   let avatar = scene.getMeshByName(otherId);

  //   // kalau belum ada → spawn sederhana
  //   if (!avatar) {
  //     avatar = Mesh.CreateCapsule(
  //       otherId,
  //       { height: 2 },
  //       scene
  //     );

  //     avatar.position = new Vector3(
  //       position.x,
  //       position.y,
  //       position.z
  //     );
  //   } else {
  //     avatar.position.set(
  //       position.x,
  //       position.y,
  //       position.z
  //     );
  //   }
  // });
  socket.on("avatar_update", (data: any) => {
    const avatar = scene.getMeshByName(data.uid);
    if (!avatar) return;

    avatar.position.set(
      data.position.x,
      data.position.y,
      data.position.z
    );
  });

  socket.on("user_left", (uid: string) => {
    const avatar = scene.getMeshByName(uid);
    if (avatar) avatar.dispose();

    console.log("❌ Remove avatar:", uid);
  });

  // ====================================
  // DISCONNECT CLEANUP
  // ====================================
  socket.on("player-leave", (id: string) => {
    const avatar = scene.getMeshByName(id);
    if (avatar) avatar.dispose();
  });
}
