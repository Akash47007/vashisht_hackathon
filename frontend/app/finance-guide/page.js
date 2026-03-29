export default function FinanceGuidePage() {
  return (
    <section className="grid">
      <article className="card highlight-card">
        <h2>Finance Guide: the full map before you invest</h2>
        <p className="muted">
          This guide explains personal finance from zero to confident investing.
          You can read it in order or jump to what you need right now.
        </p>
        <div className="pill-list">
          <span className="pill">Budgeting</span>
          <span className="pill">Emergency fund</span>
          <span className="pill">Inflation</span>
          <span className="pill">Compounding</span>
          <span className="pill">Stocks and bonds</span>
          <span className="pill">Risk management</span>
          <span className="pill">Retirement planning</span>
        </div>
      </article>

      <article className="card">
        <h3 className="section-title">1. Budget first, always</h3>
        <p>
          A solid budget gives you the fuel to invest. A simple split can be:
          needs, wants, and future. If your income is irregular, build a baseline
          monthly survival number first, then invest the rest in a rule-based way.
        </p>
        <div className="info-block">
          <strong>Action:</strong> Track 30 days of expenses and identify one
          recurring expense to optimize. That optimized amount becomes your
          monthly investment starter amount.
        </div>
      </article>

      <article className="card">
        <h3 className="section-title">2. Emergency fund before heavy risk</h3>
        <p>
          Keep cash for shocks before increasing market exposure. Typical target:
          3-6 months of essential expenses in a liquid, low-risk instrument.
        </p>
        <table className="table">
          <thead>
            <tr>
              <th>Profile</th>
              <th>Emergency Fund Target</th>
              <th>Why</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Stable salary</td>
              <td>3 months</td>
              <td>Predictable income lowers short-term cash stress</td>
            </tr>
            <tr>
              <td>Freelance or variable income</td>
              <td>6 months</td>
              <td>Income volatility requires larger buffer</td>
            </tr>
            <tr>
              <td>Single earning household</td>
              <td>6+ months</td>
              <td>Lower redundancy increases downside risk</td>
            </tr>
          </tbody>
        </table>
      </article>

      <article className="card">
        <h3 className="section-title">3. Core concepts that drive long-term wealth</h3>
        <div className="grid two">
          <div className="metric-slab">
            <h4>Inflation</h4>
            <p className="muted">
              Your money loses buying power every year, so idle cash often falls
              behind your future needs.
            </p>
          </div>
          <div className="metric-slab">
            <h4>Compounding</h4>
            <p className="muted">
              Returns generate returns. Starting early gives time to amplify the
              compounding effect.
            </p>
          </div>
          <div className="metric-slab">
            <h4>Risk and return</h4>
            <p className="muted">
              Higher expected return usually means higher volatility. Match risk
              to your time horizon and behavior tolerance.
            </p>
          </div>
          <div className="metric-slab">
            <h4>Diversification</h4>
            <p className="muted">
              Do not depend on one stock, one sector, or one asset class. Spread
              risk to reduce severe downside.
            </p>
          </div>
        </div>
      </article>

      <article className="card">
        <h3 className="section-title">4. A practical order of operations</h3>
        <ol>
          <li>Create budget and trim leakage.</li>
          <li>Build emergency fund.</li>
          <li>Start retirement contribution automation.</li>
          <li>Add diversified equity and bond exposure.</li>
          <li>Review and rebalance quarterly.</li>
        </ol>
      </article>

      <article className="card">
        <h3 className="section-title">Important</h3>
        <p className="muted">
          This website is an educational planning tool. It helps you understand
          options and build habits but does not provide regulated personalized
          financial advice.
        </p>
      </article>
    </section>
  );
}
