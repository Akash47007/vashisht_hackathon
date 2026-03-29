const SESSION_KEY = "futureyou.session";

function dispatchSessionUpdate() {
  if (typeof window === "undefined") {
    return;
  }

  window.dispatchEvent(new Event("futureyou-session-updated"));
}

export function saveSession(session) {
  if (typeof window === "undefined") {
    return;
  }

  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  dispatchSessionUpdate();
}

export function getSession() {
  if (typeof window === "undefined") {
    return null;
  }

  const raw = localStorage.getItem(SESSION_KEY);
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function clearSession() {
  if (typeof window === "undefined") {
    return;
  }

  localStorage.removeItem(SESSION_KEY);
  dispatchSessionUpdate();
}
