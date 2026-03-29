const ALLOCATION_BY_RISK = {
  conservative: { stocks: 30, bonds: 70 },
  balanced: { stocks: 50, bonds: 50 },
  growth: { stocks: 80, bonds: 20 },
};

function roundToTwo(value) {
  return Math.round(value * 100) / 100;
}

function toRatio(value, fallback) {
  const parsed = Number(value);
  if (Number.isNaN(parsed) || parsed < 0) {
    return fallback;
  }

  if (parsed > 1) {
    return parsed / 100;
  }

  return parsed;
}

function getYearsToRetirement(currentAge, retirementAge) {
  return Math.max(retirementAge - currentAge, 1);
}

function getFutureMonthlyExpense(currentMonthlyExpense, inflationRate, yearsToRetirement) {
  return currentMonthlyExpense * Math.pow(1 + inflationRate, yearsToRetirement);
}

function getRequiredRetirementCorpus(
  futureMonthlyExpense,
  annualReturnPostRetirement,
  yearsInRetirement,
) {
  const yearlyNeed = futureMonthlyExpense * 12;

  if (annualReturnPostRetirement === 0) {
    return yearlyNeed * yearsInRetirement;
  }

  return (
    yearlyNeed *
    ((1 - Math.pow(1 + annualReturnPostRetirement, -yearsInRetirement)) /
      annualReturnPostRetirement)
  );
}

function getFutureValue(
  presentValue,
  monthlyContribution,
  annualReturnPreRetirement,
  monthsToRetirement,
) {
  const monthlyReturn = annualReturnPreRetirement / 12;

  if (monthlyReturn === 0) {
    return presentValue + monthlyContribution * monthsToRetirement;
  }

  const futureValueFromPresent =
    presentValue * Math.pow(1 + monthlyReturn, monthsToRetirement);
  const futureValueFromContributions =
    monthlyContribution *
    ((Math.pow(1 + monthlyReturn, monthsToRetirement) - 1) / monthlyReturn);

  return futureValueFromPresent + futureValueFromContributions;
}

function getRequiredMonthlyContribution(
  targetFutureValue,
  presentValue,
  annualReturnPreRetirement,
  monthsToRetirement,
) {
  const monthlyReturn = annualReturnPreRetirement / 12;

  if (monthlyReturn === 0) {
    return Math.max((targetFutureValue - presentValue) / monthsToRetirement, 0);
  }

  const growthFactor = Math.pow(1 + monthlyReturn, monthsToRetirement);
  const numerator = (targetFutureValue - presentValue * growthFactor) * monthlyReturn;
  const denominator = growthFactor - 1;

  if (denominator === 0) {
    return 0;
  }

  return Math.max(numerator / denominator, 0);
}

function getConfidenceScore(corpusProjected, corpusRequired) {
  if (corpusRequired <= 0) {
    return "high";
  }

  const ratio = corpusProjected / corpusRequired;
  if (ratio >= 1) {
    return "high";
  }
  if (ratio >= 0.7) {
    return "medium";
  }
  return "low";
}

export function calculatePlan(profile, assumptions, monthlyContribution = 0) {
  const currentAge = Number(profile.currentAge);
  const retirementAge = Number(profile.retirementAge);
  const currentMonthlyExpense = Number(profile.currentMonthlyExpense);
  const currentInvestedSavings = Number(profile.currentSavings || 0);
  const riskComfort = String(profile.riskComfort || "balanced").toLowerCase();

  const inflationRate = toRatio(
    assumptions.inflationRate,
    0.06,
  );
  const annualReturnPreRetirement = toRatio(
    assumptions.expectedAnnualReturnPreRetirement,
    0.1,
  );
  const annualReturnPostRetirement = toRatio(
    assumptions.expectedAnnualReturnPostRetirement,
    0.05,
  );
  const yearsInRetirement = Number(assumptions.yearsInRetirement || 30);

  const yearsToRetirement = getYearsToRetirement(currentAge, retirementAge);
  const monthsToRetirement = yearsToRetirement * 12;

  const expenseAtRetirement = getFutureMonthlyExpense(
    currentMonthlyExpense,
    inflationRate,
    yearsToRetirement,
  );
  const corpusRequired = getRequiredRetirementCorpus(
    expenseAtRetirement,
    annualReturnPostRetirement,
    yearsInRetirement,
  );

  const corpusProjected = getFutureValue(
    currentInvestedSavings,
    Number(monthlyContribution),
    annualReturnPreRetirement,
    monthsToRetirement,
  );

  const requiredMonthlyContribution = getRequiredMonthlyContribution(
    corpusRequired,
    currentInvestedSavings,
    annualReturnPreRetirement,
    monthsToRetirement,
  );

  const monthlyGap = Math.max(requiredMonthlyContribution - Number(monthlyContribution), 0);
  const confidenceScore = getConfidenceScore(corpusProjected, corpusRequired);
  const recommendedAllocation = ALLOCATION_BY_RISK[riskComfort] || ALLOCATION_BY_RISK.balanced;

  return {
    assumptions: {
      inflationRate,
      annualReturnPreRetirement,
      annualReturnPostRetirement,
      yearsInRetirement,
    },
    corpusRequired: roundToTwo(corpusRequired),
    corpusProjected: roundToTwo(corpusProjected),
    monthlyContributionNeeded: roundToTwo(requiredMonthlyContribution),
    currentMonthlyContribution: roundToTwo(Number(monthlyContribution)),
    monthlyGap: roundToTwo(monthlyGap),
    confidenceScore,
    recommendedAllocation,
    expenseAtRetirement: roundToTwo(expenseAtRetirement),
    yearsToRetirement,
    monthsToRetirement,
  };
}
