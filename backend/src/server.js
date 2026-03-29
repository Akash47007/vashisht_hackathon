import bcrypt from "bcryptjs";
import cors from "cors";
import express from "express";
import jwt from "jsonwebtoken";
import cron from "node-cron";
import { v4 as uuidv4 } from "uuid";
import { z } from "zod";
import { appConfig } from "./config.js";
import { calculatePlan } from "./financial.js";
import { db, getLearningProgressForUser, learningQuests } from "./store.js";

const app = express();

app.use(
  cors({
    origin: appConfig.clientOrigin,
    credentials: true,
  }),
);
app.use(express.json());

function findUserByEmail(email) {
  const normalized = email.toLowerCase();
  for (const user of db.users.values()) {
    if (user.email.toLowerCase() === normalized) {
      return user;
    }
  }
  return null;
}

function trackEvent(userId, eventType, properties = {}) {
  db.events.push({
    id: uuidv4(),
    userId,
    eventType,
    properties,
    createdAt: new Date().toISOString(),
  });
}

function hasRecentNudge(userId, nudgeType, lookbackHours = 24) {
  const now = Date.now();
  const threshold = lookbackHours * 60 * 60 * 1000;

  return db.nudges.some((nudge) => {
    if (nudge.userId !== userId || nudge.nudgeType !== nudgeType) {
      return false;
    }

    return now - new Date(nudge.sentAt).getTime() <= threshold;
  });
}

function createNudge(userId, nudgeType, message, actionUrl = "/dashboard") {
  if (hasRecentNudge(userId, nudgeType)) {
    return null;
  }

  const nudge = {
    id: uuidv4(),
    userId,
    nudgeType,
    message,
    actionUrl,
    sentAt: new Date().toISOString(),
    clickedAt: null,
    completedAt: null,
  };

  db.nudges.push(nudge);
  trackEvent(userId, "nudge_sent", { nudgeType });
  return nudge;
}

function getContributionHistory(userId) {
  return db.contributions
    .filter((entry) => entry.userId === userId)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

function getWithdrawalHistory(userId) {
  return db.withdrawals
    .filter((entry) => entry.userId === userId)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

function getContributionStreak(userId) {
  const contributions = getContributionHistory(userId);
  if (contributions.length === 0) {
    return 0;
  }

  let streak = 1;
  for (let i = 1; i < contributions.length; i += 1) {
    const previousDate = new Date(contributions[i - 1].date).getTime();
    const currentDate = new Date(contributions[i].date).getTime();
    const gapInDays = (previousDate - currentDate) / (1000 * 60 * 60 * 24);

    if (gapInDays <= 8) {
      streak += 1;
    } else {
      break;
    }
  }

  return streak;
}

function hasContributionWithinDays(userId, days) {
  const contributions = getContributionHistory(userId);
  if (contributions.length === 0) {
    return false;
  }

  const latest = new Date(contributions[0].date).getTime();
  const now = Date.now();
  const diffInDays = (now - latest) / (1000 * 60 * 60 * 24);
  return diffInDays <= days;
}

function getConsistencyRate(userId, weeks = 4) {
  const recurring = db.recurringContributions.get(userId);
  const contributions = getContributionHistory(userId);

  if (!recurring) {
    return 0;
  }

  const cutoff = Date.now() - weeks * 7 * 24 * 60 * 60 * 1000;
  const recentContributions = contributions.filter(
    (entry) => new Date(entry.date).getTime() >= cutoff,
  );

  let expectedContributions = 1;
  if (recurring.frequency === "weekly") {
    expectedContributions = weeks;
  }
  if (recurring.frequency === "biweekly") {
    expectedContributions = Math.max(Math.ceil(weeks / 2), 1);
  }
  if (recurring.frequency === "monthly") {
    expectedContributions = Math.max(Math.ceil(weeks / 4), 1);
  }

  if (expectedContributions === 0) {
    return 0;
  }

  return Math.min((recentContributions.length / expectedContributions) * 100, 100);
}

function roundToTwo(value) {
  return Math.round(Number(value || 0) * 100) / 100;
}

function getAnnualRateRatio(value, fallback) {
  const parsed = Number(value);
  if (Number.isNaN(parsed) || parsed < 0) {
    return fallback;
  }

  return parsed > 1 ? parsed / 100 : parsed;
}

function getMonthsElapsed(dateValue) {
  if (!dateValue) {
    return 0;
  }

  const start = new Date(dateValue);
  if (Number.isNaN(start.getTime())) {
    return 0;
  }

  const now = new Date();
  let months = (now.getFullYear() - start.getFullYear()) * 12;
  months += now.getMonth() - start.getMonth();

  if (now.getDate() < start.getDate()) {
    months -= 1;
  }

  return Math.max(months, 0);
}

function projectLumpSum(principal, annualRate, months) {
  const amount = Number(principal || 0);
  if (amount <= 0) {
    return 0;
  }

  const monthlyRate = Number(annualRate || 0) / 12;
  if (monthlyRate <= 0 || months <= 0) {
    return amount;
  }

  return amount * Math.pow(1 + monthlyRate, months);
}

function projectFromNow(currentValue, monthlyContribution, annualRate, months) {
  const principal = Number(currentValue || 0);
  const contribution = Number(monthlyContribution || 0);
  const monthlyRate = Number(annualRate || 0) / 12;

  if (monthlyRate <= 0) {
    return principal + contribution * months;
  }

  const growthFactor = Math.pow(1 + monthlyRate, months);
  const futurePrincipal = principal * growthFactor;
  const futureContributions =
    contribution * ((growthFactor - 1) / monthlyRate);

  return futurePrincipal + futureContributions;
}

function getPortfolioSnapshot(userId, profile, plan) {
  const contributions = getContributionHistory(userId);
  const withdrawals = getWithdrawalHistory(userId);
  const recurring = db.recurringContributions.get(userId);
  const annualReturnAssumption = getAnnualRateRatio(
    plan?.assumptions?.annualReturnPreRetirement,
    appConfig.defaults.expectedAnnualReturnPreRetirement,
  );

  const basePrincipal = Number(profile?.currentSavings || 0);
  const baseMonths = getMonthsElapsed(profile?.updatedAt);
  const baseCurrentValue = projectLumpSum(
    basePrincipal,
    annualReturnAssumption,
    baseMonths,
  );

  const contributionPrincipal = contributions.reduce(
    (sum, entry) => sum + Number(entry.amount || 0),
    0,
  );

  const contributionCurrentValue = contributions.reduce((sum, entry) => {
    const monthsHeld = getMonthsElapsed(entry.date || entry.createdAt);
    return (
      sum +
      projectLumpSum(Number(entry.amount || 0), annualReturnAssumption, monthsHeld)
    );
  }, 0);

  const totalWithdrawn = withdrawals.reduce(
    (sum, entry) => sum + Number(entry.amount || 0),
    0,
  );
  const totalNetWithdrawn = withdrawals.reduce(
    (sum, entry) => sum + Number(entry.netPayout || 0),
    0,
  );

  const investedPrincipal = Math.max(basePrincipal + contributionPrincipal - totalWithdrawn, 0);
  const estimatedCurrentValue = Math.max(baseCurrentValue + contributionCurrentValue - totalWithdrawn, 0);
  const estimatedReturnsValue = estimatedCurrentValue - investedPrincipal;
  const estimatedReturnsPercent =
    investedPrincipal > 0
      ? (estimatedReturnsValue / investedPrincipal) * 100
      : 0;

  const monthlyContribution = Number(
    recurring?.amount || plan?.currentMonthlyContribution || 0,
  );
  const returnScenarios = [1, 3, 5].map((years) => {
    const months = years * 12;
    const projectedValue = projectFromNow(
      estimatedCurrentValue,
      monthlyContribution,
      annualReturnAssumption,
      months,
    );
    const projectedPrincipal = investedPrincipal + monthlyContribution * months;
    const projectedReturnsValue = projectedValue - projectedPrincipal;
    const projectedReturnsPercent =
      projectedPrincipal > 0
        ? (projectedReturnsValue / projectedPrincipal) * 100
        : 0;

    return {
      years,
      projectedPrincipal: roundToTwo(projectedPrincipal),
      projectedValue: roundToTwo(projectedValue),
      projectedReturnsValue: roundToTwo(projectedReturnsValue),
      projectedReturnsPercent: roundToTwo(projectedReturnsPercent),
    };
  });

  return {
    asOf: new Date().toISOString(),
    investedPrincipal: roundToTwo(investedPrincipal),
    estimatedCurrentValue: roundToTwo(estimatedCurrentValue),
    estimatedReturnsValue: roundToTwo(estimatedReturnsValue),
    estimatedReturnsPercent: roundToTwo(estimatedReturnsPercent),
    annualReturnAssumptionPercent: roundToTwo(annualReturnAssumption * 100),
    totalContributions: contributions.length,
    totalWithdrawals: withdrawals.length,
    totalWithdrawn: roundToTwo(totalWithdrawn),
    totalNetWithdrawn: roundToTwo(totalNetWithdrawn),
    monthlyContribution: roundToTwo(monthlyContribution),
    returnScenarios,
    disclaimer:
      "Returns are modeled estimates using your current assumptions and contribution history. Actual market returns vary.",
  };
}

function getMoneyFlowBreakdown(userId, plan) {
  const recurring = db.recurringContributions.get(userId);
  const withdrawals = getWithdrawalHistory(userId);
  const monthlyContribution = Number(
    recurring?.amount || plan?.currentMonthlyContribution || 0,
  );

  const allocation = plan?.recommendedAllocation || { stocks: 50, bonds: 50 };
  const stocksPercent = Number(allocation.stocks || 0);
  const bondsPercent = Number(allocation.bonds || 0);
  const stocksAmount = (monthlyContribution * stocksPercent) / 100;
  const bondsAmount = (monthlyContribution * bondsPercent) / 100;

  const inflationRate = getAnnualRateRatio(
    plan?.assumptions?.inflationRate,
    appConfig.defaults.inflationRate,
  );
  const preRetirementRate = getAnnualRateRatio(
    plan?.assumptions?.annualReturnPreRetirement,
    appConfig.defaults.expectedAnnualReturnPreRetirement,
  );
  const postRetirementRate = getAnnualRateRatio(
    plan?.assumptions?.annualReturnPostRetirement,
    appConfig.defaults.expectedAnnualReturnPostRetirement,
  );

  const cadence = recurring?.frequency || "monthly";
  const contributionMode = recurring?.method || "manual";
  const totalWithdrawn = withdrawals.reduce(
    (sum, entry) => sum + Number(entry.amount || 0),
    0,
  );

  return {
    monthlyContribution: roundToTwo(monthlyContribution),
    cadence,
    contributionMode,
    nextScheduledDate: recurring?.nextScheduledDate || null,
    totalWithdrawn: roundToTwo(totalWithdrawn),
    allocationPercent: {
      stocks: stocksPercent,
      bonds: bondsPercent,
    },
    allocationAmount: {
      stocks: roundToTwo(stocksAmount),
      bonds: roundToTwo(bondsAmount),
    },
    assumptions: {
      inflationPercent: roundToTwo(inflationRate * 100),
      expectedAnnualReturnPreRetirementPercent: roundToTwo(preRetirementRate * 100),
      expectedAnnualReturnPostRetirementPercent: roundToTwo(postRetirementRate * 100),
    },
    handlingSteps: [
      "Contribution is scheduled based on your selected cadence and mode.",
      `${stocksPercent}% is routed to stock exposure and ${bondsPercent}% to bond exposure using your risk profile.`,
      "Portfolio projection updates after every contribution event using your plan assumptions.",
      "Withdrawals are processed from available portfolio value and reflected in return projections.",
      "Dashboard returns combine invested principal and modeled growth to show transparent progress.",
    ],
    disclosure:
      "This is an educational flow simulation for hackathon mode; no real brokerage execution happens in this build.",
  };
}

function getEssentialHealth(profile, moneyFlowBreakdown, portfolioSnapshot) {
  const monthlyExpense = Number(profile?.currentMonthlyExpense || 0);
  const monthlyIncome = Number(profile?.currentMonthlyIncome || 0);
  const monthlyContribution = Number(moneyFlowBreakdown?.monthlyContribution || 0);
  const emergencyFundTarget = monthlyExpense > 0 ? monthlyExpense * 6 : 0;
  const emergencyFundMinimum = monthlyExpense > 0 ? monthlyExpense * 3 : 0;
  const currentLiquidity = Number(portfolioSnapshot?.estimatedCurrentValue || 0);
  const coverageMonths = monthlyExpense > 0 ? currentLiquidity / monthlyExpense : 0;
  const safeToWithdrawNow = Math.max(currentLiquidity - emergencyFundTarget, 0);
  const monthlySurplus = monthlyIncome - monthlyExpense - monthlyContribution;

  const recommendations = [];

  if (coverageMonths < 3) {
    recommendations.push("Build emergency reserves to at least 3 months of expenses before large withdrawals.");
  }

  if (monthlySurplus < 0) {
    recommendations.push("Your current setup is cash-flow negative. Reduce contribution amount or monthly expenses.");
  }

  if (safeToWithdrawNow <= 0) {
    recommendations.push("Avoid non-essential withdrawals until emergency target coverage is reached.");
  }

  if (recommendations.length === 0) {
    recommendations.push("Your current reserve and cash flow look stable. Use withdrawals only for planned needs.");
  }

  return {
    emergencyFundMinimum: roundToTwo(emergencyFundMinimum),
    emergencyFundTarget: roundToTwo(emergencyFundTarget),
    currentLiquidity: roundToTwo(currentLiquidity),
    emergencyCoverageMonths: roundToTwo(coverageMonths),
    safeToWithdrawNow: roundToTwo(safeToWithdrawNow),
    monthlySurplus: roundToTwo(monthlySurplus),
    cashflowStatus: monthlySurplus >= 0 ? "healthy" : "stressed",
    recommendations,
    sourceNote:
      "Emergency guidance uses the common 3-6 month expense buffer principle for resilience.",
  };
}

function getWithdrawalEstimate(userId, amount, reason = "other") {
  const profile = db.profiles.get(userId);
  const plan = db.plans.get(userId) || generateAndStorePlan(userId);
  const portfolioSnapshot = getPortfolioSnapshot(userId, profile, plan);
  const requestedAmount = Number(amount || 0);

  const availableLiquidity = Number(portfolioSnapshot.estimatedCurrentValue || 0);
  const gainRatio =
    Number(portfolioSnapshot.investedPrincipal || 0) > 0
      ? Math.max(Number(portfolioSnapshot.estimatedReturnsValue || 0), 0) /
        Number(portfolioSnapshot.investedPrincipal || 0)
      : 0;

  const processingFee = Math.min(Math.max(requestedAmount * 0.005, 0), 500);
  const normalizedReason = String(reason || "other").toLowerCase();
  let penaltyRate = 0;

  if (Number(profile?.currentAge || 0) < 60) {
    penaltyRate = ["emergency", "medical", "job_loss"].includes(normalizedReason)
      ? 0.01
      : 0.02;
  }

  const estimatedPenalty = requestedAmount * penaltyRate;
  const taxableGainPart = requestedAmount * gainRatio;
  const estimatedTax = taxableGainPart * 0.1;
  const netPayout = requestedAmount - processingFee - estimatedPenalty - estimatedTax;

  const assumptions = db.assumptions.get(userId) || getDefaultAssumptions();
  const recurring = db.recurringContributions.get(userId);
  const currentMonthlyContribution = Number(recurring?.amount || 0);
  const adjustedProfile = {
    ...profile,
    currentSavings: Math.max(Number(profile?.currentSavings || 0) - requestedAmount, 0),
  };
  const adjustedPlan = calculatePlan(adjustedProfile, assumptions, currentMonthlyContribution);

  return {
    requestedAmount: roundToTwo(requestedAmount),
    availableLiquidity: roundToTwo(availableLiquidity),
    availableAfterWithdrawal: roundToTwo(Math.max(availableLiquidity - requestedAmount, 0)),
    estimatedCharges: {
      processingFee: roundToTwo(processingFee),
      earlyWithdrawalPenalty: roundToTwo(estimatedPenalty),
      estimatedTax: roundToTwo(estimatedTax),
    },
    netPayout: roundToTwo(Math.max(netPayout, 0)),
    retirementImpact: {
      corpusProjectedBefore: roundToTwo(plan?.corpusProjected || 0),
      corpusProjectedAfter: roundToTwo(adjustedPlan.corpusProjected),
      corpusImpact: roundToTwo((plan?.corpusProjected || 0) - adjustedPlan.corpusProjected),
      monthlyGapBefore: roundToTwo(plan?.monthlyGap || 0),
      monthlyGapAfter: roundToTwo(adjustedPlan.monthlyGap),
      confidenceBefore: plan?.confidenceScore || "n/a",
      confidenceAfter: adjustedPlan.confidenceScore,
    },
    note:
      "Estimate includes simulated fees, potential tax drag, and long-term corpus impact. Use withdrawals for genuine needs.",
  };
}

function getRecentTransactions(userId, limit = 12) {
  const contributionTx = getContributionHistory(userId).map((entry) => ({
    id: entry.id,
    date: entry.date,
    type: "contribution",
    amount: roundToTwo(Number(entry.amount || 0)),
    direction: "in",
    note: entry.type || "manual",
  }));

  const withdrawalTx = getWithdrawalHistory(userId).map((entry) => ({
    id: entry.id,
    date: entry.date,
    type: "withdrawal",
    amount: roundToTwo(Number(entry.amount || 0)),
    netAmount: roundToTwo(Number(entry.netPayout || 0)),
    direction: "out",
    note: entry.reason || "other",
  }));

  return [...contributionTx, ...withdrawalTx]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, limit);
}

function getQuestRewards(quest) {
  const difficulty = String(quest?.difficulty || "beginner").toLowerCase();

  if (difficulty === "advanced") {
    return { xpEarned: 45, literacyScoreChange: 9 };
  }

  if (difficulty === "intermediate") {
    return { xpEarned: 35, literacyScoreChange: 7 };
  }

  return { xpEarned: 25, literacyScoreChange: 5 };
}

function getLearningXpForUser(userId) {
  const progress = getLearningProgressForUser(userId);

  return [...progress].reduce((sum, questId) => {
    const quest = learningQuests.find((entry) => entry.id === questId);
    if (!quest) {
      return sum;
    }

    return sum + getQuestRewards(quest).xpEarned;
  }, 0);
}

function getDefaultAssumptions() {
  return {
    inflationRate: appConfig.defaults.inflationRate,
    expectedAnnualReturnPreRetirement:
      appConfig.defaults.expectedAnnualReturnPreRetirement,
    expectedAnnualReturnPostRetirement:
      appConfig.defaults.expectedAnnualReturnPostRetirement,
    yearsInRetirement: appConfig.defaults.yearsInRetirement,
  };
}

function getAllocationGuidance(riskComfort = "balanced") {
  const normalized = String(riskComfort).toLowerCase();

  if (normalized === "conservative") {
    return {
      label: "Conservative",
      summary: "Lower volatility focus with stronger capital preservation bias.",
      why: "Suitable if you prioritize stability over aggressive growth.",
      allocation: "30% stocks / 70% bonds",
    };
  }

  if (normalized === "growth") {
    return {
      label: "Growth",
      summary: "Higher long-term growth potential with short-term volatility.",
      why: "Suitable if you have a long horizon and can tolerate drawdowns.",
      allocation: "80% stocks / 20% bonds",
    };
  }

  return {
    label: "Balanced",
    summary: "Blend of growth and stability for moderate risk comfort.",
    why: "Suitable for most early investors building consistency first.",
    allocation: "50% stocks / 50% bonds",
  };
}

function getInvestmentKnowledgeCards() {
  return [
    {
      title: "Stocks",
      risk: "High",
      timeHorizon: "7+ years",
      details:
        "Equity can drive long-term growth but experiences short-term volatility.",
    },
    {
      title: "Bonds",
      risk: "Low to medium",
      timeHorizon: "3+ years",
      details:
        "Bonds can add stability, income characteristics, and lower portfolio swings.",
    },
    {
      title: "Index funds",
      risk: "Medium",
      timeHorizon: "5+ years",
      details:
        "Diversified market exposure with lower maintenance for long-term investors.",
    },
    {
      title: "Emergency cash",
      risk: "Low",
      timeHorizon: "Immediate",
      details:
        "Keep liquidity for unexpected expenses before taking higher investment risk.",
    },
  ];
}

function getActionChecklist(userId, profile, plan) {
  const recurring = db.recurringContributions.get(userId);
  const contributionCount = getContributionHistory(userId).length;
  const withdrawalCount = getWithdrawalHistory(userId).length;
  const learningCompleted = getLearningProgressForUser(userId).size;

  return [
    {
      id: "setup_contribution",
      title: "Set up recurring contribution",
      completed: Boolean(recurring),
      cta: "/contribution",
    },
    {
      id: "first_contribution",
      title: "Record first contribution",
      completed: contributionCount > 0,
      cta: "/contribution",
    },
    {
      id: "first_learning",
      title: "Complete one learning quest",
      completed: learningCompleted > 0,
      cta: "/learning",
    },
    {
      id: "allocation_review",
      title: "Review suggested stock-bond allocation",
      completed: Boolean(plan?.recommendedAllocation),
      cta: "/investing",
    },
    {
      id: "goal_statement",
      title: "Define your retirement lifestyle statement",
      completed: Boolean(profile?.lifestyleGoals?.desiredLifestyle),
      cta: "/snapshot",
    },
    {
      id: "withdrawal_readiness",
      title: "Review withdrawal impact before withdrawing",
      completed: withdrawalCount > 0,
      cta: "/withdrawals",
    },
  ];
}

const MARKET_UNIVERSE = [
  {
    key: "stocks",
    label: "Top Stocks",
    description: "Large-cap leaders with high liquidity",
    symbols: ["AAPL", "MSFT", "NVDA", "AMZN", "GOOGL", "META"],
  },
  {
    key: "bondEtfs",
    label: "Top Bond ETFs",
    description: "Diversified fixed-income exposure",
    symbols: ["BND", "AGG", "TLT", "SHY", "LQD"],
  },
  {
    key: "broadMarketEtfs",
    label: "Top Market ETFs",
    description: "Broad index exposure for long-term investors",
    symbols: ["SPY", "VTI", "QQQ", "VXUS", "VEA"],
  },
  {
    key: "defensiveAssets",
    label: "Defensive Assets",
    description: "Lower-volatility and inflation-sensitive options",
    symbols: ["GLD", "IEF", "TIP", "USMV", "SCHP"],
  },
];

const INSTRUMENT_NAMES = {
  AAPL: "Apple Inc.",
  MSFT: "Microsoft Corp.",
  NVDA: "NVIDIA Corp.",
  AMZN: "Amazon.com Inc.",
  GOOGL: "Alphabet Inc.",
  META: "Meta Platforms Inc.",
  BND: "Vanguard Total Bond Market ETF",
  AGG: "iShares Core U.S. Aggregate Bond ETF",
  TLT: "iShares 20+ Year Treasury Bond ETF",
  SHY: "iShares 1-3 Year Treasury Bond ETF",
  LQD: "iShares iBoxx $ Investment Grade Corporate Bond ETF",
  SPY: "SPDR S&P 500 ETF Trust",
  VTI: "Vanguard Total Stock Market ETF",
  QQQ: "Invesco QQQ Trust",
  VXUS: "Vanguard Total International Stock ETF",
  VEA: "Vanguard FTSE Developed Markets ETF",
  GLD: "SPDR Gold Shares",
  IEF: "iShares 7-10 Year Treasury Bond ETF",
  TIP: "iShares TIPS Bond ETF",
  USMV: "iShares MSCI USA Min Vol Factor ETF",
  SCHP: "Schwab U.S. TIPS ETF",
};

const FALLBACK_MARKET_HIGHLIGHTS = {
  asOf: new Date().toISOString(),
  source: "Fallback watchlist",
  isFallback: true,
  categories: [
    {
      key: "stocks",
      label: "Top Stocks",
      description: "Live data unavailable, showing watchlist symbols",
      items: [
        { symbol: "AAPL", name: "Apple Inc.", price: 0, change: 0, changePercent: 0, currency: "USD" },
        { symbol: "MSFT", name: "Microsoft Corp.", price: 0, change: 0, changePercent: 0, currency: "USD" },
        { symbol: "NVDA", name: "NVIDIA Corp.", price: 0, change: 0, changePercent: 0, currency: "USD" },
      ],
    },
    {
      key: "bondEtfs",
      label: "Top Bond ETFs",
      description: "Live data unavailable, showing watchlist symbols",
      items: [
        { symbol: "BND", name: "Vanguard Total Bond Market ETF", price: 0, change: 0, changePercent: 0, currency: "USD" },
        { symbol: "AGG", name: "iShares Core U.S. Aggregate Bond ETF", price: 0, change: 0, changePercent: 0, currency: "USD" },
        { symbol: "TLT", name: "iShares 20+ Year Treasury Bond ETF", price: 0, change: 0, changePercent: 0, currency: "USD" },
      ],
    },
    {
      key: "broadMarketEtfs",
      label: "Top Market ETFs",
      description: "Live data unavailable, showing watchlist symbols",
      items: [
        { symbol: "SPY", name: "SPDR S&P 500 ETF Trust", price: 0, change: 0, changePercent: 0, currency: "USD" },
        { symbol: "VTI", name: "Vanguard Total Stock Market ETF", price: 0, change: 0, changePercent: 0, currency: "USD" },
        { symbol: "QQQ", name: "Invesco QQQ Trust", price: 0, change: 0, changePercent: 0, currency: "USD" },
      ],
    },
  ],
};

function normalizeQuote(quote) {
  return {
    symbol: quote.symbol,
    name: quote.shortName || quote.longName || quote.symbol,
    price: Number(quote.regularMarketPrice || 0),
    change: Number(quote.regularMarketChange || 0),
    changePercent: Number(quote.regularMarketChangePercent || 0),
    currency: quote.currency || "USD",
  };
}

function parseStooqCsv(text) {
  const lines = String(text || "")
    .trim()
    .split(/\r?\n/)
    .filter(Boolean);

  if (lines.length <= 1) {
    return [];
  }

  return lines.slice(1).map((line) => {
    const [symbolRaw, dateRaw, timeRaw, openRaw, highRaw, lowRaw, closeRaw, volumeRaw] =
      line.split(",");

    const symbol = String(symbolRaw || "")
      .replace(/\.US$/i, "")
      .toUpperCase();
    const open = Number(openRaw);
    const close = Number(closeRaw);
    const high = Number(highRaw);
    const low = Number(lowRaw);
    const volume = Number(volumeRaw);

    const hasPrice = Number.isFinite(close);
    const hasOpen = Number.isFinite(open) && open > 0;
    const change = hasPrice && hasOpen ? close - open : 0;
    const changePercent = hasPrice && hasOpen ? (change / open) * 100 : 0;

    return {
      symbol,
      shortName: INSTRUMENT_NAMES[symbol] || symbol,
      regularMarketPrice: hasPrice ? close : 0,
      regularMarketChange: Number.isFinite(change) ? change : 0,
      regularMarketChangePercent: Number.isFinite(changePercent) ? changePercent : 0,
      regularMarketDayHigh: Number.isFinite(high) ? high : 0,
      regularMarketDayLow: Number.isFinite(low) ? low : 0,
      regularMarketVolume: Number.isFinite(volume) ? volume : 0,
      marketDate: dateRaw || "",
      marketTime: timeRaw || "",
      currency: "USD",
    };
  });
}

async function fetchLiveMarketHighlights() {
  const symbols = [...new Set(MARKET_UNIVERSE.flatMap((entry) => entry.symbols))];
  const stooqSymbols = symbols.map((symbol) => `${symbol.toLowerCase()}.us`);
  const endpoint = `https://stooq.com/q/l/?s=${stooqSymbols.join("+")}&f=sd2t2ohlcv&h&e=csv`;

  const response = await fetch(endpoint);

  if (!response.ok) {
    throw new Error(`Market upstream failed with ${response.status}`);
  }

  const csv = await response.text();
  const quotes = parseStooqCsv(csv);
  if (!Array.isArray(quotes) || quotes.length === 0) {
    throw new Error("No quotes returned from market upstream");
  }

  const bySymbol = new Map(quotes.map((quote) => [quote.symbol, normalizeQuote(quote)]));

  const categories = MARKET_UNIVERSE.map((category) => {
    const items = category.symbols
      .map((symbol) => bySymbol.get(symbol))
      .filter(Boolean)
      .sort((a, b) => b.changePercent - a.changePercent)
      .slice(0, 3);

    return {
      key: category.key,
      label: category.label,
      description: category.description,
      items,
    };
  }).filter((category) => category.items.length > 0);

  if (categories.length === 0) {
    throw new Error("No categorized quotes available");
  }

  return {
    asOf: new Date().toISOString(),
    source: "Stooq",
    isFallback: false,
    categories,
  };
}

function generateAndStorePlan(userId) {
  const profile = db.profiles.get(userId);
  if (!profile) {
    return null;
  }

  const assumptions = db.assumptions.get(userId) || getDefaultAssumptions();
  const recurring = db.recurringContributions.get(userId);
  const totalWithdrawn = getWithdrawalHistory(userId).reduce(
    (sum, entry) => sum + Number(entry.amount || 0),
    0,
  );
  const adjustedProfile = {
    ...profile,
    currentSavings: Math.max(Number(profile.currentSavings || 0) - totalWithdrawn, 0),
  };
  const monthlyContribution = recurring ? Number(recurring.amount) : 0;
  const planResult = calculatePlan(adjustedProfile, assumptions, monthlyContribution);

  const plan = {
    id: uuidv4(),
    userId,
    ...planResult,
    currentSavingsAfterWithdrawals: roundToTwo(adjustedProfile.currentSavings),
    totalWithdrawn: roundToTwo(totalWithdrawn),
    generatedAt: new Date().toISOString(),
  };

  db.plans.set(userId, plan);
  return plan;
}

const signupSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6).max(128),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6).max(128),
});

const profileSchema = z
  .object({
    userId: z.string().uuid(),
    currentAge: z.number().int().min(18).max(80),
    retirementAge: z.number().int().min(40).max(85),
    currentMonthlyIncome: z.number().min(0),
    currentMonthlyExpense: z.number().min(0),
    currentSavings: z.number().min(0),
    riskComfort: z.enum(["conservative", "balanced", "growth"]),
    lifestyleGoals: z
      .object({
        desiredLifestyle: z.string().optional(),
        travelBudget: z.number().min(0).optional(),
        healthBuffer: z.number().min(0).optional(),
        dependents: z.number().int().min(0).optional(),
      })
      .optional(),
    assumptions: z
      .object({
        inflationRate: z.number().min(0).max(100).optional(),
        expectedAnnualReturnPreRetirement: z.number().min(0).max(100).optional(),
        expectedAnnualReturnPostRetirement: z.number().min(0).max(100).optional(),
        yearsInRetirement: z.number().int().min(1).max(60).optional(),
      })
      .optional(),
  })
  .refine((data) => data.retirementAge > data.currentAge, {
    message: "Retirement age must be greater than current age",
    path: ["retirementAge"],
  });

const userIdSchema = z.object({ userId: z.string().uuid() });

const contributionSetupSchema = z.object({
  userId: z.string().uuid(),
  frequency: z.enum(["weekly", "biweekly", "monthly"]),
  amount: z.number().positive(),
  startDate: z.string().optional(),
  via: z.enum(["auto", "round_up", "manual"]),
});

const contributionRecordSchema = z.object({
  userId: z.string().uuid(),
  amount: z.number().positive(),
  date: z.string().optional(),
  type: z.enum(["scheduled", "bonus", "manual"]),
});

const withdrawalSimulateSchema = z.object({
  userId: z.string().uuid(),
  amount: z.number().positive(),
  reason: z
    .enum(["emergency", "medical", "job_loss", "education", "family", "other"])
    .optional(),
});

const withdrawalRequestSchema = z.object({
  userId: z.string().uuid(),
  amount: z.number().positive(),
  reason: z.enum(["emergency", "medical", "job_loss", "education", "family", "other"]),
  destination: z.enum(["bank_transfer", "wallet", "manual"]).optional(),
  note: z.string().max(240).optional(),
});

const eventSchema = z.object({
  userId: z.string().uuid().optional(),
  eventType: z.string().min(1).max(100),
  properties: z.record(z.any()).optional(),
});

const completeQuestSchema = z.object({
  userId: z.string().uuid(),
});

app.get("/health", (_req, res) => {
  res.json({
    status: "ok",
    service: "futureyou-backend",
    timestamp: new Date().toISOString(),
  });
});

app.post("/auth/signup", async (req, res, next) => {
  try {
    const payload = signupSchema.parse(req.body);
    if (findUserByEmail(payload.email)) {
      return res.status(409).json({ message: "User already exists" });
    }

    const passwordHash = await bcrypt.hash(payload.password, 10);
    const user = {
      id: uuidv4(),
      email: payload.email,
      passwordHash,
      createdAt: new Date().toISOString(),
    };

    db.users.set(user.id, user);

    const token = jwt.sign(
      { sub: user.id, email: user.email },
      appConfig.jwtSecret,
      { expiresIn: "7d" },
    );

    trackEvent(user.id, "signup_completed");

    return res.status(201).json({
      token,
      userId: user.id,
      expiresIn: "7d",
    });
  } catch (error) {
    return next(error);
  }
});

app.post("/auth/login", async (req, res, next) => {
  try {
    const payload = loginSchema.parse(req.body);
    const user = findUserByEmail(payload.email);
    if (!user) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const isValid = await bcrypt.compare(payload.password, user.passwordHash);
    if (!isValid) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const token = jwt.sign(
      { sub: user.id, email: user.email },
      appConfig.jwtSecret,
      { expiresIn: "7d" },
    );

    trackEvent(user.id, "login_completed");

    return res.json({ token, userId: user.id, expiresIn: "7d" });
  } catch (error) {
    return next(error);
  }
});

app.post("/profile", (req, res, next) => {
  try {
    const payload = profileSchema.parse(req.body);

    if (!db.users.has(payload.userId)) {
      return res.status(404).json({ message: "User not found" });
    }

    const profile = {
      userId: payload.userId,
      currentAge: payload.currentAge,
      retirementAge: payload.retirementAge,
      currentMonthlyIncome: payload.currentMonthlyIncome,
      currentMonthlyExpense: payload.currentMonthlyExpense,
      currentSavings: payload.currentSavings,
      riskComfort: payload.riskComfort,
      lifestyleGoals: payload.lifestyleGoals || {},
      updatedAt: new Date().toISOString(),
      onboardingCompleted: true,
    };

    const assumptions = {
      ...getDefaultAssumptions(),
      ...(payload.assumptions || {}),
    };

    db.profiles.set(payload.userId, profile);
    db.assumptions.set(payload.userId, assumptions);

    trackEvent(payload.userId, "onboarding_completed");

    return res.json({
      profileId: payload.userId,
      onboardingCompleted: true,
      profile,
      assumptions,
    });
  } catch (error) {
    return next(error);
  }
});

app.get("/profile/:userId", (req, res) => {
  const { userId } = req.params;
  const profile = db.profiles.get(userId);
  if (!profile) {
    return res.status(404).json({ message: "Profile not found" });
  }

  return res.json({
    profile,
    assumptions: db.assumptions.get(userId) || getDefaultAssumptions(),
  });
});

app.put("/profile/:userId", (req, res, next) => {
  try {
    const userId = req.params.userId;
    const existing = db.profiles.get(userId);
    if (!existing) {
      return res.status(404).json({ message: "Profile not found" });
    }

    const mergedPayload = {
      ...existing,
      ...req.body,
      userId,
    };

    const payload = profileSchema.parse(mergedPayload);

    const updatedProfile = {
      ...existing,
      ...payload,
      updatedAt: new Date().toISOString(),
    };

    db.profiles.set(userId, updatedProfile);

    const existingAssumptions = db.assumptions.get(userId) || getDefaultAssumptions();
    db.assumptions.set(userId, {
      ...existingAssumptions,
      ...(req.body.assumptions || {}),
    });

    const plan = generateAndStorePlan(userId);
    trackEvent(userId, "profile_updated", { recalcTriggered: true });

    return res.json({
      updatedProfile,
      recalcTriggered: true,
      plan,
    });
  } catch (error) {
    return next(error);
  }
});

app.post("/plan/generate", (req, res, next) => {
  try {
    const payload = userIdSchema.parse(req.body);

    if (!db.profiles.has(payload.userId)) {
      return res.status(404).json({ message: "Profile not found" });
    }

    const plan = generateAndStorePlan(payload.userId);
    trackEvent(payload.userId, "plan_generated", {
      confidenceScore: plan.confidenceScore,
      monthlyGap: plan.monthlyGap,
    });

    createNudge(
      payload.userId,
      "plan_generated",
      `Your plan is ready. You can close your retirement gap by saving ${plan.monthlyContributionNeeded} per month.`,
      "/contribution",
    );

    return res.json(plan);
  } catch (error) {
    return next(error);
  }
});

app.get("/plan/:userId", (req, res) => {
  const { userId } = req.params;
  if (!db.profiles.has(userId)) {
    return res.status(404).json({ message: "Profile not found" });
  }

  const existingPlan = db.plans.get(userId) || generateAndStorePlan(userId);
  return res.json(existingPlan);
});

app.post("/plan/simulate", (req, res, next) => {
  try {
    const schema = z.object({
      userId: z.string().uuid(),
      monthlyContribution: z.number().min(0).optional(),
      assumptions: z
        .object({
          inflationRate: z.number().min(0).max(100).optional(),
          expectedAnnualReturnPreRetirement: z.number().min(0).max(100).optional(),
          expectedAnnualReturnPostRetirement: z.number().min(0).max(100).optional(),
          yearsInRetirement: z.number().int().min(1).max(60).optional(),
        })
        .optional(),
    });

    const payload = schema.parse(req.body);
    const profile = db.profiles.get(payload.userId);
    if (!profile) {
      return res.status(404).json({ message: "Profile not found" });
    }

    const assumptions = {
      ...(db.assumptions.get(payload.userId) || getDefaultAssumptions()),
      ...(payload.assumptions || {}),
    };

    const recurring = db.recurringContributions.get(payload.userId);
    const monthlyContribution =
      payload.monthlyContribution ?? Number(recurring?.amount || 0);

    const simulation = calculatePlan(profile, assumptions, monthlyContribution);
    return res.json(simulation);
  } catch (error) {
    return next(error);
  }
});

app.post("/contribution/setup", (req, res, next) => {
  try {
    const payload = contributionSetupSchema.parse(req.body);

    if (!db.users.has(payload.userId)) {
      return res.status(404).json({ message: "User not found" });
    }

    const recurring = {
      id: uuidv4(),
      userId: payload.userId,
      frequency: payload.frequency,
      amount: payload.amount,
      method: payload.via,
      startDate: payload.startDate || new Date().toISOString().slice(0, 10),
      nextScheduledDate: payload.startDate || new Date().toISOString().slice(0, 10),
      isActive: true,
      createdAt: new Date().toISOString(),
    };

    db.recurringContributions.set(payload.userId, recurring);
    const plan = generateAndStorePlan(payload.userId);
    const portfolioSnapshot = getPortfolioSnapshot(
      payload.userId,
      db.profiles.get(payload.userId),
      plan,
    );
    const moneyFlowBreakdown = getMoneyFlowBreakdown(payload.userId, plan);
    const essentialHealth = getEssentialHealth(
      db.profiles.get(payload.userId),
      moneyFlowBreakdown,
      portfolioSnapshot,
    );

    trackEvent(payload.userId, "contribution_setup", {
      frequency: payload.frequency,
      amount: payload.amount,
      method: payload.via,
    });

    return res.status(201).json({
      contributionId: recurring.id,
      nextNudgeDate: recurring.nextScheduledDate,
      recurring,
      moneyFlowBreakdown,
      portfolioSnapshot,
      essentialHealth,
    });
  } catch (error) {
    return next(error);
  }
});

app.post("/contribution/record", (req, res, next) => {
  try {
    const payload = contributionRecordSchema.parse(req.body);
    if (!db.users.has(payload.userId)) {
      return res.status(404).json({ message: "User not found" });
    }

    const contribution = {
      id: uuidv4(),
      userId: payload.userId,
      amount: payload.amount,
      date: payload.date || new Date().toISOString().slice(0, 10),
      type: payload.type,
      createdAt: new Date().toISOString(),
    };

    db.contributions.push(contribution);
    const streakCount = getContributionStreak(payload.userId);

    trackEvent(payload.userId, "contribution_recorded", {
      amount: payload.amount,
      type: payload.type,
      streakCount,
    });

    if (streakCount === 1) {
      createNudge(
        payload.userId,
        "milestone",
        "You made your first contribution. Great start!",
      );
    }

    if (streakCount > 0 && streakCount % 4 === 0) {
      createNudge(
        payload.userId,
        "milestone",
        `You hit a ${streakCount}-week consistency streak. Keep going.`,
      );
    }

    const plan = generateAndStorePlan(payload.userId);
    const portfolioSnapshot = getPortfolioSnapshot(
      payload.userId,
      db.profiles.get(payload.userId),
      plan,
    );
    const moneyFlowBreakdown = getMoneyFlowBreakdown(payload.userId, plan);
    const essentialHealth = getEssentialHealth(
      db.profiles.get(payload.userId),
      moneyFlowBreakdown,
      portfolioSnapshot,
    );

    return res.status(201).json({
      contributionId: contribution.id,
      streakCount,
      updatedPlan: plan,
      portfolioSnapshot,
      moneyFlowBreakdown,
      essentialHealth,
    });
  } catch (error) {
    return next(error);
  }
});

app.get("/contribution/history/:userId", (req, res) => {
  const { userId } = req.params;
  if (!db.users.has(userId)) {
    return res.status(404).json({ message: "User not found" });
  }

  const contributions = getContributionHistory(userId);
  const totalContributed = contributions.reduce((sum, entry) => sum + entry.amount, 0);
  const profile = db.profiles.get(userId);
  const plan = profile ? db.plans.get(userId) || generateAndStorePlan(userId) : null;
  const portfolioSnapshot = getPortfolioSnapshot(userId, profile, plan);
  const moneyFlowBreakdown = getMoneyFlowBreakdown(userId, plan);

  return res.json({
    contributions,
    totalContributed,
    consistencyRate: Number(getConsistencyRate(userId).toFixed(2)),
    portfolioSnapshot,
    moneyFlowBreakdown,
    totalWithdrawn: roundToTwo(
      getWithdrawalHistory(userId).reduce((sum, entry) => sum + Number(entry.amount || 0), 0),
    ),
    essentialHealth: getEssentialHealth(profile, moneyFlowBreakdown, portfolioSnapshot),
    recentTransactions: getRecentTransactions(userId, 15),
  });
});

app.post("/withdrawals/simulate", (req, res, next) => {
  try {
    const payload = withdrawalSimulateSchema.parse(req.body);
    if (!db.users.has(payload.userId)) {
      return res.status(404).json({ message: "User not found" });
    }

    const profile = db.profiles.get(payload.userId);
    if (!profile) {
      return res.status(404).json({ message: "Profile not found" });
    }

    const estimate = getWithdrawalEstimate(
      payload.userId,
      payload.amount,
      payload.reason || "other",
    );

    if (payload.amount > estimate.availableLiquidity) {
      return res.status(400).json({
        message: "Withdrawal amount exceeds available portfolio value",
        estimate,
      });
    }

    return res.json(estimate);
  } catch (error) {
    return next(error);
  }
});

app.post("/withdrawals/request", (req, res, next) => {
  try {
    const payload = withdrawalRequestSchema.parse(req.body);
    if (!db.users.has(payload.userId)) {
      return res.status(404).json({ message: "User not found" });
    }

    const profile = db.profiles.get(payload.userId);
    if (!profile) {
      return res.status(404).json({ message: "Profile not found" });
    }

    const estimate = getWithdrawalEstimate(payload.userId, payload.amount, payload.reason);
    if (payload.amount > estimate.availableLiquidity) {
      return res.status(400).json({
        message: "Withdrawal amount exceeds available portfolio value",
        estimate,
      });
    }

    const withdrawal = {
      id: uuidv4(),
      userId: payload.userId,
      amount: roundToTwo(payload.amount),
      reason: payload.reason,
      destination: payload.destination || "bank_transfer",
      note: payload.note || "",
      processingFee: estimate.estimatedCharges.processingFee,
      earlyWithdrawalPenalty: estimate.estimatedCharges.earlyWithdrawalPenalty,
      estimatedTax: estimate.estimatedCharges.estimatedTax,
      netPayout: estimate.netPayout,
      status: "completed",
      date: new Date().toISOString().slice(0, 10),
      requestedAt: new Date().toISOString(),
      processedAt: new Date().toISOString(),
    };

    db.withdrawals.push(withdrawal);

    const plan = generateAndStorePlan(payload.userId);
    const portfolioSnapshot = getPortfolioSnapshot(payload.userId, profile, plan);
    const moneyFlowBreakdown = getMoneyFlowBreakdown(payload.userId, plan);
    const essentialHealth = getEssentialHealth(profile, moneyFlowBreakdown, portfolioSnapshot);

    trackEvent(payload.userId, "withdrawal_requested", {
      amount: payload.amount,
      reason: payload.reason,
      destination: withdrawal.destination,
      netPayout: withdrawal.netPayout,
      corpusImpact: estimate.retirementImpact.corpusImpact,
    });

    if (
      estimate.retirementImpact.corpusImpact > 100000 &&
      payload.reason !== "emergency" &&
      payload.reason !== "medical"
    ) {
      createNudge(
        payload.userId,
        "withdrawal_impact_warning",
        "This withdrawal meaningfully impacts your retirement corpus. Review your plan and contribution amount.",
        "/snapshot",
      );
    }

    return res.status(201).json({
      withdrawalId: withdrawal.id,
      withdrawal,
      estimate,
      updatedPlan: plan,
      portfolioSnapshot,
      moneyFlowBreakdown,
      essentialHealth,
    });
  } catch (error) {
    return next(error);
  }
});

app.get("/withdrawals/history/:userId", (req, res) => {
  const { userId } = req.params;
  if (!db.users.has(userId)) {
    return res.status(404).json({ message: "User not found" });
  }

  const profile = db.profiles.get(userId);
  const plan = profile ? db.plans.get(userId) || generateAndStorePlan(userId) : null;
  const portfolioSnapshot = getPortfolioSnapshot(userId, profile, plan);
  const moneyFlowBreakdown = getMoneyFlowBreakdown(userId, plan);
  const essentialHealth = getEssentialHealth(profile, moneyFlowBreakdown, portfolioSnapshot);
  const withdrawals = getWithdrawalHistory(userId);

  return res.json({
    withdrawals,
    totalRequested: roundToTwo(
      withdrawals.reduce((sum, entry) => sum + Number(entry.amount || 0), 0),
    ),
    totalNetPayout: roundToTwo(
      withdrawals.reduce((sum, entry) => sum + Number(entry.netPayout || 0), 0),
    ),
    totalCharges: roundToTwo(
      withdrawals.reduce(
        (sum, entry) =>
          sum +
          Number(entry.processingFee || 0) +
          Number(entry.earlyWithdrawalPenalty || 0) +
          Number(entry.estimatedTax || 0),
        0,
      ),
    ),
    portfolioSnapshot,
    essentialHealth,
    recentTransactions: getRecentTransactions(userId, 20),
  });
});

app.get("/dashboard/:userId", (req, res) => {
  const { userId } = req.params;
  if (!db.users.has(userId)) {
    return res.status(404).json({ message: "User not found" });
  }

  const contributions = getContributionHistory(userId);
  const profile = db.profiles.get(userId);
  const completedQuests = getLearningProgressForUser(userId).size;
  const xp = contributions.length * 10 + getLearningXpForUser(userId);
  const nextMilestone = Math.ceil((xp + 1) / 100) * 100;
  const planSnapshot = db.plans.get(userId) || generateAndStorePlan(userId);
  const allocationGuidance = getAllocationGuidance(profile?.riskComfort);
  const portfolioSnapshot = getPortfolioSnapshot(userId, profile, planSnapshot);
  const moneyFlowBreakdown = getMoneyFlowBreakdown(userId, planSnapshot);
  const essentialHealth = getEssentialHealth(profile, moneyFlowBreakdown, portfolioSnapshot);
  const recentWithdrawals = getWithdrawalHistory(userId).slice(0, 10);

  const response = {
    streak: getContributionStreak(userId),
    xp,
    nextMilestone,
    consistencyRate: Number(getConsistencyRate(userId).toFixed(2)),
    completedQuests,
    oneTimeSetupCompleted: Boolean(profile?.onboardingCompleted),
    profileSummary: {
      age: profile?.currentAge || null,
      retirementAge: profile?.retirementAge || null,
      monthlyIncome: profile?.currentMonthlyIncome || 0,
      monthlyExpense: profile?.currentMonthlyExpense || 0,
      riskComfort: profile?.riskComfort || "balanced",
      lifestyleGoal: profile?.lifestyleGoals?.desiredLifestyle || "",
    },
    recentContributions: contributions.slice(0, 10),
    recentWithdrawals,
    recentTransactions: getRecentTransactions(userId, 15),
    planSnapshot,
    portfolioSnapshot,
    moneyFlowBreakdown,
    essentialHealth,
    withdrawalPolicy: {
      supportedReasons: ["emergency", "medical", "job_loss", "education", "family", "other"],
      processingFeePercent: 0.5,
      estimatedTaxOnGainsPercent: 10,
      note: "Withdrawals reduce long-term compounding; use simulation before confirming.",
    },
    allocationGuidance,
    investmentKnowledgeCards: getInvestmentKnowledgeCards(),
    actionChecklist: getActionChecklist(userId, profile, planSnapshot),
    pendingNudges: db.nudges
      .filter((nudge) => nudge.userId === userId && !nudge.completedAt)
      .sort((a, b) => new Date(b.sentAt).getTime() - new Date(a.sentAt).getTime())
      .slice(0, 5),
  };

  return res.json(response);
});

app.get("/learning/quests", (req, res) => {
  const { userId } = req.query;

  let progress = new Set();
  if (typeof userId === "string" && userId.length > 0) {
    progress = getLearningProgressForUser(userId);
  }

  const quests = learningQuests.map((quest) => ({
    ...quest,
    completed: progress.has(quest.id),
  }));
  const completedCount = [...progress].length;

  return res.json({
    quests,
    completedCount,
    totalCount: quests.length,
    completionRate: quests.length
      ? Number(((completedCount / quests.length) * 100).toFixed(2))
      : 0,
    totalLearningMinutes: Number(
      (quests.reduce((sum, quest) => sum + Number(quest.durationSeconds || 0), 0) / 60).toFixed(1),
    ),
  });
});

app.post("/learning/quests/:questId/complete", (req, res, next) => {
  try {
    const payload = completeQuestSchema.parse(req.body);
    const { questId } = req.params;

    if (!db.users.has(payload.userId)) {
      return res.status(404).json({ message: "User not found" });
    }

    const quest = learningQuests.find((entry) => entry.id === questId);
    if (!quest) {
      return res.status(404).json({ message: "Quest not found" });
    }

    const progress = getLearningProgressForUser(payload.userId);
    progress.add(quest.id);
    const rewards = getQuestRewards(quest);
    const learningXp = getLearningXpForUser(payload.userId);

    trackEvent(payload.userId, "learning_quest_completed", {
      questId,
      topic: quest.topic,
      difficulty: quest.difficulty || "beginner",
    });

    return res.json({
      questId,
      xpEarned: rewards.xpEarned,
      literacyScoreChange: rewards.literacyScoreChange,
      newLevel: Math.floor(learningXp / 100) + 1,
      completedCount: progress.size,
      totalLearningXp: learningXp,
    });
  } catch (error) {
    return next(error);
  }
});

app.get("/nudges/:userId", (req, res) => {
  const { userId } = req.params;
  const nudges = db.nudges
    .filter((entry) => entry.userId === userId)
    .sort((a, b) => new Date(b.sentAt).getTime() - new Date(a.sentAt).getTime());

  return res.json({ nudges });
});

app.post("/events/nudge/:nudgeId/click", (req, res) => {
  const { nudgeId } = req.params;
  const nudge = db.nudges.find((entry) => entry.id === nudgeId);
  if (!nudge) {
    return res.status(404).json({ message: "Nudge not found" });
  }

  nudge.clickedAt = new Date().toISOString();
  trackEvent(nudge.userId, "nudge_clicked", { nudgeType: nudge.nudgeType });

  return res.json({
    eventLogged: true,
    nudgeId: nudge.id,
  });
});

app.post("/events", (req, res, next) => {
  try {
    const payload = eventSchema.parse(req.body);
    const event = {
      id: uuidv4(),
      userId: payload.userId || null,
      eventType: payload.eventType,
      properties: payload.properties || {},
      createdAt: new Date().toISOString(),
    };

    db.events.push(event);
    return res.status(201).json({ eventId: event.id });
  } catch (error) {
    return next(error);
  }
});

app.get("/metrics/summary", (_req, res) => {
  const onboardingCompleted = db.events.filter(
    (event) => event.eventType === "onboarding_completed",
  ).length;
  const planGenerated = db.events.filter(
    (event) => event.eventType === "plan_generated",
  ).length;
  const firstContributionSetup = db.events.filter(
    (event) => event.eventType === "contribution_setup",
  ).length;
  const contributionRecorded = db.events.filter(
    (event) => event.eventType === "contribution_recorded",
  ).length;
  const learningCompleted = db.events.filter(
    (event) => event.eventType === "learning_quest_completed",
  ).length;
  const withdrawalsRequested = db.events.filter(
    (event) => event.eventType === "withdrawal_requested",
  ).length;
  const nudgesClicked = db.events.filter(
    (event) => event.eventType === "nudge_clicked",
  ).length;
  const nudgesSent = db.events.filter((event) => event.eventType === "nudge_sent").length;

  return res.json({
    onboardingCompleted,
    planGenerated,
    firstContributionSetup,
    contributionRecorded,
    learningCompleted,
    withdrawalsRequested,
    totalWithdrawn: roundToTwo(
      db.withdrawals.reduce((sum, entry) => sum + Number(entry.amount || 0), 0),
    ),
    nudgeClickThroughRate: nudgesSent
      ? Number(((nudgesClicked / nudgesSent) * 100).toFixed(2))
      : 0,
  });
});

app.get("/market/highlights", async (_req, res) => {
  try {
    const highlights = await fetchLiveMarketHighlights();
    return res.json(highlights);
  } catch (error) {
    return res.json({
      ...FALLBACK_MARKET_HIGHLIGHTS,
      asOf: new Date().toISOString(),
      message:
        "Live market feed unavailable. Showing a curated watchlist for educational exploration.",
    });
  }
});

function runNudgeSweep() {
  const now = new Date();

  for (const recurring of db.recurringContributions.values()) {
    if (!recurring.isActive) {
      continue;
    }

    const expectedGapDays = recurring.frequency === "monthly" ? 35 : recurring.frequency === "biweekly" ? 17 : 8;

    if (!hasContributionWithinDays(recurring.userId, expectedGapDays)) {
      createNudge(
        recurring.userId,
        "missed_contribution",
        "You missed your recent contribution. A quick catch-up keeps your goal on track.",
        "/contribution",
      );
    }

    if (now.getDate() === 1) {
      createNudge(
        recurring.userId,
        "salary_day_reminder",
        "New month, new progress. Save your planned amount today.",
        "/contribution",
      );
    }
  }
}

cron.schedule("0 9 * * *", runNudgeSweep);

app.use((error, _req, res, _next) => {
  if (error instanceof z.ZodError) {
    return res.status(400).json({
      message: "Validation failed",
      details: error.issues,
    });
  }

  return res.status(500).json({
    message: "Internal server error",
    details: error.message,
  });
});

app.listen(appConfig.port, () => {
  console.log(`FutureYou backend running on port ${appConfig.port}`);
});
