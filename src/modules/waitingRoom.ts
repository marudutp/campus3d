import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  arrayUnion,
  arrayRemove,
  serverTimestamp
} from "firebase/firestore";

import { db } from "../firebase/config";

// ======================================
// CAMPUS3D WAITING ROOM MODULE FINAL
// sessions/{classId}
// ======================================

interface SessionData {
  id?: string;
  classId: string;
  teacherId: string;
  status: string;
  onlineCount: number;
  participants: string[];
  startAt: string | null;
  startedAt: any;
  endedAt: any;
}

export async function createSession(
  classId: string,
  teacherId: string,
  startAt?: string
) {
  const ref = doc(
    db,
    "sessions",
    classId
  );

  await setDoc(ref, {
    classId,
    teacherId,
    status: "waiting",
    onlineCount: 0,
    participants: [],
    startAt:
      startAt || null,
    startedAt: null,
    endedAt: null,
    createdAt:
      serverTimestamp()
  });
}

// ======================================
// GET SESSION
// ======================================
export async function getSession(
  classId: string
): Promise<SessionData | null> {
  const ref = doc(
    db,
    "sessions",
    classId
  );

  const snap =
    await getDoc(ref);

  if (!snap.exists())
    return null;

  return {
    id: snap.id,
    ...(snap.data() as SessionData)
  };
}

// ======================================
// START CLASS
// waiting -> live
// ======================================
export async function startSession(
  classId: string
) {
  const ref = doc(
    db,
    "sessions",
    classId
  );

  await updateDoc(ref, {
    status: "live",
    startedAt:
      serverTimestamp()
  });
}

// ======================================
// END CLASS
// live -> ended
// ======================================
export async function endSession(
  classId: string
) {
  const ref = doc(
    db,
    "sessions",
    classId
  );

  await updateDoc(ref, {
    status: "ended",
    endedAt:
      serverTimestamp()
  });
}

// ======================================
// CANCEL SESSION
// delete doc
// ======================================
export async function deleteSession(
  classId: string
) {
  const ref = doc(
    db,
    "sessions",
    classId
  );

  await deleteDoc(ref);
}

// ======================================
// JOIN WAITING ROOM
// ======================================
export async function joinQueue(
  classId: string,
  userId: string
) {
  const ref = doc(
    db,
    "sessions",
    classId
  );

  await updateDoc(ref, {
    participants:
      arrayUnion(
        userId
      ),
    onlineCountIncrement:
      true
  });

  await recalcOnlineCount(
    classId
  );
}

// ======================================
// LEAVE WAITING ROOM
// ======================================
export async function leaveQueue(
  classId: string,
  userId: string
) {
  const ref = doc(
    db,
    "sessions",
    classId
  );

  await updateDoc(ref, {
    participants:
      arrayRemove(
        userId
      )
  });

  await recalcOnlineCount(
    classId
  );
}

// ======================================
// MANUAL ONLINE COUNT
// ======================================
export async function setOnlineCount(
  classId: string,
  total: number
) {
  const ref = doc(
    db,
    "sessions",
    classId
  );

  await updateDoc(ref, {
    onlineCount: total
  });
}

// ======================================
// RECALC BASED ON ARRAY LENGTH
// ======================================
export async function recalcOnlineCount(
  classId: string
) {
  const data =
    await getSession(
      classId
    );

  if (!data) return;

  const total =
    data
      .participants
      ?.length || 0;

  await setOnlineCount(
    classId,
    total
  );
}

// ======================================
// CHANGE START TIME
// ======================================
export async function updateStartTime(
  classId: string,
  startAt: string
) {
  const ref = doc(
    db,
    "sessions",
    classId
  );

  await updateDoc(ref, {
    startAt
  });
}

// ======================================
// RESET SESSION
// ended -> waiting
// ======================================
export async function resetSession(
  classId: string
) {
  const ref = doc(
    db,
    "sessions",
    classId
  );

  await updateDoc(ref, {
    status: "waiting",
    participants: [],
    onlineCount: 0,
    startedAt: null,
    endedAt: null
  });
}