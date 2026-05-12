// import {
//   GoogleAuthProvider,
//   signInWithPopup,
//   setPersistence,
//   browserLocalPersistence,
//   onAuthStateChanged,
//   signOut
// } from "firebase/auth";

// import { auth } from "./config";

// export let currentUser: any = null;

// const listeners: any[] = [];

// onAuthStateChanged(auth, (user) => {
//   console.log("🔥 AUTH STATE:", user);
//   currentUser = user;
//   if (user) {
//     listeners.forEach(cb => cb(user));
//   }

// });

// export function onUserReady(cb: any) {
//   listeners.push(cb);
//   if (currentUser) cb(currentUser);
// }

// export function initAuth() {
//   console.log("Auth ready");
// }

// // export async function login() {
// //   const provider = new GoogleAuthProvider();

// //   await setPersistence(auth, browserLocalPersistence);

// //   const result = await signInWithPopup(auth, provider);

// //   return result.user;
// // }
// export async function login() {
//   const provider = new GoogleAuthProvider();

//   // 🔥 WAJIB: paksa pilih akun setiap login
//   provider.setCustomParameters({
//     prompt: "select_account"
//   });

//   await setPersistence(auth, browserLocalPersistence);

//   const result = await signInWithPopup(auth, provider);

//   console.log("✅ Login user:", result.user.email);


//   return result.user;
// }

// export async function logout() {
//   await signOut(auth);
//   location.reload();
// }

import {
  GoogleAuthProvider,
  signInWithPopup,
  setPersistence,
  browserLocalPersistence,
  onAuthStateChanged,
  signOut
} from "firebase/auth";

import { auth } from "./config";

export let currentUser: any = null;

const listeners: any[] = [];

// 🔥 TAMBAHKAN: Fungsi untuk menyimpan user ke localStorage
function saveUserToLocalStorage(user: any) {
  if (user) {
    localStorage.setItem('user', JSON.stringify({
      uid: user.uid,
      displayName: user.displayName,
      email: user.email,
      photoURL: user.photoURL || ""
    }));
    console.log("💾 User saved to localStorage:", user.uid);
  } else {
    localStorage.removeItem('user');
    console.log("🗑️ User removed from localStorage");
  }
}

// 🔥 TAMBAHKAN: Fungsi untuk memuat user dari localStorage (fallback)
export function loadUserFromLocalStorage() {
  const stored = localStorage.getItem('user');
  if (stored) {
    try {
      const user = JSON.parse(stored);
      console.log("📦 User loaded from localStorage:", user.uid);
      return user;
    } catch (e) {
      console.error("Failed to parse user from localStorage", e);
    }
  }
  return null;
}

onAuthStateChanged(auth, (user) => {
  console.log("🔥 AUTH STATE:", user);
  currentUser = user;

  // 🔥 SIMPAN KE LOCALSTORAGE setiap kali auth state berubah
  saveUserToLocalStorage(user);

  if (user) {
    listeners.forEach(cb => cb(user));
  }
});

export function onUserReady(cb: any) {
  listeners.push(cb);
  if (currentUser) cb(currentUser);
}

export function initAuth() {
  console.log("Auth ready");
}

export async function login() {
  const provider = new GoogleAuthProvider();

  // 🔥 WAJIB: paksa pilih akun setiap login
  provider.setCustomParameters({
    prompt: "select_account"
  });

  await setPersistence(auth, browserLocalPersistence);

  const result = await signInWithPopup(auth, provider);

  console.log("✅ Login user:", result.user.email);

  // 🔥 user akan otomatis tersimpan via onAuthStateChanged
  return result.user;
}

export async function logout() {
  await signOut(auth);
  // 🔥 user akan otomatis dihapus dari localStorage via onAuthStateChanged
  location.reload();
}