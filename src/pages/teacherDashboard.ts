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
  formatRupiah
} from "../utils/format";

import {
  addDoc,
  collection
} from "firebase/firestore";

import { db } from "../firebase/config";

import {
  createSession,
  startSession,
  endSession
} from "../modules/waitingRoom";

// =====================================
// 👨‍🏫 TEACHER DASHBOARD FINAL + WAITING ROOM
// =====================================
export async function loadTeacherDashboard(
  userId: string
) {
  const app =
    document.getElementById(
      "app"
    )!;

  const userName =
    currentUser?.displayName ||
    "Pengajar";

  // =====================================
  // BALANCE
  // =====================================
  async function getBalance() {
    const res =
      await fetch(
        "http://localhost:3001/balance/" +
          userId
      );

    const data =
      await res.json();

    return (
      data.balance || 0
    );
  }

  // =====================================
  // UI
  // =====================================
  app.innerHTML = `
    <div class="min-h-screen bg-[#020617] text-white px-6 py-8">

      <div class="max-w-6xl mx-auto">

        <!-- HEADER -->
        <div class="flex justify-between items-center mb-8">

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
            class="bg-red-500/20 border border-red-500 px-4 py-2 rounded-lg"
          >
            Logout
          </button>

        </div>

        <!-- CREATE CLASS -->
        <div class="glass-card p-6 rounded-2xl mb-8">

          <h3 class="text-lg font-semibold mb-4">
            🚀 Buat Kelas Baru
          </h3>

          <input
            id="classTitle"
            placeholder="Nama Kelas"
            class="mb-2 w-full p-3 rounded bg-black/30"
          />

          <input
            id="classPrice"
            type="number"
            placeholder="Harga"
            class="mb-2 w-full p-3 rounded bg-black/30"
          />

          <textarea
            id="classMission"
            placeholder="Tujuan / Deskripsi Kelas"
            class="mb-2 w-full p-3 rounded bg-black/30"
          ></textarea>

          <input
            id="classLinkedin"
            placeholder="Link LinkedIn"
            class="mb-2 w-full p-3 rounded bg-black/30"
          />

          <input
            id="classTeaser"
            placeholder="Link YouTube Teaser"
            class="mb-4 w-full p-3 rounded bg-black/30"
          />

          <button
            id="createBtn"
            class="bg-[#00CED1] text-black px-5 py-3 rounded-lg font-semibold"
          >
            Buat Kelas
          </button>

        </div>

        <!-- CLASS LIST -->
        <div
          id="myClasses"
          class="grid md:grid-cols-2 gap-4"
        ></div>

      </div>

    </div>
  `;

  // =====================================
  // LOGOUT
  // =====================================
  document.getElementById(
    "logoutBtn"
  )!.onclick = logout;

  // =====================================
  // LOAD BALANCE
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
  // CREATE CLASS
  // =====================================
  document.getElementById(
    "createBtn"
  )!.onclick =
    async () => {
      const title =
        (
          document.getElementById(
            "classTitle"
          ) as HTMLInputElement
        ).value;

      const price =
        Number(
          (
            document.getElementById(
              "classPrice"
            ) as HTMLInputElement
          ).value
        );

      const mission =
        (
          document.getElementById(
            "classMission"
          ) as HTMLTextAreaElement
        ).value;

      const linkedin =
        (
          document.getElementById(
            "classLinkedin"
          ) as HTMLInputElement
        ).value;

      const teaser =
        (
          document.getElementById(
            "classTeaser"
          ) as HTMLInputElement
        ).value;

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
  // LOAD CLASSES
  // =====================================
  const classes =
    await getClasses();

  const container =
    document.getElementById(
      "myClasses"
    )!;

  classes
    .filter(
      (c: any) =>
        c.instructors?.includes(
          userId
        )
    )
    .forEach(
      (cls: any) => {
        const studentCount =
          cls.students
            ?.length || 0;

        const div =
          document.createElement(
            "div"
          );

        div.className =
          "glass-card p-5 rounded-2xl";

        const shareLink =
          `${location.origin}/?ref=${userId}&classId=${cls.id}`;

        div.innerHTML = `
          <h3 class="text-lg font-bold mb-2">
            ${cls.title}
          </h3>

          <p class="text-[#00CED1] font-semibold mb-1">
            ${formatRupiah(
              cls.price
            )}
          </p>

          <p class="text-sm text-gray-400 mb-1">
            👥 ${studentCount} siswa
          </p>

          <p class="text-sm text-gray-400 mb-4">
            Potensi omzet:
            ${formatRupiah(
              studentCount *
                cls.price
            )}
          </p>

          <div class="grid grid-cols-2 gap-2 mb-3">

            <button class="editBtn bg-blue-500 px-3 py-2 rounded-lg">
              Edit
            </button>

            <button class="deleteBtn bg-red-500 px-3 py-2 rounded-lg">
              Hapus
            </button>

            <button class="waitingBtn bg-yellow-500 text-black px-3 py-2 rounded-lg">
              Waiting Room
            </button>

            <button class="liveBtn bg-green-500 px-3 py-2 rounded-lg">
              Start Live
            </button>

            <button class="endBtn bg-gray-600 px-3 py-2 rounded-lg col-span-2">
              End Class
            </button>

          </div>

          <div class="grid grid-cols-3 gap-2">

            <button class="waBtn bg-green-500 px-2 py-2 rounded text-sm">
              WA
            </button>

            <button class="fbBtn bg-blue-600 px-2 py-2 rounded text-sm">
              FB
            </button>

            <button class="liBtn bg-sky-600 px-2 py-2 rounded text-sm">
              LinkedIn
            </button>

          </div>
        `;

        // ===============================
        // ELEMENTS
        // ===============================
        const editBtn =
          div.querySelector(
            ".editBtn"
          ) as HTMLButtonElement;

        const deleteBtn =
          div.querySelector(
            ".deleteBtn"
          ) as HTMLButtonElement;

        const waitingBtn =
          div.querySelector(
            ".waitingBtn"
          ) as HTMLButtonElement;

        const liveBtn =
          div.querySelector(
            ".liveBtn"
          ) as HTMLButtonElement;

        const endBtn =
          div.querySelector(
            ".endBtn"
          ) as HTMLButtonElement;

        const waBtn =
          div.querySelector(
            ".waBtn"
          ) as HTMLButtonElement;

        const fbBtn =
          div.querySelector(
            ".fbBtn"
          ) as HTMLButtonElement;

        const liBtn =
          div.querySelector(
            ".liBtn"
          ) as HTMLButtonElement;

        // ===============================
        // EDIT
        // ===============================
        editBtn.onclick =
          async () => {
            const newTitle =
              prompt(
                "Nama kelas baru:",
                cls.title
              );

            if (
              !newTitle
            )
              return;

            const newPrice =
              Number(
                prompt(
                  "Harga baru:",
                  cls.price
                )
              );

            await updateClass(
              cls.id,
              {
                title:
                  newTitle,
                price:
                  newPrice
              }
            );

            loadTeacherDashboard(
              userId
            );
          };

        // ===============================
        // DELETE + REFUND
        // ===============================
        deleteBtn.onclick =
          async () => {
            if (
              !confirm(
                "Yakin hapus kelas?"
              )
            )
              return;

            if (
              cls.students
                ?.length > 0
            ) {
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
                  body:
                    JSON.stringify(
                      {
                        studentIds:
                          cls.students,
                        teacherId:
                          cls
                            .instructors[0],
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
                    message:
                      `⚠️ Kelas "${cls.title}" dibatalkan. Refund diproses.`,
                    createdAt:
                      new Date()
                  }
                );
              }

              alert(
                "Refund diproses 💰"
              );
            }

            await deleteClass(
              cls.id
            );

            loadTeacherDashboard(
              userId
            );
          };

        // ===============================
        // WAITING ROOM
        // ===============================
        waitingBtn.onclick =
          async () => {
            await createSession(
              cls.id,
              userId
            );

            window.location.href =
              `/waiting-room.html?classId=${cls.id}`;
          };

        // ===============================
        // START LIVE
        // ===============================
        liveBtn.onclick =
          async () => {
            await startSession(
              cls.id
            );

            window.location.href =
              `/classroom.html?classId=${cls.id}`;
          };

        // ===============================
        // END CLASS
        // ===============================
        endBtn.onclick =
          async () => {
            await endSession(
              cls.id
            );

            alert(
              "Kelas diakhiri."
            );
          };

        // ===============================
        // SHARE
        // ===============================
        waBtn.onclick =
          () => {
            const text =
              `Belajar di kelas ${cls.title} 🚀\n${shareLink}`;

            window.open(
              "https://wa.me/?text=" +
                encodeURIComponent(
                  text
                ),
              "_blank"
            );
          };

        fbBtn.onclick =
          () => {
            window.open(
              "https://www.facebook.com/sharer/sharer.php?u=" +
                encodeURIComponent(
                  shareLink
                ),
              "_blank"
            );
          };

        liBtn.onclick =
          () => {
            window.open(
              "https://www.linkedin.com/sharing/share-offsite/?url=" +
                encodeURIComponent(
                  shareLink
                ),
              "_blank"
            );
          };

        container.appendChild(
          div
        );
      }
    );
}