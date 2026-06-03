import {
  createClass,
  getClasses,
  updateClass,
  deleteClass
} from "../modules/class";

import {
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

import { signOut } from "firebase/auth";
import { auth } from "../firebase/config";

async function logout() {
  await signOut(auth);

  // bersihkan role
  localStorage.removeItem("role");

  // redirect ke landing
  window.location.href = "/";
}

// =====================================
// AVATAR
// =====================================
const TEACHER_AVATARS = [
  "final_frog.glb",
  "final_yeti.glb",
  "kumisMixamo.glb"
];

function getTeacherAvatar(): string {
  return localStorage.getItem("teacherAvatar") || "final_frog.glb";
}

function saveTeacherAvatar(avatar: string) {
  localStorage.setItem("teacherAvatar", avatar);
}

function showAvatarPicker() {
  const modal = document.createElement("div");
  modal.className = "fixed inset-0 bg-black/70 flex items-center justify-center z-50";
  
  const currentAvatar = getTeacherAvatar();
  const avatarOptions = TEACHER_AVATARS.map(avatar => `
    <div class="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-black/50 ${currentAvatar === avatar ? 'border-[#00CED1]' : 'border-gray-600'}" data-avatar="${avatar}">
      <input type="radio" name="avatar" value="${avatar}" ${currentAvatar === avatar ? 'checked' : ''} />
      <label class="flex-1 cursor-pointer">${avatar.replace('.glb', '')}</label>
    </div>
  `).join('');
  
  modal.innerHTML = `
    <div class="bg-[#1a1a2e] rounded-2xl p-8 max-w-md w-full mx-4 border border-[#00CED1]/30">
      <h3 class="text-xl font-bold mb-6 text-[#00CED1]">Pilih Avatar</h3>
      
      <div class="space-y-3 mb-6">
        ${avatarOptions}
      </div>
      
      <div class="flex gap-3">
        <button class="flex-1 bg-gray-600 px-4 py-2 rounded-lg cancelAvatarBtn">
          Batal
        </button>
        <button class="flex-1 bg-[#00CED1] text-black px-4 py-2 rounded-lg font-semibold saveAvatarBtn">
          Simpan
        </button>
      </div>
    </div>
  `;
  
  document.body.appendChild(modal);
  
  const cancelBtn = modal.querySelector(".cancelAvatarBtn") as HTMLButtonElement;
  const saveBtn = modal.querySelector(".saveAvatarBtn") as HTMLButtonElement;
  
  cancelBtn.onclick = () => modal.remove();
  
  saveBtn.onclick = () => {
    const selected = (modal.querySelector('input[name="avatar"]:checked') as HTMLInputElement).value;
    saveTeacherAvatar(selected);
    modal.remove();
    location.reload();
  };
}
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
  // const VITE_BANK_SERVER_URL =
  // import.meta.env.VITE_API_URL;

  const VITE_BANK_SERVER_URL = "https://a7ebaad9-c561-44dc-856f-1d3ac470f4cf-00-q2g9bpcnu210.pike.replit.dev";

  async function getBalance() {
    const res =
      await fetch(
        `${VITE_BANK_SERVER_URL}/balance/` +
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

          <div class="flex gap-2">
            <button
              id="editAvatarBtn"
              class="bg-[#00CED1]/20 border border-[#00CED1] px-4 py-2 rounded-lg hover:bg-[#00CED1]/30"
            >
              🎭 Edit Avatar
            </button>
            
            <button
              id="logoutBtn"
              class="bg-red-500/20 border border-red-500 px-4 py-2 rounded-lg"
            >
              Logout
            </button>
          </div>

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

           <label class="block text-sm text-gray-300 mb-2">
             🏫 Pilih Tipe Classroom
           </label>
           <select
             id="classroomType"
             class="mb-2 w-full p-3 rounded bg-black/30"
           >
             <option value="classroom.glb">Classroom (Default)</option>
             <option value="cyber_neon_lab.glb">Cyber Neon Lab</option>
             <option value="immersive_classroom.glb">Immersive Classroom</option>
             <option value="minimalist_gallery.glb">Minimalist Gallery</option>
             <option value="ruang-meeting-minimalist.glb">Ruang Meeting Minimalist</option>
             <option value="ruang-miting-futuristik.glb">Ruang Miting Futuristik</option>
             <option value="ruang-miting-minimalis-2.glb">Ruang Miting Minimalis 2</option>
             <option value="ruang.dokter.glb">Ruang Dokter</option>
             <option value="ruang.tunggu-1.glb">Ruang Tunggu 1</option>
             <option value="zen_studio.glb">Zen Studio</option>
           </select>

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
  // EDIT AVATAR
  // =====================================
  document.getElementById(
    "editAvatarBtn"
  )!.onclick = showAvatarPicker;

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
  // CREATE CLASS (DENGAN KONFIRMASI & POTONGAN 30%)
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

      const classroomType =
        (
          document.getElementById(
            "classroomType"
          ) as HTMLSelectElement
        ).value;

      const instructorName =
        currentUser?.displayName ||
        "Pengajar";

      // Validasi sederhana
      if (!title || !price || price <= 0) {
        alert("Harap isi nama kelas dan harga yang valid.");
        return;
      }

      // Hitung potongan 30%
      const potongan = price * 0.3;
      const pendapatanBersih = price - potongan;

      // Konfirmasi dengan pilihan OK (Saya Setuju) / Cancel (Batal)
      const isConfirmed = confirm(
        `⚠️ KONFIRMASI PEMBUATAN KELAS ⚠️\n\n` +
        `Nama Kelas : ${title}\n` +
        `Harga Kelas: Rp ${price.toLocaleString("id-ID")}\n` +
        `Tipe Classroom: ${classroomType}\n\n` +
        `💰 Potongan Platform (30%): Rp ${potongan.toLocaleString("id-ID")}\n` +
        `✅ Pendapatan yang Anda terima: Rp ${pendapatanBersih.toLocaleString("id-ID")}\n\n` +
        `Apakah Anda setuju membuat kelas dengan ketentuan ini?\n` +
        `(Klik OK = Saya Setuju, Cancel = Batal)`
      );

      if (!isConfirmed) return; // Batal jika pilih Cancel

      await createClass(
        title,
        userId,
        price,
        mission,
        instructorName,
        linkedin,
        teaser,
        classroomType
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
  console.log("=== TEACHER DASHBOARD DEBUG ===");
  console.log("1. userId:", userId);
  console.log("2. Total classes from Firestore:", classes.length);
  console.log("3. Sample class (first):", classes[0]);
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
        const VITE_BANK_SERVER_URL = "https://a7ebaad9-c561-44dc-856f-1d3ac470f4cf-00-q2g9bpcnu210.pike.replit.dev";
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
             // Buat modal form untuk edit
             const modal = document.createElement("div");
             modal.className = "fixed inset-0 bg-black/70 flex items-center justify-center z-50";
             modal.innerHTML = `
               <div class="bg-[#1a1a2e] rounded-2xl p-8 max-w-md w-full mx-4 border border-[#00CED1]/30">
                 <h3 class="text-xl font-bold mb-6 text-[#00CED1]">Edit Kelas</h3>
                 
                 <div class="space-y-4">
                   <div>
                     <label class="block text-sm text-gray-300 mb-2">Nama Kelas</label>
                     <input id="editTitle" type="text" value="${cls.title}" class="w-full p-3 rounded bg-black/30 text-white" />
                   </div>

                   <div>
                     <label class="block text-sm text-gray-300 mb-2">Harga</label>
                     <input id="editPrice" type="number" value="${cls.price}" class="w-full p-3 rounded bg-black/30 text-white" />
                   </div>

                   <div>
                     <label class="block text-sm text-gray-300 mb-2">🏫 Tipe Classroom</label>
                     <select id="editClassroom" class="w-full p-3 rounded bg-black/30 text-white">
                       <option value="classroom.glb" ${cls.classroomType === "classroom.glb" ? "selected" : ""}>Classroom (Default)</option>
                       <option value="cyber_neon_lab.glb" ${cls.classroomType === "cyber_neon_lab.glb" ? "selected" : ""}>Cyber Neon Lab</option>
                       <option value="immersive_classroom.glb" ${cls.classroomType === "immersive_classroom.glb" ? "selected" : ""}>Immersive Classroom</option>
                       <option value="minimalist_gallery.glb" ${cls.classroomType === "minimalist_gallery.glb" ? "selected" : ""}>Minimalist Gallery</option>
                       <option value="ruang-meeting-minimalist.glb" ${cls.classroomType === "ruang-meeting-minimalist.glb" ? "selected" : ""}>Ruang Meeting Minimalist</option>
                       <option value="ruang-miting-futuristik.glb" ${cls.classroomType === "ruang-miting-futuristik.glb" ? "selected" : ""}>Ruang Miting Futuristik</option>
                       <option value="ruang-miting-minimalis-2.glb" ${cls.classroomType === "ruang-miting-minimalis-2.glb" ? "selected" : ""}>Ruang Miting Minimalis 2</option>
                       <option value="ruang.dokter.glb" ${cls.classroomType === "ruang.dokter.glb" ? "selected" : ""}>Ruang Dokter</option>
                       <option value="ruang.tunggu-1.glb" ${cls.classroomType === "ruang.tunggu-1.glb" ? "selected" : ""}>Ruang Tunggu 1</option>
                       <option value="zen_studio.glb" ${cls.classroomType === "zen_studio.glb" ? "selected" : ""}>Zen Studio</option>
                     </select>
                   </div>
                 </div>

                 <div class="flex gap-3 mt-8">
                   <button id="cancelEdit" class="flex-1 bg-gray-600 px-4 py-2 rounded-lg">
                     Batal
                   </button>
                   <button id="saveEdit" class="flex-1 bg-[#00CED1] text-black px-4 py-2 rounded-lg font-semibold">
                     Simpan
                   </button>
                 </div>
               </div>
             `;

             document.body.appendChild(modal);

             const cancelBtn = modal.querySelector("#cancelEdit") as HTMLButtonElement;
             const saveBtn = modal.querySelector("#saveEdit") as HTMLButtonElement;

             cancelBtn.onclick = () => modal.remove();

             saveBtn.onclick = async () => {
               const newTitle = (modal.querySelector("#editTitle") as HTMLInputElement).value;
               const newPrice = Number((modal.querySelector("#editPrice") as HTMLInputElement).value);
               const newClassroom = (modal.querySelector("#editClassroom") as HTMLSelectElement).value;

               if (!newTitle || newPrice <= 0) {
                 alert("Harap isi nama kelas dan harga yang valid.");
                 return;
               }

               await updateClass(cls.id, {
                 title: newTitle,
                 price: newPrice,
                 classroomType: newClassroom
               });

               modal.remove();
               loadTeacherDashboard(userId);
             };
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
                `${VITE_BANK_SERVER_URL}/refund`,
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
            // await createSession(
            //   cls.id,
            //   userId,
            //   undefined,
            //   cls.title,
            //   currentUser?.displayName || "Pengajar"
            // );

            // window.location.href =
            //   `/waiting-room.html?classId=${cls.id}`;
            window.location.href =
              `/waiting-room?classId=${cls.id}`;
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