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

onAuthStateChanged(auth, (user) => {
  console.log("🔥 AUTH STATE:", user);
  currentUser = user;
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

  await setPersistence(auth, browserLocalPersistence);

  const result = await signInWithPopup(auth, provider);

  return result.user;
}

export async function logout() {
  await signOut(auth);
  location.reload();
}