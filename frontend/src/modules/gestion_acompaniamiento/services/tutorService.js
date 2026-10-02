import { apiClient } from "../../../services/apiClient";

const pendingProfileRequests = new Map();

function getProfileEndpoint(rol) {
  return rol === "mentor"
    ? "/mentor/perfil-academico/"
    : "/tutor/perfil-academico/";
}

function getProfileCacheKey(rol, userId) {
  return userId ? `ideacampus:academic-profile:${rol}:${userId}` : null;
}

export function getCachedTutorProfile(rol, userId) {
  const key = getProfileCacheKey(rol, userId);
  if (!key) return null;

  try {
    const cachedProfile = sessionStorage.getItem(key);
    return cachedProfile ? JSON.parse(cachedProfile) : null;
  } catch {
    return null;
  }
}

function cacheTutorProfile(rol, userId, perfil) {
  const key = getProfileCacheKey(rol, userId);
  if (!key || !perfil) return;

  try {
    sessionStorage.setItem(key, JSON.stringify(perfil));
  } catch {
    return;
  }
}

export async function getTutorProfile(rol, userId) {
  const key = getProfileCacheKey(rol, userId);
  if (key && pendingProfileRequests.has(key)) {
    return pendingProfileRequests.get(key);
  }

  const request = apiClient.get(getProfileEndpoint(rol))
    .then((perfil) => {
      cacheTutorProfile(rol, userId, perfil);
      return perfil;
    })
    .finally(() => {
      if (key) pendingProfileRequests.delete(key);
    });

  if (key) pendingProfileRequests.set(key, request);
  return request;
}

export async function registerTutorProfile(perfil, rol, userId) {
  const updatedProfile = await apiClient.put(getProfileEndpoint(rol), perfil);
  cacheTutorProfile(rol, userId, updatedProfile);
  return updatedProfile;
}