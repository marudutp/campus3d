import { onAuthStateChanged, User } from "firebase/auth";
import { auth } from "./firebase/config";

import { loadStudentDashboard } from "./pages/studentDashboard";
import { loadTeacherDashboard } from "./pages/teacherDashboard";
import { loadWaitingRoom } from "./pages/waitingRoom";
import { loadClassroom } from "./pages/classroom";

import {
  initLanding,
  loadLandingClasses
} from "./landing";

import { runSeeder } from "./seeder";

// =====================================
// 🌐 DOM ELEMENTS
// =====================================
const landing =
  document.getElementById(
    "landing-page"
  ) as HTMLElement;

const app =
  document.getElementById(
    "app"
  ) as HTMLElement;

// =====================================
// 🚀 INIT APP
// =====================================
async function boot() {
  try {
    await loadLandingClasses();
  } catch (err) {
    console.error(
      "❌ Gagal load landing:",
      err
    );
  }

  initLanding();
}

boot();

// =====================================
// 🧪 TEMP SEEDER
// Jalankan di console:
// seed()
// =====================================
// (window as any).seed = runSeeder;

// =====================================
// 🔐 AUTH STATE
// SINGLE ENTRY POINT
// =====================================
onAuthStateChanged(
  auth,
  async (
    user: User | null
  ) => {
    console.log(
      "🔥 AUTH STATE:",
      user?.uid ||
      "guest"
    );

    // ===============================
    // BELUM LOGIN
    // ===============================
    if (!user) {
      showLanding();
      return;
    }

    // ===============================
    // SUDAH LOGIN
    // ===============================
    await onUserReady(
      user
    );
  }
);

// =====================================
// 👤 USER READY
// =====================================
async function onUserReady(
  user: User
) {
  hideLanding();

  const role =
    localStorage.getItem(
      "role"
    );

  console.log(
    "🔥 ROLE:",
    role
  );

  if (!role) {
    console.warn(
      "⚠️ Role belum dipilih"
    );

    showLanding();
    return;
  }

  // =================================
  // ROUTING CHECK
  // =================================
  const path =
    window.location.pathname;

  const params =
    new URLSearchParams(
      window.location.search
    );
  const page =
    params.get("page");

  const classId =
    params.get(
      "classId"
    );

  // =================================
  // WAITING ROOM
  // contoh:
  // /waiting-room.html?classId=abc123
  // =================================
  if (
    path.includes("waiting-room") ||
    path.includes("waitingRoom") ||
    page === "waiting-room"
  ) {
    console.log(
      "⏳ LOAD WAITING ROOM"
    );

    await loadWaitingRoom();
    return;
  }

  // =================================
  // CLASSROOM
  // future route
  // /classroom.html?classId=abc123
  // =================================
  if (
    (
      path.includes("classroom") ||
      page === "classroom"
    ) &&
    classId
  ) {
    console.log(
      "🎮 CLASSROOM ROUTE DETECTED:",
      classId
    );

    await loadClassroom();

    return;
  }

  // =================================
  // DASHBOARD DEFAULT
  // =================================
  if (
    role ===
    "teacher"
  ) {
    console.log(
      "🚀 LOAD TEACHER DASHBOARD"
    );

    await loadTeacherDashboard(
      user.uid
    );
  } else {
    console.log(
      "🚀 LOAD STUDENT DASHBOARD"
    );

    await loadStudentDashboard(
      user.uid
    );
  }
}

// =====================================
// SHOW LANDING
// =====================================
function showLanding() {
  landing.style.display =
    "block";

  app.innerHTML = "";
}

// =====================================
// HIDE LANDING
// =====================================
function hideLanding() {
  landing.style.display =
    "none";
}