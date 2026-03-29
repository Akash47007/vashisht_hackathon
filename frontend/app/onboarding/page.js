"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "../../lib/api";
import { clearSession, getSession, saveSession } from "../../lib/session";

const initialState = {
  email: "",
  password: "",
  currentAge: 21,
  retirementAge: 60,
  currentMonthlyIncome: 25000,
  currentMonthlyExpense: 18000,
  currentSavings: 5000,
  riskComfort: "balanced",
  desiredLifestyle: "Financially independent with travel flexibility",
  travelBudget: 250000,
  healthBuffer: 500000,
  dependents: 0,
};

const riskProfiles = {
  conservative: {
    title: "Conservative",
    allocation: "30% stocks / 70% bonds",
    expectedRange: "Approx 6-8% annualized",
    behavior: "Lower volatility and steadier movement",
  },
  balanced: {
    title: "Balanced",
    allocation: "50% stocks / 50% bonds",
    expectedRange: "Approx 8-10% annualized",
    behavior: "Moderate growth with moderate volatility",
  },
  growth: {
    title: "Growth",
    allocation: "80% stocks / 20% bonds",
    expectedRange: "Approx 10-12% annualized",
    behavior: "Higher growth potential with larger swings",
  },
};

export default function OnboardingPage() {
  const router = useRouter();
  const [form, setForm] = useState(initialState);
  const [step, setStep] = useState(1);
  const [activeSession, setActiveSession] = useState(null);
  const [prefilledFromSession, setPrefilledFromSession] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const totalSteps = 4;

  useEffect(() => {
    const existingSession = getSession();
    if (!existingSession?.userId) {
      setActiveSession(null);
      return;
    }

    setActiveSession(existingSession);

    if (!prefilledFromSession && existingSession.email) {
      setForm((current) => ({
        ...current,
        email: existingSession.email,
      }));
      setPrefilledFromSession(true);
    }
  }, [prefilledFromSession]);

  const canMoveNext = useMemo(() => {
    if (step === 1) {
      return form.email.length > 3 && form.password.length >= 6;
    }

    if (step === 2) {
      return (
        Number(form.currentAge) >= 18 &&
        Number(form.retirementAge) > Number(form.currentAge) &&
        Number(form.currentMonthlyIncome) >= 0 &&
        Number(form.currentMonthlyExpense) >= 0
      );
    }

    if (step === 3) {
      return (
        Number(form.currentSavings) >= 0 &&
        Number(form.travelBudget) >= 0 &&
        Number(form.healthBuffer) >= 0
      );
    }

    return true;
  }, [form, step]);

  const selectedRiskProfile = riskProfiles[form.riskComfort] || riskProfiles.balanced;

  function updateField(key, value) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function handleSwitchAccount() {
    clearSession();
    setActiveSession(null);
    setPrefilledFromSession(false);
    setForm({ ...initialState });
    setStep(1);
    setError("");
    setSuccess("");
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (step < totalSteps) {
      if (canMoveNext) {
        setStep((current) => current + 1);
      }
      return;
    }

    setLoading(true);
    setError("");
    setSuccess("");

    try {
      let authResult;

      try {
        authResult = await api.signup({
          email: form.email,
          password: form.password,
        });
      } catch (authError) {
        if (authError.message === "User already exists") {
          authResult = await api.login({
            email: form.email,
            password: form.password,
          });
        } else {
          throw authError;
        }
      }

      saveSession({
        token: authResult.token,
        userId: authResult.userId,
        email: form.email,
      });

      await api.saveProfile({
        userId: authResult.userId,
        currentAge: Number(form.currentAge),
        retirementAge: Number(form.retirementAge),
        currentMonthlyIncome: Number(form.currentMonthlyIncome),
        currentMonthlyExpense: Number(form.currentMonthlyExpense),
        currentSavings: Number(form.currentSavings),
        riskComfort: form.riskComfort,
        lifestyleGoals: {
          desiredLifestyle: form.desiredLifestyle,
          travelBudget: Number(form.travelBudget),
          healthBuffer: Number(form.healthBuffer),
          dependents: Number(form.dependents),
        },
      });

      await api.generatePlan(authResult.userId);
      setSuccess("Plan generated successfully. Redirecting to your snapshot.");
      setTimeout(() => {
        router.push("/snapshot");
      }, 600);
    } catch (err) {
      setError(err.message || "Unable to complete onboarding");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="grid">
      <article className="card">
        <h2>One-time setup: create your financial baseline</h2>
        <p className="muted">
          Complete this once. After setup, you will use snapshot, contribution,
          dashboard, and learning pages directly.
        </p>
        <div className="stepper" aria-label="Onboarding progress">
          <div className={`step ${step > 1 ? "done" : step === 1 ? "active" : ""}`}>
            1. Account
          </div>
          <div className={`step ${step > 2 ? "done" : step === 2 ? "active" : ""}`}>
            2. Income and age
          </div>
          <div className={`step ${step > 3 ? "done" : step === 3 ? "active" : ""}`}>
            3. Savings and goals
          </div>
          <div className={`step ${step === 4 ? "active" : ""}`}>4. Risk and review</div>
        </div>
      </article>

      <article className="card">
        <form onSubmit={handleSubmit}>
          {step === 1 ? (
            <div className="grid two">
              <label>
                Email
                <input
                  required
                  type="email"
                  value={form.email}
                  onChange={(event) => updateField("email", event.target.value)}
                  placeholder="you@example.com"
                />
              </label>

              <label>
                Password
                <input
                  required
                  minLength={6}
                  type="password"
                  value={form.password}
                  onChange={(event) => updateField("password", event.target.value)}
                  placeholder="At least 6 characters"
                />
              </label>

              <p className="muted" style={{ gridColumn: "1 / -1" }}>
                Already have an account? <a href="/login">Login here</a>.
              </p>

              {activeSession ? (
                <div className="info-block" style={{ gridColumn: "1 / -1" }}>
                  <strong>Signed in as {activeSession.email}</strong>
                  <p className="muted">
                    To create another account, switch account first. Your current
                    account data remains saved.
                  </p>
                  <div className="actions">
                    <button
                      className="btn secondary"
                      onClick={handleSwitchAccount}
                      type="button"
                    >
                      Switch account
                    </button>
                    <button
                      className="btn ghost"
                      onClick={() => router.push("/dashboard")}
                      type="button"
                    >
                      Continue to dashboard
                    </button>
                  </div>
                </div>
              ) : null}
            </div>
          ) : null}

          {step === 2 ? (
            <div className="grid two">
              <label>
                Current age
                <input
                  required
                  min={18}
                  max={80}
                  type="number"
                  value={form.currentAge}
                  onChange={(event) => updateField("currentAge", event.target.value)}
                />
              </label>

              <label>
                Retirement age target
                <input
                  required
                  min={40}
                  max={85}
                  type="number"
                  value={form.retirementAge}
                  onChange={(event) => updateField("retirementAge", event.target.value)}
                />
              </label>

              <label>
                Monthly income
                <input
                  required
                  min={0}
                  type="number"
                  value={form.currentMonthlyIncome}
                  onChange={(event) =>
                    updateField("currentMonthlyIncome", event.target.value)
                  }
                />
              </label>

              <label>
                Monthly expenses
                <input
                  required
                  min={0}
                  type="number"
                  value={form.currentMonthlyExpense}
                  onChange={(event) =>
                    updateField("currentMonthlyExpense", event.target.value)
                  }
                />
              </label>
            </div>
          ) : null}

          {step === 3 ? (
            <div className="grid two">
              <label>
                Current savings
                <input
                  required
                  min={0}
                  type="number"
                  value={form.currentSavings}
                  onChange={(event) => updateField("currentSavings", event.target.value)}
                />
              </label>

              <label>
                Travel budget goal
                <input
                  min={0}
                  type="number"
                  value={form.travelBudget}
                  onChange={(event) => updateField("travelBudget", event.target.value)}
                />
              </label>

              <label>
                Health buffer goal
                <input
                  min={0}
                  type="number"
                  value={form.healthBuffer}
                  onChange={(event) => updateField("healthBuffer", event.target.value)}
                />
              </label>

              <label>
                Dependents planned
                <input
                  min={0}
                  type="number"
                  value={form.dependents}
                  onChange={(event) => updateField("dependents", event.target.value)}
                />
              </label>
            </div>
          ) : null}

          {step === 4 ? (
            <div className="grid two">
              <label>
                Risk comfort
                <select
                  value={form.riskComfort}
                  onChange={(event) => updateField("riskComfort", event.target.value)}
                >
                  <option value="conservative">Conservative</option>
                  <option value="balanced">Balanced</option>
                  <option value="growth">Growth</option>
                </select>
              </label>

              <div className="info-block" style={{ gridColumn: "1 / -1" }}>
                <strong>What this starter allocation means</strong>
                <p className="muted">
                  You selected <strong>{selectedRiskProfile.title}</strong>. We use
                  this to suggest your initial stock-bond split and expected risk
                  behavior. You can adjust contribution amount anytime.
                </p>
                <p className="muted">
                  Suggested split: <strong>{selectedRiskProfile.allocation}</strong>
                  {" | "}Expected range: <strong>{selectedRiskProfile.expectedRange}</strong>
                </p>
                <div className="grid two">
                  {Object.entries(riskProfiles).map(([key, profile]) => (
                    <div
                      className={`metric-slab ${form.riskComfort === key ? "selected-risk" : ""}`}
                      key={key}
                    >
                      <h4>{profile.title}</h4>
                      <p><strong>{profile.allocation}</strong></p>
                      <p className="muted">{profile.expectedRange}</p>
                      <p className="muted">{profile.behavior}</p>
                    </div>
                  ))}
                </div>
              </div>

              <label style={{ gridColumn: "1 / -1" }}>
                Desired retirement lifestyle
                <textarea
                  rows={3}
                  value={form.desiredLifestyle}
                  onChange={(event) => updateField("desiredLifestyle", event.target.value)}
                />
              </label>
            </div>
          ) : null}

          <div className="actions">
            {step > 1 ? (
              <button
                className="btn secondary"
                disabled={loading}
                onClick={() => setStep((current) => current - 1)}
                type="button"
              >
                Back
              </button>
            ) : null}

            <button
              className="btn primary"
              disabled={loading || !canMoveNext}
              type="submit"
            >
              {loading
                ? "Generating plan..."
                : step < totalSteps
                  ? "Continue"
                  : "Finish setup and generate plan"}
            </button>
          </div>

          <p className="muted">Step {step} of {totalSteps}</p>

          {error ? <p className="error">{error}</p> : null}
          {success ? <p className="success">{success}</p> : null}
        </form>
      </article>
    </section>
  );
}
