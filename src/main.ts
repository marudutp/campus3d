// src/main.ts
import { initLanding, loadLandingClasses } from './landing';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from './firebase/config';
import { startEngine } from './legacy-engine/main';
import { initWaitingRoom } from './pages/waitingRoom';

async function bootstrap() {
  // CEK DULU: Apakah ini halaman khusus (waiting room atau classroom)?
  const path = window.location.pathname;
  const urlParams = new URLSearchParams(window.location.search);
  const classIdFromUrl = urlParams.get('classId');

  // CASE 1: Halaman WAITING ROOM
  // if (path === '/waiting-room' && classIdFromUrl) {
  //   console.log("🚪 Waiting room detected, classId:", classIdFromUrl);
  //   const landingPage = document.getElementById('landing-page');
  //   if (landingPage) landingPage.style.display = 'none';

  //   // Panggil initWaitingRoom dengan parameter classId
  //   await initWaitingRoom();
  //   return;
  // }
  // CASE 1: Halaman WAITING ROOM (support dengan dan tanpa .html)
  if ((path === '/waiting-room' || path === '/waiting-room.html') && classIdFromUrl) {
    console.log("🚪 Waiting room detected, classId:", classIdFromUrl);
    const landingPage = document.getElementById('landing-page');
    if (landingPage) landingPage.style.display = 'none';
    await initWaitingRoom(classIdFromUrl);
    return;
  }

  // CASE 2: Halaman CLASSROOM (3D)
  // if ((path === '/classroom' || path === '/classroom.html') && classIdFromUrl) {
  //   console.log("🎮 Classroom detected, classId:", classIdFromUrl);

  // if ((path === '/classroom' || path === '/classroom.html') && classIdFromUrl) {
  //   console.log("🎮 Classroom detected, classId:", classIdFromUrl);
  //   const landingPage = document.getElementById('landing-page');
  //   if (landingPage) landingPage.style.display = 'none';

  //   const userStr = localStorage.getItem('user');
  //   const user = userStr ? JSON.parse(userStr) : null;
  //   const role = localStorage.getItem('role') || 'student';

  //   await startEngine({
  //     sessionId: classIdFromUrl,
  //     user: {
  //       uid: user?.uid || `student_${Date.now()}`,
  //       displayName: user?.displayName || 'Siswa',
  //       role: role
  //     }
  //   });
  //   return;
  // }

  // CASE 2: Halaman CLASSROOM
  if ((path === '/classroom' || path === '/classroom.html') && classIdFromUrl) {
    console.log("🎮 Classroom detected, classId:", classIdFromUrl);

    // Sembunyikan landing page
    const landingPage = document.getElementById('landing-page');
    if (landingPage) landingPage.style.display = 'none';

    // 🔥 PASTIKAN CANVAS ADA
    // let canvas = document.getElementById('renderCanvas') as HTMLCanvasElement;
    let canvas = document.getElementById('renderCanvas') as unknown as HTMLCanvasElement;
    if (!canvas) {
      console.log("⚠️ Canvas not found, creating...");
      canvas = document.createElement('canvas');
      canvas.id = 'renderCanvas';
      canvas.style.position = 'fixed';
      canvas.style.top = '0';
      canvas.style.left = '0';
      canvas.style.width = '100%';
      canvas.style.height = '100%';
      canvas.style.outline = 'none';
      document.body.appendChild(canvas);
    }

    const userStr = localStorage.getItem('user');
    const user = userStr ? JSON.parse(userStr) : null;
    const role = localStorage.getItem('role') || 'student';

    await startEngine({
      sessionId: classIdFromUrl,
      user: {
        uid: user?.uid || `student_${Date.now()}`,
        displayName: user?.displayName || 'Siswa',
        role: role
      }
    });
    return;
  }

  // CASE 3: SEMUA HALAMAN LAIN (dashboard, landing, dll)
  console.log("🏠 Using auth flow for dashboard & landing");

  // Tampilkan loading state
  const app = document.getElementById('app');
  if (app) {
    app.innerHTML = `
      <div class="min-h-screen flex items-center justify-center bg-[#020617]">
        <div class="text-center">
          <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-[#00CED1] mx-auto"></div>
          <p class="mt-4 text-gray-400">Memuat...</p>
        </div>
      </div>
    `;
  }

  // Wait for auth state
  onAuthStateChanged(auth, async (user) => {
    if (user) {
      // User sudah login, load dashboard sesuai role
      const role = localStorage.getItem('role') || 'student';
      console.log(`✅ User logged in as ${role}:`, user.displayName);

      // Sembunyikan landing page
      const landingPage = document.getElementById('landing-page');
      if (landingPage) landingPage.style.display = 'none';

      if (role === 'teacher') {
        // Panggil loadTeacherDashboard dari teacherDashboard.ts
        const { loadTeacherDashboard } = await import('./pages/teacherDashboard');
        await loadTeacherDashboard(user.uid);
      } else {
        // Panggil loadStudentDashboard dari studentDashboard.ts
        const { loadStudentDashboard } = await import('./pages/studentDashboard');
        await loadStudentDashboard(user.uid);
      }
    } else {
      // User belum login, tampilkan landing page
      console.log("👤 No user, showing landing page");

      // Reset app container
      if (app) app.innerHTML = '';

      // Tampilkan landing page
      const landingPage = document.getElementById('landing-page');
      if (landingPage) landingPage.style.display = 'block';

      initLanding();
      await loadLandingClasses();
    }
  });
}

// Jalankan
bootstrap();