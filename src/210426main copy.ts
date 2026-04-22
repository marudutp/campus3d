// import "./style.css";

// import { initAuth } from "./firebase/auth";
// import { initLanding } from "./ui/landing";
// import { loadStudentDashboard } from "./ui/studentDashboard";
// import { loadTeacherDashboard } from "./ui/teacherDashboard";
// import { getUserRole, createUser } from "./modules/user";
// import type { User } from "firebase/auth";
// import { loadLandingClasses } from "./ui/landing";
// import { onAuthStateChanged } from "firebase/auth";
// import { auth } from "./firebase/config";

// // 🔥 INIT LANDING
// initLanding();
// loadLandingClasses();

// onAuthStateChanged(auth, (user: User | null) => {
//   if (!user) return;

//   onUserReady(user); // ✅ aman sekarang
// });

// // 🔥 AUTH FLOW
// // onUserReady(async (user: User) => {

// //   console.log("🔥 USER MASUK:", user);

// //   // 🔥 WAJIB: MATIKAN OVERLAY DI AWAL
// //   const overlay = document.getElementById("ui-overlay");
// //   if (overlay) {
// //     overlay.style.opacity = "0";
// //     overlay.style.pointerEvents = "none";
// //   }

// //   // 🔥 hide landing
// //   const landing = document.getElementById("landing-page");
// //   if (landing) landing.style.display = "none";

// //   try {
// //     let role = await getUserRole(user.uid);

// //     if (!role) {
// //       role = localStorage.getItem("role") || "student";
// //       await createUser(user, role);
// //     }

// //     if (role === "teacher") {
// //       loadTeacherDashboard(user.uid);
// //     } else {
// //       loadStudentDashboard(user.uid);
// //     }

// //   } catch (err) {
// //     console.error("❌ ERROR:", err);

// //     // fallback
// //     loadStudentDashboard(user.uid);
// //   }
// // });

// function onUserReady(user: User) {
//   //   // 🔥 WAJIB: MATIKAN OVERLAY DI AWAL
//   const overlay = document.getElementById("ui-overlay");
//   if (overlay) {
//     overlay.style.opacity = "0";
//     overlay.style.pointerEvents = "none";
//   }

//   // 🔥 hide landing
//   const landing = document.getElementById("landing-page");
//   if (landing) landing.style.display = "none";

//   const role = localStorage.getItem("role");

//   if (role === "teacher") {
//     loadTeacherDashboard(user.uid);
//   } else {
//     loadStudentDashboard(user.uid);
//   }
// }

// // 🔥 INIT AUTH
// initAuth();

// import { onAuthStateChanged, User } from "firebase/auth";
// import { auth } from "./firebase/config";

// import { loadStudentDashboard } from "./pages/studentDashboard";
// import { loadTeacherDashboard } from "./pages/teacherDashboard";
// import { initLanding,loadLandingClasses } from "./landing";
// import { runSeeder } from "./seeder";

// // 🔥 INIT LANDING (selalu jalan)
// loadLandingClasses();
// initLanding(); // 🔥 WAJIB

// //run once, langsug di delete
// // (window as any).seed = runSeeder;

// // 🔥 AUTH STATE (SINGLE ENTRY POINT)
// onAuthStateChanged(auth, (user: User | null) => {
//   console.log("🔥 AUTH STATE:", user);

//   const landing = document.getElementById("landing-page")!;
//   const app = document.getElementById("app")!;

//   // 🔥 BELUM LOGIN → TAMPILKAN LANDING
//   if (!user) {
//     landing.style.display = "block";
//     app.innerHTML = "";
//     return;
//   }

//   // 🔥 SUDAH LOGIN → LANJUT KE APP
//   onUserReady(user);
// });

// // 🔥 APP LOGIC (SINGLE SOURCE OF TRUTH)
// function onUserReady(user: User) {
//   const landing = document.getElementById("landing-page")!;
//   const app = document.getElementById("app")!;

//   // 🔥 SEMBUNYIKAN LANDING
//   landing.style.display = "none";

//   const role = localStorage.getItem("role");

//   console.log("🔥 ROLE:", role);

//   // 🔥 GUARD (ANTI BUG)
//   if (!role) {
//     console.warn("⚠️ Role belum dipilih, kembali ke landing");

//     landing.style.display = "block";
//     app.innerHTML = "";

//     return;
//   }

//   // 🔥 ROUTING DASHBOARD
//   if (role === "teacher") {
//     console.log("🚀 LOAD TEACHER DASHBOARD");
//     loadTeacherDashboard(user.uid);
//   } else {
//     console.log("🚀 LOAD STUDENT DASHBOARD");
//     loadStudentDashboard(user.uid);
//   }
// }
import { onAuthStateChanged, User } from "firebase/auth";
import { auth } from "./firebase/config";

import { loadStudentDashboard } from "./pages/studentDashboard";
import { loadTeacherDashboard } from "./pages/teacherDashboard";

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
// 🚀 INIT LANDING
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

    // =================================
    // BELUM LOGIN
    // =================================
    if (!user) {
      showLanding();
      return;
    }

    // =================================
    // SUDAH LOGIN
    // =================================
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
  const role =
    localStorage.getItem(
      "role"
    );

  console.log(
    "🔥 ROLE:",
    role
  );

  // =================================
  // GUARD
  // =================================
  if (!role) {
    console.warn(
      "⚠️ Role belum dipilih"
    );

    showLanding();
    return;
  }

  // =================================
  // ROUTING
  // =================================
  hideLanding();

  try {
    if (
      role === "teacher"
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
  } catch (err) {
    console.error(
      "❌ Gagal load dashboard:",
      err
    );

    showLanding();
  }
}

// =====================================
// 🌐 HELPERS
// =====================================
function showLanding() {
  landing.style.display =
    "block";

  app.innerHTML = "";
}

function hideLanding() {
  landing.style.display =
    "none";
}