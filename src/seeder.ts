// ======================================
// 🚀 CAMPUS3D FIRESTORE SEEDER
// File: src/seeder.ts
// Jalankan sekali untuk isi dummy classes
// ======================================

import { collection, addDoc } from "firebase/firestore";
import { db } from "./firebase/config";

// ======================================
// 🎯 DATASET
// ======================================
const demoClasses = [
  {
    title: "AI Prompt Engineering untuk Bisnis",
    instructorName: "Rafi Pratama",
    price: 149000,
    mission:
      "Pelajari cara memakai AI untuk marketing, sales dan produktivitas.",
    linkedin:
      "https://linkedin.com/in/rafipratama",
    teaserUrl:
      "https://youtu.be/wyP9Xjetxwk",
    date: "2026-05-20"
  },

  {
    title: "Public Speaking Powerful Confidence",
    instructorName: "Nadia Putri",
    price: 99000,
    mission:
      "Berbicara percaya diri di depan umum dan meeting kerja.",
    linkedin:
      "https://linkedin.com/in/nadiaputri",
    teaserUrl:
      "https://youtu.be/JV8mIfjwPeM",
    date: "2026-05-18"
  },

  {
    title: "Blender 3D untuk Pemula",
    instructorName: "Dimas Surya",
    price: 179000,
    mission:
      "Belajar modeling 3D dari nol hingga render profesional.",
    linkedin:
      "https://linkedin.com/in/dimassurya",
    teaserUrl:
      "https://youtu.be/nIoXOplUvAw",
    date: "2026-05-25"
  },

  {
    title: "Digital Marketing Meta Ads 2026",
    instructorName: "Kevin Hartono",
    price: 199000,
    mission:
      "Naikkan penjualan lewat Facebook & Instagram Ads.",
    linkedin:
      "https://linkedin.com/in/kevinhartono",
    teaserUrl:
      "https://youtu.be/9No-FiEInLA",
    date: "2026-05-22"
  },

  {
    title: "English Speaking for Career Growth",
    instructorName: "Michelle Tan",
    price: 129000,
    mission:
      "Percakapan kerja, interview, dan presentasi profesional.",
    linkedin:
      "https://linkedin.com/in/michelletan",
    teaserUrl:
      "https://youtu.be/dQw4w9WgXcQ",
    date: "2026-05-30"
  }
];

// ======================================
// 🎲 RANDOM STUDENT COUNT
// ======================================
function randomStudents() {
  const total =
    Math.floor(Math.random() * 80);

  return Array.from(
    { length: total },
    (_, i) => `student_${i + 1}`
  );
}

// ======================================
// 🚀 RUN SEEDER
// ======================================
export async function runSeeder() {
  try {
    const ref =
      collection(db, "classes");

    for (const item of demoClasses) {
      await addDoc(ref, {
        ...item,

        instructors: [
          "seed_teacher_001"
        ],

        students:
          randomStudents(),

        createdAt:
          new Date()
      });

      console.log(
        "✅ Added:",
        item.title
      );
    }

    console.log(
      "🔥 Seeder selesai!"
    );

    alert(
      "Seeder berhasil 🚀"
    );
  } catch (error) {
    console.error(
      "❌ Seeder gagal:",
      error
    );
  }
}