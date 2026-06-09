import { User } from "firebase/auth";
import "./styles/global.css";

import {
  initLanding,
  loadLandingClasses
} from "./landing";

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

// Page module cache
let pageModules: any = null;
let auth: any = null;
let onAuthStateChanged: any = null;

// =====================================
// 🚀 INIT APP (Render Landing First)
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

  // DEFER: Load Firebase & page modules after landing renders
  initFirebaseAndModules();
}

// =====================================
// ⚡ DEFER FIREBASE + PAGE MODULES
// =====================================
async function initFirebaseAndModules() {
  try {
    const { auth: firebaseAuth } = await import("./firebase/config");
    const { onAuthStateChanged: firebaseOnAuthStateChanged } = await import("firebase/auth");
    
    auth = firebaseAuth;
    onAuthStateChanged = firebaseOnAuthStateChanged;

    // Load page modules lazily
    pageModules = await Promise.all([
      import("./pages/studentDashboard"),
      import("./pages/teacherDashboard"),
      import("./pages/waitingRoom"),
      import("./pages/classroom")
    ]);

    // Setup auth listener after modules loaded
    setupAuthListener();
  } catch (err) {
    console.error("❌ Failed to init Firebase/modules:", err);
  }
}

// =====================================
// 🔐 AUTH STATE LISTENER
// =====================================
function setupAuthListener() {
  if (!auth || !onAuthStateChanged) return;

  onAuthStateChanged(
    auth,
    async (user: User | null) => {
      console.log(
        "🔥 AUTH STATE:",
        user?.uid || "guest"
      );

      if (!user) {
        showLanding();
        return;
      }

      await onUserReady(user);
    }
  );
}

boot();

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

  // Destructure page modules from cache
  if (!pageModules) {
    console.error("❌ Page modules not loaded");
    return;
  }

  const { loadStudentDashboard } = pageModules[0];
  const { loadTeacherDashboard } = pageModules[1];
  const { loadWaitingRoom } = pageModules[2];
  const { loadClassroom } = pageModules[3];

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