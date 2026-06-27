/** Lumiera usa 127.0.0.1 (Canva Connect e OAuth não aceitam localhost). */
export const LUMIERA_HOST = "127.0.0.1";
export const LUMIERA_BACKEND_PORT = 3005;
export const LUMIERA_FRONTEND_PORT = 5176;

export const LUMIERA_BACKEND_BASE = `http://${LUMIERA_HOST}:${LUMIERA_BACKEND_PORT}`;
export const LUMIERA_FRONTEND_BASE = `http://${LUMIERA_HOST}:${LUMIERA_FRONTEND_PORT}`;

export const LUMIERA_CANVA_CALLBACK = `${LUMIERA_BACKEND_BASE}/api/canva/callback`;
export const LUMIERA_YOUTUBE_CALLBACK = `${LUMIERA_BACKEND_BASE}/api/upload/youtube/callback`;