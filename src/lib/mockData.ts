export interface PeerMetrics {
  symbol: string;
  companyName: string;
  evToEBITDATTM: number;
  evToSalesTTM: number;
  peRatioTTM: number;
  grossProfitMarginTTM: number;
  revenueGrowth: number;
  marketCap?: number;
  enterpriseValue?: number;
}

export interface PrecedentTransaction {
  target: string;
  acquirer: string;
  year: number;
  dealSize: number; // in $ Millions
  evToEBITDA: number;
  evToRevenue: number;
  description: string;
}

export interface SectorData {
  sector: string;
  precedentTransactions: PrecedentTransaction[];
}

export const PRECEDENT_TRANSACTIONS: Record<string, PrecedentTransaction[]> = {
  Technology: [
    { target: "Figma", acquirer: "Adobe", year: 2022, dealSize: 20000, evToEBITDA: 100.0, evToRevenue: 50.0, description: "Design software platform (terminated due to regulatory pressure, but multiples remain benchmark)" },
    { target: "Activision Blizzard", acquirer: "Microsoft", year: 2023, dealSize: 68700, evToEBITDA: 31.8, evToRevenue: 9.1, description: "Gaming publisher consolidation" },
    { target: "Slack Technologies", acquirer: "Salesforce", year: 2021, dealSize: 27700, evToEBITDA: 85.4, evToRevenue: 27.5, description: "Enterprise collaboration software integration" },
    { target: "VMware", acquirer: "Broadcom", year: 2023, dealSize: 61000, evToEBITDA: 20.3, evToRevenue: 4.8, description: "Enterprise virtualization software acquisition" },
    { target: "Splunk", acquirer: "Cisco Systems", year: 2024, dealSize: 28000, evToEBITDA: 30.5, evToRevenue: 7.2, description: "Observability and cybersecurity platform" },
    { target: "Ansys", acquirer: "Synopsys", year: 2024, dealSize: 35000, evToEBITDA: 41.2, evToRevenue: 15.6, description: "Engineering simulation software" }
  ],
  Healthcare: [
    { target: "Seagen", acquirer: "Pfizer", year: 2023, dealSize: 43000, evToEBITDA: 45.0, evToRevenue: 21.5, description: "Oncology biopharma acquisition" },
    { target: "Horizon Therapeutics", acquirer: "Amgen", year: 2023, dealSize: 27800, evToEBITDA: 18.2, evToRevenue: 7.7, description: "Rare disease biotechnology" },
    { target: "Prometheus Biosciences", acquirer: "Merck", year: 2023, dealSize: 10800, evToEBITDA: -12.0, evToRevenue: 35.0, description: "Immunology therapeutics development stage" },
    { target: "Oak Street Health", acquirer: "CVS Health", year: 2023, dealSize: 10600, evToEBITDA: -15.4, evToRevenue: 4.9, description: "Primary care medical clinics acquisition" },
    { target: "Karuna Therapeutics", acquirer: "Bristol Myers Squibb", year: 2024, dealSize: 14000, evToEBITDA: -8.0, evToRevenue: 52.0, description: "Neuroscience drug pipeline development" }
  ],
  Consumer: [
    { target: "Subway", acquirer: "Roark Capital", year: 2023, dealSize: 9600, evToEBITDA: 12.5, evToRevenue: 2.8, description: "Quick service restaurant chain" },
    { target: "L'Occitane (Privatization)", acquirer: "Reinold Geiger", year: 2024, dealSize: 6400, evToEBITDA: 14.2, evToRevenue: 2.3, description: "Premium beauty and cosmetics retail" },
    { target: "Tiffany & Co.", acquirer: "LVMH", year: 2021, dealSize: 15800, evToEBITDA: 18.6, evToRevenue: 3.6, description: "Luxury jewelry brand integration" },
    { target: "Tapestry", acquirer: "Capri Holdings", year: 2023, dealSize: 8500, evToEBITDA: 9.8, evToRevenue: 1.5, description: "Fashion brands merger (Coach and Michael Kors)" },
    { target: "Boston Beer Company", acquirer: "PepsiCo (Joint Venture/Stk)", year: 2023, dealSize: 4200, evToEBITDA: 16.5, evToRevenue: 2.1, description: "Craft beverage and hard seltzer manufacturer" }
  ],
  Industrials: [
    { target: "Carrier Commercial Refrigeration", acquirer: "Haier Smart Home", year: 2023, dealSize: 640, evToEBITDA: 9.5, evToRevenue: 0.8, description: "Industrial cold chain infrastructure division" },
    { target: "Algonquin Power (Water Div)", acquirer: "Corix", year: 2024, dealSize: 2300, evToEBITDA: 15.2, evToRevenue: 4.5, description: "Regulated water utility distribution" },
    { target: "Copeland (Emerson Climate)", acquirer: "Blackstone", year: 2023, dealSize: 14000, evToEBITDA: 12.8, evToRevenue: 2.1, description: "HVAC and compressor technologies buyout" },
    { target: "Arconic", acquirer: "Apollo Global Management", year: 2023, dealSize: 5200, evToEBITDA: 11.2, evToRevenue: 0.6, description: "Aerospace aluminum components LBO" },
    { target: "National Gas Transmission (UK)", acquirer: "Macquarie", year: 2023, dealSize: 12200, evToEBITDA: 13.5, evToRevenue: 4.1, description: "Critical energy transmission infrastructure privatization" }
  ]
};

export const MOCK_TICKERS: Record<string, { name: string; sector: string; metrics: PeerMetrics; peers: string[] }> = {
  AAPL: {
    name: "Apple Inc.",
    sector: "Technology",
    metrics: { symbol: "AAPL", companyName: "Apple Inc.", evToEBITDATTM: 24.8, evToSalesTTM: 7.2, peRatioTTM: 28.5, grossProfitMarginTTM: 0.462, revenueGrowth: 0.048, marketCap: 3200000, enterpriseValue: 3180000 },
    peers: ["MSFT", "GOOGL", "AMZN", "META", "NVDA", "NFLX"]
  },
  MSFT: {
    name: "Microsoft Corporation",
    sector: "Technology",
    metrics: { symbol: "MSFT", companyName: "Microsoft Corporation", evToEBITDATTM: 26.5, evToSalesTTM: 11.5, peRatioTTM: 32.1, grossProfitMarginTTM: 0.698, revenueGrowth: 0.125, marketCap: 3050000, enterpriseValue: 3020000 },
    peers: ["AAPL", "GOOGL", "ORCL", "CRM", "ADBE", "NVDA"]
  },
  NVDA: {
    name: "NVIDIA Corporation",
    sector: "Technology",
    metrics: { symbol: "NVDA", companyName: "NVIDIA Corporation", evToEBITDATTM: 45.2, evToSalesTTM: 22.4, peRatioTTM: 65.8, grossProfitMarginTTM: 0.753, revenueGrowth: 1.150, marketCap: 2800000, enterpriseValue: 2790000 },
    peers: ["AMD", "INTC", "AVGO", "QCOM", "TSM", "MSFT"]
  },
  NFLX: {
    name: "Netflix, Inc.",
    sector: "Technology",
    metrics: { symbol: "NFLX", companyName: "Netflix, Inc.", evToEBITDATTM: 22.1, evToSalesTTM: 6.8, peRatioTTM: 38.2, grossProfitMarginTTM: 0.435, revenueGrowth: 0.152, marketCap: 280000, enterpriseValue: 290000 },
    peers: ["DIS", "WBD", "PARA", "CMCSA", "SONY", "SPOT"]
  },
  AMZN: {
    name: "Amazon.com, Inc.",
    sector: "Technology",
    metrics: { symbol: "AMZN", companyName: "Amazon.com, Inc.", evToEBITDATTM: 18.2, evToSalesTTM: 3.1, peRatioTTM: 40.5, grossProfitMarginTTM: 0.485, revenueGrowth: 0.118, marketCap: 1950000, enterpriseValue: 1980000 },
    peers: ["WMT", "TGT", "EBAY", "BABA", "MELI", "COST"]
  },
  JNJ: {
    name: "Johnson & Johnson",
    sector: "Healthcare",
    metrics: { symbol: "JNJ", companyName: "Johnson & Johnson", evToEBITDATTM: 14.1, evToSalesTTM: 4.2, peRatioTTM: 16.5, grossProfitMarginTTM: 0.675, revenueGrowth: 0.052, marketCap: 380000, enterpriseValue: 405000 },
    peers: ["PFE", "LLY", "MRK", "ABBV", "BMY", "AMGN"]
  },
  PG: {
    name: "Procter & Gamble Co.",
    sector: "Consumer",
    metrics: { symbol: "PG", companyName: "Procter & Gamble Co.", evToEBITDATTM: 17.5, evToSalesTTM: 4.8, peRatioTTM: 24.2, grossProfitMarginTTM: 0.512, revenueGrowth: 0.032, marketCap: 390000, enterpriseValue: 415000 },
    peers: ["KO", "PEP", "CL", "KMB", "UL", "EL"]
  },
  CAT: {
    name: "Caterpillar Inc.",
    sector: "Industrials",
    metrics: { symbol: "CAT", companyName: "Caterpillar Inc.", evToEBITDATTM: 11.8, evToSalesTTM: 2.1, peRatioTTM: 14.8, grossProfitMarginTTM: 0.315, revenueGrowth: 0.061, marketCap: 160000, enterpriseValue: 182000 },
    peers: ["DE", "CNH", "PCAR", "ETN", "GE", "HON"]
  },
  TSLA: {
    name: "Tesla Inc.",
    sector: "Consumer",
    metrics: { symbol: "TSLA", companyName: "Tesla Inc.", evToEBITDATTM: 32.5, evToSalesTTM: 6.2, peRatioTTM: 52.8, grossProfitMarginTTM: 0.178, revenueGrowth: 0.085, marketCap: 650000, enterpriseValue: 642000 },
    peers: ["RIVN", "LCID", "NIO", "F", "GM"]
  },
  TESLA: {
    name: "Tesla Inc.",
    sector: "Consumer",
    metrics: { symbol: "TSLA", companyName: "Tesla Inc.", evToEBITDATTM: 32.5, evToSalesTTM: 6.2, peRatioTTM: 52.8, grossProfitMarginTTM: 0.178, revenueGrowth: 0.085, marketCap: 650000, enterpriseValue: 642000 },
    peers: ["RIVN", "LCID", "NIO", "F", "GM"]
  },
  RIVN: {
    name: "Rivian Automotive, Inc.",
    sector: "Consumer",
    metrics: { symbol: "RIVN", companyName: "Rivian Automotive, Inc.", evToEBITDATTM: -8.5, evToSalesTTM: 1.8, peRatioTTM: -5.2, grossProfitMarginTTM: -0.125, revenueGrowth: 0.22, marketCap: 11000, enterpriseValue: 12500 },
    peers: ["TSLA", "LCID", "NIO", "F", "GM"]
  },
  LCID: {
    name: "Lucid Group, Inc.",
    sector: "Consumer",
    metrics: { symbol: "LCID", companyName: "Lucid Group, Inc.", evToEBITDATTM: -5.4, evToSalesTTM: 4.8, peRatioTTM: -2.3, grossProfitMarginTTM: -0.85, revenueGrowth: 0.15, marketCap: 6000, enterpriseValue: 7500 },
    peers: ["TSLA", "RIVN", "NIO", "F", "GM"]
  },
  NIO: {
    name: "NIO Inc.",
    sector: "Consumer",
    metrics: { symbol: "NIO", companyName: "NIO Inc.", evToEBITDATTM: -10.2, evToSalesTTM: 1.1, peRatioTTM: -4.8, grossProfitMarginTTM: 0.055, revenueGrowth: 0.12, marketCap: 8000, enterpriseValue: 9200 },
    peers: ["TSLA", "RIVN", "LCID", "F", "GM"]
  },
  F: {
    name: "Ford Motor Company",
    sector: "Consumer",
    metrics: { symbol: "F", companyName: "Ford Motor Company", evToEBITDATTM: 9.8, evToSalesTTM: 2.1, peRatioTTM: 11.2, grossProfitMarginTTM: 0.145, revenueGrowth: 0.045, marketCap: 45000, enterpriseValue: 132000 },
    peers: ["GM", "TSLA", "RIVN", "LCID", "NIO"]
  },
  GM: {
    name: "General Motors Company",
    sector: "Consumer",
    metrics: { symbol: "GM", companyName: "General Motors Company", evToEBITDATTM: 7.2, evToSalesTTM: 1.8, peRatioTTM: 8.5, grossProfitMarginTTM: 0.132, revenueGrowth: 0.038, marketCap: 52000, enterpriseValue: 118000 },
    peers: ["F", "TSLA", "RIVN", "LCID", "NIO"]
  },
  // Indian listed companies (mapped to standard local PE/IB multiples)
  "RELIANCE.NS": {
    name: "Reliance Industries Limited",
    sector: "Industrials",
    metrics: { symbol: "RELIANCE.NS", companyName: "Reliance Industries Limited", evToEBITDATTM: 14.3, evToSalesTTM: 2.8, peRatioTTM: 21.6, grossProfitMarginTTM: 0.403, revenueGrowth: 0.044, marketCap: 220000, enterpriseValue: 245000 },
    peers: ["ONGC.NS", "IOC.NS", "BPCL.NS", "LT.NS"]
  },
  "TCS.NS": {
    name: "Tata Consultancy Services Ltd",
    sector: "Technology",
    metrics: { symbol: "TCS.NS", companyName: "Tata Consultancy Services Ltd", evToEBITDATTM: 22.5, evToSalesTTM: 5.8, peRatioTTM: 28.2, grossProfitMarginTTM: 0.415, revenueGrowth: 0.085, marketCap: 145000, enterpriseValue: 142000 },
    peers: ["INFY.NS", "WIPRO.NS", "HCLTECH.NS", "TECHM.NS"]
  },
  "INFY.NS": {
    name: "Infosys Limited",
    sector: "Technology",
    metrics: { symbol: "INFY.NS", companyName: "Infosys Limited", evToEBITDATTM: 18.5, evToSalesTTM: 4.5, peRatioTTM: 24.1, grossProfitMarginTTM: 0.328, revenueGrowth: 0.068, marketCap: 75000, enterpriseValue: 72000 },
    peers: ["TCS.NS", "WIPRO.NS", "HCLTECH.NS", "TECHM.NS"]
  },
  "WIPRO.NS": {
    name: "Wipro Limited",
    sector: "Technology",
    metrics: { symbol: "WIPRO.NS", companyName: "Wipro Limited", evToEBITDATTM: 14.2, evToSalesTTM: 3.1, peRatioTTM: 19.5, grossProfitMarginTTM: 0.285, revenueGrowth: 0.042, marketCap: 32000, enterpriseValue: 30000 },
    peers: ["TCS.NS", "INFY.NS", "HCLTECH.NS", "TECHM.NS"]
  },
  "HCLTECH.NS": {
    name: "HCL Technologies Ltd",
    sector: "Technology",
    metrics: { symbol: "HCLTECH.NS", companyName: "HCL Technologies Ltd", evToEBITDATTM: 16.1, evToSalesTTM: 3.8, peRatioTTM: 21.8, grossProfitMarginTTM: 0.342, revenueGrowth: 0.075, marketCap: 45000, enterpriseValue: 43000 },
    peers: ["TCS.NS", "INFY.NS", "WIPRO.NS", "TECHM.NS"]
  },
  "TECHM.NS": {
    name: "Tech Mahindra Limited",
    sector: "Technology",
    metrics: { symbol: "TECHM.NS", companyName: "Tech Mahindra Limited", evToEBITDATTM: 12.8, evToSalesTTM: 2.6, peRatioTTM: 17.4, grossProfitMarginTTM: 0.268, revenueGrowth: 0.038, marketCap: 15000, enterpriseValue: 14500 },
    peers: ["TCS.NS", "INFY.NS", "WIPRO.NS", "HCLTECH.NS"]
  },
  "SUNPHARMA.NS": {
    name: "Sun Pharmaceutical Industries",
    sector: "Healthcare",
    metrics: { symbol: "SUNPHARMA.NS", companyName: "Sun Pharmaceutical Industries", evToEBITDATTM: 21.4, evToSalesTTM: 5.2, peRatioTTM: 29.5, grossProfitMarginTTM: 0.625, revenueGrowth: 0.108, marketCap: 38000, enterpriseValue: 37000 },
    peers: ["CIPLA.NS", "DRREDDY.NS", "LUPIN.NS", "TORNTPHARM.NS"]
  },
  "CIPLA.NS": {
    name: "Cipla Limited",
    sector: "Healthcare",
    metrics: { symbol: "CIPLA.NS", companyName: "Cipla Limited", evToEBITDATTM: 16.8, evToSalesTTM: 3.8, peRatioTTM: 23.4, grossProfitMarginTTM: 0.582, revenueGrowth: 0.082, marketCap: 14000, enterpriseValue: 13500 },
    peers: ["SUNPHARMA.NS", "DRREDDY.NS", "LUPIN.NS", "TORNTPHARM.NS"]
  },
  "DRREDDY.NS": {
    name: "Dr. Reddy's Laboratories",
    sector: "Healthcare",
    metrics: { symbol: "DRREDDY.NS", companyName: "Dr. Reddy's Laboratories", evToEBITDATTM: 14.5, evToSalesTTM: 3.2, peRatioTTM: 18.6, grossProfitMarginTTM: 0.568, revenueGrowth: 0.074, marketCap: 12000, enterpriseValue: 11500 },
    peers: ["SUNPHARMA.NS", "CIPLA.NS", "LUPIN.NS", "TORNTPHARM.NS"]
  },
  "LUPIN.NS": {
    name: "Lupin Limited",
    sector: "Healthcare",
    metrics: { symbol: "LUPIN.NS", companyName: "Lupin Limited", evToEBITDATTM: 12.2, evToSalesTTM: 2.4, peRatioTTM: 16.5, grossProfitMarginTTM: 0.525, revenueGrowth: 0.051, marketCap: 8000, enterpriseValue: 7800 },
    peers: ["SUNPHARMA.NS", "CIPLA.NS", "DRREDDY.NS", "TORNTPHARM.NS"]
  },
  "TORNTPHARM.NS": {
    name: "Torrent Pharmaceuticals Ltd",
    sector: "Healthcare",
    metrics: { symbol: "TORNTPHARM.NS", companyName: "Torrent Pharmaceuticals Ltd", evToEBITDATTM: 18.2, evToSalesTTM: 4.6, peRatioTTM: 26.8, grossProfitMarginTTM: 0.604, revenueGrowth: 0.092, marketCap: 9500, enterpriseValue: 9200 },
    peers: ["SUNPHARMA.NS", "CIPLA.NS", "DRREDDY.NS", "LUPIN.NS"]
  },
  "TATAMOTORS.NS": {
    name: "Tata Motors Limited",
    sector: "Consumer",
    metrics: { symbol: "TATAMOTORS.NS", companyName: "Tata Motors Limited", evToEBITDATTM: 8.5, evToSalesTTM: 1.2, peRatioTTM: 12.4, grossProfitMarginTTM: 0.185, revenueGrowth: 0.145, marketCap: 38000, enterpriseValue: 46000 },
    peers: ["MARUTI.NS", "M&M.NS", "HEROMOTOCO.NS", "ASHOKLEY.NS"]
  },
  "MARUTI.NS": {
    name: "Maruti Suzuki India Limited",
    sector: "Consumer",
    metrics: { symbol: "MARUTI.NS", companyName: "Maruti Suzuki India Limited", evToEBITDATTM: 14.2, evToSalesTTM: 2.4, peRatioTTM: 22.5, grossProfitMarginTTM: 0.218, revenueGrowth: 0.082, marketCap: 35000, enterpriseValue: 33000 },
    peers: ["TATAMOTORS.NS", "M&M.NS", "HEROMOTOCO.NS", "ASHOKLEY.NS"]
  },
  "M&M.NS": {
    name: "Mahindra & Mahindra Limited",
    sector: "Consumer",
    metrics: { symbol: "M&M.NS", companyName: "Mahindra & Mahindra Limited", evToEBITDATTM: 11.8, evToSalesTTM: 1.8, peRatioTTM: 18.2, grossProfitMarginTTM: 0.205, revenueGrowth: 0.112, marketCap: 28000, enterpriseValue: 27000 },
    peers: ["TATAMOTORS.NS", "MARUTI.NS", "HEROMOTOCO.NS", "ASHOKLEY.NS"]
  },
  "HEROMOTOCO.NS": {
    name: "Hero MotoCorp Limited",
    sector: "Consumer",
    metrics: { symbol: "HEROMOTOCO.NS", companyName: "Hero MotoCorp Limited", evToEBITDATTM: 10.5, evToSalesTTM: 1.5, peRatioTTM: 15.8, grossProfitMarginTTM: 0.252, revenueGrowth: 0.054, marketCap: 9000, enterpriseValue: 8500 },
    peers: ["TATAMOTORS.NS", "MARUTI.NS", "M&M.NS", "ASHOKLEY.NS"]
  },
  "ASHOKLEY.NS": {
    name: "Ashok Leyland Limited",
    sector: "Consumer",
    metrics: { symbol: "ASHOKLEY.NS", companyName: "Ashok Leyland Limited", evToEBITDATTM: 9.2, evToSalesTTM: 1.1, peRatioTTM: 14.1, grossProfitMarginTTM: 0.174, revenueGrowth: 0.078, marketCap: 6500, enterpriseValue: 7000 },
    peers: ["TATAMOTORS.NS", "MARUTI.NS", "M&M.NS", "HEROMOTOCO.NS"]
  },
  "HINDUNILVR.NS": {
    name: "Hindustan Unilever Limited",
    sector: "Consumer",
    metrics: { symbol: "HINDUNILVR.NS", companyName: "Hindustan Unilever Limited", evToEBITDATTM: 28.5, evToSalesTTM: 7.2, peRatioTTM: 36.4, grossProfitMarginTTM: 0.505, revenueGrowth: 0.052, marketCap: 72000, enterpriseValue: 71000 },
    peers: ["ITC.NS", "MARUTI.NS", "TATAMOTORS.NS", "M&M.NS"]
  },
  "ITC.NS": {
    name: "ITC Limited",
    sector: "Consumer",
    metrics: { symbol: "ITC.NS", companyName: "ITC Limited", evToEBITDATTM: 18.2, evToSalesTTM: 5.1, peRatioTTM: 24.5, grossProfitMarginTTM: 0.458, revenueGrowth: 0.064, marketCap: 68000, enterpriseValue: 65000 },
    peers: ["HINDUNILVR.NS", "MARUTI.NS", "TATAMOTORS.NS", "M&M.NS"]
  },
  "LT.NS": {
    name: "Larsen & Toubro Limited",
    sector: "Industrials",
    metrics: { symbol: "LT.NS", companyName: "Larsen & Toubro Limited", evToEBITDATTM: 15.8, evToSalesTTM: 1.8, peRatioTTM: 24.2, grossProfitMarginTTM: 0.148, revenueGrowth: 0.125, marketCap: 52000, enterpriseValue: 58000 },
    peers: ["RELIANCE.NS", "ONGC.NS", "IOC.NS", "BPCL.NS"]
  },
  "ONGC.NS": {
    name: "Oil & Natural Gas Corp Ltd",
    sector: "Industrials",
    metrics: { symbol: "ONGC.NS", companyName: "Oil & Natural Gas Corp Ltd", evToEBITDATTM: 6.5, evToSalesTTM: 1.2, peRatioTTM: 8.4, grossProfitMarginTTM: 0.325, revenueGrowth: 0.021, marketCap: 40000, enterpriseValue: 45000 },
    peers: ["RELIANCE.NS", "IOC.NS", "BPCL.NS", "LT.NS"]
  },
  "IOC.NS": {
    name: "Indian Oil Corporation Ltd",
    sector: "Industrials",
    metrics: { symbol: "IOC.NS", companyName: "Indian Oil Corporation Ltd", evToEBITDATTM: 5.8, evToSalesTTM: 0.8, peRatioTTM: 7.2, grossProfitMarginTTM: 0.125, revenueGrowth: 0.015, marketCap: 25000, enterpriseValue: 32000 },
    peers: ["RELIANCE.NS", "ONGC.NS", "BPCL.NS", "LT.NS"]
  },
  "BPCL.NS": {
    name: "Bharat Petroleum Corp Ltd",
    sector: "Industrials",
    metrics: { symbol: "BPCL.NS", companyName: "Bharat Petroleum Corp Ltd", evToEBITDATTM: 6.1, evToSalesTTM: 0.9, peRatioTTM: 7.8, grossProfitMarginTTM: 0.135, revenueGrowth: 0.018, marketCap: 18000, enterpriseValue: 23000 },
    peers: ["RELIANCE.NS", "ONGC.NS", "IOC.NS", "LT.NS"]
  }
};

const DEFAULT_PEER_METRICS: Record<string, Omit<PeerMetrics, "symbol" | "companyName">> = {
  Technology: { evToEBITDATTM: 22.4, evToSalesTTM: 8.5, peRatioTTM: 30.2, grossProfitMarginTTM: 0.65, revenueGrowth: 0.12 },
  Healthcare: { evToEBITDATTM: 16.8, evToSalesTTM: 5.2, peRatioTTM: 22.5, grossProfitMarginTTM: 0.60, revenueGrowth: 0.08 },
  Consumer: { evToEBITDATTM: 13.5, evToSalesTTM: 2.8, peRatioTTM: 19.4, grossProfitMarginTTM: 0.42, revenueGrowth: 0.04 },
  Industrials: { evToEBITDATTM: 11.2, evToSalesTTM: 1.8, peRatioTTM: 15.6, grossProfitMarginTTM: 0.28, revenueGrowth: 0.05 }
};

// Generates a deterministically random peer list and peer metrics based on target ticker
export function getFallbackData(ticker: string): { target: PeerMetrics; peers: PeerMetrics[]; precedentDeals: PrecedentTransaction[]; sector: string } {
  const cleanTicker = ticker.toUpperCase().trim();
  
  // Map clean Indian names to their .NS symbol equivalent for easier queries
  let searchSymbol = cleanTicker;
  const indianMappings: Record<string, string> = {
    RELIANCE: "RELIANCE.NS",
    TCS: "TCS.NS",
    INFY: "INFY.NS",
    WIPRO: "WIPRO.NS",
    HCLTECH: "HCLTECH.NS",
    TECHM: "TECHM.NS",
    SUNPHARMA: "SUNPHARMA.NS",
    CIPLA: "CIPLA.NS",
    DRREDDY: "DRREDDY.NS",
    LUPIN: "LUPIN.NS",
    TORNTPHARM: "TORNTPHARM.NS",
    TATAMOTORS: "TATAMOTORS.NS",
    MARUTI: "MARUTI.NS",
    MANDM: "M&M.NS",
    "M&M": "M&M.NS",
    HEROMOTOCO: "HEROMOTOCO.NS",
    ASHOKLEY: "ASHOKLEY.NS",
    HINDUNILVR: "HINDUNILVR.NS",
    HUL: "HINDUNILVR.NS",
    ITC: "ITC.NS",
    LT: "LT.NS",
    ONGC: "ONGC.NS",
    IOC: "IOC.NS",
    BPCL: "BPCL.NS"
  };
  if (indianMappings[cleanTicker]) {
    searchSymbol = indianMappings[cleanTicker];
  }

  const cachedMatch = MOCK_TICKERS[searchSymbol];
  
  if (cachedMatch) {
    const peersData = cachedMatch.peers.map(peerSymbol => {
      if (MOCK_TICKERS[peerSymbol]) {
        return MOCK_TICKERS[peerSymbol].metrics;
      }
      return generateDynamicPeer(peerSymbol, cachedMatch.sector);
    });
    return {
      target: cachedMatch.metrics,
      peers: peersData,
      precedentDeals: PRECEDENT_TRANSACTIONS[cachedMatch.sector] || PRECEDENT_TRANSACTIONS.Technology,
      sector: cachedMatch.sector
    };
  }

  // Create a pseudo-random sector based on the ticker name
  const sectors = ["Technology", "Healthcare", "Consumer", "Industrials"];
  const charSum = cleanTicker.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const sector = sectors[charSum % sectors.length];
  
  // Generate dynamic target metrics
  const target = generateDynamicPeer(cleanTicker, sector, true);
  
  // Generate 5 dynamic peers
  const peerSuffixes = ["CORP", "INC", "HOLD", "TECH", "SYS", "MED", "IND"];
  const peers: PeerMetrics[] = [];
  for (let i = 0; i < 5; i++) {
    const peerSymbol = `${cleanTicker.slice(0, 3)}${peerSuffixes[(charSum + i) % peerSuffixes.length].slice(0, 2)}`;
    peers.push(generateDynamicPeer(peerSymbol, sector, false, i));
  }

  return {
    target,
    peers,
    precedentDeals: PRECEDENT_TRANSACTIONS[sector] || PRECEDENT_TRANSACTIONS.Technology,
    sector
  };
}

function generateDynamicPeer(symbol: string, sector: string, isTarget = false, seedOffset = 0): PeerMetrics {
  const base = DEFAULT_PEER_METRICS[sector] || DEFAULT_PEER_METRICS.Technology;
  
  // Generate minor variations based on character codes
  const charSum = symbol.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0) + seedOffset;
  
  // Multipliers range +/- 20%
  const varianceFactor = 0.8 + ((charSum % 40) / 100); // 0.8 to 1.2
  
  const evToEBITDATTM = Math.round(base.evToEBITDATTM * varianceFactor * 10) / 10;
  const evToSalesTTM = Math.round(base.evToSalesTTM * (varianceFactor * 0.95) * 10) / 10;
  const peRatioTTM = Math.round(base.peRatioTTM * (varianceFactor * 1.05) * 10) / 10;
  const grossProfitMarginTTM = Math.round(Math.min(0.95, Math.max(0.15, base.grossProfitMarginTTM * (0.9 + (charSum % 20) / 100))) * 1000) / 1000;
  const revenueGrowth = Math.round(Math.max(-0.15, base.revenueGrowth * (0.5 + (charSum % 15) / 10)) * 1000) / 1000;
  
  const rev = 500 + (charSum % 10) * 120; // Revenue size $500M - $1700M
  const ebitda = rev * (grossProfitMarginTTM * 0.4); // Assume EBITDA is 40% of Gross Profit
  
  const enterpriseValue = ebitda * evToEBITDATTM;
  const marketCap = enterpriseValue * 0.9; // Debt/Cash ratio

  // Format nice name
  const suffix = ["Inc.", "Corp.", "Holdings", "Technologies", "Co."][charSum % 5];
  const companyName = `${symbol.charAt(0) + symbol.slice(1).toLowerCase()} ${suffix}`;

  return {
    symbol,
    companyName,
    evToEBITDATTM,
    evToSalesTTM,
    peRatioTTM,
    grossProfitMarginTTM,
    revenueGrowth,
    marketCap: Math.round(marketCap),
    enterpriseValue: Math.round(enterpriseValue)
  };
}
