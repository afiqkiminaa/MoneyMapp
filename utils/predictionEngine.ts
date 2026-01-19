interface DataPoint {
  x: number; // Time index (e.g., Month 1, 2, 3)
  y: number; // Value (Amount Spent)
}

export class SpendingForecaster {
  private data: DataPoint[];
  private slope: number = 0;
  private intercept: number = 0;
  private isTrained: boolean = false;

  constructor(historicalData: number[]) {
    // 1. Data Preprocessing: Convert raw values into vector coordinates
    // We filter out 0 values to avoid skewing the trend with "empty" months
    this.data = historicalData
      .filter(val => val > 0)
      .map((amount, index) => ({
        x: index + 1,
        y: amount,
      }));
  }

  /**
   * "Trains" the model using Ordinary Least Squares (OLS) Linear Regression.
   * Finds the line of best fit (y = mx + c) that minimizes variance.
   */
  public train(): void {
    const N = this.data.length;
    
    // Need at least 2 points to draw a line
    if (N < 2) {
      this.isTrained = false;
      return;
    }

    const sumX = this.data.reduce((sum, d) => sum + d.x, 0);
    const sumY = this.data.reduce((sum, d) => sum + d.y, 0);
    const sumXX = this.data.reduce((sum, d) => sum + d.x * d.x, 0);
    const sumXY = this.data.reduce((sum, d) => sum + d.x * d.y, 0);

    const denominator = N * sumXX - sumX * sumX;

    if (denominator === 0) {
      // Edge case: Perfect vertical line (infinite slope)
      this.slope = 0;
      this.intercept = sumY / N;
    } else {
      this.slope = (N * sumXY - sumX * sumY) / denominator;
      this.intercept = (sumY - this.slope * sumX) / N;
    }
    
    this.isTrained = true;
    // console.log(`[ML Engine] Model Trained. Slope: ${this.slope.toFixed(2)}, Intercept: ${this.intercept.toFixed(2)}`);
  }

  /**
   * Generates a linear prediction for the next time step.
   * @param stepsAhead How many months forward to predict (default 1)
   */
  private predictLinear(stepsAhead: number = 1): number {
    if (!this.isTrained) return 0;
    
    const lastX = this.data[this.data.length - 1].x;
    const targetX = lastX + stepsAhead;
    
    const prediction = this.slope * targetX + this.intercept;
    
    // ReLU (Rectified Linear Unit) - clamp negative values to 0
    return Math.max(0, prediction);
  }

  /**
   * Calculates the weighted Run-Rate for the current incomplete month.
   * @param currentSpent Total spent so far this month
   * @param dayOfMonth Current day (1-31)
   * @param daysInMonth Total days in current month (28-31)
   */
  /**
   * Calculates the weighted Run-Rate for the current incomplete month.
   * Includes a "Volatility Cap" to prevent unrealistic linear extrapolation.
   */
  public predictCurrentMonth(currentSpent: number, dayOfMonth: number, daysInMonth: number): number {
    // 1. Calculate Pure Run Rate (Extrapolation)
    const safeDay = Math.max(1, dayOfMonth);
    const runRate = (currentSpent / safeDay) * daysInMonth;

    // 2. Get Historical Average (Baseline)
    const historyAvg = this.data.reduce((sum, d) => sum + d.y, 0) / (this.data.length || 1);

    // 3. Weighting Function (Sigmoid-like)
    // Early month: Trust History (0.1 weight on reality)
    // Late month: Trust Reality (0.9+ weight on reality)
    let realityWeight = dayOfMonth / daysInMonth;
    // Damping: If it's the first week, strictly limit the weight of the current run-rate
    if (dayOfMonth < 7) realityWeight = 0.1;

    // 4. Ensemble Prediction
    let prediction = runRate;
    if (this.data.length > 0) {
      prediction = (runRate * realityWeight) + (historyAvg * (1 - realityWeight));
    }

    // If we have history, prevent the prediction from exceeding a "reasonable" max.
    if (this.data.length > 0) {
      // Find the single highest spending month in recorded history
      const maxHistorical = this.data.reduce((max, d) => Math.max(max, d.y), 0);
      
      // The Ceiling: We allow the prediction to go up to 1.5x the highest historic month.
      // This accommodates growth/inflation but stops "infinite" spikes.
      // You can adjust '1.5' (50% buffer) to be stricter (e.g., 1.2) if preferred.
      const ceiling = maxHistorical * 1.5;

      prediction = Math.min(prediction, ceiling);
    }

    // Safety: Prediction can never be less than what user already spent
    return Math.max(prediction, currentSpent);
  }

  /**
   * Predicts Next Month using "Trend Chaining".
   * Feeds the Current Month Projection back into the model to predict the future.
   */
  public predictNextMonth(currentMonthProjection: number): number {
    // If model isn't trained (not enough data), fallback to current projection
    if (!this.isTrained) return currentMonthProjection;

    // 1. Get the pure linear trend forecast
    const linearForecast = this.predictLinear(1);

    // 2. "Dampen" the trend with the current month's projection
    // This prevents wild swings if the slope is too aggressive
    const ensembleForecast = (linearForecast + currentMonthProjection) / 2;

    return Math.max(0, ensembleForecast);
  }
}