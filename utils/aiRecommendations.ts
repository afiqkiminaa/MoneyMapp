/**
 * Enhanced AI-Powered Budget Recommendation Engine v2.0
 * Provides real-time, contextual budget insights with daily spending awareness
 */

type CategoryTotals = Record<string, number>;
type BudgetLimit = { category: string; limit: number };

interface AIRecommendation {
  category: string;
  type:
    | "critical_alert"
    | "budget_exceeded"
    | "trajectory_warning"
    | "pace_monitor"
    | "safe_zone"
    | "optimization"
    | "unbudgeted"
    | "recovery"
    | "on_track";
  message: string;
  priority: "critical" | "high" | "medium" | "low";
  suggestedLimit?: number;
  insight?: string;
  actionItems?: string[];
  daysInMonth?: number;
  daysRemaining?: number;
  dailyRate?: number;
  projectedTotal?: number;
}

/**
 * Get current day of month
 */
const getCurrentDayOfMonth = (): number => {
  return new Date().getDate();
};

/**
 * Get days remaining in current month
 */
const getDaysRemainingInMonth = (): number => {
  const now = new Date();
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  return lastDay.getDate() - now.getDate();
};

/**
 * Get total days in month
 */
const getTotalDaysInMonth = (): number => {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
};

/**
 * Calculate average spending per day
 */
const calculateDailyRate = (spent: number, daysIntoMonth: number): number => {
  return daysIntoMonth > 0 ? spent / daysIntoMonth : 0;
};

/**
 * Project total spending by end of month
 */
const projectMonthEnd = (dailyRate: number, daysRemaining: number, currentSpent: number): number => {
  return currentSpent + dailyRate * daysRemaining;
};

/**
 * Calculate category average from historical data
 */
export const calculateCategoryAverage = (
  historicalData: CategoryTotals[],
  category: string
): number => {
  const validAmounts = historicalData
    .map((month) => month[category] || 0)
    .filter((amt) => amt > 0);

  if (validAmounts.length === 0) return 0;
  return validAmounts.reduce((a, b) => a + b, 0) / validAmounts.length;
};

/**
 * Calculate standard deviation
 */
export const calculateStandardDeviation = (
  historicalData: CategoryTotals[],
  category: string
): number => {
  const amounts = historicalData.map((month) => month[category] || 0);
  const average = amounts.reduce((a, b) => a + b, 0) / amounts.length;
  const squaredDiffs = amounts.map((amt) => Math.pow(amt - average, 2));
  const avgSquaredDiff =
    squaredDiffs.reduce((a, b) => a + b, 0) / squaredDiffs.length;
  return Math.sqrt(avgSquaredDiff);
};

/**
 * Detect spending trend
 */
export const detectSpendingTrend = (
  historicalData: CategoryTotals[],
  category: string
): "increasing" | "decreasing" | "stable" => {
  if (historicalData.length < 2) return "stable";

  const amounts = historicalData.map((month) => month[category] || 0);
  const recentAvg =
    amounts.slice(-2).reduce((a, b) => a + b, 0) / Math.min(2, amounts.length);
  const olderAvg =
    amounts.slice(0, -2).reduce((a, b) => a + b, 0) / Math.max(1, amounts.length - 2);

  const percentageChange = ((recentAvg - olderAvg) / (olderAvg || 1)) * 100;

  if (percentageChange > 15) return "increasing";
  if (percentageChange < -15) return "decreasing";
  return "stable";
};

/**
 * Detect anomaly using Z-score
 */
export const isAnomalyDetected = (
  historicalData: CategoryTotals[],
  category: string,
  currentAmount: number
): boolean => {
  const average = calculateCategoryAverage(historicalData, category);
  const stdDev = calculateStandardDeviation(historicalData, category);

  if (stdDev === 0) return false;
  const zScore = Math.abs((currentAmount - average) / stdDev);
  return zScore > 2;
};

/**
 * Calculate optimal budget
 */
export const calculateOptimalBudget = (
  historicalData: CategoryTotals[],
  category: string,
  currentLimit: number
): number | null => {
  const average = calculateCategoryAverage(historicalData, category);
  const stdDev = calculateStandardDeviation(historicalData, category);

  if (average === 0) return null;

  const optimalBudget = average + stdDev * 0.5; // More conservative
  if (Math.abs(optimalBudget - currentLimit) / currentLimit < 0.08) {
    return null;
  }

  return Math.round(optimalBudget * 100) / 100;
};

/**
 * Main recommendation engine - Enhanced with realistic, daily-aware insights
 */
export const generateAIRecommendations = (
  budgetData: {
    category: string;
    limit: number;
    used: number;
    percentage: number;
    color: string;
  }[],
  historicalData: CategoryTotals[],
  currentMonthTotals: CategoryTotals,
  budgetLimits?: { category: string; limit: number }[]
): AIRecommendation[] => {
  const recommendations: AIRecommendation[] = [];
  const currentDay = getCurrentDayOfMonth();
  const daysRemaining = getDaysRemainingInMonth();
  const totalDaysInMonth = getTotalDaysInMonth();
  const dayProgress = (currentDay / totalDaysInMonth) * 100;

  // Track all budgeted categories
  const allBudgetedCategories = new Set<string>();
  if (budgetLimits) {
    budgetLimits.forEach((b) =>
      allBudgetedCategories.add(b.category.trim().toLowerCase())
    );
  }
  budgetData.forEach((b) =>
    allBudgetedCategories.add(b.category.trim().toLowerCase())
  );

  // SECTION 1: CRITICAL & OVER BUDGET ANALYSIS
  budgetData.forEach((b) => {
    if (b.used > b.limit) {
      const overspentAmount = b.used - b.limit;
      const overspentPercentage = ((overspentAmount / b.limit) * 100).toFixed(1);
      const dailyRate = calculateDailyRate(b.used, currentDay);
      const projectedEnd = projectMonthEnd(dailyRate, daysRemaining, b.used);
      const trend = detectSpendingTrend(historicalData, b.category);
      const isAnomaly = isAnomalyDetected(historicalData, b.category, b.used);

      // CRITICAL: Major overspend + anomaly + increasing trend
      if (
        b.used > b.limit * 1.5 &&
        isAnomaly &&
        trend === "increasing"
      ) {
        recommendations.push({
          category: b.category,
          type: "critical_alert",
          priority: "critical",
          message: `🚨 CRITICAL: ${b.category} is severely overbudget! Already spent RM${b.used.toFixed(2)} of RM${b.limit.toFixed(2)} (${overspentPercentage}% over).`,
          suggestedLimit: calculateOptimalBudget(historicalData, b.category, b.limit) || b.limit * 1.3,
          daysInMonth: totalDaysInMonth,
          daysRemaining,
          dailyRate,
          projectedTotal: projectedEnd,
          insight: `At your current rate of RM${dailyRate.toFixed(2)}/day, you could spend RM${projectedEnd.toFixed(2)} by month-end. This is an unusual spike combined with an upward trend.`,
          actionItems: [
            `Reduce daily spending in ${b.category} immediately`,
            `Investigate the spike - was it a one-time purchase?`,
            `Cut discretionary spending to recover by month-end`,
            `Consider reallocating from other categories if needed`,
          ],
        });
      }
      // HIGH: Over budget with trajectory warning
      else if (b.used > b.limit * 1.2 || (dailyRate * totalDaysInMonth > b.limit * 1.5)) {
        recommendations.push({
          category: b.category,
          type: "trajectory_warning",
          priority: "high",
          message: `⚠️ ${b.category}: Over budget and on track to exceed by RM${(projectedEnd - b.limit).toFixed(2)}.`,
          suggestedLimit: calculateOptimalBudget(historicalData, b.category, b.limit) || undefined,
          daysInMonth: totalDaysInMonth,
          daysRemaining,
          dailyRate,
          projectedTotal: projectedEnd,
          insight: `You've spent RM${b.used.toFixed(2)} in ${currentDay} days. At this rate (RM${dailyRate.toFixed(2)}/day), you'll hit RM${projectedEnd.toFixed(2)} by month-end.`,
          actionItems: [
            `Reduce daily spending to RM${((b.limit - b.used) / daysRemaining).toFixed(2)}/day to stay on budget`,
            `Find ways to cut ${(((projectedEnd - b.limit) / projectedEnd) * 100).toFixed(0)}% of spending to meet limit`,
          ],
        });
      }
      // MEDIUM: Moderately over budget
      else {
        recommendations.push({
          category: b.category,
          type: "budget_exceeded",
          priority: "medium",
          message: `❌ ${b.category}: Over budget by RM${overspentAmount.toFixed(2)} (${overspentPercentage}% over).`,
          suggestedLimit: calculateOptimalBudget(historicalData, b.category, b.limit) || undefined,
          daysInMonth: totalDaysInMonth,
          daysRemaining,
          dailyRate,
          projectedTotal: projectedEnd,
          insight: `With ${daysRemaining} days left, aim for RM${((b.limit - b.used) / daysRemaining).toFixed(2)}/day spending.`,
          actionItems: [
            `Monitor daily spending carefully`,
            `Prioritize essential purchases only`,
          ],
        });
      }
    }
  });

  // SECTION 2: PACE MONITORING (Under budget but need to track pace)
  budgetData.forEach((b) => {
    if (b.used <= b.limit && b.used > 0) {
      const expectedSpend = (b.limit / totalDaysInMonth) * currentDay;
      const variance = b.used - expectedSpend;
      const variancePercent = ((variance / expectedSpend) * 100).toFixed(1);
      const dailyRate = calculateDailyRate(b.used, currentDay);
      const projectedEnd = projectMonthEnd(dailyRate, daysRemaining, b.used);

      // UNDER PACE (spending slower than budget allocation)
      if (variance < 0 && Math.abs(variance) > expectedSpend * 0.2) {
        const savedPace = Math.abs(variance);
        recommendations.push({
          category: b.category,
          type: "pace_monitor",
          priority: "low",
          message: `✅ ${b.category}: On track! You're RM${savedPace.toFixed(2)} under pace (${variancePercent}%).`,
          daysInMonth: totalDaysInMonth,
          daysRemaining,
          dailyRate,
          projectedTotal: projectedEnd,
          insight: `At your current rate (RM${dailyRate.toFixed(2)}/day), you'll finish at RM${projectedEnd.toFixed(2)}, leaving RM${(b.limit - projectedEnd).toFixed(2)} unspent.`,
          actionItems: [
            `Maintain current spending pattern`,
            `Consider if you could allocate saved amount to other categories or savings`,
          ],
        });
      }
      // SLIGHTLY OVER PACE (spending slightly faster than budget allocation)
      else if (variance > 0 && variance <= expectedSpend * 0.3) {
        recommendations.push({
          category: b.category,
          type: "pace_monitor",
          priority: "medium",
          message: `⏱️ ${b.category}: Slightly above pace. You're RM${variance.toFixed(2)} ahead of budget allocation.`,
          daysInMonth: totalDaysInMonth,
          daysRemaining,
          dailyRate,
          projectedTotal: projectedEnd,
          insight: `Budget pace suggests RM${expectedSpend.toFixed(2)} by now, but you've spent RM${b.used.toFixed(2)}. Projected end: RM${projectedEnd.toFixed(2)}.`,
          actionItems: [
            `Slight course correction needed`,
            `Reduce daily spending by RM${((projectedEnd - b.limit) / daysRemaining).toFixed(2)} to stay on budget`,
          ],
        });
      }
      // SAFE ZONE
      else if (projectedEnd <= b.limit * 0.95) {
        recommendations.push({
          category: b.category,
          type: "safe_zone",
          priority: "low",
          message: `🎯 ${b.category}: Safe zone! Spending under control.`,
          daysInMonth: totalDaysInMonth,
          daysRemaining,
          dailyRate,
          projectedTotal: projectedEnd,
          insight: `Current rate suggests RM${projectedEnd.toFixed(2)} by month-end with RM${(b.limit - projectedEnd).toFixed(2)} buffer.`,
        });
      }
    }
  });

  // SECTION 3: OPTIMIZATION FOR LOW SPENDERS
  budgetData.forEach((b) => {
    if (b.used > 0 && b.used < b.limit * 0.3) {
      const average = calculateCategoryAverage(historicalData, b.category);
      const dailyRate = calculateDailyRate(b.used, currentDay);
      const projectedEnd = projectMonthEnd(dailyRate, daysRemaining, b.used);

      if (average > 0 && b.limit > average * 1.5) {
        recommendations.push({
          category: b.category,
          type: "optimization",
          priority: "low",
          message: `💡 ${b.category}: Great savings! Only RM${b.used.toFixed(2)} spent (${b.percentage.toFixed(0)}% of budget).`,
          suggestedLimit: Math.round(average * 1.3 * 100) / 100,
          daysInMonth: totalDaysInMonth,
          daysRemaining,
          dailyRate,
          projectedTotal: projectedEnd,
          insight: `Historical average: RM${average.toFixed(2)}/month. Your budget of RM${b.limit.toFixed(2)} is generous. Consider reducing to RM${(Math.round(average * 1.3 * 100) / 100).toFixed(2)}.`,
          actionItems: [
            `Reallocate RM${(b.limit - Math.round(average * 1.3 * 100) / 100).toFixed(2)} to savings or other categories`,
            `Maintain current spending habits`,
          ],
        });
      }
    }
  });

  // SECTION 4: UNBUDGETED SPENDING (IMPORTANT FOR AWARENESS)
  Object.entries(currentMonthTotals).forEach(([category, amount]) => {
    const normalizedCat = category.trim().toLowerCase();
    if (!allBudgetedCategories.has(normalizedCat) && amount > 100) {
      // Only alert if significant unbudgeted spending
      const average = calculateCategoryAverage(historicalData, category);
      const suggestedLimit = Math.round(average * 1.3 * 100) / 100 || amount * 1.15;
      const dailyRate = calculateDailyRate(amount, currentDay);
      const projectedEnd = projectMonthEnd(dailyRate, daysRemaining, amount);

      recommendations.push({
        category,
        type: "unbudgeted",
        priority: "medium",
        message: `📊 ${category}: No budget set, but RM${amount.toFixed(2)} spent (${((amount / suggestedLimit) * 100).toFixed(0)}% of suggested).`,
        suggestedLimit,
        daysInMonth: totalDaysInMonth,
        daysRemaining,
        dailyRate,
        projectedTotal: projectedEnd,
        insight: `You're spending RM${dailyRate.toFixed(2)}/day here. Set a budget of RM${suggestedLimit.toFixed(2)} to track this category.`,
        actionItems: [
          `Create a budget for ${category} at RM${suggestedLimit.toFixed(2)}/month`,
          `Monitor daily spending patterns`,
        ],
      });
    }
  });

  // SECTION 5: RECOVERY RECOMMENDATIONS
  budgetData.forEach((b) => {
    if (b.used > b.limit && daysRemaining < 10) {
      const daysLeftInMonth = daysRemaining;
      const overspent = b.used - b.limit;

      if (daysLeftInMonth > 0 && daysLeftInMonth <= 10) {
        recommendations.push({
          category: b.category,
          type: "recovery",
          priority: "high",
          message: `🔧 ${b.category}: ${daysLeftInMonth} days left - Recovery mode engaged!`,
          daysInMonth: totalDaysInMonth,
          daysRemaining: daysLeftInMonth,
          insight: `You're RM${overspent.toFixed(2)} over. Avoid unnecessary purchases in ${b.category} for the rest of the month.`,
          actionItems: [
            `${daysLeftInMonth === 1 ? "This is your last day!" : `Only ${daysLeftInMonth} days left`}`,
            `Zero spending in this category recommended`,
            `Plan next month's budget to avoid repeat`,
          ],
        });
      }
    }
  });

  // SECTION 6: OVERALL SPENDING HEALTH
  const totalSpending = Object.values(currentMonthTotals).reduce((a, b) => a + b, 0);
  const totalBudget = budgetData.reduce((a, b) => a + b.limit, 0);

  if (totalBudget > 0) {
    const budgetedSpending = budgetData.reduce((a, b) => a + b.used, 0);
    const expectedTotalSpend = (totalBudget / totalDaysInMonth) * currentDay;
    const actualSpendingPace = ((budgetedSpending - expectedTotalSpend) / expectedTotalSpend) * 100;

    if (actualSpendingPace > 25) {
      recommendations.push({
        category: "Overall",
        type: "trajectory_warning",
        priority: "high",
        message: `⚠️ Overall Budget: You're ${actualSpendingPace.toFixed(0)}% ahead of pace. Projected overspend: RM${((totalSpending / currentDay) * totalDaysInMonth - totalBudget).toFixed(2)}.`,
        daysInMonth: totalDaysInMonth,
        daysRemaining,
        dailyRate: totalSpending / currentDay,
        projectedTotal: (totalSpending / currentDay) * totalDaysInMonth,
        insight: `You've spent ${dayProgress.toFixed(0)}% of the month (${currentDay}/${totalDaysInMonth} days) but used ${(((budgetedSpending / totalBudget) * 100)).toFixed(0)}% of budget.`,
        actionItems: [
          `Tighten spending across all categories`,
          `Review discretionary purchases`,
          `Prioritize essential expenses only`,
        ],
      });
    }
  }

  // Sort by priority and type importance
  const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
  const typeImportance = {
    critical_alert: 0,
    trajectory_warning: 1,
    budget_exceeded: 2,
    recovery: 3,
    pace_monitor: 4,
    unbudgeted: 5,
    optimization: 6,
    safe_zone: 7,
    on_track: 8,
  };

  return recommendations.sort((a, b) => {
    const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
    if (priorityDiff !== 0) return priorityDiff;
    return typeImportance[a.type] - typeImportance[b.type];
  });
};

/**
 * Format recommendation for display
 */
export const formatRecommendation = (rec: AIRecommendation): string => {
  let output = rec.message;
  if (rec.projectedTotal) {
    output += `\n📈 Projected end-of-month: RM${rec.projectedTotal.toFixed(2)}`;
  }
  if (rec.insight) {
    output += `\n💭 ${rec.insight}`;
  }
  if (rec.actionItems && rec.actionItems.length > 0) {
    output += `\n📋 Actions:\n${rec.actionItems.map((a) => `  • ${a}`).join("\n")}`;
  }
  return output;
};