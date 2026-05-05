import { doc, getDoc } from "firebase/firestore";
import { db } from "../firebase/config";
import { currentUser } from "../firebase/auth";

import { createPioneerScene } from "../legacy-engine/scene";
import { io } from "socket.io-client";
import { Vector3, Mesh } from "@babylonjs/core";
import { VoiceManager } from "../legacy-engine/voice/VoiceManager";
// optional nanti:
/// import { NetworkManager } from "../network/NetworkManager";

export async function loadClassroom() {
  const app =
    document.getElementById("app")!;

  const params =
    new URLSearchParams(
      window.location.search
    );

  const classId =
    params.get("classId");

  if (!classId) {
    app.innerHTML =
      errorBox(
        "Class ID tidak ditemukan"
      );
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
  const sessionRef =
    doc(
      db,
      "sessions",
      classId
    );

  const sessionSnap =
    await getDoc(
      sessionRef
    );

  if (
    !sessionSnap.exists()
  ) {
    window.location.href =
      `/waiting-room.html?classId=${classId}`;
    return;
  }

  const session: any =
    sessionSnap.data();

  if (
    session.status !==
    "live"
  ) {
    window.location.href =
      `/waiting-room.html?classId=${classId}`;
    return;
  }

  // ====================================
  // UI SHELL
  // ====================================
  app.innerHTML = `
    <div class="w-screen h-screen relative bg-black">

      <canvas
        id="renderCanvas"
        class="w-full h-full touch-none"
      ></canvas>

      <div class="absolute top-4 left-4 bg-black/50 text-white px-4 py-2 rounded-xl text-sm">
        🎓 Class: ${classId}
      </div>

      <div class="absolute top-4 right-4 flex gap-2">

        <button
          id="leaveBtn"
          class="bg-red-500 px-4 py-2 rounded-lg text-white"
        >
          Leave
        </button>

      </div>

      <div
        id="loadingText"
        class="absolute inset-0 flex items-center justify-center text-white text-xl bg-black z-10"
      >
        Loading Classroom...
      </div>

    </div>
  `;

  // ====================================
  // LOAD BABYLON SCENE
  // ====================================
  try {
    const result =
      await createPioneerScene(
        "renderCanvas"
      );

    console.log(
      "✅ Scene Ready:",
      result
    );


    // ====================================
    // 🎧 AUDIO INIT (FIXED)
    // ====================================

    // ====================================
    // 🎧 AUDIO INIT (FIXED)
    // ====================================
    const voice = new VoiceManager(result.scene);

    await voice.init(
      classId as string,
      user!.uid,
      "https://localhost:8081"
    );


    initMovement(
      result.scene,
      classId,
      user.uid
    );
    // future:
    // initMovement(result.scene, classId, user);
    // initVoice(classId, user);

    const loading =
      document.getElementById(
        "loadingText"
      );

    if (loading)
      loading.remove();

  } catch (err) {
    console.error(err);

    app.innerHTML =
      errorBox(
        "Gagal memuat classroom"
      );
  }

  // ====================================
  // LEAVE BUTTON
  // ====================================
  document.getElementById(
    "leaveBtn"
  )!.onclick = () => {
    window.location.href =
      `/dashboard.html`;
  };
}

// ====================================
// HELPER
// ====================================
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
  userId: string
) {
  const socket = io("https://localhost:8080");

  // ====================================
  // JOIN ROOM
  // ====================================
  socket.emit("join-room", {
    classId,
    userId
  });

  console.log("🚀 Connected to movement server");

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
      userId,
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
  socket.on("player-move", (data: any) => {
    const { userId: otherId, position } = data;

    if (otherId === userId) return;

    let avatar = scene.getMeshByName(otherId);

    // kalau belum ada → spawn sederhana
    if (!avatar) {
      avatar = Mesh.CreateCapsule(
        otherId,
        { height: 2 },
        scene
      );

      avatar.position = new Vector3(
        position.x,
        position.y,
        position.z
      );
    } else {
      avatar.position.set(
        position.x,
        position.y,
        position.z
      );
    }
  });

  // ====================================
  // DISCONNECT CLEANUP
  // ====================================
  socket.on("player-leave", (id: string) => {
    const avatar = scene.getMeshByName(id);
    if (avatar) avatar.dispose();
  });
}
