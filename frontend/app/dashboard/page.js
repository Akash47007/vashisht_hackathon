"use client";

import { useEffect, useState } from "react";
import { api } from "../../lib/api";
import { getSession } from "../../lib/session";

function Currency({ value }) {
  return <>{new Intl.NumberFormat("en-IN").format(Number(value || 0))}</>;
}

export default function DashboardPage() {
  const [session, setSession] = useState(null);
  const [dashboard, setDashboard] = useState(null);
  const [metrics, setMetrics] = useState(null);
  const [marketHighlights, setMarketHighlights] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadDashboard(userId) {
    setLoading(true);
    setError("");
    try {
      const [dashboardData, metricsData, marketData] = await Promise.all([
        api.getDashboard(userId),
        api.getMetrics(),
        api.getMarketHighlights(),
      ]);
      setDashboard(dashboardData);
      setMetrics(metricsData);
      setMarketHighlights(marketData?.categories ? marketData : null);
    } catch (err) {
      setError(err.message || "Unable to load dashboard");
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

    loadDashboard(current.userId);
  }, []);

  async function handleNudgeClick(nudgeId) {
    if (!session?.userId) {
      return;
    }

    try {
      await api.clickNudge(nudgeId);
      await loadDashboard(session.userId);
    } catch (err) {
      setError(err.message || "Unable to update nudge");
    }
  }

  if (!session?.userId) {
    return (
      <article className="card">
        <h2>No active profile found</h2>
        <p className="muted">Complete onboarding to unlock dashboard insights.</p>
        <a className="btn primary" href="/onboarding">
          Go to onboarding
        </a>
      </article>
    );
  }

  if (loading) {
    return <article className="card">Loading dashboard...</article>;
  }

  if (!dashboard) {
    return (
      <article className="card">
        <h2>Dashboard unavailable</h2>
        <p className="error">{error || "No dashboard data found."}</p>
      </article>
    );
  }

  const quickStartItems = [
    {
      id: "snapshot_review",
      title: "Review retirement snapshot",
      href: "/snapshot",
      done: Boolean(dashboard.planSnapshot),
    },
    {
      id: "contribution_setup",
      title: "Set and verify recurring contribution",
      href: "/contribution",
      done: Number(dashboard.moneyFlowBreakdown?.monthlyContribution || 0) > 0,
    },
    {
      id: "first_contribution",
      title: "Record at least one contribution",
      href: "/contribution",
      done: Number(dashboard.recentContributions?.length || 0) > 0,
    },
    {
      id: "learning_quest",
      title: "Complete one learning quest",
      href: "/learning",
      done: Number(dashboard.completedQuests || 0) > 0,
    },
    {
      id: "withdrawal_preview",
      title: "Run withdrawal preview before need",
      href: "/withdrawals",
      done: Number(dashboard.recentWithdrawals?.length || 0) > 0,
    },
  ];

  const completedQuickStart = quickStartItems.filter((item) => item.done).length;

  return (
    <section className="grid">
      <article className="card highlight-card">
        <h2>Financial command center</h2>
        <p className="muted">
          Track your retirement progress, understand investments, and complete
          your next best money action each week.
        </p>
        <div className="pill-list">
          <span className="pill">
            Setup: {dashboard.oneTimeSetupCompleted ? "Completed" : "Pending"}
          </span>
          <span className="pill">Risk: {dashboard.profileSummary?.riskComfort}</span>
          <span className="pill">Quests done: {dashboard.completedQuests}</span>
          <span className="pill">
            Safe withdraw now: Rs <Currency value={dashboard.essentialHealth?.safeToWithdrawNow} />
          </span>
          <span className="pill">
            Cash-flow: {dashboard.essentialHealth?.cashflowStatus || "n/a"}
          </span>
          <span className="pill">
            Quick-start: {completedQuickStart}/{quickStartItems.length}
          </span>
        </div>
        <div className="actions">
          <a className="btn secondary" href="/manual">
            Open user manual
          </a>
          <a className="btn ghost" href="/snapshot">
            Simulate plan
          </a>
        </div>
        {error ? <p className="error">{error}</p> : null}
      </article>

      <article className="card">
        <h3>Guided quick-start</h3>
        <p className="muted">
          Complete these once after onboarding to unlock the full value of your setup.
        </p>
        <div className="list">
          {quickStartItems.map((item) => (
            <div className="list-item" key={item.id}>
              <strong>{item.done ? "Completed" : "Pending"}</strong>
              <p>{item.title}</p>
              {!item.done ? (
                <a className="btn secondary" href={item.href}>
                  Open
                </a>
              ) : null}
            </div>
          ))}
        </div>
      </article>

      <div className="grid two">
        <article className="card">
          <h3>Streak</h3>
          <p className="kpi">{dashboard.streak} weeks</p>
        </article>
        <article className="card">
          <h3>XP</h3>
          <p className="kpi">{dashboard.xp}</p>
        </article>
        <article className="card">
          <h3>Consistency</h3>
          <p className="kpi">{dashboard.consistencyRate}%</p>
        </article>
        <article className="card">
          <h3>Next milestone</h3>
          <p className="kpi">{dashboard.nextMilestone} XP</p>
        </article>
      </div>

      <article className="card">
        <h3>Plan snapshot</h3>
        <p>
          Required corpus: Rs <Currency value={dashboard.planSnapshot?.corpusRequired} />
        </p>
        <p>
          Projected corpus: Rs <Currency value={dashboard.planSnapshot?.corpusProjected} />
        </p>
        <p>
          Monthly gap: Rs <Currency value={dashboard.planSnapshot?.monthlyGap} />
        </p>
        <span className="badge">
          Confidence: {dashboard.planSnapshot?.confidenceScore || "n/a"}
        </span>
      </article>

      <article className="card">
        <h3>How your monthly money is handled</h3>
        {dashboard.moneyFlowBreakdown ? (
          <>
            <div className="grid two">
              <p>
                Contribution amount: Rs{" "}
                <Currency value={dashboard.moneyFlowBreakdown.monthlyContribution} />
              </p>
              <p>Cadence: {dashboard.moneyFlowBreakdown.cadence}</p>
              <p>Mode: {dashboard.moneyFlowBreakdown.contributionMode}</p>
              <p>
                Next scheduled date: {dashboard.moneyFlowBreakdown.nextScheduledDate || "Not set"}
              </p>
            </div>

            <div className="info-block" style={{ marginTop: "0.6rem" }}>
              <p>
                Stocks: {dashboard.moneyFlowBreakdown.allocationPercent?.stocks}% (Rs{" "}
                <Currency value={dashboard.moneyFlowBreakdown.allocationAmount?.stocks} />)
              </p>
              <p>
                Bonds: {dashboard.moneyFlowBreakdown.allocationPercent?.bonds}% (Rs{" "}
                <Currency value={dashboard.moneyFlowBreakdown.allocationAmount?.bonds} />)
              </p>
              <p className="muted">
                Assumptions: inflation {dashboard.moneyFlowBreakdown.assumptions?.inflationPercent}% |
                pre-retirement return {" "}
                {dashboard.moneyFlowBreakdown.assumptions?.expectedAnnualReturnPreRetirementPercent}% |
                post-retirement return {" "}
                {dashboard.moneyFlowBreakdown.assumptions?.expectedAnnualReturnPostRetirementPercent}%
              </p>
            </div>

            <ol>
              {(dashboard.moneyFlowBreakdown.handlingSteps || []).map((stepText) => (
                <li key={stepText}>{stepText}</li>
              ))}
            </ol>

            <p className="muted">{dashboard.moneyFlowBreakdown.disclosure}</p>
          </>
        ) : (
          <p className="muted">Set up contributions to view money-handling details.</p>
        )}
      </article>

      <article className="card">
        <h3>Returns tracker</h3>
        {dashboard.portfolioSnapshot ? (
          <>
            <div className="grid two">
              <p>
                Invested principal: Rs{" "}
                <Currency value={dashboard.portfolioSnapshot.investedPrincipal} />
              </p>
              <p>
                Estimated current value: Rs{" "}
                <Currency value={dashboard.portfolioSnapshot.estimatedCurrentValue} />
              </p>
              <p>
                Estimated returns: {" "}
                <span
                  className={
                    Number(dashboard.portfolioSnapshot.estimatedReturnsValue) >= 0
                      ? "up"
                      : "down"
                  }
                >
                  Rs <Currency value={dashboard.portfolioSnapshot.estimatedReturnsValue} />
                </span>
              </p>
              <p>
                Return %: {" "}
                <span
                  className={
                    Number(dashboard.portfolioSnapshot.estimatedReturnsPercent) >= 0
                      ? "up"
                      : "down"
                  }
                >
                  {Number(dashboard.portfolioSnapshot.estimatedReturnsPercent || 0).toFixed(2)}%
                </span>
              </p>
            </div>

            <table className="table" style={{ marginTop: "0.6rem" }}>
              <thead>
                <tr>
                  <th>Horizon</th>
                  <th>Projected principal</th>
                  <th>Projected value</th>
                  <th>Projected return</th>
                </tr>
              </thead>
              <tbody>
                {(dashboard.portfolioSnapshot.returnScenarios || []).map((scenario) => (
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

            <p className="muted">{dashboard.portfolioSnapshot.disclaimer}</p>
          </>
        ) : (
          <p className="muted">Returns tracker appears after contribution setup.</p>
        )}
      </article>

      <article className="card">
        <h3>Liquidity and withdrawal safety</h3>
        {dashboard.essentialHealth ? (
          <>
            <div className="grid two">
              <p>
                Emergency minimum (3 months): Rs <Currency value={dashboard.essentialHealth.emergencyFundMinimum} />
              </p>
              <p>
                Emergency target (6 months): Rs <Currency value={dashboard.essentialHealth.emergencyFundTarget} />
              </p>
              <p>
                Current liquidity: Rs <Currency value={dashboard.essentialHealth.currentLiquidity} />
              </p>
              <p>
                Coverage months: {Number(dashboard.essentialHealth.emergencyCoverageMonths || 0).toFixed(1)}
              </p>
              <p>
                Safe withdraw now: Rs <Currency value={dashboard.essentialHealth.safeToWithdrawNow} />
              </p>
              <p>
                Monthly surplus: Rs <Currency value={dashboard.essentialHealth.monthlySurplus} />
              </p>
            </div>
            <ul>
              {(dashboard.essentialHealth.recommendations || []).map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
            <p className="muted">{dashboard.essentialHealth.sourceNote}</p>
            <div className="actions">
              <a className="btn secondary" href="/withdrawals">
                Open withdrawal center
              </a>
              <a className="btn ghost" href="/snapshot">
                Recalculate plan impact
              </a>
            </div>
          </>
        ) : (
          <p className="muted">Liquidity health appears after profile setup.</p>
        )}
      </article>

      <article className="card">
        <h3>Profile summary</h3>
        <div className="grid two">
          <p>Current age: {dashboard.profileSummary?.age}</p>
          <p>Retirement age: {dashboard.profileSummary?.retirementAge}</p>
          <p>
            Monthly income: Rs <Currency value={dashboard.profileSummary?.monthlyIncome} />
          </p>
          <p>
            Monthly expenses: Rs <Currency value={dashboard.profileSummary?.monthlyExpense} />
          </p>
        </div>
        <p className="muted">
          Lifestyle goal: {dashboard.profileSummary?.lifestyleGoal || "Not set"}
        </p>
      </article>

      <article className="card">
        <h3>Recommended allocation and why</h3>
        <p>
          <strong>{dashboard.allocationGuidance?.label}</strong> - {" "}
          {dashboard.allocationGuidance?.allocation}
        </p>
        <p className="muted">{dashboard.allocationGuidance?.summary}</p>
        <p className="muted">{dashboard.allocationGuidance?.why}</p>
        <div className="actions">
          <a className="btn secondary" href="/investing">
            Explore investment options
          </a>
          <a className="btn ghost" href="/contribution">
            Adjust contributions
          </a>
        </div>
      </article>

      <article className="card">
        <h3>Your next actions</h3>
        <div className="list">
          {(dashboard.actionChecklist || []).map((item) => (
            <div className="list-item" key={item.id}>
              <strong>{item.completed ? "Completed" : "Pending"}</strong>
              <p>{item.title}</p>
              {!item.completed ? (
                <a className="btn secondary" href={item.cta}>
                  Do now
                </a>
              ) : null}
            </div>
          ))}
        </div>
      </article>

      <article className="card">
        <h3>Stocks, bonds, and portfolio basics</h3>
        <div className="grid two">
          {(dashboard.investmentKnowledgeCards || []).map((card) => (
            <div className="metric-slab" key={card.title}>
              <h4>{card.title}</h4>
              <p className="muted">Risk: {card.risk}</p>
              <p className="muted">Horizon: {card.timeHorizon}</p>
              <p>{card.details}</p>
            </div>
          ))}
        </div>
      </article>

      <article className="card">
        <h3>Current market watch</h3>
        <p className="muted">
          Use these as research starting points. They are not personalized buy
          recommendations.
        </p>
        {marketHighlights?.categories?.length ? (
          <div className="grid two">
            {marketHighlights.categories.map((category) => (
              <div className="metric-slab" key={category.key}>
                <h4>{category.label}</h4>
                <p className="muted">{category.description}</p>
                {(category.items || []).map((item) => (
                  <div key={item.symbol} style={{ marginBottom: "0.4rem" }}>
                    <strong>{item.symbol}</strong> - {item.name}
                    <br />
                    <span>
                      {item.currency} {Number(item.price || 0).toFixed(2)}
                    </span>
                    <span className={item.changePercent >= 0 ? "up" : "down"}>
                      {" "}
                      ({item.changePercent >= 0 ? "+" : ""}
                      {Number(item.changePercent || 0).toFixed(2)}%)
                    </span>
                  </div>
                ))}
              </div>
            ))}
          </div>
        ) : (
          <p className="muted">Market highlights are loading.</p>
        )}
      </article>

      <article className="card">
        <h3>Pending nudges</h3>
        {dashboard.pendingNudges?.length ? (
          <div className="list">
            {dashboard.pendingNudges.map((nudge) => (
              <div className="list-item" key={nudge.id}>
                <strong>{nudge.nudgeType.replaceAll("_", " ")}</strong>
                <p className="muted">{nudge.message}</p>
                <button
                  className="btn secondary"
                  onClick={() => handleNudgeClick(nudge.id)}
                  type="button"
                >
                  Mark as viewed
                </button>
              </div>
            ))}
          </div>
        ) : (
          <p className="muted">No nudges pending right now.</p>
        )}
      </article>

      <article className="card">
        <h3>Recent contributions</h3>
        {dashboard.recentContributions?.length ? (
          <div className="list">
            {dashboard.recentContributions.map((entry) => (
              <div className="list-item" key={entry.id}>
                <strong>Rs <Currency value={entry.amount} /></strong>
                <p className="muted">
                  {entry.date} | {entry.type}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <p className="muted">No contributions recorded yet.</p>
        )}
      </article>

      <article className="card">
        <h3>Recent withdrawals</h3>
        {dashboard.recentWithdrawals?.length ? (
          <div className="list">
            {dashboard.recentWithdrawals.map((entry) => (
              <div className="list-item" key={entry.id}>
                <strong>
                  Rs <Currency value={entry.amount} /> | {entry.reason}
                </strong>
                <p className="muted">
                  Net payout: Rs <Currency value={entry.netPayout} /> | {entry.date}
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
        {dashboard.recentTransactions?.length ? (
          <div className="list">
            {dashboard.recentTransactions.map((entry) => (
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
          <p className="muted">No transactions yet.</p>
        )}
      </article>

      {metrics ? (
        <article className="card">
          <h3>Product metrics summary</h3>
          <div className="grid two">
            <p>Onboarding completed: {metrics.onboardingCompleted}</p>
            <p>Plan generated: {metrics.planGenerated}</p>
            <p>First contribution setup: {metrics.firstContributionSetup}</p>
            <p>Contributions recorded: {metrics.contributionRecorded}</p>
            <p>Learning completed: {metrics.learningCompleted}</p>
            <p>Nudge CTR: {metrics.nudgeClickThroughRate}%</p>
          </div>
        </article>
      ) : null}
    </section>
  );
}
