"use client";

import { useEffect, useMemo, useState } from "react";
import { getSession } from "../../lib/session";

const CHECKLIST_KEY = "futureyou.manualChecklist";

const defaultChecklist = {
  snapshot: false,
  contribution: false,
  dashboard: false,
  learning: false,
  withdrawals: false,
};

const featureMap = [
  {
    id: "snapshot",
    title: "Snapshot",
    route: "/snapshot",
    purpose: "See your required corpus, projected corpus, and monthly gap.",
    useFlow: "Run the what-if simulator before changing your monthly contribution.",
    successSignal: "Monthly gap trends downward over time.",
  },
  {
    id: "contribution",
    title: "Contributions",
    route: "/contribution",
    purpose: "Set recurring contribution mode and record your contributions.",
    useFlow: "Pick amount and frequency, then record first contribution.",
    successSignal: "Consistency rate and streak improve on the dashboard.",
  },
  {
    id: "dashboard",
    title: "Dashboard",
    route: "/dashboard",
    purpose: "Monitor progress, returns, liquidity health, and nudges.",
    useFlow: "Review weekly KPIs and complete one pending action.",
    successSignal: "Confidence remains stable or improves.",
  },
  {
    id: "learning",
    title: "Learning",
    route: "/learning",
    purpose: "Build money literacy through short, practical quests.",
    useFlow: "Finish at least one module per week and apply one action task.",
    successSignal: "Quest completion count and XP keep increasing.",
  },
  {
    id: "withdrawals",
    title: "Withdrawals",
    route: "/withdrawals",
    purpose: "Preview fees, tax drag, and retirement impact before withdrawing.",
    useFlow: "Always run preview first, then confirm only if still needed.",
    successSignal: "Emergency coverage stays at or above 3 months.",
  },
  {
    id: "finance-guide",
    title: "Finance Guide",
    route: "/finance-guide",
    purpose: "Learn budgeting, emergency funds, and long-term planning basics.",
    useFlow: "Read one section, then apply it in your real monthly routine.",
    successSignal: "Monthly surplus improves and saving friction goes down.",
  },
  {
    id: "investing",
    title: "Investing Basics",
    route: "/investing",
    purpose: "Understand stocks, bonds, ETFs, and risk-aware allocation.",
    useFlow: "Compare options before changing your risk profile.",
    successSignal: "You can explain your allocation in one sentence.",
  },
];

function readChecklist() {
  if (typeof window === "undefined") {
    return defaultChecklist;
  }

  try {
    const raw = window.localStorage.getItem(CHECKLIST_KEY);
    if (!raw) {
      return defaultChecklist;
    }

    const parsed = JSON.parse(raw);
    return {
      ...defaultChecklist,
      ...parsed,
    };
  } catch {
    return defaultChecklist;
  }
}

function saveChecklist(value) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(CHECKLIST_KEY, JSON.stringify(value));
}

export default function ManualPage() {
  const [session, setSession] = useState(null);
  const [checklist, setChecklist] = useState(defaultChecklist);

  useEffect(() => {
    setSession(getSession());
    setChecklist(readChecklist());
  }, []);

  const completedCount = useMemo(() => {
    return Object.values(checklist).filter(Boolean).length;
  }, [checklist]);

  const progress = useMemo(() => {
    const total = Object.keys(defaultChecklist).length;
    if (!total) {
      return 0;
    }

    return Math.round((completedCount / total) * 100);
  }, [completedCount]);

  function toggleChecklist(key) {
    const next = {
      ...checklist,
      [key]: !checklist[key],
    };
    setChecklist(next);
    saveChecklist(next);
  }

  if (!session?.userId) {
    return (
      <section className="grid">
        <article className="card">
          <h2>User Manual</h2>
          <p className="muted">
            This manual explains all features available after onboarding.
          </p>
          <p className="muted">
            Please login or complete onboarding to open your personalized workflow.
          </p>
          <div className="actions">
            <a className="btn secondary" href="/login">
              Login
            </a>
            <a className="btn primary" href="/onboarding">
              Go to onboarding
            </a>
          </div>
        </article>
      </section>
    );
  }

  return (
    <section className="grid">
      <article className="card highlight-card">
        <h2>User Manual: Everything after onboarding</h2>
        <p className="muted">
          Use this page as your operating guide. It explains every available
          feature, when to use it, and how to know it is working for you.
        </p>
        <div className="pill-list">
          <span className="pill">Account: {session.email}</span>
          <span className="pill">Guided progress: {progress}%</span>
          <span className="pill">Completed steps: {completedCount}/5</span>
        </div>
        <div className="actions">
          <a className="btn primary" href="/dashboard">
            Open dashboard
          </a>
          <a className="btn secondary" href="/snapshot">
            Open snapshot
          </a>
          <a className="btn ghost" href="/learning">
            Continue learning
          </a>
        </div>
      </article>

      <article className="card">
        <h3>Quick-start sequence (first 15 minutes)</h3>
        <p className="muted">
          Follow this exact order once. Then repeat the weekly routine section.
        </p>
        <div className="list">
          <div className="list-item">
            <label>
              <input
                type="checkbox"
                checked={checklist.snapshot}
                onChange={() => toggleChecklist("snapshot")}
              />{" "}
              Step 1: Review retirement snapshot and test one what-if value.
            </label>
          </div>
          <div className="list-item">
            <label>
              <input
                type="checkbox"
                checked={checklist.contribution}
                onChange={() => toggleChecklist("contribution")}
              />{" "}
              Step 2: Set contribution frequency and record first contribution.
            </label>
          </div>
          <div className="list-item">
            <label>
              <input
                type="checkbox"
                checked={checklist.dashboard}
                onChange={() => toggleChecklist("dashboard")}
              />{" "}
              Step 3: Verify dashboard KPIs, pending actions, and money flow.
            </label>
          </div>
          <div className="list-item">
            <label>
              <input
                type="checkbox"
                checked={checklist.learning}
                onChange={() => toggleChecklist("learning")}
              />{" "}
              Step 4: Complete one learning quest and apply one action task.
            </label>
          </div>
          <div className="list-item">
            <label>
              <input
                type="checkbox"
                checked={checklist.withdrawals}
                onChange={() => toggleChecklist("withdrawals")}
              />{" "}
              Step 5: Open withdrawal center and run one preview simulation.
            </label>
          </div>
        </div>
      </article>

      <article className="card">
        <h3>Feature-by-feature manual</h3>
        <table className="table">
          <thead>
            <tr>
              <th>Feature</th>
              <th>Purpose</th>
              <th>How to use</th>
              <th>Success signal</th>
            </tr>
          </thead>
          <tbody>
            {featureMap.map((feature) => (
              <tr key={feature.id}>
                <td>
                  <a href={feature.route}>{feature.title}</a>
                </td>
                <td>{feature.purpose}</td>
                <td>{feature.useFlow}</td>
                <td>{feature.successSignal}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </article>

      <article className="card">
        <h3>How to read key numbers correctly</h3>
        <div className="grid two">
          <div className="metric-slab">
            <h4>Corpus required vs projected</h4>
            <p className="muted">
              Required corpus is your goal. Projected corpus is where your current
              behavior is taking you.
            </p>
          </div>
          <div className="metric-slab">
            <h4>Monthly gap</h4>
            <p className="muted">
              Gap is the extra monthly amount needed to align projection with goal.
            </p>
          </div>
          <div className="metric-slab">
            <h4>Consistency rate</h4>
            <p className="muted">
              Measures how reliably you contribute versus your expected cadence.
            </p>
          </div>
          <div className="metric-slab">
            <h4>Safe to withdraw now</h4>
            <p className="muted">
              Amount above your emergency target that is relatively safer to
              withdraw.
            </p>
          </div>
        </div>
      </article>

      <article className="card">
        <h3>Weekly operating routine</h3>
        <ol>
          <li>Open dashboard and review one pending action.</li>
          <li>Confirm contribution status and upcoming schedule date.</li>
          <li>Check liquidity and emergency coverage before any withdrawal.</li>
          <li>Complete one short learning module.</li>
          <li>Run one snapshot simulation if your income or expenses changed.</li>
        </ol>
      </article>

      <article className="card">
        <h3>Common mistakes to avoid</h3>
        <ul>
          <li>Skipping contribution setup and only checking projections.</li>
          <li>Withdrawing without previewing corpus impact first.</li>
          <li>Reacting to short-term market moves with long-term money.</li>
          <li>Ignoring monthly surplus and emergency fund health.</li>
        </ul>
      </article>

      <article className="card">
        <h3>Important note</h3>
        <p className="muted">
          This is an educational simulator. Planning logic, market highlights, and
          withdrawal estimates are guidance tools and not regulated investment
          advice.
        </p>
      </article>
    </section>
  );
}