import {
  createClass,
  getClasses,
  updateClass,
  deleteClass
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
  addDoc,
  collection
} from "firebase/firestore";

import { db } from "../firebase/config";

export async function loadTeacherDashboard(userId: string) {
  const app = document.getElementById("app")!;
  const userName =
    currentUser?.displayName || "Pengajar";

  // =====================================
  // 💰 GET BALANCE
  // =====================================
  async function getBalance() {
    try {
      const res = await fetch(
        `http://localhost:3001/balance/${userId}`
      );

      const data = await res.json();

      return data.balance || 0;
    } catch {
      return 0;
    }
  }

  // =====================================
  // 🎨 UI
  // =====================================
  app.innerHTML = `
    <div class="min-h-screen bg-[#020617] text-white px-6 py-8">

      <!-- HEADER -->
      <div class="max-w-5xl mx-auto flex justify-between items-start mb-8">

        <div>
          <h2 class="text-2xl font-bold">
            👨‍🏫 Halo,
            <span class="text-[#00CED1]">
              ${userName}
            </span>
          </h2>

          <p
            id="balanceInfo"
            class="text-green-400 text-sm mt-2"
          >
            💰 Memuat saldo...
          </p>
        </div>

        <button
          id="logoutBtn"
          class="bg-red-500/20 border border-red-500 px-4 py-2 rounded-lg hover:bg-red-500/40 transition"
        >
          Logout
        </button>

      </div>

      <!-- CREATE CLASS -->
      <div class="max-w-5xl mx-auto glass-card p-6 rounded-2xl mb-8">

        <h3 class="text-lg font-semibold mb-4">
          Buat Kelas
        </h3>

        <input
          id="classTitle"
          placeholder="Nama Kelas"
          class="mb-3 w-full p-3 rounded bg-black/30 border border-white/10"
        />

        <input
          id="classPrice"
          type="number"
          placeholder="Harga"
          class="mb-3 w-full p-3 rounded bg-black/30 border border-white/10"
        />

        <textarea
          id="classMission"
          placeholder="Tujuan Kelas"
          class="mb-3 w-full p-3 rounded bg-black/30 border border-white/10"
        ></textarea>

        <input
          id="classLinkedin"
          placeholder="LinkedIn Pengajar"
          class="mb-3 w-full p-3 rounded bg-black/30 border border-white/10"
        />

        <input
          id="classTeaser"
          placeholder="YouTube Teaser"
          class="mb-4 w-full p-3 rounded bg-black/30 border border-white/10"
        />

        <button
          id="createBtn"
          class="bg-[#00CED1] text-black px-6 py-3 rounded-lg font-bold hover:scale-105 transition"
        >
          Buat Kelas
        </button>

      </div>

      <!-- CLASS LIST -->
      <div class="max-w-5xl mx-auto">

        <h3 class="text-lg font-semibold mb-4 text-gray-300">
          Kelas Saya
        </h3>

        <div
          id="myClasses"
          class="grid md:grid-cols-2 gap-4"
        ></div>

      </div>

    </div>
  `;

  // =====================================
  // 🚪 LOGOUT
  // =====================================
  document.getElementById("logoutBtn")!.onclick =
    logout;

  // =====================================
  // 💰 LOAD BALANCE
  // =====================================
  const balance =
    await getBalance();

  document.getElementById(
    "balanceInfo"
  )!.innerText =
    `💰 Pendapatan: ${formatRupiah(
      balance
    )}`;

  // =====================================
  // ➕ CREATE CLASS
  // =====================================
  document.getElementById(
    "createBtn"
  )!.onclick = async () => {
    const title = (
      document.getElementById(
        "classTitle"
      ) as HTMLInputElement
    ).value.trim();

    const price = Number(
      (
        document.getElementById(
          "classPrice"
        ) as HTMLInputElement
      ).value
    );

    const mission = (
      document.getElementById(
        "classMission"
      ) as HTMLTextAreaElement
    ).value.trim();

    const linkedin = (
      document.getElementById(
        "classLinkedin"
      ) as HTMLInputElement
    ).value.trim();

    const teaser = (
      document.getElementById(
        "classTeaser"
      ) as HTMLInputElement
    ).value.trim();

    if (!title) {
      alert(
        "Nama kelas wajib diisi"
      );
      return;
    }

    if (
      teaser &&
      !teaser.includes(
        "youtube.com"
      ) &&
      !teaser.includes(
        "youtu.be"
      )
    ) {
      alert(
        "Link teaser harus YouTube"
      );
      return;
    }

    const instructorName =
      currentUser?.displayName ||
      "Pengajar";

    await createClass(
      title,
      userId,
      price,
      mission,
      instructorName,
      linkedin,
      teaser
    );

    alert(
      "Kelas berhasil dibuat 🚀"
    );

    loadTeacherDashboard(
      userId
    );
  };

  // =====================================
  // 📚 LOAD MY CLASSES
  // =====================================
  const classes =
    await getClasses();

  const myClasses =
    classes.filter(
      (c: any) =>
        c.instructors?.includes(
          userId
        )
    );

  const container =
    document.getElementById(
      "myClasses"
    )!;

  // EMPTY STATE
  if (
    myClasses.length === 0
  ) {
    container.innerHTML = `
      <div class="col-span-full text-center py-16 text-gray-400">
        Anda belum membuat kelas.
      </div>
    `;
    return;
  }

  // =====================================
  // 🎓 RENDER CLASS CARD
  // =====================================
  myClasses.forEach(
    (cls: any) => {
      const div =
        document.createElement(
          "div"
        );

      const studentCount =
        cls.students?.length ||
        0;

      div.className =
        "glass-card p-6 rounded-2xl";

      div.innerHTML = `
        <h4 class="text-lg font-bold mb-2">
          ${cls.title}
        </h4>

        <p class="text-[#00CED1] font-semibold mb-1">
          ${formatRupiah(
            cls.price
          )}
        </p>

        <p class="text-sm text-gray-400 mb-1">
          👥 ${studentCount} siswa
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
            : `
            <p class="text-gray-500 text-sm mb-2">
              Belum ada jadwal
            </p>
          `
        }

        ${
          cls.mission
            ? `
            <p class="text-gray-400 text-sm mb-4">
              ${cls.mission}
            </p>
          `
            : ""
        }

        <div class="flex gap-2 flex-wrap">

          <button
            class="editBtn bg-yellow-500 text-black px-3 py-2 rounded text-sm font-semibold"
          >
            Edit
          </button>

          <button
            class="deleteBtn bg-red-500 px-3 py-2 rounded text-sm font-semibold"
          >
            Hapus
          </button>

        </div>
      `;

      // =====================================
      // ✏️ EDIT CLASS
      // =====================================
      const editBtn =
        div.querySelector(
          ".editBtn"
        ) as HTMLButtonElement;

      editBtn.onclick =
        async () => {
          const newTitle =
            prompt(
              "Nama kelas baru:",
              cls.title
            );

          if (!newTitle)
            return;

          const newPrice =
            Number(
              prompt(
                "Harga baru:",
                String(
                  cls.price
                )
              )
            );

          const newDate =
            prompt(
              "Tanggal kelas (YYYY-MM-DD):",
              cls.date ||
                ""
            ) || "";

          const newMission =
            prompt(
              "Tujuan kelas:",
              cls.mission ||
                ""
            ) || "";

          const newLinkedin =
            prompt(
              "Link LinkedIn:",
              cls.linkedin ||
                ""
            ) || "";

          const newTeaser =
            prompt(
              "Link YouTube Teaser:",
              cls.teaserUrl ||
                ""
            ) || "";

          if (
            newTeaser &&
            !newTeaser.includes(
              "youtube.com"
            ) &&
            !newTeaser.includes(
              "youtu.be"
            )
          ) {
            alert(
              "Link teaser harus YouTube"
            );
            return;
          }

          await updateClass(
            cls.id,
            {
              title:
                newTitle.trim(),

              price:
                isNaN(
                  newPrice
                )
                  ? cls.price
                  : newPrice,

              date: newDate,

              mission:
                newMission.trim(),

              linkedin:
                newLinkedin.trim(),

              teaserUrl:
                newTeaser.trim(),

              instructorName:
                currentUser?.displayName ||
                "Pengajar"
            }
          );

          alert(
            "Kelas berhasil diupdate ✨"
          );

          loadTeacherDashboard(
            userId
          );
        };

      // =====================================
      // ❌ DELETE + REFUND
      // =====================================
      const deleteBtn =
        div.querySelector(
          ".deleteBtn"
        ) as HTMLButtonElement;

      deleteBtn.onclick =
        async () => {
          const ok =
            confirm(
              `Yakin ingin menghapus kelas "${cls.title}"?`
            );

          if (!ok)
            return;

          // refund jika ada siswa
          if (
            cls.students
              ?.length > 0
          ) {
            try {
              await fetch(
                "http://localhost:3001/refund",
                {
                  method:
                    "POST",

                  headers:
                    {
                      "Content-Type":
                        "application/json"
                    },

                  body: JSON.stringify(
                    {
                      studentIds:
                        cls.students,

                      teacherId:
                        cls.instructors[0],

                      amount:
                        cls.price
                    }
                  )
                }
              );

              for (const studentId of cls.students) {
                await addDoc(
                  collection(
                    db,
                    "notifications"
                  ),
                  {
                    userId:
                      studentId,

                    message: `⚠️ Kelas "${cls.title}" dibatalkan. Refund sedang diproses.`,

                    createdAt:
                      new Date()
                  }
                );
              }

              alert(
                "Refund siswa diproses 💰"
              );
            } catch {
              alert(
                "Gagal memproses refund"
              );
            }
          }

          await deleteClass(
            cls.id
          );

          alert(
            "Kelas berhasil dihapus"
          );

          loadTeacherDashboard(
            userId
          );
        };

      container.appendChild(
        div
      );
    }
  );
}