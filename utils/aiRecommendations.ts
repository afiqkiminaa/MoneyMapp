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
    | "bill_alert"
    | "smart_savings"         // NEW: Suggests moving surplus to savings
    | "positive_reinforcement" // NEW: Praise for good habits
    | "pace_monitor"
    | "safe_zone"
    | "optimization"
    | "unbudgeted"
    | "recovery"
    | "on_track";
  message: string;
  priority: "critical" | "high" | "medium" | "low";
  suggestedLimit?: number; // Used for budget resizing
  potentialSavings?: number; // NEW: Specific amount available to save
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

// ... [Keep existing FIXED_COST_KEYWORDS and isFixedCostCategory helper] ...
const FIXED_COST_KEYWORDS = [
  "rent", "mortgage", "loan", "insurance", "tax", "bill", 
  "utilities", "wifi", "internet", "subscription", "netflix", 
  "spotify", "gym", "tuition", "school"
];

const isFixedCostCategory = (category: string): boolean => {
  const lower = category.toLowerCase();
  return FIXED_COST_KEYWORDS.some(k => lower.includes(k));
};

// ... [Keep createMonthContext helper] ...
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
    currentDayOfMonth = new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 0).getDate();
    totalDaysInMonth = currentDayOfMonth;
    daysRemaining = 0;
  }

  return { selectedDate, isCurrentMonth, currentDayOfMonth, totalDaysInMonth, daysRemaining, dayProgress: (currentDayOfMonth / totalDaysInMonth) * 100 };
};

// ... [Keep getConfidenceScore helper] ...
const getConfidenceScore = (currentDay: number, totalDays: number): number => {
  const dayPercentage = (currentDay / totalDays) * 100;
  if (dayPercentage >= 85) return 0.98;
  if (dayPercentage >= 50) return 0.85;
  if (dayPercentage >= 20) return 0.60;
  return 0.40;
};

// ... [Keep calculateCategoryAverage helper] ...
export const calculateCategoryAverage = (historicalData: CategoryTotals[], category: string): number => {
  const validAmounts = historicalData.map((month) => month[category] || 0).filter((amt) => amt > 0);
  if (validAmounts.length === 0) return 0;
  return validAmounts.reduce((a, b) => a + b, 0) / validAmounts.length;
};

// ... [Keep projectMonthEndSmart helper from previous step] ...
const projectMonthEndSmart = (spent: number, currentDay: number, totalDays: number, historicalData: CategoryTotals[], category: string): number => {
  const isFixed = isFixedCostCategory(category);
  const historicalAvg = calculateCategoryAverage(historicalData, category);

  if (isFixed) {
    if (spent >= historicalAvg * 0.9) return spent;
    return Math.max(spent, historicalAvg);
  }

  if (currentDay === 0) return spent;
  const dailyRate = spent / currentDay;
  const linearProjection = spent + (dailyRate * (totalDays - currentDay));
  
  if (currentDay <= 7) {
    if (historicalAvg > 0) {
       const linearWeight = currentDay / 10;
       const blended = (historicalAvg * (1 - linearWeight)) + (linearProjection * linearWeight);
       return Math.max(spent, blended);
    }
  }
  return Math.round(linearProjection * 100) / 100;
};

// ============ MAIN: Generate Recommendations ============
export const generateAIRecommendations = (
  budgetData: { category: string; limit: number; used: number; percentage: number; color: string }[],
  historicalData: CategoryTotals[],
  currentMonthTotals: CategoryTotals,
  budgetLimits?: { category: string; limit: number }[],
  selectedDate?: Date
): AIRecommendation[] => {
  if (!selectedDate) selectedDate = new Date();
  if (!budgetData || budgetData.length === 0) return [];

  const monthCtx = createMonthContext(selectedDate);
  
  if (!monthCtx.isCurrentMonth || monthCtx.currentDayOfMonth < 2) return [];

  const recommendations: AIRecommendation[] = [];
  const processedCategories = new Set<string>();

  const allBudgetedCategories = new Set<string>();
  if (budgetLimits) budgetLimits.forEach((b) => allBudgetedCategories.add(b.category.trim().toLowerCase()));
  budgetData.forEach((b) => allBudgetedCategories.add(b.category.trim().toLowerCase()));

  budgetData.forEach((b) => {
    const catKey = b.category.trim().toLowerCase();
    const isFixed = isFixedCostCategory(b.category);
    const historicalAvg = calculateCategoryAverage(historicalData, b.category);
    
    const projectedEnd = projectMonthEndSmart(b.used, monthCtx.currentDayOfMonth, monthCtx.totalDaysInMonth, historicalData, b.category);
    const dailyRate = b.used / monthCtx.currentDayOfMonth;
    const confidence = getConfidenceScore(monthCtx.currentDayOfMonth, monthCtx.totalDaysInMonth);
    const overspentAmount = b.used - b.limit;

    // 1. OVER BUDGET LOGIC (Negative)
    if (b.used > b.limit) {
      if (isFixed) {
        recommendations.push({
            category: b.category, type: "critical_alert", priority: "critical",
            message: `🚨 ${b.category} limit exceeded by RM${overspentAmount.toFixed(2)}.`,
            insight: "Fixed bill exceeded budget. Update your limit next month.",
            actionItems: ["Adjust budget limit"], confidence: 1.0
        });
      } else {
        recommendations.push({
            category: b.category, type: "recovery", priority: "critical",
            message: `⚠️ Stop Spending: ${b.category} is over by RM${overspentAmount.toFixed(2)}.`,
            insight: `Projected overrun: RM${(projectedEnd - b.limit).toFixed(2)}.`,
            actionItems: ["Freeze spending"], dailyRate, projectedTotal: projectedEnd, confidence
        });
      }
      processedCategories.add(catKey);
      return; 
    }

    // 2. WARNING LOGIC (Negative/Neutral)
    if (!isFixed && b.used > 0 && projectedEnd > b.limit * 1.15 && (projectedEnd - b.limit) > 50) {
        recommendations.push({
            category: b.category, type: "trajectory_warning", priority: "high",
            message: `📈 Slow Down: ${b.category} trending to hit RM${projectedEnd.toFixed(2)}.`,
            insight: `Spending RM${dailyRate.toFixed(2)}/day. Safe limit is RM${((b.limit - b.used)/monthCtx.daysRemaining).toFixed(2)}/day.`,
            suggestedLimit: projectedEnd,
            dailyRate, projectedTotal: projectedEnd, daysRemaining: monthCtx.daysRemaining, confidence
        });
        processedCategories.add(catKey);
        return;
    }

    // 3. POSITIVE & OPPORTUNITY LOGIC (New!)
    
    // A. "Smart Savings" Opportunity (Mid-Month Check)
    // If we are halfway through the month, variable spending is stable, and we have a large surplus.
    if (!isFixed && monthCtx.currentDayOfMonth > 12) {
        const surplus = b.limit - projectedEnd;
        // If surplus is significant (> RM50) AND projected usage is < 85% of budget
        if (surplus > 50 && projectedEnd < (b.limit * 0.85)) {
             recommendations.push({
                category: b.category,
                type: "smart_savings",
                priority: "medium", // Positive, but actionable
                message: `💰 Opportunity: You are RM${surplus.toFixed(0)} under budget on ${b.category}!`,
                insight: `Great discipline! You're projected to spend RM${projectedEnd.toFixed(2)} out of RM${b.limit.toFixed(0)}.`,
                potentialSavings: Math.floor(surplus), // Suggest saving the surplus
                actionItems: [`Move RM${Math.floor(surplus)} to a Savings Goal`, `Treat yourself to a small reward`],
                projectedTotal: projectedEnd,
                confidence
             });
             processedCategories.add(catKey);
             return;
        }
    }

    // B. "Bill Win" (Fixed Cost Came in Low)
    // If it's late in the month (Day 25+), bill is paid (used > 0), and it was cheaper than limit.
    if (isFixed && monthCtx.currentDayOfMonth > 20 && b.used > 0 && b.used < b.limit) {
        // Double check against historical average to ensure it's actually paid
        if (b.used >= historicalAvg * 0.8) {
             const saved = b.limit - b.used;
             recommendations.push({
                category: b.category,
                type: "positive_reinforcement",
                priority: "low",
                message: `✅ ${b.category} bill was RM${saved.toFixed(2)} cheaper than expected.`,
                insight: "Fixed expenses coming in under budget is the easiest way to save.",
                actionItems: ["Update budget limit for accuracy", "Save the difference"],
                confidence: 0.95
             });
             processedCategories.add(catKey);
             return;
        }
    }

    // C. "Perfect Pace" (The Steady Hand)
    // Spending is within 5% variance of the "perfect" linear path
    if (!isFixed && b.used > 50) {
        const perfectPace = (b.limit / monthCtx.totalDaysInMonth) * monthCtx.currentDayOfMonth;
        const variance = Math.abs(b.used - perfectPace);
        
        if (variance < (perfectPace * 0.05)) { // Within 5% accuracy
             recommendations.push({
                category: b.category,
                type: "positive_reinforcement",
                priority: "low",
                message: `⭐ Perfect Pace: Your ${b.category} spending is exactly on track.`,
                insight: `You are managing this budget perfectly day-by-day.`,
                dailyRate,
                confidence
             });
             processedCategories.add(catKey);
        }
    }

  });

  // ... [Keep Unbudgeted Section] ...
   Object.entries(currentMonthTotals).forEach(([category, amount]) => {
    const normalizedCat = category.trim().toLowerCase();
    if (processedCategories.has(normalizedCat)) return;
    if (allBudgetedCategories.has(normalizedCat)) return;
    if (amount > 50) {
       recommendations.push({
            category, type: "unbudgeted", priority: "medium",
            message: `📝 Unbudgeted: You've spent RM${amount.toFixed(2)} on "${category}".`,
            suggestedLimit: Math.ceil(amount * 1.2 / 10) * 10,
            insight: "Tracking this category helps avoid monthly surprises.",
            actionItems: ["Create a budget now"]
       });
    }
  });

  const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
  return recommendations.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);
};

export const formatRecommendation = (rec: AIRecommendation): string => {
    return rec.message; 
};