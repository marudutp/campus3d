import {
  doc,
  getDoc,
  onSnapshot
} from "firebase/firestore";

import { db } from "../firebase/config";
import { currentUser } from "../firebase/auth";

// ========================================
// CAMPUS3D WAITING ROOM FINAL
// route example:
// /waiting-room.html?classId=abc123
// ========================================

export async function loadWaitingRoom() {
  const app =
    document.getElementById("app")!;

  const params =
    new URLSearchParams(
      window.location.search
    );

  const classId =
    params.get("classId");

  if (!classId) {
    app.innerHTML = `
      <div class="min-h-screen bg-[#020617] text-white flex items-center justify-center">
        Invalid class ID
      </div>
    `;
    return;
  }

  const user = currentUser;

  if (!user) {
    window.location.href = "/";
    return;
  }

  // ========================================
  // Load class data
  // ========================================
  const classRef = doc(
    db,
    "classes",
    classId
  );

  const classSnap =
    await getDoc(classRef);

  if (!classSnap.exists()) {
    app.innerHTML = `
      <div class="min-h-screen bg-[#020617] text-white flex items-center justify-center">
        Class not found
      </div>
    `;
    return;
  }

  const cls: any =
    classSnap.data();

  // ========================================
  // UI
  // ========================================
  app.innerHTML = `
    <div class="min-h-screen bg-[#020617] text-white px-6 py-10">

      <div class="max-w-3xl mx-auto">

        <div class="glass-card p-8 rounded-2xl">

          <div class="text-center mb-8">

            <h1 class="text-3xl font-bold mb-2">
              🎓 ${cls.title}
            </h1>

            <p class="text-gray-400">
              by ${cls.instructorName || "Instructor"}
            </p>

          </div>

          <div class="grid md:grid-cols-3 gap-4 mb-8">

            <div class="bg-black/20 rounded-xl p-4 text-center">
              <p class="text-sm text-gray-400 mb-1">
                Status
              </p>

              <p
                id="statusText"
                class="text-yellow-400 font-semibold"
              >
                Waiting
              </p>
            </div>

            <div class="bg-black/20 rounded-xl p-4 text-center">
              <p class="text-sm text-gray-400 mb-1">
                Participants
              </p>

              <p
                id="onlineCount"
                class="text-[#00CED1] font-semibold"
              >
                0
              </p>
            </div>

            <div class="bg-black/20 rounded-xl p-4 text-center">
              <p class="text-sm text-gray-400 mb-1">
                Countdown
              </p>

              <p
                id="countdown"
                class="text-green-400 font-semibold"
              >
                --
              </p>
            </div>

          </div>

          <div class="bg-black/20 rounded-xl p-5 mb-6">

            <h3 class="font-semibold mb-3">
              🚀 Before Class Starts
            </h3>

            <ul class="text-sm text-gray-400 space-y-2">
              <li>• Use headphones for better audio</li>
              <li>• Prepare microphone if needed</li>
              <li>• Stable internet recommended</li>
              <li>• You will enter automatically</li>
            </ul>

          </div>

          <div class="flex gap-3 flex-wrap">

            <button
              id="refreshBtn"
              class="bg-[#00CED1] text-black px-4 py-2 rounded-lg font-semibold"
            >
              Refresh
            </button>

            <button
              id="homeBtn"
              class="bg-white/10 px-4 py-2 rounded-lg"
            >
              Dashboard
            </button>

          </div>

        </div>

      </div>

    </div>
  `;

  // ========================================
  // Buttons
  // ========================================
  document.getElementById(
    "refreshBtn"
  )!.onclick = () => {
    window.location.reload();
  };

  document.getElementById(
    "homeBtn"
  )!.onclick = () => {
    window.location.href = "/";
  };

  // ========================================
  // Listen session status
  // ========================================
  const sessionRef = doc(
    db,
    "sessions",
    classId
  );

  onSnapshot(
    sessionRef,
    (snap) => {
      if (!snap.exists()) {
        return;
      }

      const session: any =
        snap.data();

      const statusText =
        document.getElementById(
          "statusText"
        )!;

      const onlineCount =
        document.getElementById(
          "onlineCount"
        )!;

      const countdown =
        document.getElementById(
          "countdown"
        )!;

      statusText.textContent =
        capitalize(
          session.status ||
            "waiting"
        );

      onlineCount.textContent =
        String(
          session.onlineCount ||
            0
        );

      // ====================================
      // Waiting
      // ====================================
      if (
        session.status ===
        "waiting"
      ) {
        statusText.className =
          "text-yellow-400 font-semibold";
      }

      // ====================================
      // Live → redirect
      // ====================================
      if (
        session.status ===
        "live"
      ) {
        statusText.className =
          "text-green-400 font-semibold";

        countdown.textContent =
          "Entering...";

        setTimeout(() => {
          window.location.href =
            `/classroom.html?classId=${classId}`;
        }, 1500);
      }

      // ====================================
      // Ended
      // ====================================
      if (
        session.status ===
        "ended"
      ) {
        statusText.className =
          "text-red-400 font-semibold";

        countdown.textContent =
          "Finished";
      }

      // ====================================
      // Countdown logic
      // ====================================
      if (
        session.startAt &&
        session.status ===
          "waiting"
      ) {
        startCountdown(
          session.startAt
        );
      }
    }
  );
}

// ========================================
// Countdown
// ========================================
function startCountdown(
  startAt: any
) {
  const target =
    new Date(startAt).getTime();

  const el =
    document.getElementById(
      "countdown"
    );

  const timer =
    setInterval(() => {
      if (!el) {
        clearInterval(timer);
        return;
      }

      const now =
        Date.now();

      const diff =
        target - now;

      if (diff <= 0) {
        el.textContent =
          "Starting...";
        clearInterval(timer);
        return;
      }

      const mins =
        Math.floor(
          diff / 60000
        );

      const secs =
        Math.floor(
          (diff %
            60000) /
            1000
        );

      el.textContent =
        `${pad(mins)}:${pad(
          secs
        )}`;
    }, 1000);
}

// ========================================
// Helpers
// ========================================
function pad(
  num: number
) {
  return String(
    num
  ).padStart(2, "0");
}

function capitalize(
  text: string
) {
  return (
    text.charAt(0)
      .toUpperCase() +
    text.slice(1)
  );
}