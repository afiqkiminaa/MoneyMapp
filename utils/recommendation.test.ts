import { describe, it, expect, beforeEach } from '@jest/globals';
import {
  generateAIRecommendations,
  createMonthContext,
  calculateCategoryAverage,
  calculateStandardDeviation,
  detectSpendingTrend,
  isAnomalyDetected,
  calculateOptimalBudget,
} from './aiRecommendations';
import { isSameMonth, subMonths } from 'date-fns';

// ============ MOCK DATA (FOR TESTING ONLY) ============
const mockHistoricalData = [
  { Food: 118, Rent: 1000, Utilities: 78, Entertainment: 45 },
  { Food: 125, Rent: 1000, Utilities: 85, Entertainment: 52 },
  { Food: 120, Rent: 1000, Utilities: 82, Entertainment: 48 },
  { Food: 128, Rent: 1000, Utilities: 88, Entertainment: 55 },
  { Food: 115, Rent: 1000, Utilities: 80, Entertainment: 50 },
  { Food: 122, Rent: 1000, Utilities: 85, Entertainment: 50 },
];

const mockBudgetLimits = [
  { category: "Food", limit: 150 },
  { category: "Rent", limit: 1000 },
  { category: "Utilities", limit: 100 },
  { category: "Entertainment", limit: 75 },
];

const mockBudgetData = [
  {
    category: "Food",
    limit: 150,
    used: 46.0,
    percentage: 30.67,
    color: "#22c55e",
  },
  {
    category: "Rent",
    limit: 1000,
    used: 333.0,
    percentage: 33.3,
    color: "#22c55e",
  },
  {
    category: "Utilities",
    limit: 100,
    used: 23.9,
    percentage: 23.9,
    color: "#22c55e",
  },
];

const mockCurrentMonthTotals = {
  Food: 46.0,
  Rent: 333.0,
  Utilities: 23.9,
};

// ============ TEST SUITE 1: Month Context ============
describe("createMonthContext - FIX #4", () => {
  it("should create correct context for current month", () => {
    const today = new Date();
    const ctx = createMonthContext(today);

    expect(ctx.isCurrentMonth).toBe(true);
    expect(ctx.currentDayOfMonth).toBe(today.getDate());
    expect(ctx.totalDaysInMonth).toBeGreaterThan(28);
    expect(ctx.totalDaysInMonth).toBeLessThanOrEqual(31);
    expect(ctx.daysRemaining).toBeGreaterThanOrEqual(0);
    expect(ctx.dayProgress).toBeGreaterThanOrEqual(0);
    expect(ctx.dayProgress).toBeLessThanOrEqual(100);
  });

  it("should create correct context for past month", () => {
    const pastMonth = subMonths(new Date(), 1);
    const ctx = createMonthContext(pastMonth);

    expect(ctx.isCurrentMonth).toBe(false);
    expect(ctx.currentDayOfMonth).toBe(0);
    expect(ctx.daysRemaining).toBe(0);
    expect(ctx.dayProgress).toBe(0);
  });
});

// ============ TEST SUITE 2: Current Month Validation ============
describe("Month Validation - FIX #3", () => {
  it("should return empty array for historical month", () => {
    const historicalMonth = subMonths(new Date(), 1);

    const recs = generateAIRecommendations(
      mockBudgetData,
      mockHistoricalData,
      mockCurrentMonthTotals,
      mockBudgetLimits,
      historicalMonth
    );

    expect(recs.length).toBe(0);
    expect(recs).toEqual([]);
  });

  it("should return recommendations for current month", () => {
    const today = new Date();

    const recs = generateAIRecommendations(
      mockBudgetData,
      mockHistoricalData,
      mockCurrentMonthTotals,
      mockBudgetLimits,
      today
    );

    // If there's spending, should have recommendations
    if (Object.values(mockCurrentMonthTotals).some(val => val > 0)) {
      expect(recs.length).toBeGreaterThan(0);
    }
  });
});

// ============ TEST SUITE 3: Deduplication ============
describe("Deduplication - FIX #2", () => {
  it("should not have duplicate categories in recommendations", () => {
    const today = new Date();

    const recs = generateAIRecommendations(
      mockBudgetData,
      mockHistoricalData,
      mockCurrentMonthTotals,
      mockBudgetLimits,
      today
    );

    // Count occurrences of each category
    const categoryCounts: Record<string, number> = {};
    recs.forEach((rec) => {
      categoryCounts[rec.category] = (categoryCounts[rec.category] || 0) + 1;
    });

    // Each category should appear at most once
    Object.values(categoryCounts).forEach((count) => {
      expect(count).toBeLessThanOrEqual(1);
    });
  });

  it("should prioritize highest severity for each category", () => {
    const today = new Date();
    // Create heavily over-budget scenario
    const spendingData = {
      Food: 250,
      Rent: 1000,
      Utilities: 50,
    };

    const budgetData = [
      {
        category: "Food",
        limit: 150,
        used: 250,
        percentage: 166.7,
        color: "#ef4444",
      },
      {
        category: "Rent",
        limit: 1000,
        used: 1000,
        percentage: 100,
        color: "#facc15",
      },
    ];

    const recs = generateAIRecommendations(
      budgetData,
      mockHistoricalData,
      spendingData,
      mockBudgetLimits,
      today
    );

    const foodRecs = recs.filter((r) => r.category === "Food");
    expect(foodRecs.length).toBe(1); // Only one Food recommendation
  });
});

// ============ TEST SUITE 4: Confidence Scoring ============
describe("Confidence Scoring - FIX #6", () => {
  it("all recommendations should include confidence score", () => {
    const today = new Date();

    const recs = generateAIRecommendations(
      mockBudgetData,
      mockHistoricalData,
      mockCurrentMonthTotals,
      mockBudgetLimits,
      today
    );

    if (recs.length > 0) {
      recs.forEach((rec) => {
        if (rec.daysRemaining !== undefined) {
          expect(rec.confidence).toBeDefined();
          expect(rec.confidence).toBeGreaterThanOrEqual(0);
          expect(rec.confidence).toBeLessThanOrEqual(1);
        }
      });
    }
  });
});

// ============ TEST SUITE 5: Data Quality Indicators ============
describe("Data Quality - FIX #7", () => {
  it("all recommendations should include data quality", () => {
    const today = new Date();

    const recs = generateAIRecommendations(
      mockBudgetData,
      mockHistoricalData,
      mockCurrentMonthTotals,
      mockBudgetLimits,
      today
    );

    if (recs.length > 0) {
      recs.forEach((rec) => {
        if (rec.daysRemaining !== undefined) {
          expect(rec.dataQuality).toBeDefined();
          expect(["excellent", "good", "fair", "poor"]).toContain(
            rec.dataQuality
          );
        }
      });
    }
  });
});

// ============ TEST SUITE 6: Overall Budget Calculation ============
describe("Overall Budget Calculation - FIX #1", () => {
  it("should project based on actual spending, not budget sum", () => {
    const budgetSum = mockBudgetData.reduce((a, b) => a + b.limit, 0);
    const actualSpending = Object.values(mockCurrentMonthTotals).reduce(
      (a, b) => a + b,
      0
    );

    // Should use actual spending, not budget sum
    expect(actualSpending).toBeLessThan(budgetSum);

    const today = new Date();
    const recs = generateAIRecommendations(
      mockBudgetData,
      mockHistoricalData,
      mockCurrentMonthTotals,
      mockBudgetLimits,
      today
    );

    // Find overall budget recommendation
    const overallRec = recs.find((r) => r.category === "Overall");
    if (overallRec && overallRec.projectedTotal) {
      // Should be more aligned with actual than budget sum
      const errorFromActual = Math.abs(overallRec.projectedTotal - actualSpending);
      const errorFromBudget = Math.abs(overallRec.projectedTotal - budgetSum);

      expect(errorFromActual).toBeLessThan(errorFromBudget);
    }
  });
});

// ============ TEST SUITE 7: Conservative Projections ============
describe("Conservative Projections - FIX #5", () => {
  it("should handle anomalies gracefully", () => {
    // Food usually RM122, but now RM250
    const anomalySpending = {
      Food: 250,
      Rent: 1000,
      Utilities: 50,
    };

    // Should detect anomaly for Food
    const isAnomaly = isAnomalyDetected(
      mockHistoricalData,
      "Food",
      250
    );
    expect(isAnomaly).toBe(true);
  });

  it("should use historical data correctly", () => {
    const average = calculateCategoryAverage(mockHistoricalData, "Food");
    expect(average).toBeGreaterThan(110);
    expect(average).toBeLessThan(130);
  });

  it("should detect spending trends", () => {
    const trend = detectSpendingTrend(mockHistoricalData, "Food");
    expect(["increasing", "decreasing", "stable"]).toContain(trend);
  });

  it("should suggest optimal budgets", () => {
    const optimal = calculateOptimalBudget(mockHistoricalData, "Food", 150);
    if (optimal) {
      expect(optimal).toBeGreaterThan(110);
      expect(optimal).toBeLessThan(180);
    }
  });
});

// ============ TEST SUITE 8: Integration Tests ============
describe("Integration Tests", () => {
  it("should not show daily recommendations for past months", () => {
    const pastMonth = subMonths(new Date(), 1);

    const recs = generateAIRecommendations(
      mockBudgetData,
      mockHistoricalData,
      mockCurrentMonthTotals,
      mockBudgetLimits,
      pastMonth
    );

    // Historical months should return empty
    expect(recs.length).toBe(0);
  });

  it("should have proper recommendation hierarchy", () => {
    const today = new Date();

    const recs = generateAIRecommendations(
      mockBudgetData,
      mockHistoricalData,
      mockCurrentMonthTotals,
      mockBudgetLimits,
      today
    );

    // Check priority order
    const priorities = ["critical", "high", "medium", "low"];
    let lastPriority = -1;

    recs.forEach((rec) => {
      const currentPriority = priorities.indexOf(rec.priority);
      expect(currentPriority).toBeGreaterThanOrEqual(lastPriority);
      lastPriority = currentPriority;
    });
  });

  it("should include all required fields in recommendations", () => {
    const today = new Date();

    const recs = generateAIRecommendations(
      mockBudgetData,
      mockHistoricalData,
      mockCurrentMonthTotals,
      mockBudgetLimits,
      today
    );

    recs.forEach((rec) => {
      // Required fields
      expect(rec.category).toBeDefined();
      expect(rec.type).toBeDefined();
      expect(rec.message).toBeDefined();
      expect(rec.priority).toBeDefined();

      // New fields
      if (rec.daysRemaining !== undefined) {
        expect(rec.confidence).toBeDefined();
        expect(rec.dataQuality).toBeDefined();
      }
    });
  });
});

// ============ TEST SUITE 9: Edge Cases ============
describe("Edge Cases", () => {
  it("should handle empty budget data", () => {
    const today = new Date();

    const recs = generateAIRecommendations(
      [],
      mockHistoricalData,
      mockCurrentMonthTotals,
      mockBudgetLimits,
      today
    );

    expect(recs).toEqual([]);
  });

  it("should handle empty spending data", () => {
    const today = new Date();

    const recs = generateAIRecommendations(
      mockBudgetData,
      mockHistoricalData,
      {},
      mockBudgetLimits,
      today
    );

    expect(recs).toEqual([]);
  });

  it("should handle undefined selectedDate", () => {
    const recs = generateAIRecommendations(
      mockBudgetData,
      mockHistoricalData,
      mockCurrentMonthTotals,
      mockBudgetLimits,
      undefined // undefined date
    );

    // Should still work, defaults to today
    expect(Array.isArray(recs)).toBe(true);
  });
});

// ============ RUNNING THE TESTS ============
/*
To run these tests:

1. Install Jest:
   npm install --save-dev jest ts-jest @types/jest

2. Create jest.config.js in your project root:
   module.exports = {
     preset: 'ts-jest',
     testEnvironment: 'node',
   };

3. Run all tests:
   npm test

4. Run specific test:
   npm test -- --testNamePattern="Deduplication"

5. Run with coverage:
   npm test -- --coverage
*/