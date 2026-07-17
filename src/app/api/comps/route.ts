import { NextRequest, NextResponse } from 'next/server';
import { getCache, setCache } from '@/lib/cache';
import { getFallbackData, PeerMetrics } from '@/lib/mockData';
import { Groq } from 'groq-sdk';

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const ticker = (searchParams.get('ticker') || 'AAPL').toUpperCase().trim();
  const queryApiKey = searchParams.get('fmpKey');
  const queryGroqKey = searchParams.get('groqKey');
  
  // Resolve API Key: query parameter first, then env variable
  const apiKey = queryApiKey || process.env.FMP_API_KEY || '';
  const groqKey = queryGroqKey || process.env.GROQ_API_KEY || '';

  if (!ticker) {
    return NextResponse.json({ error: 'Ticker is required' }, { status: 400 });
  }

  // If no API Key is available, immediately return mock data
  if (!apiKey) {
    const mock = getFallbackData(ticker);
    const aggregates = calculateAggregates(mock.peers);
    return NextResponse.json({
      ...mock,
      aggregates,
      source: 'mock',
      message: 'No API key provided. Displaying sector-specific mock data.'
    });
  }

  const cacheKey = `comps-${ticker}-${apiKey.slice(-5)}`; // Cache key includes suffix of API key for safety

  try {
    // 1. Check final cache first
    const cachedResponse = await getCache<any>(cacheKey);
    if (cachedResponse) {
      return NextResponse.json({
        ...cachedResponse,
        source: 'cache'
      });
    }

    // 2. Resolve sector and peer list dynamically using target profile
    const dynamicInfo = await getDynamicPeersAndSector(ticker, apiKey);
    const allSymbols = Array.from(new Set([ticker, ...dynamicInfo.peers]));

    // 3. Fetch metrics for each symbol (utilizing granular symbol-level cache)
    const metricsPromises = allSymbols.map(symbol => fetchCompanyMetrics(symbol, apiKey));
    const resolvedMetricsResults = await Promise.all(metricsPromises);

    // Filter out failed metric fetches
    const validMetrics = resolvedMetricsResults.filter((m): m is PeerMetrics => m !== null);
    
    // Separate target from peers
    const targetMetrics = validMetrics.find(m => m.symbol === ticker);
    const peersMetrics = validMetrics.filter(m => m.symbol !== ticker);

    if (!targetMetrics) {
      throw new Error(`Failed to fetch metrics for target company: ${ticker}`);
    }

    // 4. Calculate aggregated metrics across peers
    const peerAggregates = calculateAggregates(peersMetrics);

    // Get sector-appropriate precedent transactions
    const fallbackInfo = getFallbackData(ticker);

    const responseData = {
      target: targetMetrics,
      peers: peersMetrics,
      sector: dynamicInfo.sector,
      aggregates: peerAggregates,
      precedentDeals: fallbackInfo.precedentDeals,
      source: 'api'
    };

    // 5. Store in cache
    await setCache(cacheKey, responseData);

    return NextResponse.json(responseData);

  } catch (error: any) {
    console.error(`Error in /api/comps for ${ticker}:`, error.message || error);
    
    // Attempt Groq AI fallback first if a Groq key is present
    if (groqKey && !groqKey.startsWith('gsk_mock') && groqKey.trim() !== '') {
      try {
        console.log(`FMP failed for ${ticker}. Attempting Groq AI fallback...`);
        const aiComps = await fetchPeersFromGroq(ticker, groqKey);
        const aggregates = calculateAggregates(aiComps.peers);
        // AI fallback doesn't generate precedent deals — pull the sector-curated set
        const fallbackInfo = getFallbackData(ticker);
        const responseData = {
          ...aiComps,
          aggregates,
          precedentDeals: fallbackInfo.precedentDeals,
          message: `FMP API unavailable for ${ticker}. comps generated dynamically via Llama-3.1.`
        };
        // Store in cache
        await setCache(cacheKey, responseData);
        return NextResponse.json(responseData);
      } catch (aiError: any) {
        console.error('Groq AI fallback failed:', aiError.message || aiError);
      }
    }

    // Serve fallback mock data on error (like rate limit or invalid key)
    const mock = getFallbackData(ticker);
    const aggregates = calculateAggregates(mock.peers);
    return NextResponse.json({
      ...mock,
      aggregates,
      source: 'mock_fallback',
      message: `API Error: ${error.message || 'Unknown error'}. Showing mock data.`
    });
  }
}

// Fetch helper with cache integration
async function fetchCompanyMetrics(symbol: string, apiKey: string): Promise<PeerMetrics | null> {
  const cacheKey = `symbol-metrics-${symbol}`;
  
  // Try cache first
  const cachedMetrics = await getCache<PeerMetrics>(cacheKey);
  if (cachedMetrics) {
    return cachedMetrics;
  }

  try {
    // Endpoints (FMP moved path parameters to symbol query parameters in stable version)
    const keyMetricsUrl = `https://financialmodelingprep.com/stable/key-metrics-ttm?symbol=${symbol}&apikey=${apiKey}`;
    const ratiosUrl = `https://financialmodelingprep.com/stable/ratios-ttm?symbol=${symbol}&apikey=${apiKey}`;
    const growthUrl = `https://financialmodelingprep.com/stable/financial-growth?symbol=${symbol}&limit=1&apikey=${apiKey}`;

    const [keyMetricsRes, ratiosRes, growthRes] = await Promise.all([
      fetch(keyMetricsUrl),
      fetch(ratiosUrl),
      fetch(growthUrl)
    ]);

    if (keyMetricsRes.status === 401 || keyMetricsRes.status === 403) {
      throw new Error('Invalid FMP API Key');
    }

    if (!keyMetricsRes.ok) return null;

    const keyMetricsData = await keyMetricsRes.json();
    const ratiosData = ratiosRes.ok ? await ratiosRes.json() : [];
    const growthData = growthRes.ok ? await growthRes.json() : [];

    const keyMetrics = Array.isArray(keyMetricsData) && keyMetricsData[0] ? keyMetricsData[0] : {};
    const ratios = Array.isArray(ratiosData) && ratiosData[0] ? ratiosData[0] : {};
    const growth = Array.isArray(growthData) && growthData[0] ? growthData[0] : {};

    // Get company profile for company name
    const profileUrl = `https://financialmodelingprep.com/stable/profile?symbol=${symbol}&apikey=${apiKey}`;
    const profileRes = await fetch(profileUrl);
    const profileData = profileRes.ok ? await profileRes.json() : [];
    const profile = Array.isArray(profileData) && profileData[0] ? profileData[0] : {};
    
    const companyName = profile.companyName || keyMetrics.companyName || symbol;
    const marketCap = profile.mcap || keyMetrics.marketCapTTM || 0;
    const enterpriseValue = keyMetrics.enterpriseValueTTM || profile.ev || 0;

    // Standardize multiples (aligned to FMP stable endpoint JSON structure)
    // EV/EBITDA is keyMetrics.evToEBITDATTM
    const evToEBITDATTM = keyMetrics.evToEBITDATTM || (enterpriseValue && keyMetrics.ebitdaTTM ? enterpriseValue / keyMetrics.ebitdaTTM : 12.0);
    // EV/Revenue is keyMetrics.evToSalesTTM
    const evToSalesTTM = keyMetrics.evToSalesTTM || 3.0;
    // P/E is ratios.priceToEarningsRatioTTM
    const peRatioTTM = ratios.priceToEarningsRatioTTM || keyMetrics.peRatioTTM || 18.0;
    // Gross Margin is ratios.grossProfitMarginTTM
    const grossProfitMarginTTM = ratios.grossProfitMarginTTM || 0.40;
    // Revenue Growth is growth.revenueGrowth
    const revenueGrowth = growth.revenueGrowth || 0.05;

    const metrics: PeerMetrics = {
      symbol,
      companyName,
      evToEBITDATTM: Math.round(Number(evToEBITDATTM) * 10) / 10,
      evToSalesTTM: Math.round(Number(evToSalesTTM) * 10) / 10,
      peRatioTTM: Math.round(Number(peRatioTTM) * 10) / 10,
      grossProfitMarginTTM: Math.round(Number(grossProfitMarginTTM) * 1000) / 1000,
      revenueGrowth: Math.round(Number(revenueGrowth) * 1000) / 1000,
      marketCap: Math.round(marketCap / 1000000), // In Millions
      enterpriseValue: Math.round(enterpriseValue / 1000000) // In Millions
    };

    // Cache symbol metrics
    await setCache(cacheKey, metrics);
    return metrics;
  } catch (error: any) {
    console.error(`Failed fetching metrics for ${symbol}:`, error);
    if (error.message === 'Invalid FMP API Key') {
      throw error;
    }
    return null;
  }
}

function calculateAggregates(peers: PeerMetrics[]) {
  if (peers.length === 0) {
    return {
      evToEBITDA: { median: 12.0, mean: 12.0, min: 10.0, max: 15.0 },
      evToSales: { median: 3.0, mean: 3.0, min: 2.0, max: 4.5 },
      peRatio: { median: 18.0, mean: 18.0, min: 14.0, max: 22.0 }
    };
  }

  const getStats = (values: number[]) => {
    const sorted = [...values].sort((a, b) => a - b);
    const min = sorted[0];
    const max = sorted[sorted.length - 1];
    const mean = sorted.reduce((a, b) => a + b, 0) / sorted.length;
    
    let median = 0;
    const mid = Math.floor(sorted.length / 2);
    if (sorted.length % 2 === 0) {
      median = (sorted[mid - 1] + sorted[mid]) / 2;
    } else {
      median = sorted[mid];
    }

    return {
      min: Math.round(min * 10) / 10,
      max: Math.round(max * 10) / 10,
      mean: Math.round(mean * 10) / 10,
      median: Math.round(median * 10) / 10
    };
  };

  return {
    evToEBITDA: getStats(peers.map(p => p.evToEBITDATTM).filter(v => v > 0)),
    evToSales: getStats(peers.map(p => p.evToSalesTTM).filter(v => v > 0)),
    peRatio: getStats(peers.map(p => p.peRatioTTM).filter(v => v > 0))
  };
}

// Dynamically retrieves target profile to classify sector and generate region-appropriate peers
async function getDynamicPeersAndSector(ticker: string, apiKey: string) {
  // 1. Fetch profile to get sector
  const profileUrl = `https://financialmodelingprep.com/stable/profile?symbol=${ticker}&apikey=${apiKey}`;
  let sector = 'Technology';
  
  try {
    const res = await fetch(profileUrl);
    const data = await res.json();
    if (Array.isArray(data) && data.length > 0) {
      sector = data[0].sector || 'Technology';
    }
  } catch (err) {
    console.error('Failed to fetch profile for', ticker, err);
  }

  // 2. Map FMP sector string to one of our 4 standard sectors
  let mappedSector: 'Technology' | 'Healthcare' | 'Consumer' | 'Industrials' = 'Technology';
  const sectorLower = sector.toLowerCase();
  if (sectorLower.includes('health') || sectorLower.includes('pharm') || sectorLower.includes('biotech')) {
    mappedSector = 'Healthcare';
  } else if (sectorLower.includes('consumer') || sectorLower.includes('retail') || sectorLower.includes('automotive') || sectorLower.includes('services') || sectorLower.includes('food') || sectorLower.includes('beverage')) {
    mappedSector = 'Consumer';
  } else if (sectorLower.includes('industrial') || sectorLower.includes('energy') || sectorLower.includes('basic materials') || sectorLower.includes('utilities') || sectorLower.includes('construction') || sectorLower.includes('conglomerates') || sectorLower.includes('transport')) {
    mappedSector = 'Industrials';
  }

  // 3. Select US or Indian peers based on ticker suffix
  const isIndian = ticker.toUpperCase().endsWith('.NS') || ticker.toUpperCase().endsWith('.BO');
  let peers: string[] = [];
  
  if (isIndian) {
    if (mappedSector === 'Technology') {
      peers = ["TCS.NS", "INFY.NS", "WIPRO.NS", "HCLTECH.NS", "TECHM.NS"];
    } else if (mappedSector === 'Healthcare') {
      peers = ["SUNPHARMA.NS", "CIPLA.NS", "DRREDDY.NS", "LUPIN.NS", "TORNTPHARM.NS"];
    } else if (mappedSector === 'Consumer') {
      peers = ["TATAMOTORS.NS", "MARUTI.NS", "M&M.NS", "HINDUNILVR.NS", "ITC.NS"];
    } else {
      peers = ["RELIANCE.NS", "LT.NS", "ONGC.NS", "IOC.NS", "BPCL.NS"];
    }
  } else {
    if (mappedSector === 'Technology') {
      peers = ["AAPL", "MSFT", "GOOGL", "AMZN", "NVDA", "META"];
    } else if (mappedSector === 'Healthcare') {
      peers = ["JNJ", "PFE", "LLY", "MRK", "ABBV", "AMGN"];
    } else if (mappedSector === 'Consumer') {
      peers = ["PG", "KO", "PEP", "NKE", "MCD", "WMT"];
    } else {
      peers = ["CAT", "DE", "HON", "GE", "LMT", "UNP"];
    }
  }

  // Exclude target company from peers list if it exists in it
  const cleanTicker = ticker.toUpperCase().trim();
  peers = peers.filter(p => p !== cleanTicker);

  return { sector: mappedSector, peers };
}

// Dynamically queries Groq Llama-3.1 model to generate a peer comparable group and multiples
async function fetchPeersFromGroq(ticker: string, apiKey: string) {
  if (!apiKey || apiKey.startsWith('gsk_mock') || apiKey.trim() === '') {
    throw new Error('No valid Groq key available');
  }

  const groq = new Groq({ apiKey });
  
  const systemPrompt = `You are a Senior Investment Banking Analyst. Your task is to output comparable public companies and valuation metrics for a given target ticker.
Your output must be a single, raw JSON object ONLY, with absolutely no formatting markdown code blocks (no \`\`\`json), no trailing commas, no conversational text, and no explanation.

JSON Format:
{
  "target": {
    "symbol": "TICKER_SYMBOL",
    "companyName": "Company Name",
    "evToEBITDATTM": 15.4,
    "evToSalesTTM": 3.2,
    "peRatioTTM": 22.5,
    "grossProfitMarginTTM": 0.45,
    "revenueGrowth": 0.08,
    "marketCap": 25000,
    "enterpriseValue": 28000
  },
  "peers": [
    {
      "symbol": "PEER_TICKER",
      "companyName": "Peer Company Name",
      "evToEBITDATTM": 14.2,
      "evToSalesTTM": 3.0,
      "peRatioTTM": 20.1,
      "grossProfitMarginTTM": 0.42,
      "revenueGrowth": 0.06,
      "marketCap": 18000,
      "enterpriseValue": 19500
    }
  ],
  "sector": "Technology"
}

Sectors allowed: Technology, Healthcare, Consumer, Industrials.
For Indian targets (e.g. RELIANCE.NS, TCS.NS), provide actual Indian peers (with .NS or .BO suffix) and realistic multiples in local contexts. Estimates of margins and growth should be represented as decimal fractions (e.g. 0.45 for 45%).`;

  const userPrompt = `Generate the public comps data for target ticker: ${ticker}. Ensure all properties match the schema. Return only the JSON object.`;

  const chatCompletion = await groq.chat.completions.create({
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ],
    model: 'llama-3.1-8b-instant',
    temperature: 0.1,
    max_tokens: 1000,
    response_format: { type: 'json_object' }
  });

  const responseText = chatCompletion.choices[0]?.message?.content || '{}';
  const cleanJson = responseText.trim().replace(/^```json\s*/i, '').replace(/```$/, '');
  const parsed = JSON.parse(cleanJson);

  // Validate parsed fields to ensure compatibility
  if (!parsed.target || !parsed.peers || !Array.isArray(parsed.peers)) {
    throw new Error('Invalid JSON structure returned by LLM');
  }

  // Ensure sector is mapped properly
  let sector = parsed.sector || 'Technology';
  if (!['Technology', 'Healthcare', 'Consumer', 'Industrials'].includes(sector)) {
    sector = 'Technology';
  }

  // Ensure metrics are clean numbers
  const sanitizeMetric = (m: any, fallbackSymbol: string): PeerMetrics => ({
    symbol: (m.symbol || fallbackSymbol).toUpperCase(),
    companyName: m.companyName || fallbackSymbol,
    evToEBITDATTM: Number(m.evToEBITDATTM) || 12.0,
    evToSalesTTM: Number(m.evToSalesTTM) || 3.0,
    peRatioTTM: Number(m.peRatioTTM) || 18.0,
    grossProfitMarginTTM: Number(m.grossProfitMarginTTM) || 0.4,
    revenueGrowth: Number(m.revenueGrowth) || 0.05,
    marketCap: Number(m.marketCap) || 10000,
    enterpriseValue: Number(m.enterpriseValue) || 11000
  });

  const targetMetrics = sanitizeMetric(parsed.target, ticker);
  const peersMetrics = parsed.peers.map((p: any, i: number) => sanitizeMetric(p, `PEER${i}`));

  return {
    target: targetMetrics,
    peers: peersMetrics,
    sector,
    source: 'ai_fallback'
  };
}
