import { NextRequest, NextResponse } from 'next/server';
import { Groq } from 'groq-sdk';
import { runLBOModel, LBOInputs, YearForecast } from '@/lib/lbo';

export async function POST(req: NextRequest) {
  // Parse the body once up front — the request stream can only be consumed
  // a single time, so the error fallback below reuses this parsed object.
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  try {
    const { target, sector, aggregates, lboInputs, lboOutputs, cheapRichFlag, precedentMedian, apiKeyOverride } = body;

    const apiKey = apiKeyOverride || process.env.GROQ_API_KEY || '';

    // Calculate dynamic parameters for prompt
    const targetEV_EBITDA = target.evToEBITDATTM;
    const targetEV_Sales = target.evToSalesTTM;
    const peersMedianEV_EBITDA = aggregates?.evToEBITDA?.median || 12.0;
    const peersMedianEV_Sales = aggregates?.evToSales?.median || 3.0;
    const targetGrowth = target.revenueGrowth;
    const targetMargin = target.grossProfitMarginTTM;

    const irrVal = (lboOutputs.irr * 100).toFixed(1);
    const moicVal = lboOutputs.moic.toFixed(2);

    // If no key is set or key is mock-like, generate dynamic financial template directly
    if (!apiKey || apiKey.startsWith('gsk_mock') || apiKey.trim() === '') {
      const generatedMemo = generateDynamicFinancialMemo(target, sector, targetEV_EBITDA, peersMedianEV_EBITDA, lboInputs, lboOutputs, cheapRichFlag, precedentMedian);
      return NextResponse.json({ memo: generatedMemo, source: 'template_fallback' });
    }

    const groq = new Groq({ apiKey });

    const systemPrompt = `You are a Managing Director at an elite Private Equity fund. Write a highly analytical, dense, and professional 1-page Investment Committee (IC) memo based on the financial and valuation details provided. The tone must be institutional, objective, and precise, avoiding fluff or standard AI hype words. Focus heavily on valuation multiples, cash conversion, leverage risk, and returns sensitivity.`;

    const userPrompt = `
Target Company: ${target.companyName} (${target.symbol})
Sector: ${sector}

VALUATION SUMMARY:
- Target EV/EBITDA Multiple: ${targetEV_EBITDA}x (Public Peers Median: ${peersMedianEV_EBITDA}x)
- Target EV/Revenue Multiple: ${targetEV_Sales}x (Public Peers Median: ${peersMedianEV_Sales}x)
- Target Gross Margin: ${(targetMargin * 100).toFixed(1)}%
- Target YoY Revenue Growth: ${(targetGrowth * 100).toFixed(1)}%

LBO FORECAST INPUTS:
- Hold Period: ${lboInputs.holdPeriod} years
- Entry Multiple: ${lboInputs.entryMultiple}x EBITDA
- Exit Multiple: ${lboInputs.exitMultiple}x EBITDA
- Purchase Leverage: ${lboInputs.leverageMultiple}x EBITDA (Debt Interest Rate: ${(lboInputs.interestRate * 100).toFixed(1)}%, Tax Rate: ${(lboInputs.taxRate * 100).toFixed(1)}%)
- Annual EBITDA Growth: ${(lboInputs.ebitdaGrowth * 100).toFixed(1)}%

LBO RETURNS OUTPUTS:
- Entry Equity Required: $${lboOutputs.entryEquity}M
- Exit Equity Value: $${lboOutputs.exitEquity}M
- Multiple on Invested Capital (MOIC): ${moicVal}x
- Internal Rate of Return (IRR): ${irrVal}%

PRECEDENT M&A TRANSACTIONS:
- Sector Precedent Transactions Median EBITDA Multiple: ${precedentMedian}x
- Valuation Flag: Target is priced as "${cheapRichFlag}" relative to precedent M&A transactions.

Please write a structured, executive-level Investment Committee Memo. Organize the response using the following headers (use markdown format):
1. **Executive Summary & Investment Recommendation**: Provide a firm BUY, HOLD, or AVOID recommendation based on the returns hurdles (hurdle rate is typically 20% IRR). Outline the core strategic narrative.
2. **Valuation & Multiples Assessment**: Contrast the entry pricing against public comps and precedent M&A deals. Address multiple contraction risk (entering at ${lboInputs.entryMultiple}x and exiting at ${lboInputs.exitMultiple}x).
3. **Debt Serviceability & FCF Performance**: Discuss the target's ability to service the debt load (${lboInputs.leverageMultiple}x EBITDA) and pay down principal using projected Free Cash Flow.
4. **Key Risks & Risk Mitigants**: Identify the top 2-3 transaction risks (e.g., leverage constraint, multiple contraction, growth deceleration) and their specific structural or operational mitigants.

Make sure the output is professional, reads like actual Private Equity memo text, and matches the numbers exactly.
    `;

    const chatCompletion = await groq.chat.completions.create({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      model: 'llama-3.1-8b-instant',
      temperature: 0.2,
      max_tokens: 1500,
    });

    const memoText = chatCompletion.choices[0]?.message?.content || '';
    
    if (!memoText) {
      throw new Error("Empty response from Groq");
    }

    return NextResponse.json({ memo: memoText, source: 'groq' });

  } catch (error: any) {
    console.error("Error generating memo:", error);
    
    // In case of any API error, run fallback generator
    try {
      const { target, sector, aggregates, lboInputs, lboOutputs, cheapRichFlag, precedentMedian } = body;
      const targetEV_EBITDA = target.evToEBITDATTM;
      const peersMedianEV_EBITDA = aggregates?.evToEBITDA?.median || 12.0;

      const generatedMemo = generateDynamicFinancialMemo(
        target,
        sector,
        targetEV_EBITDA,
        peersMedianEV_EBITDA,
        lboInputs,
        lboOutputs,
        cheapRichFlag,
        precedentMedian
      );
      
      return NextResponse.json({ 
        memo: generatedMemo, 
        source: 'template_fallback_on_error',
        warning: `LLM API Error: ${error.message || 'Rate limit or network error'}. Served auto-generated memo.`
      });
    } catch (fallbackError) {
      return NextResponse.json({ error: "Failed to generate memo: " + error.message }, { status: 500 });
    }
  }
}

// Highly realistic Private Equity Memo template generator
function generateDynamicFinancialMemo(
  target: any,
  sector: string,
  targetMultiple: number,
  peersMedian: number,
  inputs: any,
  outputs: any,
  cheapRichFlag: string,
  precedentMedian: number
): string {
  const irr = outputs.irr * 100;
  const moic = outputs.moic;

  // Derive real metrics from the actual LBO forecast instead of fabricating them
  const forecastYears: YearForecast[] = (outputs.forecast || []).filter((f: YearForecast) => f.year > 0);
  const cumulativeFCF = forecastYears.reduce((sum: number, f: YearForecast) => sum + f.fcf, 0);
  const year1 = forecastYears[0];
  const year1Coverage = year1 && year1.interest > 0 ? year1.ebitda / year1.interest : 0;
  const debtPaydownPct = outputs.entryDebt > 0
    ? Math.max(0, (1 - outputs.exitDebt / outputs.entryDebt)) * 100
    : 0;
  const avgCashConversion = forecastYears.length > 0
    ? (forecastYears.reduce((sum: number, f: YearForecast) => sum + (f.ebitda > 0 ? f.fcf / f.ebitda : 0), 0) / forecastYears.length) * 100
    : 0;

  // Re-run the model at a 2.0x contracted exit multiple for the real downside case
  const contractedExit = Math.max(1, inputs.exitMultiple - 2);
  const downsideOutputs = runLBOModel({ ...(inputs as LBOInputs), exitMultiple: contractedExit });
  const downsideIRR = downsideOutputs.irr * 100;

  const memoDate = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

  let rec = "BUY";
  let recNarrative = "";
  if (irr >= 20) {
    rec = "BUY (STRONG RECOMMENDATION)";
    recNarrative = `The asset represents a highly attractive investment opportunity. With a projected base-case IRR of ${irr.toFixed(1)}% and MOIC of ${moic.toFixed(2)}x, the transaction comfortably clears our fund's hurdle rate of 20.0%. The return profile is supported by solid cash conversion and robust deleveraging.`;
  } else if (irr >= 12) {
    rec = "HOLD / PROCEED WITH CAUTION";
    recNarrative = `The asset represents a moderate investment profile. At a projected IRR of ${irr.toFixed(1)}% and MOIC of ${moic.toFixed(2)}x, the transaction falls short of our primary 20.0% hurdle rate, though it offers defensive characteristics. Operational improvements or a lower entry multiple will be required to justify investment.`;
  } else {
    rec = "AVOID / PASS";
    recNarrative = `The asset does not meet our underwriting requirements. The projected base-case IRR is ${irr.toFixed(1)}% with a ${moic.toFixed(2)}x MOIC, which fails to compensate for the operational and leverage risks involved. We recommend passing on this opportunity at the current valuation.`;
  }

  const isMultipleContracting = inputs.exitMultiple < inputs.entryMultiple;
  const multipleContractionText = isMultipleContracting 
    ? `We have conservatively modeled multiple contraction of ${(inputs.entryMultiple - inputs.exitMultiple).toFixed(1)}x (entering at ${inputs.entryMultiple.toFixed(1)}x and exiting at ${inputs.exitMultiple.toFixed(1)}x). Despite this headwind, the asset generates sufficient cash to deliver a viable return.`
    : `We have underwritten the transaction at multiple staticity (entry and exit at ${inputs.entryMultiple.toFixed(1)}x). Given current sector volatility, any multiple contraction (e.g. -1.0x to -2.0x exit) represents a key risk to the returns.`;

  const premiumDiscount = targetMultiple > peersMedian 
    ? `a premium of ${(((targetMultiple / peersMedian) - 1) * 100).toFixed(1)}%`
    : `a discount of ${(((1 - (targetMultiple / peersMedian))) * 100).toFixed(1)}%`;

  return `# INVESTMENT COMMITTEE MEMORANDUM

**Date:** ${memoDate}
**To:** Investment Committee  
**From:** Private Equity Associate Team  
**Subject:** Acquisition of ${target.companyName} (${target.symbol})  

---

### 1. Executive Summary & Investment Recommendation
We recommend a **${rec}** decision on the acquisition of **${target.companyName}**. ${recNarrative} The strategic rationale is driven by ${target.symbol}'s dominant market position in the ${sector} sector, stable recurring revenue streams, and opportunities for cost optimization and margins expansion under our ownership.

- **Purchase Price (EV):** $${outputs.entryEV.toLocaleString()}M
- **Required Equity:** $${outputs.entryEquity.toLocaleString()}M
- **Opening Debt (Leverage):** $${outputs.entryDebt.toLocaleString()}M (${inputs.leverageMultiple.toFixed(1)}x EBITDA)
- **Base Case Returns:** **${irr.toFixed(1)}% IRR** / **${moic.toFixed(2)}x MOIC** over a ${inputs.holdPeriod}-year hold.

---

### 2. Valuation & Multiples Assessment
${target.companyName} is entering at an implied EV/EBITDA of **${targetMultiple.toFixed(1)}x**, which represents ${premiumDiscount} to the public peers median of **${peersMedian.toFixed(1)}x**. 

Relative to precedent M&A transactions in the ${sector} sector (median deal multiple of **${precedentMedian.toFixed(1)}x**), the target is flagged as **${cheapRichFlag.toUpperCase()}**. ${multipleContractionText} Our entry valuation is justified by ${target.companyName}'s superior financial metrics, specifically a gross profit margin of **${(target.grossProfitMarginTTM * 100).toFixed(1)}%** compared to historical averages, and annual organic growth projected at **${(inputs.ebitdaGrowth * 100).toFixed(1)}%**.

---

### 3. Debt Serviceability & FCF Performance
Under the proposed ${inputs.leverageMultiple.toFixed(1)}x EBITDA leverage structure ($${outputs.entryDebt.toLocaleString()}M in initial senior debt), the target company displays robust debt serviceability.
- **Interest Coverage:** The initial Year 1 interest coverage ratio (EBITDA / Interest Expense) is **${year1Coverage.toFixed(1)}x**, providing a significant cushion.
- **Deleveraging Profile:** Over the ${inputs.holdPeriod}-year hold period, the target generates cumulative Free Cash Flow of **$${Math.round(cumulativeFCF).toLocaleString()}M**, allowing us to pay down approximately **${debtPaydownPct.toFixed(0)}%** of the opening debt balance by exit.
- **Cash Conversion:** EBITDA-to-FCF conversion averages **${avgCashConversion.toFixed(0)}%** annually, driven by capital intensity modeled at ${(inputs.capexPercentOfEBITDA * 100).toFixed(0)}% of EBITDA and disciplined working capital management.

---

### 4. Key Risks & Risk Mitigants
- **Risk 1: Interest Rate & Leverage Constraint.** Servicing debt under a ${(inputs.interestRate * 100).toFixed(1)}% interest rate leaves the business vulnerable to macroeconomic shocks.  
  *Mitigant:* We will execute an interest rate swap to hedge 75% of the floating debt exposure into fixed rates. Furthermore, the company's defensive contract structure guarantees stable cash flows even in recessionary environments.
- **Risk 2: Exit Multiple Contraction.** The ${sector} sector is currently trading at elevated levels, presenting risk of sector-wide valuation compression by Year ${inputs.holdPeriod}.
  *Mitigant:* Our returns underwriting does not rely on multiple expansion. As shown in our sensitivity grid, even if the exit multiple contracts by 2.0x to ${contractedExit.toFixed(1)}x, the deal generates an IRR of **${downsideIRR.toFixed(1)}%** due to steady operational growth and cumulative debt paydown.
- **Risk 3: Growth Assumptions Execution.** A shortfall in the modeled ${(inputs.ebitdaGrowth * 100).toFixed(1)}% EBITDA growth rate would impair returns.  
  *Mitigant:* The management team has a proven track record of executing add-on acquisitions. We have identified three immediate synergy-rich targets that can support growth even if organic sales slow.
`;
}
