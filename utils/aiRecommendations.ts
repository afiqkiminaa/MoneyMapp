import { isSameMonth } from 'date-fns';

type CategoryTotals = Record<string, number>;
type BudgetLimit = { category: string; limit: number };

interface MonthContext {
  selectedDate: Date;
  isCurrentMonth: boolean;
  currentDayOfMonth: number;
  totalDaysInMonth: number;
  daysRemaining: number;
  dayProgress: number;
}

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
  confidence?: number;
  dataQuality?: "excellent" | "good" | "fair" | "poor";
  minDaysRequired?: number;
}

// ============ HELPER: Create Month Context ============
export const createMonthContext = (selectedDate: Date): MonthContext => {
  const now = new Date();
  const isCurrentMonth = isSameMonth(selectedDate, now);
  
  let currentDayOfMonth: number;
  let totalDaysInMonth: number;
  let daysRemaining: number;

  if (isCurrentMonth) {
    currentDayOfMonth = now.getDate();
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    totalDaysInMonth = lastDay.getDate();
    daysRemaining = totalDaysInMonth - currentDayOfMonth;
  } else {
    currentDayOfMonth = 0;
    totalDaysInMonth = new Date(
      selectedDate.getFullYear(),
      selectedDate.getMonth() + 1,
      0
    ).getDate();
    daysRemaining = 0;
  }

  return {
    selectedDate,
    isCurrentMonth,
    currentDayOfMonth,
    totalDaysInMonth,
    daysRemaining,
    dayProgress: isCurrentMonth
      ? (currentDayOfMonth / totalDaysInMonth) * 100
      : 0,
  };
};

// ============ HELPER: Confidence Score ============
const getConfidenceScore = (currentDay: number, totalDays: number): number => {
  const dayPercentage = (currentDay / totalDays) * 100;
  
  if (dayPercentage >= 75) return 0.95;
  if (dayPercentage >= 50) return 0.85;
  if (dayPercentage >= 25) return 0.70;
  if (dayPercentage >= 10) return 0.55;
  return 0.40;
};

// ============ HELPER: Data Quality ============
const getDataQuality = (currentDay: number, totalDays: number): AIRecommendation["dataQuality"] => {
  const dayPercentage = (currentDay / totalDays) * 100;
  
  if (dayPercentage >= 75) return "excellent";
  if (dayPercentage >= 50) return "good";
  if (dayPercentage >= 25) return "fair";
  return "poor";
};

// ============ HELPER: Conservative Projection ============
const projectMonthEndConservative = (
  spent: number,
  currentDay: number,
  totalDays: number,
  historicalData: CategoryTotals[],
  category: string
): { projection: number; method: string } => {
  if (currentDay === 0) {
    return { projection: spent, method: "historical" };
  }

  const dailyRate = spent / currentDay;
  const linearProjection = spent + dailyRate * (totalDays - currentDay);
  const historicalAvg = calculateCategoryAverage(historicalData, category);
  
  let conservativeProjection: number;
  
  if (historicalAvg > 0 && currentDay >= 5) {
    const weight = Math.min(currentDay / 15, 0.7);
    conservativeProjection = 
      historicalAvg * (1 - weight) + linearProjection * weight;
  } else {
    conservativeProjection = linearProjection;
  }

  const finalProjection = Math.max(conservativeProjection, spent);
  
  return { 
    projection: Math.round(finalProjection * 100) / 100,
    method: "conservative_blend"
  };
};

// ============ CORE: Calculate Average ============
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

// ============ CORE: Calculate Standard Deviation ============
export const calculateStandardDeviation = (
  historicalData: CategoryTotals[],
  category: string
): number => {
  const amounts = historicalData.map((month) => month[category] || 0);
  if (amounts.length === 0) return 0;
  
  const average = amounts.reduce((a, b) => a + b, 0) / amounts.length;
  const squaredDiffs = amounts.map((amt) => Math.pow(amt - average, 2));
  const avgSquaredDiff =
    squaredDiffs.reduce((a, b) => a + b, 0) / squaredDiffs.length;
  return Math.sqrt(avgSquaredDiff);
};

// ============ CORE: Detect Trend ============
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

  if (olderAvg === 0) return "stable";
  
  const percentageChange = ((recentAvg - olderAvg) / olderAvg) * 100;

  if (percentageChange > 15) return "increasing";
  if (percentageChange < -15) return "decreasing";
  return "stable";
};

// ============ CORE: Detect Anomaly ============
export const isAnomalyDetected = (
  historicalData: CategoryTotals[],
  category: string,
  currentAmount: number
): boolean => {
  const average = calculateCategoryAverage(historicalData, category);
  const stdDev = calculateStandardDeviation(historicalData, category);

  if (stdDev === 0 || average === 0) return false;
  const zScore = Math.abs((currentAmount - average) / stdDev);
  return zScore > 2;
};

// ============ CORE: Calculate Optimal Budget ============
export const calculateOptimalBudget = (
  historicalData: CategoryTotals[],
  category: string,
  currentLimit: number
): number | null => {
  const average = calculateCategoryAverage(historicalData, category);
  const stdDev = calculateStandardDeviation(historicalData, category);

  if (average === 0) return null;

  const optimalBudget = average + stdDev * 0.5;
  if (Math.abs(optimalBudget - currentLimit) / currentLimit < 0.08) {
    return null;
  }

  return Math.round(optimalBudget * 100) / 100;
};

// ============ MAIN: Generate Recommendations ============
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
  budgetLimits?: { category: string; limit: number }[],
  selectedDate?: Date
): AIRecommendation[] => {
  if (!selectedDate) selectedDate = new Date();
  if (!budgetData || budgetData.length === 0) return [];
  if (!currentMonthTotals || Object.keys(currentMonthTotals).length === 0) return [];

  const monthCtx = createMonthContext(selectedDate);
  
  // FIX #3: Skip daily-based recommendations for past months
  if (!monthCtx.isCurrentMonth) {
    return [];
  }

  if (monthCtx.currentDayOfMonth < 1 || monthCtx.currentDayOfMonth > 31) {
    return [];
  }

  const recommendations: AIRecommendation[] = [];
  const processedCategories = new Set<string>();

  const allBudgetedCategories = new Set<string>();
  if (budgetLimits) {
    budgetLimits.forEach((b) =>
      allBudgetedCategories.add(b.category.trim().toLowerCase())
    );
  }
  budgetData.forEach((b) =>
    allBudgetedCategories.add(b.category.trim().toLowerCase())
  );

  // ============ SECTION 1: CRITICAL & OVER BUDGET ============
  budgetData.forEach((b) => {
    const catKey = b.category.trim().toLowerCase();
    if (processedCategories.has(catKey)) return;

    if (b.used > b.limit) {
      const overspentAmount = b.used - b.limit;
      const overspentPercentage = ((overspentAmount / b.limit) * 100).toFixed(1);
      const dailyRate = b.used / monthCtx.currentDayOfMonth;
      const projection = projectMonthEndConservative(
        b.used,
        monthCtx.currentDayOfMonth,
        monthCtx.totalDaysInMonth,
        historicalData,
        b.category
      );
      const projectedEnd = projection.projection;
      const trend = detectSpendingTrend(historicalData, b.category);
      const isAnomaly = isAnomalyDetected(historicalData, b.category, b.used);
      const confidence = getConfidenceScore(monthCtx.currentDayOfMonth, monthCtx.totalDaysInMonth);
      const dataQuality = getDataQuality(monthCtx.currentDayOfMonth, monthCtx.totalDaysInMonth);

      if (b.used > b.limit * 1.5 && isAnomaly && trend === "increasing") {
        recommendations.push({
          category: b.category,
          type: "critical_alert",
          priority: "critical",
          message: `🚨 CRITICAL: ${b.category} is severely overbudget! Already spent RM${b.used.toFixed(2)} of RM${b.limit.toFixed(2)} (${overspentPercentage}% over).`,
          suggestedLimit:
            calculateOptimalBudget(historicalData, b.category, b.limit) ||
            b.limit * 1.3,
          daysInMonth: monthCtx.totalDaysInMonth,
          daysRemaining: monthCtx.daysRemaining,
          dailyRate,
          projectedTotal: projectedEnd,
          confidence,
          dataQuality,
          minDaysRequired: 15,
          insight: `At your current rate of RM${dailyRate.toFixed(2)}/day, you could spend RM${projectedEnd.toFixed(2)} by month-end. This is an unusual spike combined with an upward trend.`,
          actionItems: [
            `Reduce daily spending in ${b.category} immediately`,
            `Investigate the spike - was it a one-time purchase?`,
            `Cut discretionary spending to recover by month-end`,
            `Consider reallocating from other categories if needed`,
          ],
        });
        processedCategories.add(catKey);
      } else if (
        b.used > b.limit * 1.2 ||
        projectedEnd > b.limit * 1.5
      ) {
        recommendations.push({
          category: b.category,
          type: "trajectory_warning",
          priority: "high",
          message: `⚠️ ${b.category}: Over budget and on track to exceed by RM${(projectedEnd - b.limit).toFixed(2)}.`,
          suggestedLimit:
            calculateOptimalBudget(historicalData, b.category, b.limit) ||
            undefined,
          daysInMonth: monthCtx.totalDaysInMonth,
          daysRemaining: monthCtx.daysRemaining,
          dailyRate,
          projectedTotal: projectedEnd,
          confidence,
          dataQuality,
          minDaysRequired: 10,
          insight: `You've spent RM${b.used.toFixed(2)} in ${monthCtx.currentDayOfMonth} days. At this rate (RM${dailyRate.toFixed(2)}/day), you'll hit RM${projectedEnd.toFixed(2)} by month-end.`,
          actionItems: [
            `Reduce daily spending to RM${((b.limit - b.used) / monthCtx.daysRemaining).toFixed(2)}/day to stay on budget`,
            `Find ways to cut ${(((projectedEnd - b.limit) / projectedEnd) * 100).toFixed(0)}% of spending to meet limit`,
          ],
        });
        processedCategories.add(catKey);
      } else if (!processedCategories.has(catKey)) {
        recommendations.push({
          category: b.category,
          type: "budget_exceeded",
          priority: "medium",
          message: `❌ ${b.category}: Over budget by RM${overspentAmount.toFixed(2)} (${overspentPercentage}% over).`,
          suggestedLimit:
            calculateOptimalBudget(historicalData, b.category, b.limit) ||
            undefined,
          daysInMonth: monthCtx.totalDaysInMonth,
          daysRemaining: monthCtx.daysRemaining,
          dailyRate,
          projectedTotal: projectedEnd,
          confidence,
          dataQuality,
          insight: `With ${monthCtx.daysRemaining} days left, aim for RM${((b.limit - b.used) / monthCtx.daysRemaining).toFixed(2)}/day spending.`,
          actionItems: [
            `Monitor daily spending carefully`,
            `Prioritize essential purchases only`,
          ],
        });
        processedCategories.add(catKey);
      }
    }
  });

  // ============ SECTION 2: PACE MONITORING ============
  budgetData.forEach((b) => {
    const catKey = b.category.trim().toLowerCase();
    if (processedCategories.has(catKey)) return;

    if (b.used > 0 && b.used <= b.limit) {
      const expectedSpend =
        (b.limit / monthCtx.totalDaysInMonth) * monthCtx.currentDayOfMonth;
      const variance = b.used - expectedSpend;
      const dailyRate = b.used / monthCtx.currentDayOfMonth;
      const projection = projectMonthEndConservative(
        b.used,
        monthCtx.currentDayOfMonth,
        monthCtx.totalDaysInMonth,
        historicalData,
        b.category
      );
      const projectedEnd = projection.projection;
      const confidence = getConfidenceScore(
        monthCtx.currentDayOfMonth,
        monthCtx.totalDaysInMonth
      );
      const dataQuality = getDataQuality(
        monthCtx.currentDayOfMonth,
        monthCtx.totalDaysInMonth
      );

      if (variance < 0 && Math.abs(variance) > expectedSpend * 0.2) {
        const savedPace = Math.abs(variance);
        const variancePercent = ((variance / expectedSpend) * 100).toFixed(1);

        recommendations.push({
          category: b.category,
          type: "pace_monitor",
          priority: "low",
          message: `✅ ${b.category}: On track! You're RM${savedPace.toFixed(2)} under pace (${variancePercent}%).`,
          daysInMonth: monthCtx.totalDaysInMonth,
          daysRemaining: monthCtx.daysRemaining,
          dailyRate,
          projectedTotal: projectedEnd,
          confidence,
          dataQuality,
          insight: `At your current rate (RM${dailyRate.toFixed(2)}/day), you'll finish at RM${projectedEnd.toFixed(2)}, leaving RM${(b.limit - projectedEnd).toFixed(2)} unspent.`,
          actionItems: [
            `Maintain current spending pattern`,
            `Consider if you could allocate saved amount to other categories or savings`,
          ],
        });
        processedCategories.add(catKey);
      } else if (variance > 0 && variance <= expectedSpend * 0.3) {
        const variancePercent = ((variance / expectedSpend) * 100).toFixed(1);

        recommendations.push({
          category: b.category,
          type: "pace_monitor",
          priority: "medium",
          message: `⏱️ ${b.category}: Slightly above pace. You're RM${variance.toFixed(2)} ahead (${variancePercent}%).`,
          daysInMonth: monthCtx.totalDaysInMonth,
          daysRemaining: monthCtx.daysRemaining,
          dailyRate,
          projectedTotal: projectedEnd,
          confidence,
          dataQuality,
          insight: `Budget pace suggests RM${expectedSpend.toFixed(2)} by now, but you've spent RM${b.used.toFixed(2)}. Projected end: RM${projectedEnd.toFixed(2)}.`,
          actionItems: [
            `Slight course correction needed`,
            `Reduce daily spending by RM${((projectedEnd - b.limit) / monthCtx.daysRemaining).toFixed(2)} to stay on budget`,
          ],
        });
        processedCategories.add(catKey);
      } else if (projectedEnd <= b.limit * 0.95 && !processedCategories.has(catKey)) {
        recommendations.push({
          category: b.category,
          type: "safe_zone",
          priority: "low",
          message: `🎯 ${b.category}: Safe zone! Spending under control.`,
          daysInMonth: monthCtx.totalDaysInMonth,
          daysRemaining: monthCtx.daysRemaining,
          dailyRate,
          projectedTotal: projectedEnd,
          confidence,
          dataQuality,
          insight: `Current rate suggests RM${projectedEnd.toFixed(2)} by month-end with RM${(b.limit - projectedEnd).toFixed(2)} buffer.`,
        });
        processedCategories.add(catKey);
      }
    }
  });

  // ============ SECTION 3: OPTIMIZATION ============
  budgetData.forEach((b) => {
    const catKey = b.category.trim().toLowerCase();
    if (processedCategories.has(catKey)) return;

    if (b.used > 0 && b.used < b.limit * 0.3) {
      const average = calculateCategoryAverage(historicalData, b.category);
      const dailyRate = b.used / monthCtx.currentDayOfMonth;
      const projection = projectMonthEndConservative(
        b.used,
        monthCtx.currentDayOfMonth,
        monthCtx.totalDaysInMonth,
        historicalData,
        b.category
      );
      const projectedEnd = projection.projection;
      const confidence = getConfidenceScore(
        monthCtx.currentDayOfMonth,
        monthCtx.totalDaysInMonth
      );
      const dataQuality = getDataQuality(
        monthCtx.currentDayOfMonth,
        monthCtx.totalDaysInMonth
      );

      if (average > 0 && b.limit > average * 1.5) {
        const suggestedLimit = Math.round(average * 1.3 * 100) / 100;

        recommendations.push({
          category: b.category,
          type: "optimization",
          priority: "low",
          message: `💡 ${b.category}: Great savings! Only RM${b.used.toFixed(2)} spent (${b.percentage.toFixed(0)}% of budget).`,
          suggestedLimit,
          daysInMonth: monthCtx.totalDaysInMonth,
          daysRemaining: monthCtx.daysRemaining,
          dailyRate,
          projectedTotal: projectedEnd,
          confidence,
          dataQuality,
          insight: `Historical average: RM${average.toFixed(2)}/month. Your budget of RM${b.limit.toFixed(2)} is generous. Consider reducing to RM${suggestedLimit.toFixed(2)}.`,
          actionItems: [
            `Reallocate RM${(b.limit - suggestedLimit).toFixed(2)} to savings or other categories`,
            `Maintain current spending habits`,
          ],
        });
        processedCategories.add(catKey);
      }
    }
  });

  // ============ SECTION 4: UNBUDGETED SPENDING ============
  Object.entries(currentMonthTotals).forEach(([category, amount]) => {
    const normalizedCat = category.trim().toLowerCase();
    if (processedCategories.has(normalizedCat)) return;

    if (!allBudgetedCategories.has(normalizedCat) && amount > 100) {
      const average = calculateCategoryAverage(historicalData, category);
      const suggestedLimit = Math.round(average * 1.3 * 100) / 100 || amount * 1.15;
      const dailyRate = amount / monthCtx.currentDayOfMonth;
      const projection = projectMonthEndConservative(
        amount,
        monthCtx.currentDayOfMonth,
        monthCtx.totalDaysInMonth,
        historicalData,
        category
      );
      const projectedEnd = projection.projection;
      const confidence = getConfidenceScore(
        monthCtx.currentDayOfMonth,
        monthCtx.totalDaysInMonth
      );
      const dataQuality = getDataQuality(
        monthCtx.currentDayOfMonth,
        monthCtx.totalDaysInMonth
      );

      recommendations.push({
        category,
        type: "unbudgeted",
        priority: "medium",
        message: `📊 ${category}: No budget set, but RM${amount.toFixed(2)} spent (${((amount / suggestedLimit) * 100).toFixed(0)}% of suggested).`,
        suggestedLimit,
        daysInMonth: monthCtx.totalDaysInMonth,
        daysRemaining: monthCtx.daysRemaining,
        dailyRate,
        projectedTotal: projectedEnd,
        confidence,
        dataQuality,
        insight: `You're spending RM${dailyRate.toFixed(2)}/day here. Set a budget of RM${suggestedLimit.toFixed(2)} to track this category.`,
        actionItems: [
          `Create a budget for ${category} at RM${suggestedLimit.toFixed(2)}/month`,
          `Monitor daily spending patterns`,
        ],
      });
      processedCategories.add(normalizedCat);
    }
  });

  // ============ SECTION 5: RECOVERY MODE ============
  budgetData.forEach((b) => {
    const catKey = b.category.trim().toLowerCase();
    if (processedCategories.has(catKey)) return;

    if (b.used > b.limit && monthCtx.daysRemaining < 10) {
      const overspent = b.used - b.limit;
      const confidence = getConfidenceScore(
        monthCtx.currentDayOfMonth,
        monthCtx.totalDaysInMonth
      );
      const dataQuality = getDataQuality(
        monthCtx.currentDayOfMonth,
        monthCtx.totalDaysInMonth
      );

      recommendations.push({
        category: b.category,
        type: "recovery",
        priority: "high",
        message: `🔧 ${b.category}: ${monthCtx.daysRemaining} days left - Recovery mode engaged!`,
        daysInMonth: monthCtx.totalDaysInMonth,
        daysRemaining: monthCtx.daysRemaining,
        confidence,
        dataQuality,
        insight: `You're RM${overspent.toFixed(2)} over. Avoid unnecessary purchases in ${b.category} for the rest of the month.`,
        actionItems: [
          `${monthCtx.daysRemaining === 1 ? "This is your last day!" : `Only ${monthCtx.daysRemaining} days left`}`,
          `Zero spending in this category recommended`,
          `Plan next month's budget to avoid repeat`,
        ],
      });
      processedCategories.add(catKey);
    }
  });

  // ============ SECTION 6: OVERALL BUDGET ============
  const totalSpending = Object.values(currentMonthTotals).reduce((a, b) => a + b, 0);
  const totalBudget = budgetData.reduce((a, b) => a + b.limit, 0);

  if (totalBudget > 0 && totalSpending > 0) {
    const budgetedSpending = budgetData.reduce((a, b) => a + b.used, 0);
    // FIX #1: Use ACTUAL spending pace, not budget sum
    const expectedSpendingPace =
      (budgetedSpending / monthCtx.currentDayOfMonth) * monthCtx.totalDaysInMonth;
    const actualSpendingVariance =
      ((expectedSpendingPace - totalBudget) / totalBudget) * 100;
    const confidence = getConfidenceScore(
      monthCtx.currentDayOfMonth,
      monthCtx.totalDaysInMonth
    );
    const dataQuality = getDataQuality(
      monthCtx.currentDayOfMonth,
      monthCtx.totalDaysInMonth
    );

    if (actualSpendingVariance > 20) {
      recommendations.push({
        category: "Overall",
        type: "trajectory_warning",
        priority: "high",
        message: `⚠️ Overall Budget: You're on track to overspend by approximately RM${(expectedSpendingPace - totalBudget).toFixed(2)}.`,
        daysInMonth: monthCtx.totalDaysInMonth,
        daysRemaining: monthCtx.daysRemaining,
        dailyRate: budgetedSpending / monthCtx.currentDayOfMonth,
        projectedTotal: expectedSpendingPace,
        confidence,
        dataQuality,
        insight: `You've spent ${monthCtx.dayProgress.toFixed(0)}% of the month (${monthCtx.currentDayOfMonth}/${monthCtx.totalDaysInMonth} days) but used ${(((budgetedSpending / totalBudget) * 100)).toFixed(0)}% of total budget.`,
        actionItems: [
          `Tighten spending across all categories`,
          `Review discretionary purchases`,
          `Prioritize essential expenses only`,
        ],
      });
    }
  }

  // ============ SORT & RETURN ============
  const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
  const typeImportance = {
    critical_alert: 0,
    trajectory_warning: 1,
    budget_exceeded: 2,
    recovery: 3,
    unbudgeted: 4,
    pace_monitor: 5,
    optimization: 6,
    safe_zone: 7,
    on_track: 8,
  };

  const sorted = recommendations.sort((a, b) => {
    const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
    if (priorityDiff !== 0) return priorityDiff;
    return typeImportance[a.type] - typeImportance[b.type];
  });

  return sorted;
};

export const formatRecommendation = (rec: AIRecommendation): string => {
  let output = rec.message;
  
  if (rec.confidence !== undefined) {
    const confidencePercent = Math.round(rec.confidence * 100);
    output += `\n🟢 Confidence: ${confidencePercent}% (${rec.dataQuality})`;
  }
  
  if (rec.projectedTotal !== undefined) {
    output += `\n📈 Projected: RM${rec.projectedTotal.toFixed(2)}`;
  }
  
  if (rec.insight) {
    output += `\n💭 ${rec.insight}`;
  }
  
  if (rec.actionItems && rec.actionItems.length > 0) {
    output += `\n📋 Actions:\n${rec.actionItems.map((a) => `  • ${a}`).join("\n")}`;
  }
  
  return output;
};