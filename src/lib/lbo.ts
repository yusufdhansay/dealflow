export interface LBOInputs {
  targetEBITDA: number;
  entryMultiple: number;
  leverageMultiple: number; // Debt/EBITDA
  interestRate: number; // e.g., 0.08
  ebitdaGrowth: number; // e.g., 0.10
  exitMultiple: number;
  holdPeriod: number; // 3-7 years
  capexPercentOfEBITDA: number; // e.g., 0.15
  taxRate: number; // e.g., 0.25
}

export interface YearForecast {
  year: number;
  ebitda: number;
  beginningDebt: number;
  interest: number;
  capex: number;
  tax: number;
  fcf: number;
  endingDebt: number;
  accumulatedCash: number;
}

export interface LBOOutputs {
  entryEV: number;
  entryDebt: number;
  entryEquity: number;
  exitEV: number;
  exitDebt: number;
  exitCash: number;
  exitEquity: number;
  moic: number;
  irr: number;
  forecast: YearForecast[];
}

export interface SensitivityCell {
  exitMultiple: number;
  leverageMultiple: number;
  irr: number;
  moic: number;
}

export function runLBOModel(inputs: LBOInputs): LBOOutputs {
  const {
    targetEBITDA,
    entryMultiple,
    leverageMultiple,
    interestRate,
    ebitdaGrowth,
    exitMultiple,
    holdPeriod,
    capexPercentOfEBITDA,
    taxRate
  } = inputs;

  // 1. Entry Calculations
  const entryEV = targetEBITDA * entryMultiple;
  const entryDebt = targetEBITDA * leverageMultiple;
  const entryEquity = Math.max(0.1, entryEV - entryDebt); // prevent negative equity at entry

  // 2. Projections and Debt Paydown
  let currentDebt = entryDebt;
  let accumulatedCash = 0;
  const forecast: YearForecast[] = [];

  // Year 0 placeholder
  forecast.push({
    year: 0,
    ebitda: targetEBITDA,
    beginningDebt: entryDebt,
    interest: 0,
    capex: 0,
    tax: 0,
    fcf: 0,
    endingDebt: entryDebt,
    accumulatedCash: 0
  });

  let prevEBITDA = targetEBITDA;

  for (let year = 1; year <= holdPeriod; year++) {
    const ebitda = prevEBITDA * (1 + ebitdaGrowth);
    const capex = ebitda * capexPercentOfEBITDA;
    const beginningDebt = currentDebt;

    // Approximate average-balance interest without circularity
    // Approximate FCF before interest
    const approxTaxes = Math.max(0, (ebitda - capex) * taxRate); // assuming D&A = Capex
    const approxFCFBeforeInterest = ebitda - capex - approxTaxes;
    
    // Approximate ending debt if we paid down using FCF before interest
    const approxEndingDebt = Math.max(0, beginningDebt - approxFCFBeforeInterest);
    const approxAverageDebt = (beginningDebt + approxEndingDebt) / 2;
    
    // Calculate final interest based on approximate average balance
    const interest = approxAverageDebt * interestRate;
    
    // Final EBT (Earnings Before Taxes)
    const ebt = Math.max(0, ebitda - capex - interest); // D&A = Capex
    const tax = ebt * taxRate;
    
    // Final Free Cash Flow
    const fcf = ebitda - interest - capex - tax;

    // Debt paydown logic
    let endingDebt = beginningDebt;
    let debtPaid = 0;

    if (fcf > 0) {
      if (fcf >= beginningDebt) {
        debtPaid = beginningDebt;
        endingDebt = 0;
        accumulatedCash += (fcf - beginningDebt);
      } else {
        debtPaid = fcf;
        endingDebt = beginningDebt - fcf;
      }
    } else {
      // FCF is negative, so we must add it to debt (revolving credit line)
      endingDebt = beginningDebt - fcf; // - fcf increases debt
    }

    forecast.push({
      year,
      ebitda: Math.round(ebitda * 10) / 10,
      beginningDebt: Math.round(beginningDebt * 10) / 10,
      interest: Math.round(interest * 10) / 10,
      capex: Math.round(capex * 10) / 10,
      tax: Math.round(tax * 10) / 10,
      fcf: Math.round(fcf * 10) / 10,
      endingDebt: Math.round(endingDebt * 10) / 10,
      accumulatedCash: Math.round(accumulatedCash * 10) / 10
    });

    currentDebt = endingDebt;
    prevEBITDA = ebitda;
  }

  // 3. Exit Calculations
  const exitEBITDA = forecast[forecast.length - 1].ebitda;
  const exitEV = exitEBITDA * exitMultiple;
  const exitDebt = currentDebt;
  const exitCash = accumulatedCash;
  const exitEquity = Math.max(0, exitEV - exitDebt + exitCash);

  // 4. Return Metrics
  const moic = exitEquity / entryEquity;
  
  // IRR formula: (exitEquity / entryEquity) ^ (1 / holdPeriod) - 1
  let irr = 0;
  if (moic > 0) {
    irr = Math.pow(moic, 1 / holdPeriod) - 1;
  } else {
    irr = -1.0; // 100% loss
  }

  return {
    entryEV: Math.round(entryEV * 10) / 10,
    entryDebt: Math.round(entryDebt * 10) / 10,
    entryEquity: Math.round(entryEquity * 10) / 10,
    exitEV: Math.round(exitEV * 10) / 10,
    exitDebt: Math.round(exitDebt * 10) / 10,
    exitCash: Math.round(exitCash * 10) / 10,
    exitEquity: Math.round(exitEquity * 10) / 10,
    moic: Math.round(moic * 100) / 100,
    irr: Math.round(irr * 1000) / 1000,
    forecast
  };
}

export function generateSensitivityMatrix(
  inputs: LBOInputs,
  leverageOffsetRange = [-2, -1, 0, 1, 2], // leverage offsets relative to current leverage
  multipleOffsetRange = [-2, -1, 0, 1, 2] // exit multiple offsets relative to current exit multiple
): SensitivityCell[][] {
  const matrix: SensitivityCell[][] = [];

  // Cap leverage below the entry multiple (mirrors the UI slider cap) so
  // entry equity never collapses to the sentinel floor and distorts IRR/MOIC.
  const maxLeverage = Math.max(1, inputs.entryMultiple - 1);
  const leverageLevels = Array.from(new Set(
    leverageOffsetRange.map(offset =>
      Math.round(Math.min(maxLeverage, Math.max(1, inputs.leverageMultiple + offset)) * 10) / 10
    )
  ));

  for (const leverage of leverageLevels) {
    const row: SensitivityCell[] = [];
    for (const offset of multipleOffsetRange) {
      const exitMultiple = inputs.exitMultiple + offset;

      const cellInputs: LBOInputs = {
        ...inputs,
        leverageMultiple: leverage,
        exitMultiple: Math.max(1, exitMultiple) // exit multiple can't be less than 1x
      };

      const result = runLBOModel(cellInputs);

      row.push({
        exitMultiple: cellInputs.exitMultiple,
        leverageMultiple: leverage,
        irr: result.irr,
        moic: result.moic
      });
    }
    matrix.push(row);
  }

  return matrix;
}
