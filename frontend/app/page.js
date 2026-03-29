"use client";

import { useEffect, useMemo, useState } from "react";
import { getSession } from "../lib/session";

const explorerProfiles = [
  {
    key: "conservative",
    label: "Conservative",
    annualReturn: 0.07,
    allocation: "30% stocks / 70% bonds",
  },
  {
    key: "balanced",
    label: "Balanced",
    annualReturn: 0.09,
    allocation: "50% stocks / 50% bonds",
  },
  {
    key: "growth",
    label: "Growth",
    annualReturn: 0.11,
    allocation: "80% stocks / 20% bonds",
  },
];

function projectFutureValue(monthlyAmount, years, annualReturn) {
  const months = Math.max(Number(years) * 12, 1);
  const monthlyRate = annualReturn / 12;
  const amount = Number(monthlyAmount);

  if (monthlyRate === 0) {
    return amount * months;
  }

  return amount * ((Math.pow(1 + monthlyRate, months) - 1) / monthlyRate);
}

function formatInr(value) {
  return new Intl.NumberFormat("en-IN", {
    maximumFractionDigits: 0,
  }).format(Number(value || 0));
}

export default function HomePage() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [monthlyAmount, setMonthlyAmount] = useState(3000);
  const [horizonYears, setHorizonYears] = useState(20);

  useEffect(() => {
    setIsLoggedIn(Boolean(getSession()?.userId));
  }, []);

  const projections = useMemo(() => {
    return explorerProfiles.map((profile) => ({
      ...profile,
      projectedCorpus: projectFutureValue(
        Number(monthlyAmount),
        Number(horizonYears),
        profile.annualReturn,
      ),
    }));
  }, [horizonYears, monthlyAmount]);

  return (
    <section className="grid">
      <article className="hero">
        <h1>Turn retirement confusion into a complete financial playbook.</h1>
        <p className="headline-note">
          Learn budgeting, emergency planning, stocks, bonds, and long-term
          investing while building a retirement habit that actually sticks.
        </p>
        <p>
          FutureYou combines planning, education, and action. You learn what to
          do, why it matters, and exactly how to execute with your current
          income.
        </p>
        <div className="actions">
          <a className="btn primary" href={isLoggedIn ? "/dashboard" : "/onboarding"}>
            {isLoggedIn ? "Go to dashboard" : "Start one-time setup"}
          </a>
          <a className="btn secondary" href={isLoggedIn ? "/manual" : "/finance-guide"}>
            {isLoggedIn ? "Open user manual" : "Explore finance guide"}
          </a>
          <a className="btn ghost" href={isLoggedIn ? "/investing" : "/manual"}>
            {isLoggedIn ? "Learn stocks and bonds" : "See full feature manual"}
          </a>
        </div>
      </article>

      <div className="grid two">
        <article className="card">
          <h3>Step 1: Understand your money</h3>
          <p className="muted">
            Build clarity on income, expenses, and savings leaks. Then set a
            sustainable baseline investment amount.
          </p>
        </article>

        <article className="card">
          <h3>Step 2: Build your plan</h3>
          <p className="muted">
            Use your profile to generate retirement corpus target, projected
            future corpus, and contribution gap.
          </p>
        </article>

        <article className="card">
          <h3>Step 3: Invest with confidence</h3>
          <p className="muted">
            Learn the difference between stocks, bonds, and diversified
            portfolios before selecting your allocation style.
          </p>
        </article>

        <article className="card">
          <h3>Step 4: Stay consistent</h3>
          <p className="muted">
            Nudges, streak tracking, and short lessons keep your behavior on
            track month after month.
          </p>
        </article>
      </div>

      <article className="card highlight-card">
        <h3>Investment Explorer</h3>
        <p className="muted">
          Enter your monthly investment amount and horizon to compare potential
          outcomes across conservative, balanced, and growth allocations.
        </p>

        <div className="grid two">
          <label>
            Monthly investment amount
            <input
              min={500}
              step={100}
              type="number"
              value={monthlyAmount}
              onChange={(event) => setMonthlyAmount(event.target.value)}
            />
          </label>

          <label>
            Investment horizon (years)
            <input
              min={1}
              max={45}
              type="number"
              value={horizonYears}
              onChange={(event) => setHorizonYears(event.target.value)}
            />
          </label>
        </div>

        <table className="table" style={{ marginTop: "0.8rem" }}>
          <thead>
            <tr>
              <th>Profile</th>
              <th>Allocation</th>
              <th>Assumed annual return</th>
              <th>Projected corpus</th>
            </tr>
          </thead>
          <tbody>
            {projections.map((row) => (
              <tr key={row.key}>
                <td>{row.label}</td>
                <td>{row.allocation}</td>
                <td>{Math.round(row.annualReturn * 100)}%</td>
                <td>Rs {formatInr(row.projectedCorpus)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <p className="muted">
          Projection is educational and based on constant return assumptions. Real
          market outcomes can vary.
        </p>
      </article>
    </section>
  );
}
