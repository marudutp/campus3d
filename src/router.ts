// src/router.ts
export type Route = 
  | { name: 'landing' }
  | { name: 'waiting-room'; classId: string }
  | { name: 'classroom'; classId: string };

export function parseRoute(): Route {
  const path = window.location.pathname;
  const params = new URLSearchParams(window.location.search);
  const pageParam = params.get('page');
  
  console.log("📍 Path:", path);
  console.log("📍 Page param:", pageParam);
  
  // Case 1: Classroom dari path /classroom atau /classroom.html
  if (path === '/classroom' || path === '/classroom.html') {
    const classId = params.get('classId');
    if (classId) return { name: 'classroom', classId };
  }
  
  // Case 2: Classroom dari query param ?page=classroom
  if (pageParam === 'classroom') {
    const classId = params.get('classId');
    if (classId) return { name: 'classroom', classId };
  }
  
  // Case 3: Waiting room
  if (path === '/waiting-room') {
    const classId = params.get('classId');
    if (classId) return { name: 'waiting-room', classId };
  }
  
  // Default: Landing page
  return { name: 'landing' };
}