"use client";

import { useEffect, useState } from "react";
import { api } from "../../lib/api";
import { getSession } from "../../lib/session";

function Currency({ value }) {
  return <>{new Intl.NumberFormat("en-IN").format(Number(value || 0))}</>;
}

export default function SnapshotPage() {
  const [session, setSession] = useState(null);
  const [plan, setPlan] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [simulateAmount, setSimulateAmount] = useState(0);
  const [simulation, setSimulation] = useState(null);

  useEffect(() => {
    const currentSession = getSession();
    setSession(currentSession);

    if (!currentSession?.userId) {
      setLoading(false);
      return;
    }

    api
      .getPlan(currentSession.userId)
      .then((result) => {
        setPlan(result);
        setSimulateAmount(Number(result.currentMonthlyContribution || 0));
      })
      .catch((err) => setError(err.message || "Failed to load snapshot"))
      .finally(() => setLoading(false));
  }, []);

  async function handleSimulate() {
    if (!session?.userId) {
      return;
    }

    try {
      const result = await api.simulatePlan({
        userId: session.userId,
        monthlyContribution: Number(simulateAmount),
      });
      setSimulation(result);
    } catch (err) {
      setError(err.message || "Unable to simulate");
    }
  }

  if (!session?.userId) {
    return (
      <article className="card">
        <h2>No active profile found</h2>
        <p className="muted">
          Start onboarding to create a profile and generate your retirement plan.
        </p>
        <a className="btn primary" href="/onboarding">
          Go to onboarding
        </a>
      </article>
    );
  }

  if (loading) {
    return <article className="card">Loading your retirement snapshot...</article>;
  }

  const activePlan = simulation || plan;
  if (!activePlan) {
    return (
      <article className="card">
        <h2>Plan not found</h2>
        <p className="error">{error || "Generate your plan first."}</p>
      </article>
    );
  }

  return (
    <section className="grid">
      <article className="card">
        <h2>Retirement readiness snapshot</h2>
        <p className="muted">
          This view compares your projected corpus with the required corpus based
          on inflation and return assumptions.
        </p>
        <span className="badge">Confidence: {activePlan.confidenceScore}</span>
        <div className="actions">
          <a className="btn secondary" href="/manual">
            Open user manual
          </a>
          <a className="btn ghost" href="/dashboard">
            Go to dashboard
          </a>
        </div>
      </article>

      <div className="grid two">
        <article className="card">
          <h3>Corpus required</h3>
          <p className="kpi">
            Rs <Currency value={activePlan.corpusRequired} />
          </p>
        </article>

        <article className="card">
          <h3>Corpus projected</h3>
          <p className="kpi">
            Rs <Currency value={activePlan.corpusProjected} />
          </p>
        </article>

        <article className="card">
          <h3>Monthly contribution needed</h3>
          <p className="kpi">
            Rs <Currency value={activePlan.monthlyContributionNeeded} />
          </p>
        </article>

        <article className="card">
          <h3>Monthly gap</h3>
          <p className="kpi">
            Rs <Currency value={activePlan.monthlyGap} />
          </p>
        </article>
      </div>

      <article className="card">
        <h3>What-if simulator</h3>
        <p className="muted">
          Try a contribution amount and instantly see its retirement impact.
        </p>
        <div className="actions">
          <input
            min={0}
            type="number"
            value={simulateAmount}
            onChange={(event) => setSimulateAmount(event.target.value)}
            style={{ maxWidth: 240 }}
          />
          <button className="btn secondary" onClick={handleSimulate} type="button">
            Simulate
          </button>
          <a className="btn primary" href="/contribution">
            Set contribution plan
          </a>
          <a className="btn secondary" href="/dashboard">
            Open dashboard
          </a>
          <a className="btn ghost" href="/withdrawals">
            Withdrawal center
          </a>
        </div>
      </article>

      <article className="card">
        <h3>Suggested allocation</h3>
        <p>
          Stocks: {activePlan.recommendedAllocation?.stocks}% | Bonds: {" "}
          {activePlan.recommendedAllocation?.bonds}%
        </p>
        {error ? <p className="error">{error}</p> : null}
      </article>

      <article className="card">
        <h3>How to use this page</h3>
        <ol>
          <li>Read required corpus and projected corpus together.</li>
          <li>If monthly gap is high, increase contribution in small steps.</li>
          <li>Use simulator to compare at least two contribution values.</li>
          <li>After choosing a value, save it in Contributions page.</li>
        </ol>
      </article>
    </section>
  );
}
