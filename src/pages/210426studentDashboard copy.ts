import { getClasses, joinClass } from "../modules/class";
import { logout, currentUser } from "../firebase/auth";
import {
  formatRupiah,
  formatDate
} from "../utils/format";

import {
  collection,
  getDocs,
  query,
  where
} from "firebase/firestore";

import { db } from "../firebase/config";

export async function loadStudentDashboard(userId: string) {
  const app = document.getElementById("app")!;
  const userName = currentUser?.displayName || "Siswa";

  // =====================================
  // 🎨 UI
  // =====================================
  app.innerHTML = `
    <div class="min-h-screen bg-[#020617] text-white px-6 py-8">

      <!-- HEADER -->
      <div class="max-w-6xl mx-auto flex justify-between items-center mb-6">

        <h2 class="text-xl md:text-2xl font-bold">
          🎓 Halo,
          <span class="text-[#00CED1]">${userName}</span>
        </h2>

        <button
          id="logoutBtn"
          class="bg-red-500/20 border border-red-500 px-4 py-2 rounded-lg hover:bg-red-500/40 transition"
        >
          Logout
        </button>

      </div>

      <!-- NOTIFICATIONS -->
      <div
        id="notifContainer"
        class="max-w-6xl mx-auto mb-6 space-y-3"
      ></div>

      <!-- CLASS LIST -->
      <div
        id="classList"
        class="max-w-6xl mx-auto grid md:grid-cols-2 gap-4"
      ></div>

    </div>
  `;

  document.getElementById("logoutBtn")!.onclick = logout;

  // =====================================
  // 🔔 LOAD NOTIFICATIONS
  // =====================================
  const notifContainer =
    document.getElementById("notifContainer")!;

  const notifQuery = query(
    collection(db, "notifications"),
    where("userId", "==", userId)
  );

  const notifSnap = await getDocs(notifQuery);

  notifSnap.docs.forEach((docSnap) => {
    const notif: any = docSnap.data();

    const div = document.createElement("div");

    div.className =
      "bg-yellow-500/10 border border-yellow-500 text-yellow-300 p-4 rounded-xl";

    div.innerText = notif.message;

    notifContainer.appendChild(div);
  });

  // =====================================
  // 📚 LOAD CLASSES
  // =====================================
  const classList =
    document.getElementById("classList")!;

  const classes = await getClasses();

  // tampilkan hanya kelas aktif
  const visibleClasses = classes.filter(
    (cls: any) => {
      if (!cls.date) return true;

      return (
        new Date(cls.date) >= new Date()
      );
    }
  );

  // =====================================
  // 🔥 EMPTY STATE
  // =====================================
  if (visibleClasses.length === 0) {
    classList.innerHTML = `
      <div class="col-span-full text-center py-20">

        <h2 class="text-3xl font-bold mb-4">
          Campus3D Makes it Real
        </h2>

        <p class="text-gray-400 max-w-xl mx-auto mb-6">
          Platform pembelajaran 3D generasi baru sedang dipersiapkan.
          Kelas-kelas berkualitas dengan instruktur terbaik akan segera hadir.
        </p>

        <p class="text-[#00CED1] font-semibold">
          Jadilah bagian dari gelombang pertama pembelajaran imersif.
        </p>

      </div>
    `;
    return;
  }

  // =====================================
  // 🎓 RENDER CLASS CARD
  // =====================================
  visibleClasses.forEach((cls: any) => {
    const isJoined =
      cls.students?.includes(userId);

    const div =
      document.createElement("div");

    div.className =
      "glass-card p-6 rounded-2xl";

    div.innerHTML = `
      <h3 class="text-lg font-bold mb-2">
        ${cls.title}
      </h3>

      <!-- Instructor -->
      <p class="text-sm text-gray-400 mb-1">
        👨‍🏫 ${cls.instructorName || "Pengajar"}
      </p>

      <!-- Date -->
      ${
        cls.date
          ? `
          <p class="text-yellow-400 text-sm mb-2">
            📅 ${formatDate(cls.date)}
          </p>
        `
          : `
          <p class="text-gray-500 text-sm mb-2">
            Jadwal menyusul
          </p>
        `
      }

      <!-- Linkedin -->
      ${
        cls.linkedin
          ? `
          <a
            href="${cls.linkedin}"
            target="_blank"
            class="text-[#00CED1] text-sm underline mb-3 block"
          >
            Lihat Profil Pengajar
          </a>
        `
          : ""
      }

      <!-- Mission -->
      ${
        cls.mission
          ? `
          <p class="text-gray-400 mb-4">
            ${cls.mission}
          </p>
        `
          : ""
      }

      <!-- Price -->
      <p class="font-semibold mb-4 text-[#00CED1]">
        ${formatRupiah(cls.price)}
      </p>

      <!-- Students -->
      <p class="text-sm text-gray-500 mb-4">
        👥 ${cls.students?.length || 0} siswa bergabung
      </p>

      <!-- Button -->
      ${
        isJoined
          ? `
          <button
            disabled
            class="bg-green-500/30 text-green-400 px-4 py-2 rounded-lg cursor-not-allowed w-full"
          >
            ✔ Anda sudah bergabung
          </button>
        `
          : `
          <button
            class="joinBtn bg-[#00CED1] text-black px-4 py-2 rounded-lg font-semibold w-full hover:scale-[1.02] transition"
          >
            Join Kelas
          </button>
        `
      }
    `;

    // ===============================
    // 💳 JOIN CLASS
    // ===============================
    if (!isJoined) {
      const btn =
        div.querySelector(
          ".joinBtn"
        ) as HTMLButtonElement;

      btn.onclick = async () => {
        btn.disabled = true;
        btn.innerText = "Memproses...";

        const success =
          await startPayment(
            cls,
            userId
          );

        if (!success) {
          btn.disabled = false;
          btn.innerText =
            "Join Kelas";
          return;
        }

        alert(
          "Berhasil join kelas! 🎉"
        );

        loadStudentDashboard(
          userId
        );
      };
    }

    classList.appendChild(div);
  });
}

// =====================================
// 💳 PAYMENT
// =====================================
async function startPayment(
  cls: any,
  userId: string
): Promise<boolean> {
  try {
    const res = await fetch(
      "http://localhost:3001/pay",
      {
        method: "POST",
        headers: {
          "Content-Type":
            "application/json"
        },
        body: JSON.stringify({
          studentId: userId,
          teacherId:
            cls.instructors[0],
          amount: cls.price
        })
      }
    );

    const data =
      await res.json();

    if (!data.success) {
      alert(
        data.error ||
          "Pembayaran gagal ❌"
      );

      return false;
    }

    await joinClass(
      cls.id,
      userId
    );

    return true;
  } catch {
    alert("Koneksi error ❌");
    return false;
  }
}