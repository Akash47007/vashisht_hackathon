export const db = {
  users: new Map(),
  profiles: new Map(),
  assumptions: new Map(),
  plans: new Map(),
  recurringContributions: new Map(),
  contributions: [],
  withdrawals: [],
  events: [],
  nudges: [],
  learningProgress: new Map(),
};

export const learningQuests = [
  {
    id: "inflation-101",
    title: "Inflation 101: Why prices outrun idle cash",
    durationSeconds: 300,
    topic: "inflation",
    difficulty: "beginner",
    content:
      "Inflation silently reduces purchasing power. If your money grows slower than inflation, your real wealth declines.",
    learningObjectives: [
      "Understand nominal vs real returns",
      "Estimate future cost of current expenses",
      "Set an inflation-aware savings goal",
    ],
    keyTakeaways: [
      "A 6% inflation rate doubles prices in roughly 12 years.",
      "Idle cash can lose long-term value even when the number stays the same.",
      "Retirement planning should always include an inflation assumption.",
    ],
    commonMistakes: [
      "Using today's expenses as retirement target",
      "Keeping all long-term money in low-yield accounts",
      "Ignoring inflation when comparing investment options",
    ],
    actionStep:
      "Pick one current expense category and calculate what it could cost in 20 years at 6% inflation.",
    quiz: {
      question: "If inflation is 6% and your money earns 4%, what happens to purchasing power?",
      options: [
        "It increases",
        "It stays the same",
        "It decreases",
      ],
      answer: "It decreases",
      explanation:
        "Your real return is approximately -2%, so your money buys less over time.",
    },
    resources: [
      "Use the retirement calculator to test inflation assumptions.",
      "Review your plan snapshot each month and compare inflation vs expected returns.",
    ],
  },
  {
    id: "power-of-compounding",
    title: "Compounding Engine: How small SIPs become large portfolios",
    durationSeconds: 360,
    topic: "compound_interest",
    difficulty: "beginner",
    content:
      "Compounding means your returns also generate returns. Time in the market often matters more than perfect timing.",
    learningObjectives: [
      "Understand why consistency beats intensity",
      "Compare early-start vs late-start scenarios",
      "Learn how contribution frequency affects final corpus",
    ],
    keyTakeaways: [
      "Starting 5 years earlier can matter more than investing a little extra later.",
      "Skipping contributions breaks compounding momentum.",
      "Automation protects compounding from emotional decisions.",
    ],
    commonMistakes: [
      "Waiting for a larger salary before starting",
      "Stopping contributions during normal market volatility",
      "Treating compounding like a short-term strategy",
    ],
    actionStep:
      "Commit to one automatic monthly amount for the next 6 months, even if it is small.",
    quiz: {
      question: "Which improves compounding most for beginners?",
      options: [
        "Trying to predict every market move",
        "Investing consistently over long periods",
        "Only investing after big market drops",
      ],
      answer: "Investing consistently over long periods",
      explanation:
        "Consistency and duration are the strongest drivers of compounding outcomes.",
    },
    resources: [
      "Compare conservative, balanced, and growth projections in the Investment Explorer.",
      "Track contribution streaks on your dashboard to protect compounding behavior.",
    ],
  },
  {
    id: "risk-basics",
    title: "Risk Basics: Return, volatility, and behavior fit",
    durationSeconds: 420,
    topic: "risk",
    difficulty: "intermediate",
    content:
      "Risk is not only price fluctuation. Real risk is failing your long-term goal due to poor allocation or panic decisions.",
    learningObjectives: [
      "Distinguish market risk from behavior risk",
      "Match allocation to time horizon",
      "Use drawdown expectations to avoid panic exits",
    ],
    keyTakeaways: [
      "Higher expected return usually requires tolerating deeper temporary declines.",
      "A good portfolio is one you can hold during stress.",
      "Diversification reduces concentration risk but does not eliminate market risk.",
    ],
    commonMistakes: [
      "Choosing growth allocation without emotional readiness",
      "Reacting to short-term news with long-term money",
      "Overweighting one sector or theme",
    ],
    actionStep:
      "Select a risk profile and write down how much temporary decline you can tolerate without stopping SIPs.",
    quiz: {
      question: "For retirement money with 20+ years horizon, what is usually more dangerous?",
      options: [
        "Short-term volatility",
        "Under-investing and not meeting corpus target",
        "Checking portfolio monthly",
      ],
      answer: "Under-investing and not meeting corpus target",
      explanation:
        "Long horizons can absorb volatility, but persistent under-investing can permanently hurt outcomes.",
    },
    resources: [
      "Review your allocation guidance and adjust only when goals or risk tolerance changes.",
      "Use dashboard return scenarios instead of reacting to daily market moves.",
    ],
  },
  {
    id: "diversification-made-simple",
    title: "Diversification Made Simple: Build an anti-fragile portfolio",
    durationSeconds: 360,
    topic: "diversification",
    difficulty: "intermediate",
    content:
      "Diversification spreads risk across asset classes, sectors, and geographies to reduce dependence on one outcome.",
    learningObjectives: [
      "Understand concentration risk",
      "Build a simple stock-bond diversified mix",
      "Know when and how to rebalance",
    ],
    keyTakeaways: [
      "Diversification improves consistency more than headline returns.",
      "Rebalancing is a risk-control tool, not a prediction tool.",
      "A diversified plan is easier to stay invested with.",
    ],
    commonMistakes: [
      "Holding many funds that all track the same theme",
      "Ignoring bond allocation entirely",
      "Confusing number of holdings with true diversification",
    ],
    actionStep:
      "Check your current plan allocation and verify it includes both growth and stabilizing assets.",
    quiz: {
      question: "What is diversification mainly designed to do?",
      options: [
        "Guarantee profits",
        "Reduce concentration and volatility risk",
        "Beat every index every year",
      ],
      answer: "Reduce concentration and volatility risk",
      explanation:
        "Diversification aims for smoother risk-adjusted progress, not guaranteed outperformance.",
    },
    resources: [
      "Study portfolio templates in Investing Basics.",
      "Revisit allocation every quarter, not every day.",
    ],
  },
  {
    id: "automate-to-win",
    title: "Automate to Win: Systems over motivation",
    durationSeconds: 300,
    topic: "automation",
    difficulty: "beginner",
    content:
      "Automation lowers decision fatigue and helps you invest through both optimism and fear cycles.",
    learningObjectives: [
      "Understand behavior friction in savings",
      "Design an auto-investing schedule",
      "Use alerts and nudges for consistency",
    ],
    keyTakeaways: [
      "Automated investing improves follow-through.",
      "Consistency usually beats sporadic high contributions.",
      "Systems reduce emotional timing mistakes.",
    ],
    commonMistakes: [
      "Relying on motivation instead of fixed rules",
      "Skipping contributions after one volatile month",
      "Keeping contribution setup too complex",
    ],
    actionStep:
      "Set your contribution date close to salary day and keep the amount affordable.",
    quiz: {
      question: "Why is automation powerful for retirement planning?",
      options: [
        "It eliminates all market risk",
        "It ensures consistent behavior over time",
        "It guarantees higher returns than manual investing",
      ],
      answer: "It ensures consistent behavior over time",
      explanation:
        "Automation helps maintain discipline, which is crucial for long-term compounding.",
    },
    resources: [
      "Set up recurring contribution and monitor streak in dashboard.",
      "Use missed-contribution nudges as behavior correction signals.",
    ],
  },
  {
    id: "returns-reading-101",
    title: "Returns Reading 101: What your dashboard numbers actually mean",
    durationSeconds: 420,
    topic: "returns_literacy",
    difficulty: "intermediate",
    content:
      "Your return should be read with context: principal invested, estimated current value, absolute gain, and percentage gain.",
    learningObjectives: [
      "Read absolute return vs return percentage",
      "Understand estimated vs guaranteed returns",
      "Interpret projected scenarios responsibly",
    ],
    keyTakeaways: [
      "Absolute gain answers how much money you earned.",
      "Return percentage normalizes gain against invested principal.",
      "Projections are scenario tools, not promises.",
    ],
    commonMistakes: [
      "Comparing returns without comparing risk",
      "Treating one-year results as permanent",
      "Ignoring fees and taxes in external investing accounts",
    ],
    actionStep:
      "Open the dashboard returns tracker and note principal, current value, and gain percentage for this month.",
    quiz: {
      question: "If principal is 100000 and current value is 112000, what is absolute return?",
      options: ["1200", "12000", "12%"],
      answer: "12000",
      explanation:
        "Absolute return is current value minus principal. Percentage return is 12%.",
    },
    resources: [
      "Review return scenarios section after changing contribution amount.",
      "Track value monthly to avoid daily noise.",
    ],
  },
  {
    id: "tax-and-cost-awareness",
    title: "Tax and Cost Awareness: Keep more of your returns",
    durationSeconds: 360,
    topic: "cost_control",
    difficulty: "advanced",
    content:
      "Fees, expense ratios, and taxes can quietly reduce long-term wealth. Net return matters more than headline return.",
    learningObjectives: [
      "Recognize key investing costs",
      "Understand why low-cost diversified funds matter",
      "Build a simple annual review checklist",
    ],
    keyTakeaways: [
      "A small recurring fee difference compounds over decades.",
      "Tax-aware behavior can materially improve net outcome.",
      "Simple, low-cost, diversified systems are often robust.",
    ],
    commonMistakes: [
      "Chasing gross returns while ignoring costs",
      "Over-trading and creating avoidable tax drag",
      "Holding overlapping expensive products",
    ],
    actionStep:
      "Make a yearly checklist: fees, tax efficiency, rebalancing, and goal alignment.",
    quiz: {
      question: "What return should investors optimize for?",
      options: ["Gross return", "Net return after costs and taxes", "Only short-term return"],
      answer: "Net return after costs and taxes",
      explanation:
        "Net return is what compounds in your real portfolio over time.",
    },
    resources: [
      "Use investing page watchlists for research, then compare cost structures before choosing products.",
      "Review annual plan assumptions and adjust conservatively.",
    ],
  },
];

export function getLearningProgressForUser(userId) {
  if (!db.learningProgress.has(userId)) {
    db.learningProgress.set(userId, new Set());
  }

  return db.learningProgress.get(userId);
}
