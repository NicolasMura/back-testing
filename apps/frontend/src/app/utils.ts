export const computeInputs = (
  initialCapital: number,
  monthlyInput: number,
  years: number
) => {
  return initialCapital + monthlyInput * 12 * years;
};

export const computeCapital = (
  initialCapital: number,
  monthlyInput: number,
  years: number,
  averageMonthlyPerformance: number,
  monthlyFeesRate: number
): [number, number] => {
  const initialCapitalInterests =
    initialCapital * Math.pow(1 + averageMonthlyPerformance, 12 * years);
  const initialCapitalInterestsWithFees =
    initialCapital *
    Math.pow(1 + (averageMonthlyPerformance - monthlyFeesRate), 12 * years);
  const composedInterests =
    (monthlyInput * (Math.pow(1 + averageMonthlyPerformance, 12 * years) - 1)) /
    averageMonthlyPerformance;
  const composedInterestsWithFees =
    (monthlyInput *
      (Math.pow(1 + averageMonthlyPerformance - monthlyFeesRate, 12 * years) -
        1)) /
    (averageMonthlyPerformance - monthlyFeesRate);

  const finalCapital = initialCapitalInterests + composedInterests;
  const finalCapitalWithFees =
    initialCapitalInterestsWithFees + composedInterestsWithFees;

  return [finalCapital, finalCapitalWithFees];
};
