"use client";

import { useEffect, useMemo, useState } from "react";
import { api } from "../../lib/api";
import { getSession } from "../../lib/session";

function Currency({ value }) {
  return <>{new Intl.NumberFormat("en-IN").format(Number(value || 0))}</>;
}

export default function ContributionPage() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(false);
  const [insightLoading, setInsightLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [moneyFlow, setMoneyFlow] = useState(null);
  const [portfolioSnapshot, setPortfolioSnapshot] = useState(null);
  const [essentialHealth, setEssentialHealth] = useState(null);
  const [form, setForm] = useState({
    frequency: "monthly",
    amount: 1000,
    startDate: new Date().toISOString().slice(0, 10),
    via: "auto",
    recordFirstContribution: true,
  });

  const summary = useMemo(() => {
    return `${form.frequency} | Rs ${form.amount} | ${form.via}`;
  }, [form]);

  async function loadInsights(userId) {
    setInsightLoading(true);

    try {
      const dashboardData = await api.getDashboard(userId);
      setMoneyFlow(dashboardData.moneyFlowBreakdown || null);
      setPortfolioSnapshot(dashboardData.portfolioSnapshot || null);
      setEssentialHealth(dashboardData.essentialHealth || null);
    } catch {
      // Keep contribution flow usable even if dashboard insights fail temporarily.
    } finally {
      setInsightLoading(false);
    }
  }

  useEffect(() => {
    const current = getSession();
    setSession(current);

    if (current?.userId) {
      loadInsights(current.userId);
    }
  }, []);

  function updateField(key, value) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (!session?.userId) {
      setError("No active session. Complete onboarding first.");
      return;
    }

    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const setupResult = await api.setupContribution({
        userId: session.userId,
        frequency: form.frequency,
        amount: Number(form.amount),
        startDate: form.startDate,
        via: form.via,
      });

      let recordResult = null;

      if (form.recordFirstContribution) {
        recordResult = await api.recordContribution({
          userId: session.userId,
          amount: Number(form.amount),
          type: "manual",
        });
      }

      const latestMoneyFlow =
        recordResult?.moneyFlowBreakdown || setupResult?.moneyFlowBreakdown || null;
      const latestPortfolio =
        recordResult?.portfolioSnapshot || setupResult?.portfolioSnapshot || null;

      if (latestMoneyFlow) {
        setMoneyFlow(latestMoneyFlow);
      }

      if (latestPortfolio) {
        setPortfolioSnapshot(latestPortfolio);
      }

      await loadInsights(session.userId);

      if (latestPortfolio) {
        const returnsPercent = Number(
          latestPortfolio.estimatedReturnsPercent || 0,
        ).toFixed(2);
        setSuccess(
          `Contribution workflow completed. Estimated portfolio return: ${returnsPercent}% based on current assumptions.`,
        );
      } else {
        setSuccess("Contribution workflow completed. Dashboard is updated.");
      }
    } catch (err) {
      setError(err.message || "Unable to setup contribution");
    } finally {
      setLoading(false);
    }
  }

  if (!session?.userId) {
    return (
      <article className="card">
        <h2>No active profile found</h2>
        <p className="muted">
          Please complete onboarding before setting up contributions.
        </p>
        <a className="btn primary" href="/onboarding">
          Go to onboarding
        </a>
      </article>
    );
  }

  return (
    <section className="grid">
      <article className="card">
        <h2>Contribution setup</h2>
        <p className="muted">
          Choose a recurring strategy and optionally log your first contribution
          now to start your streak.
        </p>
        <div className="actions">
          <a className="btn secondary" href="/manual">
            Open user manual
          </a>
          <a className="btn ghost" href="/snapshot">
            Check plan gap first
          </a>
        </div>
      </article>

      <article className="card">
        <form onSubmit={handleSubmit}>
          <div className="grid two">
            <label>
              Frequency
              <select
                value={form.frequency}
                onChange={(event) => updateField("frequency", event.target.value)}
              >
                <option value="weekly">Weekly</option>
                <option value="biweekly">Biweekly</option>
                <option value="monthly">Monthly</option>
              </select>
            </label>

            <label>
              Amount
              <input
                required
                min={1}
                type="number"
                value={form.amount}
                onChange={(event) => updateField("amount", event.target.value)}
              />
            </label>

            <label>
              Start date
              <input
                required
                type="date"
                value={form.startDate}
                onChange={(event) => updateField("startDate", event.target.value)}
              />
            </label>

            <label>
              Contribution mode
              <select
                value={form.via}
                onChange={(event) => updateField("via", event.target.value)}
              >
                <option value="auto">Auto-save</option>
                <option value="round_up">Round-up simulation</option>
                <option value="manual">Manual reminder</option>
              </select>
            </label>
          </div>

          <label>
            <input
              type="checkbox"
              checked={form.recordFirstContribution}
              onChange={(event) =>
                updateField("recordFirstContribution", event.target.checked)
              }
            />{" "}
            Record the first contribution immediately
          </label>

          <p className="muted">Current setup: {summary}</p>

          {essentialHealth ? (
            <div className="info-block">
              <strong>Contribution safety hint</strong>
              <p className="muted">
                Monthly surplus after this plan: Rs{" "}
                <Currency value={essentialHealth.monthlySurplus} />
              </p>
              <p className="muted">
                Current emergency coverage: {Number(essentialHealth.emergencyCoverageMonths || 0).toFixed(1)} months
              </p>
            </div>
          ) : null}

          <div className="actions">
            <button className="btn primary" disabled={loading} type="submit">
              {loading ? "Saving..." : "Save contribution plan"}
            </button>
            <a className="btn secondary" href="/dashboard">
              Open dashboard
            </a>
            <a className="btn ghost" href="/withdrawals">
              Manage withdrawals
            </a>
            <a className="btn ghost" href="/manual">
              How this works
            </a>
          </div>

          {error ? <p className="error">{error}</p> : null}
          {success ? <p className="success">{success}</p> : null}
        </form>
      </article>

      <article className="card">
        <h3>How your money is handled</h3>
        <p className="muted">
          This section shows how each recurring contribution is split and what
          assumptions are used for growth projections.
        </p>

        {insightLoading && !moneyFlow ? (
          <p className="muted">Loading money flow details...</p>
        ) : null}

        {moneyFlow ? (
          <>
            <div className="grid two">
              <p>
                Monthly contribution: Rs <Currency value={moneyFlow.monthlyContribution} />
              </p>
              <p>Cadence: {moneyFlow.cadence}</p>
              <p>Mode: {moneyFlow.contributionMode}</p>
              <p>Next scheduled date: {moneyFlow.nextScheduledDate || "Not set"}</p>
            </div>

            <div className="info-block" style={{ marginTop: "0.6rem" }}>
              <p>
                Stocks: {moneyFlow.allocationPercent?.stocks}% (Rs{" "}
                <Currency value={moneyFlow.allocationAmount?.stocks} />)
              </p>
              <p>
                Bonds: {moneyFlow.allocationPercent?.bonds}% (Rs{" "}
                <Currency value={moneyFlow.allocationAmount?.bonds} />)
              </p>
              <p className="muted">
                Assumptions: inflation {moneyFlow.assumptions?.inflationPercent}% |
                pre-retirement return {" "}
                {moneyFlow.assumptions?.expectedAnnualReturnPreRetirementPercent}% |
                post-retirement return {" "}
                {moneyFlow.assumptions?.expectedAnnualReturnPostRetirementPercent}%
              </p>
            </div>

            <ol>
              {(moneyFlow.handlingSteps || []).map((stepText) => (
                <li key={stepText}>{stepText}</li>
              ))}
            </ol>

            <p className="muted">{moneyFlow.disclosure}</p>
          </>
        ) : (
          <p className="muted">
            Complete one contribution setup to unlock money-flow transparency.
          </p>
        )}
      </article>

      <article className="card">
        <h3>Estimated returns tracker</h3>
        <p className="muted">
          These values update after contributions and show your principal,
          estimated current value, and projected outcomes.
        </p>

        {portfolioSnapshot ? (
          <>
            <div className="grid two">
              <p>
                Invested principal: Rs <Currency value={portfolioSnapshot.investedPrincipal} />
              </p>
              <p>
                Estimated current value: Rs{" "}
                <Currency value={portfolioSnapshot.estimatedCurrentValue} />
              </p>
              <p>
                Estimated return: {" "}
                <span
                  className={
                    Number(portfolioSnapshot.estimatedReturnsValue) >= 0 ? "up" : "down"
                  }
                >
                  Rs <Currency value={portfolioSnapshot.estimatedReturnsValue} />
                </span>
              </p>
              <p>
                Return percentage: {" "}
                <span
                  className={
                    Number(portfolioSnapshot.estimatedReturnsPercent) >= 0 ? "up" : "down"
                  }
                >
                  {Number(portfolioSnapshot.estimatedReturnsPercent || 0).toFixed(2)}%
                </span>
              </p>
            </div>

            <table className="table" style={{ marginTop: "0.6rem" }}>
              <thead>
                <tr>
                  <th>Horizon</th>
                  <th>Projected principal</th>
                  <th>Projected value</th>
                  <th>Projected returns</th>
                </tr>
              </thead>
              <tbody>
                {(portfolioSnapshot.returnScenarios || []).map((scenario) => (
                  <tr key={scenario.years}>
                    <td>{scenario.years} years</td>
                    <td>Rs <Currency value={scenario.projectedPrincipal} /></td>
                    <td>Rs <Currency value={scenario.projectedValue} /></td>
                    <td>
                      Rs <Currency value={scenario.projectedReturnsValue} /> ({" "}
                      {Number(scenario.projectedReturnsPercent || 0).toFixed(2)}%)
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <p className="muted">{portfolioSnapshot.disclaimer}</p>
          </>
        ) : (
          <p className="muted">
            Estimated returns will appear after your first contribution setup.
          </p>
        )}
      </article>
    </section>
  );
}
