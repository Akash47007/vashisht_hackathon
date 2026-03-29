const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:4000";

async function request(path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
    ...options,
  });

  const text = await response.text();
  let data = {};

  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = { raw: text };
    }
  }

  if (!response.ok) {
    const message =
      data.message ||
      data.error ||
      (typeof data.raw === "string" && data.raw.length <= 200 ? data.raw : "") ||
      `Request failed (${response.status})`;
    throw new Error(message);
  }

  return data;
}

export const api = {
  signup(payload) {
    return request("/auth/signup", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },
  login(payload) {
    return request("/auth/login", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },
  saveProfile(payload) {
    return request("/profile", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },
  getProfile(userId) {
    return request(`/profile/${userId}`);
  },
  generatePlan(userId) {
    return request("/plan/generate", {
      method: "POST",
      body: JSON.stringify({ userId }),
    });
  },
  simulatePlan(payload) {
    return request("/plan/simulate", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },
  getPlan(userId) {
    return request(`/plan/${userId}`);
  },
  setupContribution(payload) {
    return request("/contribution/setup", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },
  recordContribution(payload) {
    return request("/contribution/record", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },
  getDashboard(userId) {
    return request(`/dashboard/${userId}`);
  },
  simulateWithdrawal(payload) {
    return request("/withdrawals/simulate", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },
  requestWithdrawal(payload) {
    return request("/withdrawals/request", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },
  getWithdrawalHistory(userId) {
    return request(`/withdrawals/history/${userId}`);
  },
  getLearningQuests(userId) {
    return request(`/learning/quests?userId=${userId}`);
  },
  completeQuest(userId, questId) {
    return request(`/learning/quests/${questId}/complete`, {
      method: "POST",
      body: JSON.stringify({ userId }),
    });
  },
  getNudges(userId) {
    return request(`/nudges/${userId}`);
  },
  clickNudge(nudgeId) {
    return request(`/events/nudge/${nudgeId}/click`, {
      method: "POST",
    });
  },
  getMarketHighlights() {
    return request("/market/highlights");
  },
  getMetrics() {
    return request("/metrics/summary");
  },
};
