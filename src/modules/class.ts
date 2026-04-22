import {
  collection,
  addDoc,
  getDocs,
  doc,
  updateDoc,
  deleteDoc,
  arrayUnion
} from "firebase/firestore";

import { db } from "../firebase/config";

// =========================
// 🧱 COLLECTION
// =========================
const classRef = collection(db, "classes");

// =========================
// 🎓 CREATE CLASS
// =========================
export async function createClass(
  title: string,
  instructorId: string,
  price: number,
  mission: string = "",
  instructorName: string = "Pengajar",
  linkedin: string = "",
  teaserUrl: string = ""
) {
  if (!title || !instructorId) {
    throw new Error("Data kelas tidak valid");
  }

  await addDoc(classRef, {
    title,
    price: price || 0,
    mission,
    instructorName,
    linkedin,
    teaserUrl,

    instructors: [instructorId],
    students: [],

    date: null,
    status: "open",

    createdAt: new Date()
  });
}

// =========================
// 📚 GET ALL CLASSES
// =========================
export async function getClasses() {
  const snap = await getDocs(classRef);

  return snap.docs.map(docSnap => ({
    id: docSnap.id,
    ...docSnap.data()
  }));
}

// =========================
// 🤝 JOIN CLASS
// =========================
export async function joinClass(classId: string, userId: string) {
  if (!classId || !userId) return;

  const ref = doc(db, "classes", classId);

  await updateDoc(ref, {
    students: arrayUnion(userId)
  });
}

// =========================
// ✏️ UPDATE CLASS
// =========================
export async function updateClass(
  classId: string,
  data: Partial<{
    title: string;
    price: number;
    date: string;
    mission: string;
    instructorName: string;
    linkedin: string;
    teaserUrl: string;
    status: string;
    students: string[];
  }>
) {
  if (!classId) return;

  const ref = doc(db, "classes", classId);

  await updateDoc(ref, data);
}

// =========================
// ❌ DELETE CLASS
// =========================
export async function deleteClass(classId: string) {
  if (!classId) return;

  const ref = doc(db, "classes", classId);
  await deleteDoc(ref);
}