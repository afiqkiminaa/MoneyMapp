# AI-Powered Smart Budget Recommendation System - Enhanced v2.5

## Overview

The enhanced budget recommendation system now uses advanced AI analytics with **real-time daily spending awareness** to provide intelligent, personalized budget recommendations based on user spending patterns and spending trajectory.

---

## Features

### 1. **Daily Spending Awareness** 📅

- Tracks current day of month (e.g., Day 15 of 30)
- Calculates daily spending rate (e.g., RM12/day)
- Projects month-end totals based on spending pace
- Shows days remaining in month
- Displays month progress percentage

**Code:**
```typescript
const getCurrentDayOfMonth = (): number => {
  return new Date().getDate();
};

const getDaysRemainingInMonth = (): number => {
  const now = new Date();
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  return lastDay.getDate() - now.getDate();
};

const getTotalDaysInMonth = (): number => {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
};

const monthProgress = (getCurrentDayOfMonth() / getTotalDaysInMonth()) * 100;
```

### 2. **Spending Trajectory & Projection** 📈

- **Daily Rate**: `spent ÷ days_elapsed`
- **Projected Month-End**: `(daily_rate × days_remaining) + current_spent`
- **Budget vs Projection**: Alerts if projected total exceeds budget
- **Pace Variance**: Shows if spending is ahead or behind budget pace

**Formula Examples:**
```
Scenario 1:
  Spent: RM150 in 10 days
  Daily Rate: 150 ÷ 10 = RM15/day
  Days Remaining: 20
  Projected: (15 × 20) + 150 = RM450
  Budget: RM300
  Alert: "Will exceed by RM150"

Scenario 2:
  Spent: RM50 in 15 days
  Expected: RM100 (proportional to 50% month)
  Variance: -RM50 (50% UNDER PACE!)
  Status: "On track for savings"
```

### 3. **Historical Spending Analysis**

- Tracks spending patterns over the last 6 months
- Automatically collects monthly category totals
- Builds comprehensive spending history for each category
- Enables trend detection and anomaly identification

**Data Structure:**
```typescript
const historicalData: CategoryTotals[] = [
  { Food: 150, Rent: 1000, Utilities: 80 },  // Month -5
  { Food: 160, Rent: 1000, Utilities: 85 },  // Month -4
  { Food: 155, Rent: 1000, Utilities: 78 },  // Month -3
  { Food: 180, Rent: 1000, Utilities: 90 },  // Month -2
  { Food: 175, Rent: 1000, Utilities: 82 },  // Month -1
  { Food: 200, Rent: 1000, Utilities: 95 },  // Current Month
];
```

### 4. **Trend Detection**

- **Increasing Trends**: Alerts when spending trending upward (>15% change)
- **Decreasing Trends**: Celebrates when spending reduces over time
- **Stable Patterns**: Identifies consistent spending behavior
- Calculates percentage changes to determine trend direction

**Code:**
```typescript
export const detectSpendingTrend = (
  historicalData: CategoryTotals[],
  category: string
): "increasing" | "decreasing" | "stable" => {
  if (historicalData.length < 2) return "stable";

  const amounts = historicalData.map((month) => month[category] || 0);
  const recentAvg = amounts.slice(-2).reduce((a, b) => a + b, 0) / 2;
  const olderAvg = amounts.slice(0, -2).reduce((a, b) => a + b, 0) / Math.max(1, amounts.length - 2);

  const percentageChange = ((recentAvg - olderAvg) / (olderAvg || 1)) * 100;

  if (percentageChange > 15) return "increasing";  // >15% increase
  if (percentageChange < -15) return "decreasing"; // >15% decrease
  return "stable";
};
```

### 5. **Anomaly Detection**

- Uses statistical Z-score analysis (2 standard deviations threshold)
- Detects unusual spending spikes
- Distinguishes between normal spending and anomalies
- Provides high-priority alerts for anomalies

**Formula:** `Z-Score = |currentAmount - average| / stdDev`
- If Z-Score > 2: Anomaly detected (95% confidence)
- If Z-Score ≤ 2: Normal spending

**Example:**
```
Category: Food
Average: RM100
Std Dev: RM20
Current Spending: RM160

Z-Score = |160 - 100| / 20 = 3.0 (> 2 = ANOMALY!)

Interpretation:
  Spending is 3 standard deviations from average
  This is unusual and warrants investigation
```

**Code:**
```typescript
export const isAnomalyDetected = (
  historicalData: CategoryTotals[],
  category: string,
  currentAmount: number
): boolean => {
  const average = calculateCategoryAverage(historicalData, category);
  const stdDev = calculateStandardDeviation(historicalData, category);

  if (stdDev === 0) return false;

  const zScore = Math.abs((currentAmount - average) / stdDev);
  return zScore > 2; // 2 standard deviations = ~95% confidence
};
```

### 6. **Optimal Budget Calculation**

- **Formula**: `Optimal Budget = Average Spending + (0.5 × Standard Deviation)`
- More conservative than 1 SD (covers ~69% of spending)
- Suggests budget adjustments when optimal differs >8% from current
- Accounts for spending variability

**Code:**
```typescript
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
    return null; // Change is <8%, not worth suggesting
  }

  return Math.round(optimalBudget * 100) / 100;
};
```

### 7. **Priority-Based Severity Levels**

| Priority | Color | Trigger | Action |
|----------|-------|---------|--------|
| **Critical** 🚨 | Red | >150% budget + anomaly + increasing trend | Immediate intervention |
| **High** ⚠️ | Orange | >120% budget OR poor trajectory (projected 150%+) | Course correction needed |
| **Medium** 📋 | Yellow | ~100% budget OR unbudgeted spending (>RM100) | Monitor closely |
| **Low** ✅ | Green | <95% projected spending OR good control | Maintain pattern |

---

## AI Recommendation Types (NEW Enhanced System)

### 🚨 CRITICAL Alert
```
When: Spending > 150% of budget + Anomaly + Increasing trend
Priority: CRITICAL (Red)

Example:
  Budget: RM100
  Spent: RM160 (160% of budget)
  Average: RM80
  Z-Score: 4.0 (ANOMALY!)
  Trend: Increasing 20% month-over-month
  Day: 15 of 30
  Daily Rate: RM10.67/day
  Projected: RM360 (360% of budget!)

Message: "🚨 CRITICAL: Food is severely overbudget! Already spent 
          RM160 of RM100 (60% over)."

Insight: "At your current rate of RM10.67/day, you could spend RM360 
         by month-end. This is an unusual spike combined with an 
         upward trend."

Action Items:
  1. Reduce daily spending in Food immediately
  2. Investigate the spike - was it a one-time purchase?
  3. Cut discretionary spending to recover by month-end
  4. Consider reallocating from other categories if needed
```

### ⚠️ Trajectory Warning
```
When: Spent > 120% of budget OR Projected month-end > 150% of budget
Priority: HIGH (Orange)

Example:
  Budget: RM100
  Spent: RM125 (day 15 of 30)
  Daily Rate: RM8.33/day
  Days Remaining: 15
  Projected: RM250 (250% of budget)

Message: "⚠️ Food: Over budget and on track to exceed by RM150."

Insight: "You've spent RM125 in 15 days. At this rate 
          (RM8.33/day), you'll hit RM250 by month-end."

Action Items:
  1. Reduce daily spending to RM1.67/day to stay on budget
  2. Find ways to cut 60% of spending to meet limit
  3. Review large purchases this month
```

### ❌ Budget Exceeded
```
When: Spent > Limit (without anomaly or trajectory warning)
Priority: MEDIUM (Yellow)

Example:
  Budget: RM100
  Spent: RM115 (day 20 of 30)
  Daily Rate: RM5.75/day
  Days Remaining: 10
  Projected: RM172.50

Message: "❌ Food: Over budget by RM15 (15% over)."

Insight: "With 10 days left, aim for RM1.50/day spending."

Action Items:
  1. Monitor daily spending carefully
  2. Prioritize essential purchases only
```

### ⏱️ Pace Monitor
```
When: Under budget but tracking spending pace
Priority: MEDIUM or LOW (Yellow/Green)

Example (Ahead of Pace):
  Budget: RM100
  Spent: RM95 (day 15 of 30)
  Expected at Day 15: RM50
  Variance: +RM45 (ahead of pace)
  Projected: RM110

Message: "⏱️ Food: Slightly above pace. You're RM45 ahead 
          of budget allocation."

Insight: "Budget pace suggests RM50 by now, but you've spent RM95. 
         Projected end: RM110."

Action Items:
  1. Slight course correction needed
  2. Reduce daily spending by RM0.67/day to stay on budget

Example (Under Pace):
  Budget: RM100
  Spent: RM35 (day 15 of 30)
  Expected at Day 15: RM50
  Variance: -RM15 (under pace)
  Projected: RM70

Message: "✅ Food: On track! You're RM15 under pace."

Insight: "At current rate (RM2.33/day), you'll finish at RM70, 
         leaving RM30 unspent."

Action Items:
  1. Maintain current spending pattern
  2. Consider if you could allocate saved amount to other 
     categories or savings
```

### 🎯 Safe Zone
```
When: Projected month-end ≤ 95% of budget
Priority: LOW (Green)

Message: "🎯 Food: Safe zone! Spending under control."

Insight: "Current rate suggests RM82 by month-end 
         with RM18 buffer."
```

### 💡 Optimization Opportunity
```
When: Spending < 30% of budget AND good historical control
Priority: LOW (Green)

Example:
  Budget: RM100
  Spent: RM25 (day 15 of 30)
  Historical Average: RM60
  Suggested Budget: RM78

Message: "💡 Food: Great savings! Only RM25 spent (25% of budget)."

Insight: "Historical average: RM60/month. Your budget of RM100 
         is generous. Consider reducing to RM78."

Action Items:
  1. Reallocate RM22 to savings or other categories
  2. Maintain current spending habits
  3. Update budget for better accuracy next month
```

### 📊 Unbudgeted Spending
```
When: Significant spending without allocated budget (>RM100)
Priority: MEDIUM (Yellow)

Example:
  Category: Subscriptions
  Spent: RM250 (no budget set)
  Day: 15 of 30
  Daily Rate: RM16.67/day
  Projected: RM500
  Suggested Budget: RM380

Message: "📊 Subscriptions: No budget set, but RM250 spent 
          (179% of suggested)."

Insight: "You're spending RM16.67/day on subscriptions. 
         This is a recurring expense that should be tracked."

Action Items:
  1. Create budget for Subscriptions at RM380/month
  2. Audit all subscriptions - any unused ones?
  3. Consider canceling low-value services
  4. Set calendar reminder to review annually
```

### 🔧 Recovery Mode
```
When: Over budget + Less than 10 days remaining
Priority: HIGH (Orange)

Example:
  Budget: RM100
  Spent: RM120 (day 25 of 31)
  Days Remaining: 6
  Overspent: RM20

Message: "🔧 Food: 6 days left - Recovery mode engaged!"

Insight: "You're RM20 over. Avoid unnecessary purchases 
         in Food for the rest of the month."

Action Items:
  1. Only 6 days left!
  2. Zero spending in this category recommended
  3. Plan next month's budget to avoid repeat
```

---

## Technical Implementation

### Core Functions in `aiRecommendations.ts`

#### 1. `calculateCategoryAverage(historicalData, category)`
```typescript
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
```

#### 2. `calculateStandardDeviation(historicalData, category)`
```typescript
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
```

#### 3. `calculateDailyRate(spent: number, daysIntoMonth: number)`
```typescript
const calculateDailyRate = (spent: number, daysIntoMonth: number): number => {
  return daysIntoMonth > 0 ? spent / daysIntoMonth : 0;
};
```

#### 4. `projectMonthEnd(dailyRate, daysRemaining, currentSpent)`
```typescript
const projectMonthEnd = (
  dailyRate: number,
  daysRemaining: number,
  currentSpent: number
): number => {
  return currentSpent + dailyRate * daysRemaining;
};
```

#### 5. `generateAIRecommendations(budgetData, historicalData, currentMonthTotals, budgetLimits)`

Main recommendation engine that:
- Analyzes current budget vs spending
- Calculates daily rates and projections
- Detects trends and anomalies
- Generates prioritized recommendations
- Includes action items for each recommendation

---

## Data Structure

### Recommendation Object
```typescript
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
```

### Budget Data (Used for Display)
```typescript
{
  category: "Food",
  limit: 100,
  used: 75,
  percentage: 75,        // (used / limit) * 100
  color: "#facc15"      // Green < 50%, Yellow 50-100%, Red > 100%
}
```

---

## UI Components in budget.tsx

### 1. Helper Functions (NEW)
```typescript
// Added helper functions for date tracking
const getCurrentDayOfMonth = (): number => {
  return new Date().getDate();
};

const getDaysRemainingInMonth = (): number => {
  const now = new Date();
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  return lastDay.getDate() - now.getDate();
};

const getTotalDaysInMonth = (): number => {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
};
```

### 2. Priority Styling Function (NEW)
```typescript
const getPriorityStyles = (priority: string) => {
  if (priority === "critical") {
    return {
      container: "border-red-400 bg-red-50",
      badge: "bg-red-200",
      badgeText: "text-red-700",
      borderLeft: "border-l-4 border-l-red-500",
    };
  } else if (priority === "high") {
    return {
      container: "border-orange-300 bg-orange-50",
      badge: "bg-orange-200",
      badgeText: "text-orange-700",
      borderLeft: "border-l-4 border-l-orange-500",
    };
  } else if (priority === "medium") {
    return {
      container: "border-yellow-300 bg-yellow-50",
      badge: "bg-yellow-200",
      badgeText: "text-yellow-700",
      borderLeft: "border-l-4 border-l-yellow-500",
    };
  } else {
    return {
      container: "border-green-300 bg-green-50",
      badge: "bg-green-200",
      badgeText: "text-green-700",
      borderLeft: "border-l-4 border-l-green-500",
    };
  }
};
```

### 3. Month Progress Bar (NEW)
```typescript
{isSameMonth(selectedDate, new Date()) && (
  <View className="bg-white rounded-lg p-3 mb-3 border border-indigo-100">
    <View className="flex-row justify-between items-center mb-2">
      <Text className="text-xs font-semibold text-gray-700">
        Month Progress: {getCurrentDayOfMonth()}/{getTotalDaysInMonth()} days
      </Text>
      <Text className="text-xs font-bold text-indigo-600">
        {Math.round((getCurrentDayOfMonth() / getTotalDaysInMonth()) * 100)}%
      </Text>
    </View>
    <ProgressBar
      progress={(getCurrentDayOfMonth() / getTotalDaysInMonth())}
      color="#4f46e5"
      style={{ height: 6, borderRadius: 10 }}
    />
  </View>
)}
```

### 4. Recommendation Card with Quick Metrics (ENHANCED)
```typescript
{rec.daysRemaining !== undefined && rec.dailyRate !== undefined && (
  <View className="flex-row gap-2 mb-2 bg-white/50 p-2 rounded-lg">
    <View className="flex-1">
      <Text className="text-xs text-gray-600">Daily Rate</Text>
      <Text className="text-sm font-bold text-gray-800">
        RM{rec.dailyRate.toFixed(2)}/day
      </Text>
    </View>
    <View className="flex-1">
      <Text className="text-xs text-gray-600">Days Left</Text>
      <Text className="text-sm font-bold text-gray-800">
        {rec.daysRemaining} days
      </Text>
    </View>
    <View className="flex-1">
      <Text className="text-xs text-gray-600">Projected</Text>
      <Text className="text-sm font-bold text-gray-800">
        RM{rec.projectedTotal?.toFixed(2) || "—"}
      </Text>
    </View>
  </View>
)}
```

### 5. Action Items Display (ENHANCED)
```typescript
{rec.actionItems && rec.actionItems.length > 0 && (
  <View className="bg-white/60 rounded-lg p-2 mb-3">
    <Text className="text-xs font-bold text-gray-700 mb-2">
      📋 Recommended Actions:
    </Text>
    {rec.actionItems.map((action, actionIdx) => (
      <Text key={actionIdx} className="text-xs text-gray-700 mb-1">
        • {action}
      </Text>
    ))}
  </View>
)}
```

---

## Performance Considerations

- **Computation**: O(n) where n = number of expenses
- **Historical Window**: 6 months (configurable)
- **Update Frequency**: Real-time with onSnapshot listeners
- **Memory**: Minimal impact, stores only aggregated monthly data
- **Rendering**: useMemo prevents unnecessary recalculations

---

## What Changed in budget.tsx

### ✅ UNCHANGED (100% Original)
- Savings Goals system
- Fire Streak tracking
- All streak handlers
- Goal management
- Savings recording
- All Firebase listeners for savings

### ✨ ENHANCED (Budget Tab Only)
- Added daily spending tracking
- Added month progress bar
- Enhanced recommendation display with metrics
- Added priority-based styling
- Added action items to recommendations
- Added quick metric cards

---

## Changelog

### v2.5 (Current - Enhanced)
- ✅ Real-time daily spending awareness
- ✅ Spending trajectory & month-end projections
- ✅ Priority-based severity levels
- ✅ Daily rate calculations
- ✅ Month progress tracking
- ✅ Quick metric cards (Daily Rate | Days Left | Projected)
- ✅ Expandable recommendation cards
- ✅ Action items for each recommendation
- ✅ Recovery mode for end-of-month
- ✅ Pace monitoring (ahead/behind schedule)

### v2.0
- AI-powered anomaly detection
- Trend analysis engine
- Optimal budget calculator
- Multi-level recommendations

### v1.0 (Legacy)
- Basic threshold-based recommendations
- Simple over/under budget alerts