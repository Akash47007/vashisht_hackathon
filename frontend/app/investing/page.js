"use client";

import { useEffect, useState } from "react";
import { api } from "../../lib/api";

const assetRows = [
  {
    asset: "Stocks",
    risk: "High",
    expected: "High over long term",
    horizon: "7+ years",
    notes: "Good for growth; volatile in short term",
  },
  {
    asset: "Bonds",
    risk: "Low to Medium",
    expected: "Moderate",
    horizon: "3+ years",
    notes: "Income stability and lower volatility",
  },
  {
    asset: "Index funds/ETFs",
    risk: "Medium",
    expected: "Market-linked",
    horizon: "5+ years",
    notes: "Diversified exposure with low effort",
  },
  {
    asset: "Cash equivalents",
    risk: "Low",
    expected: "Low",
    horizon: "0-2 years",
    notes: "Best for emergency and near-term goals",
  },
  {
    asset: "Target-date funds",
    risk: "Medium",
    expected: "Age-adjusted",
    horizon: "10+ years",
    notes: "Auto-rebalances risk as retirement approaches",
  },
  {
    asset: "REITs",
    risk: "Medium to High",
    expected: "Income + growth",
    horizon: "5+ years",
    notes: "Real-estate exposure without buying property directly",
  },
];

const samplePortfolios = [
  {
    profile: "Conservative",
    allocation: "30% stocks / 70% bonds",
    goodFor: "Low volatility preference",
  },
  {
    profile: "Balanced",
    allocation: "50% stocks / 50% bonds",
    goodFor: "Moderate growth with stability",
  },
  {
    profile: "Growth",
    allocation: "80% stocks / 20% bonds",
    goodFor: "Long horizon and high risk tolerance",
  },
];

const investmentPaths = [
  {
    title: "Passive long-term path",
    instruments: "Index ETF + Bond ETF + auto SIP",
    forWho: "Most beginners who want low-maintenance discipline",
    why: "Diversified and easier to stick with across market cycles",
  },
  {
    title: "Core and satellite path",
    instruments: "80-90% index core + 10-20% selective stock ideas",
    forWho: "Users who want limited stock picking while staying diversified",
    why: "Keeps risk controlled while allowing learning and conviction bets",
  },
  {
    title: "Income and stability path",
    instruments: "Bond funds + short-duration debt + limited equity",
    forWho: "Users prioritizing capital stability",
    why: "Lower drawdowns can improve consistency for risk-sensitive users",
  },
];

function formatPrice(value) {
  return Number(value || 0).toFixed(2);
}

export default function InvestingPage() {
  const [marketHighlights, setMarketHighlights] = useState(null);
  const [marketError, setMarketError] = useState("");

  useEffect(() => {
    api
      .getMarketHighlights()
      .then((data) => setMarketHighlights(data))
      .catch((error) => setMarketError(error.message || "Unable to load market highlights"));
  }, []);

  return (
    <section className="grid">
      <article className="card highlight-card">
        <h2>Investing Basics: stocks, bonds, and how to choose</h2>
        <p className="muted">
          Use this page to understand instruments before acting. Choose based on
          goal horizon, risk comfort, and required liquidity.
        </p>
        <p className="muted">
          Always combine product knowledge with risk tolerance and long-term
          behavior. High returns are useful only if you can stay invested.
        </p>
      </article>

      <article className="card">
        <h3 className="section-title">Current market highlights</h3>
        <p className="muted">
          These are market watchlists for educational exploration, not direct buy
          recommendations.
        </p>

        {marketError ? <p className="error">{marketError}</p> : null}

        {!marketHighlights ? (
          <p className="muted">Loading live market highlights...</p>
        ) : (
          <div className="grid two">
            {(marketHighlights.categories || []).map((category) => (
              <div className="metric-slab" key={category.key}>
                <h4>{category.label}</h4>
                <p className="muted">{category.description}</p>
                {(category.items || []).map((item) => (
                  <div key={item.symbol} style={{ marginBottom: "0.45rem" }}>
                    <strong>{item.symbol}</strong> - {item.name}
                    <br />
                    <span>
                      {item.currency} {formatPrice(item.price)}
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
        )}

        {marketHighlights?.isFallback ? (
          <p className="muted">Live prices unavailable. Showing curated watchlist symbols.</p>
        ) : null}
      </article>

      <article className="card">
        <h3 className="section-title">Asset class comparison</h3>
        <table className="table">
          <thead>
            <tr>
              <th>Asset class</th>
              <th>Risk</th>
              <th>Expected return</th>
              <th>Suggested horizon</th>
              <th>Notes</th>
            </tr>
          </thead>
          <tbody>
            {assetRows.map((row) => (
              <tr key={row.asset}>
                <td>{row.asset}</td>
                <td>{row.risk}</td>
                <td>{row.expected}</td>
                <td>{row.horizon}</td>
                <td>{row.notes}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </article>

      <article className="card">
        <h3 className="section-title">More ways to invest</h3>
        <div className="grid two">
          {investmentPaths.map((path) => (
            <div className="metric-slab" key={path.title}>
              <h4>{path.title}</h4>
              <p><strong>Instruments:</strong> {path.instruments}</p>
              <p className="muted"><strong>Best for:</strong> {path.forWho}</p>
              <p className="muted">{path.why}</p>
            </div>
          ))}
        </div>
      </article>

      <article className="card">
        <h3 className="section-title">Portfolio templates</h3>
        <div className="grid two">
          {samplePortfolios.map((portfolio) => (
            <div className="metric-slab" key={portfolio.profile}>
              <h4>{portfolio.profile}</h4>
              <p>
                <strong>Allocation:</strong> {portfolio.allocation}
              </p>
              <p className="muted">{portfolio.goodFor}</p>
            </div>
          ))}
        </div>
      </article>

      <article className="card">
        <h3 className="section-title">How to pick for your retirement plan</h3>
        <ol>
          <li>If your retirement horizon is long, equity can play a larger role.</li>
          <li>If market swings cause stress, increase bond allocation.</li>
          <li>Automate contributions first, then optimize allocation.</li>
          <li>Rebalance every 3-6 months instead of reacting daily.</li>
        </ol>
      </article>

      <article className="card">
        <h3 className="section-title">Suggested next action</h3>
        <p className="muted">
          Open your dashboard, review the recommended allocation, and start with
          a contribution amount that feels easy to sustain.
        </p>
        <div className="actions">
          <a className="btn primary" href="/dashboard">
            Open dashboard
          </a>
          <a className="btn secondary" href="/contribution">
            Setup contribution
          </a>
        </div>
      </article>
    </section>
  );
}
