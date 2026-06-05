import {
  collection,
  addDoc,
  getDocs,
  doc,
  updateDoc,
  deleteDoc,
  arrayUnion,
  query,
  where
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
  teaserUrl: string = "",
  classroomType: string = "classroom.glb",
  startDate: string = "",
  endDate: string = ""
) {
  if (!title || !instructorId) {
    throw new Error("Data kelas tidak valid");
  }

  // Default startDate ke Juni tahun ini/depan
  let finalStartDate = startDate;
  if (!startDate) {
    const year = new Date().getFullYear();
    const month = new Date().getMonth();
    finalStartDate = month >= 5 ? `${year + 1}-06-01` : `${year}-06-01`;
  }

  const status = !startDate || !endDate ? "inactive" : "open";

  await addDoc(classRef, {
    title,
    price: price || 0,
    mission,
    instructorName,
    linkedin,
    teaserUrl,
    classroomType,

    instructors: [instructorId],
    students: [],

    date: null,
    startDate: finalStartDate,
    endDate: endDate,
    status: status,

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
    classroomType: string;
    status: string;
    startDate: string;
    endDate: string;
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

// =========================
// 📨 REQUEST CLASS (STUDENT)
// =========================
export async function requestClassActivation(
  classId: string,
  studentId: string,
  studentName: string
) {
  if (!classId || !studentId) return;

  const requestsRef = collection(db, "classRequests");
  
  await addDoc(requestsRef, {
    classId,
    studentId,
    studentName,
    status: "pending",
    createdAt: new Date()
  });
}

// =========================
// 📋 GET CLASS REQUESTS
// =========================
export async function getClassRequests(classId: string) {
  const requestsRef = collection(db, "classRequests");
  const q = query(requestsRef, where("classId", "==", classId), where("status", "==", "pending"));
  const snap = await getDocs(q);
  
  return snap.docs.map(docSnap => ({
    id: docSnap.id,
    ...docSnap.data()
  }));
}
