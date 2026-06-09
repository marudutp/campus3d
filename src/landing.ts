import { getClasses } from "./modules/class";
import { formatRupiah } from "./utils/format";
import { login } from "./firebase/auth";
import { GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import { auth } from "./firebase/config";
import { initWaitingRoom } from "./pages/waitingRoom";
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

  initClassSearch();
}

// =====================================
// 🔍 DEBOUNCE SEARCH
// =====================================
function debounce(func: Function, wait: number) {
  let timeout: any;
  return function (...args: any[]) {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

// =====================================
// 🔍 INIT CLASS SEARCH
// =====================================
function initClassSearch() {
  const searchInput = document.getElementById("classSearch") as HTMLInputElement;
  if (!searchInput) return;

  // Debounce search 300ms untuk mengurangi rerender
  const debouncedSearch = debounce(async (query: string) => {
    if (!query) {
      await loadLandingClasses();
      return;
    }

    const container = document.getElementById("landingClasses")!;
    const classes = await getClasses();
    
    const visibleClasses = classes.filter((cls: any) => {
      if (!cls.date) return true;
      return new Date(cls.date) >= new Date();
    });

    const filteredClasses = visibleClasses.filter((cls: any) =>
      cls.title.toLowerCase().includes(query) ||
      (cls.instructorName && cls.instructorName.toLowerCase().includes(query)) ||
      (cls.mission && cls.mission.toLowerCase().includes(query))
    );

    container.innerHTML = "";

    if (filteredClasses.length === 0) {
      container.innerHTML = `
        <div class="col-span-full text-center py-20">
          <p class="text-gray-400">Tidak ada kelas yang cocok dengan pencarian "${query}"</p>
        </div>
      `;
      return;
    }

    filteredClasses.forEach((cls: any) => {
      renderClassCard(cls, container);
    });
  }, 300);

  searchInput.addEventListener("input", async (e) => {
    const query = (e.target as HTMLInputElement).value.toLowerCase().trim();
    debouncedSearch(query);
  });
}

// =====================================
// 🎓 RENDER CLASS CARD (Reusable)
// =====================================
function renderClassCard(cls: any, container: HTMLElement) {
  const div = document.createElement("div");
  div.className = "glass-card p-5 rounded-2xl hover:scale-[1.02] transition cursor-pointer";
  
  // Use placeholder first, lazy load teaser
  const teaserHtml = cls.teaserUrl && isYoutubeUrl(cls.teaserUrl)
    ? `<div class="w-full h-40 mb-4 rounded-xl bg-gray-900 flex items-center justify-center text-gray-500" data-teaser="${getEmbedUrl(cls.teaserUrl)}">📺 Loading...</div>`
    : `<div class="w-full h-40 mb-4 rounded-xl bg-gray-800 flex items-center justify-center text-gray-500">🎥 Teaser segera hadir</div>`;

  div.innerHTML = `
    ${teaserHtml}
    <h3 class="text-lg font-bold mb-1">${cls.title}</h3>
    <p class="text-sm text-gray-400 mb-1">👨‍🏫 ${cls.instructorName || "Pengajar"}</p>
    ${cls.date ? `<p class="text-yellow-400 text-sm mb-2">📅 ${new Date(cls.date).toLocaleDateString("id-ID")}</p>` : ""}
    ${cls.mission ? `<p class="text-gray-400 text-sm mb-3 line-clamp-2">${cls.mission}</p>` : ""}
    <div class="flex justify-between items-center mt-2">
      <p class="text-[#00CED1] font-semibold">${formatRupiah(cls.price)}</p>
      <span class="text-xs text-green-400">👥 ${cls.students?.length || 0} siswa</span>
    </div>
  `;

  div.onclick = () => handleClassClick(cls);
  container.appendChild(div);

  // Lazy load teaser iframe after render
  const teaserDiv = div.querySelector('[data-teaser]') as HTMLElement;
  if (teaserDiv) {
    setTimeout(() => {
      const src = teaserDiv.getAttribute('data-teaser');
      teaserDiv.innerHTML = `
        <iframe
          src="${src}"
          class="w-full h-40 rounded-xl"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowfullscreen>
        </iframe>
      `;
    }, 100);
  }
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
    // window.location.href =
    //   `/waiting-room.html?classId=${cls.id}`;
    window.location.href =
      `/waiting-room?classId=${cls.id}`;
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
        ${cls.teaserUrl &&
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
          👨‍🏫 ${cls.instructorName ||
        "Pengajar"
        }
        </p>

        ${cls.date
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

        ${cls.mission
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
            👥 ${cls.students
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