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
  // FETCH CLASSROOM TYPE FROM CLASS
  // ====================================
  const classRef = doc(db, "classes", classId);
  const classSnap = await getDoc(classRef);
  const classroomType = classSnap.exists() ? (classSnap.data() as any).classroomType || "classroom.glb" : "classroom.glb";

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
    // window.location.href = `/waiting-room.html?classId=${classId}`;
    window.location.href =
      `/waiting-room?classId=${classId}`;
    return;
  }

  // ====================================
  // UI SHELL
  // ====================================
  //   app.innerHTML = `
  //     <div class="w-screen h-screen relative bg-black">
  //       <canvas id="renderCanvas" class="w-full h-full touch-none"></canvas>
  //       <div class="absolute top-4 left-4 bg-black/50 text-white px-4 py-2 rounded-xl text-sm">
  //         🎓 Class: ${classId}
  //       </div>
  //      <div class="absolute top-4 right-4 flex gap-2 z-50">
  //   <button id="leaveBtn" class="bg-red-500 px-4 py-2 rounded-lg text-white">
  //     Leave
  //   </button>
  // </div>
  //       <div id="loadingText" class="absolute inset-0 flex items-center justify-center text-white text-xl bg-black z-10">
  //         Loading Classroom...
  //       </div>
  //     </div>
  //   `;
  console.log(
    "🔥 SESSION DATA:",
    session
  );
  app.innerHTML = `
  <div class="w-screen h-screen relative overflow-hidden">

    <canvas
      id="renderCanvas"
      class="absolute inset-0 w-full h-full touch-none"
    ></canvas>

    <div
      class="absolute top-4 left-4 z-[1000]
      bg-black/70 text-white px-4 py-2 rounded-xl text-sm"
    >
      // 🎓 Class: ${classId}
      🎓 ${session.className || "Untitled Class"}
      <br>
👨‍🏫      ${session.teacherName || "Unknown Teacher"}
    </div>

    <div
      class="absolute top-4 right-4 z-[1000] flex gap-2"
    >
      <button
        id="leaveBtn"
        class="bg-red-500 hover:bg-red-600
        px-4 py-2 rounded-lg text-white shadow-lg"
      >
        Leave
      </button>
    </div>

    <!-- Floating Showcase Button (Teacher Only) -->
    <div
      id="showcaseControl"
      class="fixed bottom-6 right-6 z-[900] hidden flex-col gap-2"
    >
      <button
        id="showcaseBtn"
        class="bg-gradient-to-r from-purple-500 to-pink-500 
        hover:from-purple-600 hover:to-pink-600
        px-6 py-3 rounded-full text-white font-bold shadow-2xl
        transform transition hover:scale-105 flex items-center gap-2"
      >
        🎪 Showcase
      </button>
      <div
        id="showcaseMenu"
        class="bg-black/80 rounded-lg p-3 hidden flex-col gap-2 min-w-[150px]"
      >
        <button
          id="loadEarthBtn"
          class="bg-blue-500 hover:bg-blue-600 px-3 py-2 rounded text-white text-sm transition"
        >
          🌍 Load Earth
        </button>
        <button
          id="removeShowcaseBtn"
          class="bg-red-500 hover:bg-red-600 px-3 py-2 rounded text-white text-sm transition"
        >
          ❌ Remove
        </button>
      </div>
    </div>

    <div
      id="loadingText"
      class="absolute inset-0 z-[999]
      flex items-center justify-center
      text-white text-xl bg-black"
    >
      Loading Classroom...
    </div>

  </div>
`;
  console.log(
    "🔥 CLASSROOM HTML LOADED"
  );

  console.log(
    document.getElementById("leaveBtn")
  );
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
      },
      classroomType: classroomType
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

  // ====================================
  // SHOWCASE BUTTON - TEACHER ONLY
  // ====================================
  const role = localStorage.getItem("role") || "student";
  const showcaseControl = document.getElementById("showcaseControl");
  const showcaseBtn = document.getElementById("showcaseBtn");
  const showcaseMenu = document.getElementById("showcaseMenu");
  const loadEarthBtn = document.getElementById("loadEarthBtn");
  const removeShowcaseBtn = document.getElementById("removeShowcaseBtn");

  if (role === "teacher" && showcaseControl) {
    showcaseControl.classList.remove("hidden");
    showcaseControl.classList.add("flex");

    // Toggle menu
    showcaseBtn?.addEventListener("click", () => {
      showcaseMenu?.classList.toggle("hidden");
    });

    // Load Earth
    loadEarthBtn?.addEventListener("click", async () => {
      const networkManager = (window as any).networkManager;
      if (networkManager && networkManager.movementSocket) {
        networkManager.movementSocket.emit("showcase-load", {
          filename: "earth.glb",
          userId: user.uid,
          displayName: user.displayName
        });
        console.log("📡 Showcase load event sent: earth.glb");
      }
      showcaseMenu?.classList.add("hidden");
    });

    // Remove Showcase
    removeShowcaseBtn?.addEventListener("click", async () => {
      const networkManager = (window as any).networkManager;
      if (networkManager && networkManager.movementSocket) {
        networkManager.movementSocket.emit("showcase-remove", {
          userId: user.uid
        });
        console.log("📡 Showcase remove event sent");
      }
      showcaseMenu?.classList.add("hidden");
    });
  }

  // ====================================
  // LISTEN FOR SHOWCASE EVENTS (ALL USERS)
  // ====================================
  setTimeout(() => {
    const networkManager = (window as any).networkManager;
    if (networkManager && networkManager.movementSocket) {
      const socket = networkManager.movementSocket;

      socket.on("showcase-load", (data: any) => {
        console.log("📡 Received showcase-load:", data);
        const scene = (window as any).scene;
        const showcaseObj = (window as any).showcaseObject;

        if (showcaseObj) {
          showcaseObj.dispose();
        }

        loadShowcaseObject(scene, data.filename);
      });

      socket.on("showcase-remove", () => {
        console.log("📡 Received showcase-remove");
        const showcaseObj = (window as any).showcaseObject;
        if (showcaseObj) {
          showcaseObj.dispose();
          (window as any).showcaseObject = null;
          console.log("✅ Showcase object removed");
        }
      });
    }
  }, 1000);
}

// ====================================
// LOAD SHOWCASE OBJECT
// ====================================
async function loadShowcaseObject(scene: any, filename: string) {
  try {
    const { SceneLoader } = await import("@babylonjs/core");
    await import("@babylonjs/loaders/glTF");

    const result = await SceneLoader.ImportMeshAsync(
      "",
      "/assets/showcases/",
      filename,
      scene
    );

    const root = result.meshes[0];
    console.log("✅ Showcase object loaded:", filename);

    // Center dan scale
    const bounding = root.getHierarchyBoundingVectors(true);
    const height = bounding.max.y - bounding.min.y;
    const targetHeight = 5;
    const scaleFactor = targetHeight / height;
    root.scaling.setAll(scaleFactor);
    root.computeWorldMatrix(true);

    // Position di depan kamera
    root.position.set(0, 1, 5);

    // Simpan reference global
    (window as any).showcaseObject = root;

    console.log("🎪 Showcase displayed!");
  } catch (err) {
    console.error("❌ Failed to load showcase:", err);
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
