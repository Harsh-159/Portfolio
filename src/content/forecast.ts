// Section 3.5: stored headline values. The build-time tests check each against the data.

export const forecastFacts = {
  mae: 13.6,
  rmse: 27.01,
  directional: 86.7,
  skill: 0.61,
  naiveMae: 34.84,
  hours: 11999,
  hoursDirectional: 11989,
  testFrom: '1 November 2024',
  testTo: '15 March 2026',
};

export const stages = [
  { key: 'naive', label: "Last week's price", mae: 34.84, rmse: 57.43, bias: 0.19, directional: null },
  { key: 'p1', label: 'Pass 1: LightGBM and Ridge', mae: 15.29, rmse: 28.62, bias: 7.72, directional: 84.0 },
  { key: 'p2', label: 'Pass 2: adds lagged errors', mae: 13.27, rmse: 27.18, bias: 4.86, directional: 86.0 },
  { key: 'pred', label: 'Final: adds hourly bias correction', mae: 13.6, rmse: 27.01, bias: 0.5, directional: 86.7 },
] as const;

export const foldModels = [
  { key: 'lgbm_ridge_ensemble', label: 'LightGBM and Ridge ensemble' },
  { key: 'lightgbm', label: 'LightGBM' },
  { key: 'xgboost', label: 'XGBoost' },
  { key: 'linear_regression', label: 'Linear regression' },
  { key: 'seasonal_naive', label: 'Seasonal naive' },
] as const;

export const dataChecks = [
  { finding: 'Solar above 50 MW at night, too large to fix automatically', count: '1,183', severity: 'Error' },
  { finding: 'Price outliers during the 2022 to 2023 crisis, expected', count: '396', severity: 'Info' },
  { finding: 'Price outliers outside the crisis, to investigate', count: '42', severity: 'Warning' },
  { finding: 'Small solar readings at night, set to zero automatically', count: '591', severity: 'Auto-corrected' },
  { finding: 'Missing values', count: 'Price 4, wind 5, solar 8, load 55, gas 0', severity: 'Under 1% each' },
];
