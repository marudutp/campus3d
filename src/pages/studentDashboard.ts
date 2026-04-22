import {
  getClasses,
  joinClass
} from "../modules/class";

import {
  logout,
  currentUser
} from "../firebase/auth";

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

// =====================================
// 🎓 STUDENT DASHBOARD FINAL + WAITING ROOM
// =====================================
export async function loadStudentDashboard(
  userId: string
) {
  const app =
    document.getElementById(
      "app"
    )!;

  const userName =
    currentUser?.displayName ||
    "Siswa";

  // =====================================
  // 🎁 REFERRAL SYSTEM
  // =====================================
  const referralLink =
    `${location.origin}/?ref=${userId}`;

  const rewardAmount = 0;
  const successfulReferrals = 0;

  // =====================================
  // UI
  // =====================================
  app.innerHTML = `
    <div class="min-h-screen bg-[#020617] text-white px-6 py-8">

      <!-- HEADER -->
      <div class="max-w-6xl mx-auto flex justify-between items-center mb-6">

        <h2 class="text-xl md:text-2xl font-bold">
          🎓 Halo,
          <span class="text-[#00CED1]">
            ${userName}
          </span>
        </h2>

        <button
          id="logoutBtn"
          class="bg-red-500/20 border border-red-500 px-4 py-2 rounded-lg hover:bg-red-500/40 transition"
        >
          Logout
        </button>

      </div>

      <!-- REFERRAL PANEL -->
      <div class="max-w-6xl mx-auto glass-card p-6 rounded-2xl mb-6">

        <h3 class="text-lg font-semibold mb-3">
          🎁 Student Ambassador Program
        </h3>

        <p class="text-gray-400 text-sm mb-4">
          Ajak teman bergabung ke Campus3D dan dapatkan reward.
        </p>

        <div class="grid md:grid-cols-3 gap-4 mb-4">

          <div class="bg-black/20 p-4 rounded-xl">
            <p class="text-sm text-gray-400">
              Referral Berhasil
            </p>

            <p class="text-2xl font-bold text-[#00CED1]">
              ${successfulReferrals}
            </p>
          </div>

          <div class="bg-black/20 p-4 rounded-xl">
            <p class="text-sm text-gray-400">
              Reward Terkumpul
            </p>

            <p class="text-2xl font-bold text-green-400">
              ${formatRupiah(
                rewardAmount
              )}
            </p>
          </div>

          <div class="bg-black/20 p-4 rounded-xl">
            <p class="text-sm text-gray-400">
              Status
            </p>

            <p class="text-lg font-bold text-yellow-400">
              Ambassador
            </p>
          </div>

        </div>

        <div class="bg-black/20 p-3 rounded-xl text-sm break-all mb-4">
          ${referralLink}
        </div>

        <div class="flex gap-2 flex-wrap">

          <button
            id="copyReferralBtn"
            class="bg-[#00CED1] text-black px-4 py-2 rounded-lg font-semibold"
          >
            Copy Link
          </button>

          <button
            id="waShareBtn"
            class="bg-green-500 px-4 py-2 rounded-lg font-semibold"
          >
            Share WhatsApp
          </button>

          <button
            id="telegramShareBtn"
            class="bg-sky-500 px-4 py-2 rounded-lg font-semibold"
          >
            Telegram
          </button>

        </div>

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

  // =====================================
  // LOGOUT
  // =====================================
  document.getElementById(
    "logoutBtn"
  )!.onclick = logout;

  // =====================================
  // SHARE BUTTONS
  // =====================================
  document.getElementById(
    "copyReferralBtn"
  )!.onclick = async () => {
    await navigator.clipboard.writeText(
      referralLink
    );

    alert(
      "Referral link copied 🚀"
    );
  };

  document.getElementById(
    "waShareBtn"
  )!.onclick = () => {
    const text =
      `Belajar seru di Campus3D 🚀\n\nGabung lewat link saya:\n${referralLink}`;

    window.open(
      "https://wa.me/?text=" +
        encodeURIComponent(
          text
        ),
      "_blank"
    );
  };

  document.getElementById(
    "telegramShareBtn"
  )!.onclick = () => {
    window.open(
      "https://t.me/share/url?url=" +
        encodeURIComponent(
          referralLink
        ),
      "_blank"
    );
  };

  // =====================================
  // NOTIFICATIONS
  // =====================================
  const notifContainer =
    document.getElementById(
      "notifContainer"
    )!;

  const notifQuery = query(
    collection(
      db,
      "notifications"
    ),
    where(
      "userId",
      "==",
      userId
    )
  );

  const notifSnap =
    await getDocs(
      notifQuery
    );

  notifSnap.docs.forEach(
    (docSnap) => {
      const notif: any =
        docSnap.data();

      const div =
        document.createElement(
          "div"
        );

      div.className =
        "bg-yellow-500/10 border border-yellow-500 text-yellow-300 p-4 rounded-xl";

      div.innerText =
        notif.message;

      notifContainer.appendChild(
        div
      );
    }
  );

  // =====================================
  // LOAD CLASSES
  // =====================================
  const classList =
    document.getElementById(
      "classList"
    )!;

  const classes =
    await getClasses();

  const visibleClasses =
    classes.filter(
      (cls: any) => {
        if (!cls.date)
          return true;

        return (
          new Date(
            cls.date
          ) >=
          new Date()
        );
      }
    );

  // =====================================
  // EMPTY STATE
  // =====================================
  if (
    visibleClasses.length === 0
  ) {
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
  // CLASS CARDS
  // =====================================
  visibleClasses.forEach(
    (cls: any) => {
      const isJoined =
        cls.students?.includes(
          userId
        );

      const div =
        document.createElement(
          "div"
        );

      div.className =
        "glass-card p-6 rounded-2xl";

      div.innerHTML = `
        <h3 class="text-lg font-bold mb-2">
          ${cls.title}
        </h3>

        <p class="text-sm text-gray-400 mb-1">
          👨‍🏫 ${
            cls.instructorName ||
            "Pengajar"
          }
        </p>

        ${
          cls.date
            ? `
            <p class="text-yellow-400 text-sm mb-2">
              📅 ${formatDate(
                cls.date
              )}
            </p>
          `
            : ""
        }

        <p class="text-gray-400 mb-4">
          ${cls.mission || ""}
        </p>

        <p class="text-[#00CED1] font-semibold mb-4">
          ${formatRupiah(
            cls.price
          )}
        </p>

        ${
          isJoined
            ? `
            <button
              class="enterWaitingBtn bg-green-500 text-white px-4 py-2 rounded-lg w-full font-semibold"
            >
              🚪 Masuk Waiting Room
            </button>
          `
            : `
            <button
              class="joinBtn bg-[#00CED1] text-black px-4 py-2 rounded-lg w-full font-semibold"
            >
              Join Kelas
            </button>
          `
        }
      `;

      // ===============================
      // BELUM JOIN
      // ===============================
      if (!isJoined) {
        const btn =
          div.querySelector(
            ".joinBtn"
          ) as HTMLButtonElement;

        btn.onclick =
          async () => {
            const success =
              await startPayment(
                cls,
                userId
              );

            if (!success)
              return;

            alert(
              "Berhasil join kelas 🎉"
            );

            window.location.href =
              `/waiting-room.html?classId=${cls.id}`;
          };
      }

      // ===============================
      // SUDAH JOIN
      // ===============================
      if (isJoined) {
        const enterBtn =
          div.querySelector(
            ".enterWaitingBtn"
          ) as HTMLButtonElement;

        enterBtn.onclick =
          () => {
            window.location.href =
              `/waiting-room.html?classId=${cls.id}`;
          };
      }

      classList.appendChild(
        div
      );
    }
  );
}

// =====================================
// PAYMENT
// =====================================
async function startPayment(
  cls: any,
  userId: string
): Promise<boolean> {
  try {
    const res =
      await fetch(
        "http://localhost:3001/pay",
        {
          method:
            "POST",
          headers: {
            "Content-Type":
              "application/json"
          },
          body: JSON.stringify(
            {
              studentId:
                userId,
              teacherId:
                cls
                  .instructors[0],
              amount:
                cls.price
            }
          )
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
    alert(
      "Koneksi error ❌"
    );

    return false;
  }
}