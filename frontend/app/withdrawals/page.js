"use client";

import { useEffect, useMemo, useState } from "react";
import { api } from "../../lib/api";
import { getSession } from "../../lib/session";

function Currency({ value }) {
  return <>{new Intl.NumberFormat("en-IN").format(Number(value || 0))}</>;
}

const reasonOptions = [
  { value: "emergency", label: "Emergency" },
  { value: "medical", label: "Medical" },
  { value: "job_loss", label: "Job loss" },
  { value: "education", label: "Education" },
  { value: "family", label: "Family" },
  { value: "other", label: "Other" },
];

const destinationOptions = [
  { value: "bank_transfer", label: "Bank transfer" },
  { value: "wallet", label: "Wallet" },
  { value: "manual", label: "Manual processing" },
];

export default function WithdrawalsPage() {
  const [session, setSession] = useState(null);
  const [dashboard, setDashboard] = useState(null);
  const [history, setHistory] = useState(null);
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [form, setForm] = useState({
    amount: 1000,
    reason: "emergency",
    destination: "bank_transfer",
    note: "",
  });

  const essentialHealth = history?.essentialHealth || dashboard?.essentialHealth;
  const safeToWithdraw = Number(essentialHealth?.safeToWithdrawNow || 0);
  const currentLiquidity = Number(essentialHealth?.currentLiquidity || 0);
  const requestedAmount = Number(form.amount || 0);
  const exceedsLiquidity = currentLiquidity > 0 && requestedAmount > currentLiquidity;
  const exceedsSafeZone = safeToWithdraw > 0 && requestedAmount > safeToWithdraw;

  const canSubmit = useMemo(() => {
    return Number(form.amount) > 0 && !submitting && !exceedsLiquidity;
  }, [exceedsLiquidity, form.amount, submitting]);

  async function loadData(userId) {
    setLoading(true);
    setError("");

    try {
      const [dashboardData, historyData] = await Promise.all([
        api.getDashboard(userId),
        api.getWithdrawalHistory(userId),
      ]);
      setDashboard(dashboardData);
      setHistory(historyData);
    } catch (err) {
      setError(err.message || "Unable to load withdrawals data");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const current = getSession();
    setSession(current);

    if (!current?.userId) {
      setLoading(false);
      return;
    }

    loadData(current.userId);
  }, []);

  function updateField(key, value) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function handlePreview() {
    if (!session?.userId) {
      return;
    }

    setError("");
    setSuccess("");

    try {
      const result = await api.simulateWithdrawal({
        userId: session.userId,
        amount: Number(form.amount),
        reason: form.reason,
      });
      setPreview(result);
    } catch (err) {
      setPreview(null);
      setError(err.message || "Unable to simulate withdrawal");
    }
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (!session?.userId) {
      return;
    }

    setSubmitting(true);
    setError("");
    setSuccess("");

    try {
      const result = await api.requestWithdrawal({
        userId: session.userId,
        amount: Number(form.amount),
        reason: form.reason,
        destination: form.destination,
        note: form.note,
      });

      setPreview(result.estimate || null);
      setSuccess(
        `Withdrawal processed. Net payout: Rs ${new Intl.NumberFormat("en-IN").format(
          Number(result.withdrawal?.netPayout || 0),
        )}`,
      );

      await loadData(session.userId);
    } catch (err) {
      setError(err.message || "Unable to process withdrawal");
    } finally {
      setSubmitting(false);
    }
  }

  if (!session?.userId) {
    return (
      <article className="card">
        <h2>No active profile found</h2>
        <p className="muted">Please login and complete onboarding first.</p>
        <div className="actions">
          <a className="btn secondary" href="/login">
            Login
          </a>
          <a className="btn primary" href="/onboarding">
            Go to onboarding
          </a>
        </div>
      </article>
    );
  }

  if (loading) {
    return <article className="card">Loading withdrawal center...</article>;
  }

  return (
    <section className="grid">
      <article className="card highlight-card">
        <h2>Withdrawal and liquidity center</h2>
        <p className="muted">
          Withdraw when needed, but preview charges and long-term retirement impact
          first so decisions stay intentional.
        </p>
        <div className="pill-list">
          <span className="pill">
            Safe to withdraw now: Rs <Currency value={safeToWithdraw} />
          </span>
          <span className="pill">
            Current liquidity: Rs <Currency value={essentialHealth?.currentLiquidity} />
          </span>
          <span className="pill">
            Emergency coverage: {Number(essentialHealth?.emergencyCoverageMonths || 0).toFixed(1)} months
          </span>
        </div>
        <div className="actions">
          <a className="btn secondary" href="/manual">
            Open user manual
          </a>
          <a className="btn ghost" href="/dashboard">
            Back to dashboard
          </a>
        </div>
      </article>

      <article className="card">
        <h3>Request a withdrawal</h3>
        <form onSubmit={handleSubmit}>
          <div className="grid two">
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
              Reason
              <select
                value={form.reason}
                onChange={(event) => updateField("reason", event.target.value)}
              >
                {reasonOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Destination
              <select
                value={form.destination}
                onChange={(event) => updateField("destination", event.target.value)}
              >
                {destinationOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Note (optional)
              <input
                maxLength={240}
                type="text"
                value={form.note}
                onChange={(event) => updateField("note", event.target.value)}
                placeholder="Add context for your records"
              />
            </label>
          </div>

          {exceedsLiquidity ? (
            <div className="warning-block">
              Requested amount is above your available liquidity. Reduce amount to continue.
            </div>
          ) : null}

          {exceedsSafeZone ? (
            <div className="warning-block">
              This amount goes beyond your safer withdrawal zone and can weaken emergency readiness.
            </div>
          ) : null}

          <div className="actions">
            <button className="btn secondary" onClick={handlePreview} type="button">
              Preview impact
            </button>
            <button className="btn primary" disabled={!canSubmit} type="submit">
              {submitting ? "Processing..." : "Confirm withdrawal"}
            </button>
            <a className="btn ghost" href="/snapshot">
              Re-check plan
            </a>
            <a className="btn ghost" href="/manual">
              Withdrawal guide
            </a>
          </div>

          {error ? <p className="error">{error}</p> : null}
          {success ? <p className="success">{success}</p> : null}
        </form>
      </article>

      {preview ? (
        <article className="card">
          <h3>Withdrawal impact preview</h3>
          <div className="grid two">
            <p>
              Requested: Rs <Currency value={preview.requestedAmount} />
            </p>
            <p>
              Net payout: Rs <Currency value={preview.netPayout} />
            </p>
            <p>
              Processing fee: Rs <Currency value={preview.estimatedCharges?.processingFee} />
            </p>
            <p>
              Estimated tax: Rs <Currency value={preview.estimatedCharges?.estimatedTax} />
            </p>
            <p>
              Early-withdrawal penalty: Rs <Currency value={preview.estimatedCharges?.earlyWithdrawalPenalty} />
            </p>
            <p>
              Liquidity after withdrawal: Rs <Currency value={preview.availableAfterWithdrawal} />
            </p>
          </div>

          <div className="info-block" style={{ marginTop: "0.7rem" }}>
            <p>
              Projected corpus impact: Rs <Currency value={preview.retirementImpact?.corpusImpact} />
            </p>
            <p>
              Confidence change: {preview.retirementImpact?.confidenceBefore} to {" "}
              {preview.retirementImpact?.confidenceAfter}
            </p>
            <p>
              Monthly gap change: Rs <Currency value={preview.retirementImpact?.monthlyGapBefore} /> to Rs {" "}
              <Currency value={preview.retirementImpact?.monthlyGapAfter} />
            </p>
          </div>

          <p className="muted">{preview.note}</p>
        </article>
      ) : null}

      <article className="card">
        <h3>Essential safety checks</h3>
        {essentialHealth ? (
          <>
            <div className="grid two">
              <p>
                Emergency minimum (3 months): Rs <Currency value={essentialHealth.emergencyFundMinimum} />
              </p>
              <p>
                Emergency target (6 months): Rs <Currency value={essentialHealth.emergencyFundTarget} />
              </p>
              <p>
                Cash-flow status: {essentialHealth.cashflowStatus}
              </p>
              <p>
                Monthly surplus: Rs <Currency value={essentialHealth.monthlySurplus} />
              </p>
            </div>
            <ul>
              {(essentialHealth.recommendations || []).map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
            <p className="muted">{essentialHealth.sourceNote}</p>
          </>
        ) : (
          <p className="muted">Set up your profile and contribution plan to unlock safety checks.</p>
        )}
      </article>

      <article className="card">
        <h3>Withdrawal history</h3>
        {history?.withdrawals?.length ? (
          <div className="list">
            {history.withdrawals.map((entry) => (
              <div className="list-item" key={entry.id}>
                <strong>
                  Rs <Currency value={entry.amount} /> ({entry.reason})
                </strong>
                <p className="muted">
                  Net payout: Rs <Currency value={entry.netPayout} /> | Charges: Rs <Currency value={Number(entry.processingFee || 0) + Number(entry.earlyWithdrawalPenalty || 0) + Number(entry.estimatedTax || 0)} />
                </p>
                <p className="muted">
                  {entry.date} | {entry.destination} | {entry.status}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <p className="muted">No withdrawals recorded yet.</p>
        )}
      </article>

      <article className="card">
        <h3>Recent money movement</h3>
        {history?.recentTransactions?.length ? (
          <div className="list">
            {history.recentTransactions.map((entry) => (
              <div className="list-item" key={`${entry.type}-${entry.id}`}>
                <strong>
                  {entry.type === "withdrawal" ? "Withdrawal" : "Contribution"} - Rs{" "}
                  <Currency value={entry.amount} />
                </strong>
                <p className="muted">
                  {entry.date} | {entry.note}
                  {entry.netAmount ? ` | Net: Rs ${new Intl.NumberFormat("en-IN").format(Number(entry.netAmount || 0))}` : ""}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <p className="muted">No transactions found yet.</p>
        )}
      </article>
    </section>
  );
}
