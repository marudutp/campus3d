import { getClasses } from "./modules/class";
import { formatRupiah } from "./utils/format";
import { login } from "./firebase/auth";

// =====================================
// 🔐 INIT LANDING BUTTONS
// =====================================
export function initLanding() {
  const teacherBtn =
    document.getElementById("teacherBtn") as HTMLButtonElement;

  const studentBtn =
    document.getElementById("studentBtn") as HTMLButtonElement;

  if (!teacherBtn || !studentBtn) return;

  teacherBtn.onclick = async () => {
    localStorage.setItem("role", "teacher");
    await login();
  };

  studentBtn.onclick = async () => {
    localStorage.setItem("role", "student");
    await login();
  };
}

// =====================================
// 🎬 YOUTUBE EMBED PARSER
// =====================================
function getEmbedUrl(url: string): string {
  if (!url) return "";

  try {
    // youtube.com/watch?v=
    if (url.includes("watch?v=")) {
      const id =
        url.split("watch?v=")[1].split("&")[0];

      return `https://www.youtube.com/embed/${id}`;
    }

    // youtu.be/
    if (url.includes("youtu.be/")) {
      const id =
        url.split("youtu.be/")[1].split("?")[0];

      return `https://www.youtube.com/embed/${id}`;
    }

    // shorts
    if (url.includes("/shorts/")) {
      const id =
        url.split("/shorts/")[1].split("?")[0];

      return `https://www.youtube.com/embed/${id}`;
    }

    return url;
  } catch {
    return "";
  }
}

// =====================================
// ✅ VALID VIDEO URL
// =====================================
function isYoutubeUrl(url: string): boolean {
  return (
    url.includes("youtube.com") ||
    url.includes("youtu.be")
  );
}

// =====================================
// 🚀 CTA CLASS CLICK
// =====================================
function handleClassClick(cls: any) {
  const role =
    localStorage.getItem("role");

  const isLoggedIn =
    !!localStorage.getItem("role");

  // Jika user sudah pilih role
  if (role && isLoggedIn) {
    window.location.href =
      `/waiting-room.html?classId=${cls.id}`;
    return;
  }

  // Kalau belum login
  const hero =
    document.getElementById(
      "landing-page"
    );

  hero?.scrollIntoView({
    behavior: "smooth"
  });

  alert(
    "Silakan pilih peran dan login untuk bergabung 🚀"
  );
}

// =====================================
// 🌐 LOAD LANDING CLASSES
// =====================================
export async function loadLandingClasses() {
  const container =
    document.getElementById(
      "landingClasses"
    )!;

  container.innerHTML = "";

  const classes =
    await getClasses();

  // tampilkan kelas aktif
  const visibleClasses =
    classes.filter(
      (cls: any) => {
        if (!cls.date)
          return true;

        return (
          new Date(cls.date) >=
          new Date()
        );
      }
    );

  // =====================================
  // 🔥 EMPTY STATE
  // =====================================
  if (
    visibleClasses.length === 0
  ) {
    container.innerHTML = `
      <div class="col-span-full text-center py-20">

        <h2 class="text-4xl font-extrabold mb-4">
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
  // 🎓 RENDER CARD
  // =====================================
  visibleClasses.forEach(
    (cls: any) => {
      const div =
        document.createElement(
          "div"
        );

      div.className =
        "glass-card p-5 rounded-2xl hover:scale-[1.02] transition cursor-pointer";

      div.innerHTML = `
        ${
          cls.teaserUrl &&
          isYoutubeUrl(
            cls.teaserUrl
          )
            ? `
            <iframe
              src="${getEmbedUrl(
                cls.teaserUrl
              )}"
              class="w-full h-40 mb-4 rounded-xl"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowfullscreen>
            </iframe>
          `
            : `
            <div class="w-full h-40 mb-4 rounded-xl bg-gray-800 flex items-center justify-center text-gray-500">
              🎥 Teaser segera hadir
            </div>
          `
        }

        <h3 class="text-lg font-bold mb-1">
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
              📅 ${new Date(
                cls.date
              ).toLocaleDateString(
                "id-ID"
              )}
            </p>
          `
            : ""
        }

        ${
          cls.mission
            ? `
            <p class="text-gray-400 text-sm mb-3 line-clamp-2">
              ${cls.mission}
            </p>
          `
            : ""
        }

        <div class="flex justify-between items-center mt-2">

          <p class="text-[#00CED1] font-semibold">
            ${formatRupiah(
              cls.price
            )}
          </p>

          <span class="text-xs text-green-400">
            👥 ${
              cls.students
                ?.length || 0
            } siswa
          </span>

        </div>
      `;

      // =====================================
      // 🚀 CLICK CLASS
      // =====================================
      div.onclick = () =>
        handleClassClick(
          cls
        );

      container.appendChild(
        div
      );
    }
  );
}