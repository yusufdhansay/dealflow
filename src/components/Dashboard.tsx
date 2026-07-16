"use client";

import React, { useState, useEffect } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, 
  AreaChart, Area, Legend, CartesianGrid 
} from 'recharts';
import { 
  Search, Sliders, ChevronRight, CheckCircle2, AlertTriangle, 
  FileText, TrendingUp, DollarSign, Database, ShieldAlert,
  Loader2, Printer, Settings, RefreshCw, Layers
} from 'lucide-react';
import { LBOInputs, runLBOModel, generateSensitivityMatrix } from '@/lib/lbo';

export default function Dashboard() {
  // App states
  const [ticker, setTicker] = useState('');
  const [inputValue, setInputValue] = useState('');
  const [fmpKey, setFmpKey] = useState('');
  const [groqKey, setGroqKey] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  const [activeTab, setActiveTab] = useState<'comps' | 'lbo' | 'sensitivities' | 'precedents' | 'memo'>('comps');
  const [mounted, setMounted] = useState(false);

  // Data states
  const [loading, setLoading] = useState(false);
  const [rawCompsData, setRawCompsData] = useState<any>(null);
  const [memoText, setMemoText] = useState<string>('');
  const [memoLoading, setMemoLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [statusType, setStatusType] = useState<'success' | 'warning' | 'info' | ''>('');

  // Private company states
  const [isPrivate, setIsPrivate] = useState(false);
  const [privateName, setPrivateName] = useState('Acme Technologies');
  const [privateSector, setPrivateSector] = useState<'Technology' | 'Healthcare' | 'Consumer' | 'Industrials'>('Technology');
  const [privateEBITDA, setPrivateEBITDA] = useState(80); // $ Millions
  const [privateRevenue, setPrivateRevenue] = useState(400); // $ Millions
  const [privateMargin, setPrivateMargin] = useState(0.35); // 35%
  const [privateGrowth, setPrivateGrowth] = useState(0.12); // 12%
  const [privateEntryMultiple, setPrivateEntryMultiple] = useState(10.0);

  // Derived compsData based on active target mode (public vs. private)
  const compsData = React.useMemo(() => {
    if (!rawCompsData) return null;
    if (!isPrivate) return rawCompsData;

    const targetValuation = privateEBITDA * privateEntryMultiple;
    const evToSales = targetValuation / Math.max(1, privateRevenue);
    
    const privateTarget = {
      symbol: privateName.slice(0, 4).toUpperCase(),
      companyName: privateName,
      evToEBITDATTM: privateEntryMultiple,
      evToSalesTTM: Math.round(evToSales * 10) / 10,
      peRatioTTM: rawCompsData.aggregates?.peRatio?.median || 15.0,
      grossProfitMarginTTM: privateMargin,
      revenueGrowth: privateGrowth,
      marketCap: Math.round(targetValuation * 0.8), // assume 80% equity / 20% debt
      enterpriseValue: targetValuation
    };

    return {
      ...rawCompsData,
      target: privateTarget,
      sector: privateSector
    };
  }, [rawCompsData, isPrivate, privateName, privateSector, privateEBITDA, privateRevenue, privateMargin, privateGrowth, privateEntryMultiple]);

  // Synchronize LBO target EBITDA and entry multiple in Private target mode
  useEffect(() => {
    if (isPrivate) {
      setLboInputs(prev => ({
        ...prev,
        targetEBITDA: privateEBITDA,
        entryMultiple: privateEntryMultiple,
        exitMultiple: privateEntryMultiple
      }));
    }
  }, [isPrivate, privateEBITDA, privateEntryMultiple]);

  // Fetch sector benchmark public peers when switching sectors in private target mode
  useEffect(() => {
    if (isPrivate) {
      const benchmarkTicker = {
        Technology: 'AAPL',
        Healthcare: 'JNJ',
        Consumer: 'PG',
        Industrials: 'CAT'
      }[privateSector];
      fetchComps(benchmarkTicker);
    }
  }, [isPrivate, privateSector]);

  // LBO model state assumptions
  const [lboInputs, setLboInputs] = useState<LBOInputs>({
    targetEBITDA: 1000, // $ Millions
    entryMultiple: 15.0,
    leverageMultiple: 4.5,
    interestRate: 0.075,
    ebitdaGrowth: 0.08,
    exitMultiple: 15.0,
    holdPeriod: 5,
    capexPercentOfEBITDA: 0.15,
    taxRate: 0.25
  });

  const [sensitivityMetric, setSensitivityMetric] = useState<'irr' | 'moic'>('irr');

  // SSR safety
  useEffect(() => {
    setMounted(true);
    // Load local storage keys
    const storedFmp = localStorage.getItem('fmp_api_key');
    const storedGroq = localStorage.getItem('groq_api_key');
    if (storedFmp) setFmpKey(storedFmp);
    if (storedGroq) setGroqKey(storedGroq);
  }, []);

  // Fetch Comps Data
  const fetchComps = async (searchTicker: string) => {
    if (!searchTicker || searchTicker.trim() === '') return;
    setLoading(true);
    setStatusMessage('');
    try {
      const storedFmp = localStorage.getItem('fmp_api_key') || '';
      const storedGroq = localStorage.getItem('groq_api_key') || '';
      const url = `/api/comps?ticker=${searchTicker}&fmpKey=${storedFmp}&groqKey=${storedGroq}`;
      const res = await fetch(url);
      const data = await res.json();
      
      setRawCompsData(data);

      if (data.source.startsWith('mock')) {
        setStatusType('warning');
        setStatusMessage(data.message || 'No FMP key active. Using offline mock data.');
      } else if (data.source === 'ai_fallback') {
        setStatusType('success');
        setStatusMessage(data.message || 'Dynamic stock comps generated via Groq AI (live fallback).');
      } else {
        setStatusType('success');
        setStatusMessage(`Successfully loaded comps from Financial Modeling Prep (${data.source === 'cache' ? 'cached' : 'live'}).`);
      }

      // Update LBO target EBITDA and Entry Multiple from fetched target metrics
      if (data.target) {
        // Derive EBITDA from Market Cap and Multiples or set a default.
        // Let's set target EBITDA based on target EV and Multiple: EBITDA = EV / EV_EBITDA
        const targetEV = data.target.enterpriseValue || 15000;
        const targetEBITDAMultiple = data.target.evToEBITDATTM || 15.0;
        const derivedEBITDA = targetEV / targetEBITDAMultiple;
        
        setLboInputs(prev => ({
          ...prev,
          targetEBITDA: derivedEBITDA > 0 ? Math.round(derivedEBITDA) : 1000,
          entryMultiple: Math.round(targetEBITDAMultiple * 10) / 10,
          exitMultiple: Math.round(targetEBITDAMultiple * 10) / 10
        }));
      }

      // Clear old memo when changing ticker
      setMemoText('');
    } catch (error) {
      console.error('Error fetching comps data:', error);
      setStatusType('warning');
      setStatusMessage('Network error. Served fallback mock data.');
    } finally {
      setLoading(false);
    }
  };

  // Initial load (only fetch if a ticker has been set)
  useEffect(() => {
    if (ticker) {
      fetchComps(ticker);
    }
  }, [ticker]);

  // Handle keys save
  const handleSaveKeys = (e: React.FormEvent) => {
    e.preventDefault();
    localStorage.setItem('fmp_api_key', fmpKey);
    localStorage.setItem('groq_api_key', groqKey);
    setShowSettings(false);
    setStatusType('success');
    setStatusMessage('API settings updated. Re-fetching data...');
    fetchComps(ticker);
  };

  // Run LBO Engine
  const lboOutputs = runLBOModel(lboInputs);

  // Generate Sensitivity Matrix
  const sensitivityMatrix = generateSensitivityMatrix(lboInputs);

  // Generate AI Memo
  const generateMemo = async () => {
    setMemoLoading(true);
    setActiveTab('memo');
    try {
      const storedGroq = localStorage.getItem('groq_api_key') || '';
      
      const payload = {
        target: compsData.target,
        sector: compsData.sector,
        aggregates: compsData.aggregates,
        lboInputs,
        lboOutputs,
        cheapRichFlag: precedentValuationFlag(),
        precedentMedian: getPrecedentMedian(),
        apiKeyOverride: storedGroq
      };

      const res = await fetch('/api/memo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      
      setMemoText(data.memo);
      if (data.source.includes('template')) {
        setStatusType('warning');
        setStatusMessage(data.warning || 'No active Groq key. Generated PE analysis template.');
      } else {
        setStatusType('success');
        setStatusMessage('Investment memo successfully compiled via Llama-3.');
      }
    } catch (error) {
      console.error('Error generating investment memo:', error);
    } finally {
      setMemoLoading(false);
    }
  };

  // Precedent Matcher Valuation Logic
  const getPrecedentMedian = () => {
    if (!compsData?.precedentDeals || compsData.precedentDeals.length === 0) return 15.0;
    const sorted = [...compsData.precedentDeals]
      .map(d => d.evToEBITDA)
      .filter(m => m > 0)
      .sort((a, b) => a - b);
    
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
  };

  const precedentValuationFlag = () => {
    const entryMult = lboInputs.entryMultiple;
    const precedentMedian = getPrecedentMedian();
    
    const diff = entryMult - precedentMedian;
    if (diff > 1.5) return 'Rich (Expensive)';
    if (diff < -1.5) return 'Cheap (Discount)';
    return 'Fair (Parity)';
  };

  const handlePrint = () => {
    window.print();
  };

  // Format percent utility
  const formatPercent = (val: number) => {
    return `${(val * 100).toFixed(1)}%`;
  };

  // Format currency millions utility
  const formatCurrency = (val: number) => {
    return `$${Math.round(val).toLocaleString()}M`;
  };

  return (
    <div className="relative flex-1 flex flex-col z-10">
      {/* Settings Modal Panel */}
      {showSettings && (
        <div className="fixed inset-0 bg-[#00000040] backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-canvas border border-hairline rounded-lg max-w-md w-full p-6 shadow-xl">
            <h3 className="text-display-sm font-semibold tracking-tight text-ink mb-1">
              API Keys Configuration
            </h3>
            <p className="text-body-sm text-mute mb-4">
              Override defaults with your personal keys. Keys are saved securely in your browser's local storage.
            </p>
            <form onSubmit={handleSaveKeys} className="space-y-4">
              <div>
                <label className="block text-caption-mono text-mute uppercase mb-1">
                  Financial Modeling Prep API Key
                </label>
                <input 
                  type="password"
                  placeholder="Paste FMP API Key (free tier)..."
                  value={fmpKey}
                  onChange={(e) => setFmpKey(e.target.value)}
                  className="w-full text-body-sm border border-hairline rounded-sm px-3 py-2 bg-canvas text-ink focus:outline-none focus:border-hairline-strong font-mono"
                />
                <span className="text-[10px] text-mute mt-1 block">
                  Allows live peer lists, gross margins, and revenue growth fetching.
                </span>
              </div>
              <div>
                <label className="block text-caption-mono text-mute uppercase mb-1">
                  Groq API Key
                </label>
                <input 
                  type="password"
                  placeholder="Paste Groq API Key..."
                  value={groqKey}
                  onChange={(e) => setGroqKey(e.target.value)}
                  className="w-full text-body-sm border border-hairline rounded-sm px-3 py-2 bg-canvas text-ink focus:outline-none focus:border-hairline-strong font-mono"
                />
                <span className="text-[10px] text-mute mt-1 block">
                  Enables live Llama-3 investment committee memo compilation.
                </span>
              </div>
              <div className="flex gap-2 justify-end pt-2">
                <button 
                  type="button"
                  onClick={() => setShowSettings(false)}
                  className="px-4 py-2 border border-hairline rounded-pill text-body-sm text-body hover:bg-canvas-soft"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="px-4 py-2 bg-primary text-on-primary rounded-pill text-body-sm font-medium hover:opacity-90"
                >
                  Save Settings
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Hero Header Layer */}
      <div className="border-b border-hairline bg-canvas relative overflow-hidden py-10 px-4 md:px-8 print:hidden">
        <div className="mesh-gradient-bg"></div>
        <div className="max-w-[1400px] mx-auto relative flex flex-col md:flex-row md:items-center justify-between gap-6 z-10">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2 py-0.5 bg-link-bg-soft text-link rounded-full text-caption-mono text-[10px] font-medium uppercase">
                PE Simulator 2.0
              </span>
              {compsData && (
                <span className="text-caption-mono text-mute text-xs">
                  Sector: {compsData.sector}
                </span>
              )}
            </div>
            <h1 className="text-display-lg md:text-display-xl text-ink font-semibold tracking-tight leading-none mb-2">
              Deal Screener.
            </h1>
            <p className="text-body-md text-body max-w-xl">
              An institution-grade comparable-deal screening and Leveraged Buyout valuation engine built on Stark Vercel aesthetics.
            </p>
          </div>
          
          {/* Target Type Toggle & Inputs */}
          <div className="flex flex-col gap-3 self-start md:self-center items-end">
            <div className="flex items-center gap-1 bg-canvas-soft border border-hairline rounded-full p-0.5 self-end">
              <button 
                onClick={() => setIsPrivate(false)}
                className={`px-3 py-1 rounded-full text-[10px] font-bold font-mono cursor-pointer transition-all ${!isPrivate ? 'bg-primary text-on-primary shadow-xs' : 'text-mute hover:text-body'}`}
              >
                PUBLIC TICKER
              </button>
              <button 
                onClick={() => setIsPrivate(true)}
                className={`px-3 py-1 rounded-full text-[10px] font-bold font-mono cursor-pointer transition-all ${isPrivate ? 'bg-primary text-on-primary shadow-xs' : 'text-mute hover:text-body'}`}
              >
                UNLISTED TARGET
              </button>
            </div>

            {!isPrivate ? (
              /* Public Ticker Selector */
              <div className="flex items-center gap-2">
                <div className="relative">
                  <input 
                    type="text"
                    placeholder="Enter Ticker (e.g. AAPL)"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && fetchComps(inputValue)}
                    className="w-48 pl-8 pr-3 py-2 border border-hairline rounded-sm bg-canvas text-ink text-body-sm focus:outline-none focus:border-hairline-strong font-mono uppercase"
                  />
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-mute" />
                </div>
                <button 
                  onClick={() => fetchComps(inputValue)}
                  disabled={loading}
                  className="px-4 py-2 bg-primary text-on-primary rounded-sm text-body-sm font-medium hover:opacity-90 disabled:opacity-50 flex items-center gap-1.5 h-[38px] cursor-pointer"
                >
                  {loading ? <Loader2 className="h-4.5 w-4.5 animate-spin" /> : 'Screen'}
                </button>
                <button 
                  onClick={() => setShowSettings(true)}
                  className="p-2 border border-hairline rounded-sm hover:bg-canvas-soft text-body hover:text-ink h-[38px] w-[38px] flex items-center justify-center cursor-pointer"
                  title="API Settings"
                >
                  <Settings className="h-4.5 w-4.5" />
                </button>
              </div>
            ) : (
              /* Private Target Inputs Form */
              <div className="flex flex-wrap items-center gap-3 bg-canvas border border-hairline p-3 rounded-md shadow-xs">
                {/* Company Name */}
                <div className="flex flex-col">
                  <span className="text-[10px] text-mute font-mono uppercase mb-0.5">Target Name</span>
                  <input 
                    type="text"
                    value={privateName}
                    onChange={(e) => setPrivateName(e.target.value)}
                    className="w-40 border border-hairline rounded-sm px-2 py-1 bg-canvas text-ink text-xs focus:outline-none focus:border-hairline-strong font-semibold"
                  />
                </div>
                {/* Sector */}
                <div className="flex flex-col">
                  <span className="text-[10px] text-mute font-mono uppercase mb-0.5">Sector (Peers)</span>
                  <select 
                    value={privateSector}
                    onChange={(e) => setPrivateSector(e.target.value as any)}
                    className="w-32 border border-hairline rounded-sm px-2 py-1 bg-canvas text-ink text-xs focus:outline-none focus:border-hairline-strong font-sans"
                  >
                    <option value="Technology">Technology</option>
                    <option value="Healthcare">Healthcare</option>
                    <option value="Consumer">Consumer</option>
                    <option value="Industrials">Industrials</option>
                  </select>
                </div>
                {/* Revenue */}
                <div className="flex flex-col">
                  <span className="text-[10px] text-mute font-mono uppercase mb-0.5">Revenue ($M)</span>
                  <input 
                    type="number"
                    value={privateRevenue}
                    onChange={(e) => setPrivateRevenue(Math.max(1, Number(e.target.value)))}
                    className="w-20 border border-hairline rounded-sm px-2 py-1 bg-canvas text-ink text-xs focus:outline-none focus:border-hairline-strong font-mono"
                  />
                </div>
                {/* EBITDA */}
                <div className="flex flex-col">
                  <span className="text-[10px] text-mute font-mono uppercase mb-0.5">EBITDA ($M)</span>
                  <input 
                    type="number"
                    value={privateEBITDA}
                    onChange={(e) => setPrivateEBITDA(Number(e.target.value))}
                    className="w-20 border border-hairline rounded-sm px-2 py-1 bg-canvas text-ink text-xs focus:outline-none focus:border-hairline-strong font-mono"
                  />
                </div>
                {/* Entry Multiple */}
                <div className="flex flex-col">
                  <span className="text-[10px] text-mute font-mono uppercase mb-0.5">Entry Mult</span>
                  <input 
                    type="number"
                    step="0.5"
                    value={privateEntryMultiple}
                    onChange={(e) => setPrivateEntryMultiple(Number(e.target.value))}
                    className="w-16 border border-hairline rounded-sm px-2 py-1 bg-canvas text-ink text-xs focus:outline-none focus:border-hairline-strong font-mono"
                  />
                </div>
                {/* Settings gear */}
                <div className="flex items-end h-[38px] justify-center mt-auto">
                  <button 
                    onClick={() => setShowSettings(true)}
                    className="p-1.5 border border-hairline rounded-sm hover:bg-canvas-soft text-body hover:text-ink h-7 w-7 flex items-center justify-center cursor-pointer"
                    title="API Settings"
                  >
                    <Settings className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Global Status Bar */}
      {statusMessage && (
        <div className="border-b border-hairline bg-canvas-soft px-4 py-2 text-xs font-mono flex items-center justify-between text-body print:hidden">
          <div className="flex items-center gap-2 max-w-[90%] truncate">
            {statusType === 'success' && <CheckCircle2 className="h-3.5 w-3.5 text-success shrink-0" />}
            {statusType === 'warning' && <AlertTriangle className="h-3.5 w-3.5 text-warning shrink-0" />}
            {!statusType && <Database className="h-3.5 w-3.5 text-mute shrink-0" />}
            <span>{statusMessage}</span>
          </div>
          <button 
            onClick={() => setStatusMessage('')} 
            className="text-mute hover:text-ink hover:underline font-sans cursor-pointer pl-2 ml-auto"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Main Workspace */}
      <div className="max-w-[1400px] w-full mx-auto p-4 md:p-8 flex-1 flex flex-col gap-6 print:p-0">
        
        {!compsData ? (
          /* Empty / Get Started Welcome State */
          <div className="flex flex-col items-center justify-center py-24 px-4 text-center bg-canvas border border-hairline rounded-lg shadow-xs max-w-2xl mx-auto w-full">
            <div className="w-14 h-14 rounded-full bg-canvas-soft flex items-center justify-center border border-hairline mb-5">
              <TrendingUp className="h-7 w-7 text-mute" />
            </div>
            
            <h2 className="text-body-md font-semibold tracking-tight text-ink mb-1.5 font-sans">
              Screen a Target to Begin Valuation
            </h2>
            <p className="text-xs text-mute max-w-md mb-8 leading-relaxed font-sans">
              Enter a public ticker in the search bar or select "Unlisted Target" to input private company details. Click "Screen" to run the comps and LBO models.
            </p>

            <div className="flex flex-col items-center gap-3 w-full max-w-sm">
              <span className="text-[9px] text-mute font-mono uppercase tracking-wider">
                Quick Select Suggested Benchmarks
              </span>
              <div className="flex flex-wrap gap-2 justify-center">
                <button 
                  onClick={() => { setInputValue('AAPL'); setTicker('AAPL'); }}
                  className="px-3 py-1.5 border border-hairline rounded-sm hover:bg-canvas-soft hover:text-ink text-xs font-mono text-body cursor-pointer transition-colors"
                >
                  AAPL (US Tech)
                </button>
                <button 
                  onClick={() => { setInputValue('TSLA'); setTicker('TSLA'); }}
                  className="px-3 py-1.5 border border-hairline rounded-sm hover:bg-canvas-soft hover:text-ink text-xs font-mono text-body cursor-pointer transition-colors"
                >
                  TSLA (US Auto)
                </button>
                <button 
                  onClick={() => { setInputValue('TCS'); setTicker('TCS'); }}
                  className="px-3 py-1.5 border border-hairline rounded-sm hover:bg-canvas-soft hover:text-ink text-xs font-mono text-body cursor-pointer transition-colors"
                >
                  TCS (India IT)
                </button>
                <button 
                  onClick={() => { setInputValue('RELIANCE'); setTicker('RELIANCE'); }}
                  className="px-3 py-1.5 border border-hairline rounded-sm hover:bg-canvas-soft hover:text-ink text-xs font-mono text-body cursor-pointer transition-colors"
                >
                  RELIANCE (India Conglom)
                </button>
              </div>
            </div>
          </div>
        ) : (
          <>
            {/* Navigation Tabs */}
            <div className="flex border-b border-hairline print:hidden overflow-x-auto gap-2">
          <button 
            onClick={() => setActiveTab('comps')}
            className={`pb-3 px-4 text-body-sm font-medium border-b-2 transition-all cursor-pointer whitespace-nowrap ${activeTab === 'comps' ? 'border-primary text-ink' : 'border-transparent text-mute hover:text-body'}`}
          >
            Public Comps
          </button>
          <button 
            onClick={() => setActiveTab('lbo')}
            className={`pb-3 px-4 text-body-sm font-medium border-b-2 transition-all cursor-pointer whitespace-nowrap ${activeTab === 'lbo' ? 'border-primary text-ink' : 'border-transparent text-mute hover:text-body'}`}
          >
            LBO Forecaster
          </button>
          <button 
            onClick={() => setActiveTab('sensitivities')}
            className={`pb-3 px-4 text-body-sm font-medium border-b-2 transition-all cursor-pointer whitespace-nowrap ${activeTab === 'sensitivities' ? 'border-primary text-ink' : 'border-transparent text-mute hover:text-body'}`}
          >
            Sensitivity Grid
          </button>
          <button 
            onClick={() => setActiveTab('precedents')}
            className={`pb-3 px-4 text-body-sm font-medium border-b-2 transition-all cursor-pointer whitespace-nowrap ${activeTab === 'precedents' ? 'border-primary text-ink' : 'border-transparent text-mute hover:text-body'}`}
          >
            Precedent Transactions
          </button>
          <button 
            onClick={() => generateMemo()}
            disabled={!compsData || memoLoading}
            className={`pb-3 px-4 text-body-sm font-medium border-b-2 transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${activeTab === 'memo' ? 'border-primary text-ink' : 'border-transparent text-mute hover:text-body'} disabled:opacity-50`}
          >
            {memoLoading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            Investment Memo
          </button>
        </div>

        {/* Tab 1: Comps Screener */}
        {activeTab === 'comps' && compsData && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Table Area */}
            <div className="lg:col-span-2 flex flex-col gap-6">
              <div className="bg-canvas border border-hairline rounded-md overflow-hidden">
                <div className="px-6 py-4 border-b border-hairline flex items-center justify-between">
                  <h3 className="text-body-sm-strong text-ink font-medium uppercase tracking-tight font-mono">
                    Trading Comps Valuation Benchmark
                  </h3>
                  <span className="text-[10px] text-mute bg-canvas-soft px-2 py-0.5 border border-hairline font-mono">
                    TTM Metrics
                  </span>
                </div>
                <div className="overflow-x-auto">
                  <table className="vercel-table font-sans">
                    <thead>
                      <tr>
                        <th>Company Name</th>
                        <th>EV / EBITDA</th>
                        <th>EV / Revenue</th>
                        <th>P/E Ratio</th>
                        <th>Gross Margin</th>
                        <th>YoY Growth</th>
                      </tr>
                    </thead>
                    <tbody>
                      {/* Target Row */}
                      <tr className="bg-canvas-soft-2 font-medium border-y-2 border-hairline">
                        <td>
                          <div className="flex items-center gap-1.5">
                            <span className="text-ink font-semibold">{compsData.target.symbol}</span>
                            <span className="text-xs text-mute truncate max-w-[120px]" title={compsData.target.companyName}>
                              {compsData.target.companyName}
                            </span>
                            <span className="px-1.5 py-0.2 bg-primary text-on-primary rounded text-[9px] font-mono tracking-wider font-semibold uppercase">
                              Target
                            </span>
                          </div>
                        </td>
                        <td className="font-semibold text-ink font-mono">{compsData.target.evToEBITDATTM.toFixed(1)}x</td>
                        <td className="font-mono">{compsData.target.evToSalesTTM.toFixed(1)}x</td>
                        <td className="font-mono">{compsData.target.peRatioTTM.toFixed(1)}x</td>
                        <td className="font-mono">{formatPercent(compsData.target.grossProfitMarginTTM)}</td>
                        <td className="font-mono text-success">{formatPercent(compsData.target.revenueGrowth)}</td>
                      </tr>
                      {/* Peers Rows */}
                      {compsData.peers.map((peer: any) => (
                        <tr key={peer.symbol}>
                          <td>
                            <div className="flex items-center gap-1.5">
                              <span className="text-body font-medium">{peer.symbol}</span>
                              <span className="text-xs text-mute truncate max-w-[150px]" title={peer.companyName}>
                                {peer.companyName}
                              </span>
                            </div>
                          </td>
                          <td className="font-mono text-body font-medium">{peer.evToEBITDATTM.toFixed(1)}x</td>
                          <td className="font-mono text-body">{peer.evToSalesTTM.toFixed(1)}x</td>
                          <td className="font-mono text-body">{peer.peRatioTTM.toFixed(1)}x</td>
                          <td className="font-mono text-body">{formatPercent(peer.grossProfitMarginTTM)}</td>
                          <td className={`font-mono ${peer.revenueGrowth >= 0 ? 'text-success' : 'text-error'}`}>
                            {formatPercent(peer.revenueGrowth)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Chart Comparison */}
              {mounted && (
                <div className="bg-canvas border border-hairline rounded-md p-6">
                  <h3 className="text-body-sm-strong text-ink font-semibold uppercase tracking-tight font-mono mb-4">
                    EV / EBITDA Comparison vs. Public Comps
                  </h3>
                  <div className="h-64 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart 
                        data={[
                          { symbol: compsData.target.symbol, 'EV/EBITDA': compsData.target.evToEBITDATTM, isTarget: true },
                          ...compsData.peers.map((p: any) => ({ symbol: p.symbol, 'EV/EBITDA': p.evToEBITDATTM, isTarget: false }))
                        ]}
                        margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                      >
                        <XAxis dataKey="symbol" tickLine={false} axisLine={false} style={{ fontSize: 11, fontFamily: 'var(--font-mono)' }} />
                        <YAxis tickLine={false} axisLine={false} style={{ fontSize: 11, fontFamily: 'var(--font-mono)' }} />
                        <Tooltip 
                          contentStyle={{ backgroundColor: 'var(--color-canvas)', borderColor: 'var(--color-hairline)', borderRadius: 6, fontSize: 12 }} 
                          labelStyle={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}
                        />
                        <Bar 
                          dataKey="EV/EBITDA" 
                          fill="var(--color-mute)"
                          radius={[4, 4, 0, 0]}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}
            </div>

            {/* Sidebar Aggregations & Implied Ranges */}
            <div className="flex flex-col gap-6">
              <div className="bg-canvas border border-hairline rounded-md p-6">
                <h3 className="text-body-sm-strong text-ink font-semibold uppercase tracking-tight font-mono mb-4">
                  Peer Valuation Stats
                </h3>
                <div className="space-y-4">
                  <div className="p-4 bg-canvas-soft border border-hairline rounded-md">
                    <div className="text-caption-mono text-mute uppercase mb-1">EV / EBITDA Range</div>
                    <div className="flex items-baseline justify-between">
                      <span className="text-display-md text-ink font-bold font-mono">
                        {compsData.aggregates.evToEBITDA.median.toFixed(1)}x
                      </span>
                      <span className="text-xs text-mute font-mono">
                        Min: {compsData.aggregates.evToEBITDA.min.toFixed(1)}x | Max: {compsData.aggregates.evToEBITDA.max.toFixed(1)}x
                      </span>
                    </div>
                    <div className="text-[10px] text-mute mt-1">Median Peer Multiple benchmark</div>
                  </div>

                  <div className="p-4 bg-canvas-soft border border-hairline rounded-md">
                    <div className="text-caption-mono text-mute uppercase mb-1">EV / Sales Range</div>
                    <div className="flex items-baseline justify-between">
                      <span className="text-display-md text-ink font-bold font-mono">
                        {compsData.aggregates.evToSales.median.toFixed(1)}x
                      </span>
                      <span className="text-xs text-mute font-mono">
                        Min: {compsData.aggregates.evToSales.min.toFixed(1)}x | Max: {compsData.aggregates.evToSales.max.toFixed(1)}x
                      </span>
                    </div>
                  </div>

                  <div className="p-4 bg-canvas-soft border border-hairline rounded-md">
                    <div className="text-caption-mono text-mute uppercase mb-1">P/E Ratio Range</div>
                    <div className="flex items-baseline justify-between">
                      <span className="text-display-md text-ink font-bold font-mono">
                        {compsData.aggregates.peRatio.median.toFixed(1)}x
                      </span>
                      <span className="text-xs text-mute font-mono">
                        Min: {compsData.aggregates.peRatio.min.toFixed(1)}x | Max: {compsData.aggregates.peRatio.max.toFixed(1)}x
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Valuation Implication Card */}
              <div className="bg-primary text-on-primary rounded-md p-6 shadow-md relative overflow-hidden">
                <div className="absolute top-0 right-0 p-3 opacity-15">
                  <TrendingUp className="h-24 w-24" />
                </div>
                <div className="relative z-10">
                  <span className="text-[9px] font-mono border border-on-primary/30 px-2 py-0.5 rounded-full uppercase tracking-wider font-semibold opacity-85">
                    Implied Valuation Range
                  </span>
                  <h4 className="text-body-md font-semibold tracking-tight mt-3 mb-1">
                    {compsData.target.symbol} Target Range
                  </h4>
                  <p className="text-xs opacity-75 mb-4">
                    Derived by applying peer median EV/EBITDA to target company.
                  </p>
                  
                  <div className="space-y-3 border-t border-on-primary/10 pt-4">
                    <div className="flex justify-between text-xs">
                      <span className="opacity-75">Implied EV (Low case @ {compsData.aggregates.evToEBITDA.min.toFixed(1)}x):</span>
                      <span className="font-mono font-semibold">
                        {formatCurrency((compsData.target.enterpriseValue / compsData.target.evToEBITDATTM) * compsData.aggregates.evToEBITDA.min)}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm border-y border-on-primary/10 py-2">
                      <span className="font-medium">Implied EV (Median case @ {compsData.aggregates.evToEBITDA.median.toFixed(1)}x):</span>
                      <span className="font-mono font-bold text-base">
                        {formatCurrency((compsData.target.enterpriseValue / compsData.target.evToEBITDATTM) * compsData.aggregates.evToEBITDA.median)}
                      </span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="opacity-75">Implied EV (High case @ {compsData.aggregates.evToEBITDA.max.toFixed(1)}x):</span>
                      <span className="font-mono font-semibold">
                        {formatCurrency((compsData.target.enterpriseValue / compsData.target.evToEBITDATTM) * compsData.aggregates.evToEBITDA.max)}
                      </span>
                    </div>
                    <div className="flex justify-between text-xs pt-1">
                      <span className="opacity-75">Current Enterprise Value:</span>
                      <span className="font-mono text-cyan-soft font-bold">
                        {formatCurrency(compsData.target.enterpriseValue)}
                      </span>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-on-primary/10 text-xs">
                    {compsData.target.evToEBITDATTM > compsData.aggregates.evToEBITDA.median ? (
                      <div className="flex items-center gap-1.5 text-warning-soft">
                        <AlertTriangle className="h-4 w-4 shrink-0" />
                        <span>Asset trades at a premium to peer median.</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5 text-cyan-deep">
                        <CheckCircle2 className="h-4 w-4 shrink-0" />
                        <span>Asset represents discount entry opportunity.</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: LBO Forecaster */}
        {activeTab === 'lbo' && compsData && (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            
            {/* Sliders Input Panel */}
            <div className="lg:col-span-1 bg-canvas border border-hairline rounded-md p-6 flex flex-col gap-4 self-start">
              <div className="flex items-center gap-2 border-b border-hairline pb-3">
                <Sliders className="h-4 w-4 text-ink" />
                <h3 className="text-body-sm-strong text-ink font-semibold uppercase font-mono">
                  LBO Assumptions
                </h3>
              </div>

              {/* Slider Input list */}
              <div className="space-y-4 text-xs">
                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-mute">Starting EBITDA:</span>
                    <span className="font-mono text-ink font-semibold">{formatCurrency(lboInputs.targetEBITDA)}</span>
                  </div>
                  <input 
                    type="range" 
                    min={Math.max(10, Math.round(lboInputs.targetEBITDA * 0.1))}
                    max={Math.round(lboInputs.targetEBITDA * 2)}
                    value={lboInputs.targetEBITDA}
                    onChange={(e) => setLboInputs(p => ({ ...p, targetEBITDA: Number(e.target.value) }))}
                    className="w-full h-1 bg-hairline rounded-lg appearance-none cursor-pointer accent-primary"
                  />
                </div>

                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-mute">Entry EV/EBITDA:</span>
                    <span className="font-mono text-ink font-semibold">{lboInputs.entryMultiple.toFixed(1)}x</span>
                  </div>
                  <input 
                    type="range" 
                    min="4.0" 
                    max="25.0" 
                    step="0.5"
                    value={lboInputs.entryMultiple}
                    onChange={(e) => setLboInputs(p => ({ ...p, entryMultiple: Number(e.target.value) }))}
                    className="w-full h-1 bg-hairline rounded-lg appearance-none cursor-pointer accent-primary"
                  />
                </div>

                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-mute">Opening Debt / EBITDA:</span>
                    <span className="font-mono text-ink font-semibold">{lboInputs.leverageMultiple.toFixed(1)}x</span>
                  </div>
                  <input 
                    type="range" 
                    min="1.0" 
                    max={Math.min(7.5, lboInputs.entryMultiple - 1.0)} 
                    step="0.1"
                    value={lboInputs.leverageMultiple}
                    onChange={(e) => setLboInputs(p => ({ ...p, leverageMultiple: Number(e.target.value) }))}
                    className="w-full h-1 bg-hairline rounded-lg appearance-none cursor-pointer accent-primary"
                  />
                  <span className="text-[9px] text-mute leading-none block mt-1">
                    Maximum leverage is capped below entry multiple.
                  </span>
                </div>

                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-mute">Debt Interest Rate:</span>
                    <span className="font-mono text-ink font-semibold">{formatPercent(lboInputs.interestRate)}</span>
                  </div>
                  <input 
                    type="range" 
                    min="0.03" 
                    max="0.15" 
                    step="0.005"
                    value={lboInputs.interestRate}
                    onChange={(e) => setLboInputs(p => ({ ...p, interestRate: Number(e.target.value) }))}
                    className="w-full h-1 bg-hairline rounded-lg appearance-none cursor-pointer accent-primary"
                  />
                </div>

                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-mute">Annual EBITDA Growth:</span>
                    <span className="font-mono text-ink font-semibold">{formatPercent(lboInputs.ebitdaGrowth)}</span>
                  </div>
                  <input 
                    type="range" 
                    min="-0.05" 
                    max="0.30" 
                    step="0.01"
                    value={lboInputs.ebitdaGrowth}
                    onChange={(e) => setLboInputs(p => ({ ...p, ebitdaGrowth: Number(e.target.value) }))}
                    className="w-full h-1 bg-hairline rounded-lg appearance-none cursor-pointer accent-primary"
                  />
                </div>

                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-mute">Capex % of EBITDA:</span>
                    <span className="font-mono text-ink font-semibold">{formatPercent(lboInputs.capexPercentOfEBITDA)}</span>
                  </div>
                  <input 
                    type="range" 
                    min="0.05" 
                    max="0.35" 
                    step="0.01"
                    value={lboInputs.capexPercentOfEBITDA}
                    onChange={(e) => setLboInputs(p => ({ ...p, capexPercentOfEBITDA: Number(e.target.value) }))}
                    className="w-full h-1 bg-hairline rounded-lg appearance-none cursor-pointer accent-primary"
                  />
                </div>

                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-mute">Corporate Tax Rate:</span>
                    <span className="font-mono text-ink font-semibold">{formatPercent(lboInputs.taxRate)}</span>
                  </div>
                  <input 
                    type="range" 
                    min="0.15" 
                    max="0.40" 
                    step="0.01"
                    value={lboInputs.taxRate}
                    onChange={(e) => setLboInputs(p => ({ ...p, taxRate: Number(e.target.value) }))}
                    className="w-full h-1 bg-hairline rounded-lg appearance-none cursor-pointer accent-primary"
                  />
                </div>

                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-mute">Exit EV/EBITDA:</span>
                    <span className="font-mono text-ink font-semibold">{lboInputs.exitMultiple.toFixed(1)}x</span>
                  </div>
                  <input 
                    type="range" 
                    min="4.0" 
                    max="25.0" 
                    step="0.5"
                    value={lboInputs.exitMultiple}
                    onChange={(e) => setLboInputs(p => ({ ...p, exitMultiple: Number(e.target.value) }))}
                    className="w-full h-1 bg-hairline rounded-lg appearance-none cursor-pointer accent-primary"
                  />
                </div>

                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-mute">Hold Period (Years):</span>
                    <span className="font-mono text-ink font-semibold">{lboInputs.holdPeriod} Yrs</span>
                  </div>
                  <input 
                    type="range" 
                    min="3" 
                    max="7" 
                    step="1"
                    value={lboInputs.holdPeriod}
                    onChange={(e) => setLboInputs(p => ({ ...p, holdPeriod: Number(e.target.value) }))}
                    className="w-full h-1 bg-hairline rounded-lg appearance-none cursor-pointer accent-primary"
                  />
                </div>
              </div>
            </div>

            {/* Calculations and Visuals Area */}
            <div className="lg:col-span-3 flex flex-col gap-6">
              
              {/* Output Cards */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-canvas border border-hairline rounded-md p-4">
                  <div className="text-caption-mono text-mute uppercase">Entry Equity</div>
                  <div className="text-display-sm text-ink font-bold font-mono mt-1">
                    {formatCurrency(lboOutputs.entryEquity)}
                  </div>
                  <div className="text-[10px] text-mute mt-1">EV {formatCurrency(lboOutputs.entryEV)} - Debt {formatCurrency(lboOutputs.entryDebt)}</div>
                </div>

                <div className="bg-canvas border border-hairline rounded-md p-4">
                  <div className="text-caption-mono text-mute uppercase">Exit Equity</div>
                  <div className="text-display-sm text-ink font-bold font-mono mt-1">
                    {formatCurrency(lboOutputs.exitEquity)}
                  </div>
                  <div className="text-[10px] text-mute mt-1">EV {formatCurrency(lboOutputs.exitEV)} - Debt {formatCurrency(lboOutputs.exitDebt)} + Cash {formatCurrency(lboOutputs.exitCash)}</div>
                </div>

                <div className="bg-canvas border border-hairline rounded-md p-4">
                  <div className="text-caption-mono text-mute uppercase">MOIC</div>
                  <div className="text-display-sm text-ink font-bold font-mono mt-1">
                    {lboOutputs.moic.toFixed(2)}x
                  </div>
                  <div className="text-[10px] text-mute mt-1">Multiple on Invested Capital</div>
                </div>

                <div className={`border rounded-md p-4 transition-all duration-300 ${lboOutputs.irr >= 0.20 ? 'bg-canvas border-success/30 text-success' : lboOutputs.irr >= 0.12 ? 'bg-canvas border-warning/30 text-warning-deep' : 'bg-canvas border-error/30 text-error'}`}>
                  <div className="text-caption-mono uppercase opacity-75">Internal Rate of Return</div>
                  <div className="text-display-md font-bold font-mono mt-0.5">
                    {(lboOutputs.irr * 100).toFixed(1)}%
                  </div>
                  <div className="text-[10px] opacity-75 mt-1 font-sans">
                    {lboOutputs.irr >= 0.20 ? 'Strong investment return' : lboOutputs.irr >= 0.12 ? 'Moderate risk-return profile' : 'Fails hurdle rate (<12%)'}
                  </div>
                </div>
              </div>

              {/* Debt Paydown Charts */}
              {mounted && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-canvas border border-hairline rounded-md p-6">
                    <h3 className="text-body-sm-strong text-ink font-semibold uppercase tracking-tight font-mono mb-4">
                      Debt Paydown & Cash Accumulation
                    </h3>
                    <div className="h-56 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={lboOutputs.forecast} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                          <XAxis dataKey="year" name="Year" style={{ fontSize: 10, fontFamily: 'var(--font-mono)' }} />
                          <YAxis style={{ fontSize: 10, fontFamily: 'var(--font-mono)' }} />
                          <Tooltip 
                            contentStyle={{ backgroundColor: 'var(--color-canvas)', borderColor: 'var(--color-hairline)', borderRadius: 6, fontSize: 11 }}
                            labelStyle={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}
                          />
                          <Legend wrapperStyle={{ fontSize: 11 }} />
                          <Area type="monotone" dataKey="endingDebt" name="Outstanding Debt" stroke="var(--color-error)" fill="var(--color-error-soft)" stackId="1" opacity={0.6} />
                          <Area type="monotone" dataKey="accumulatedCash" name="Accumulated Cash" stroke="var(--color-success)" fill="var(--color-link-bg-soft)" stackId="2" opacity={0.6} />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  <div className="bg-canvas border border-hairline rounded-md p-6">
                    <h3 className="text-body-sm-strong text-ink font-semibold uppercase tracking-tight font-mono mb-4">
                      Free Cash Flow (FCF) Generation Profile
                    </h3>
                    <div className="h-56 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={lboOutputs.forecast.filter(f => f.year > 0)} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                          <XAxis dataKey="year" style={{ fontSize: 10, fontFamily: 'var(--font-mono)' }} />
                          <YAxis style={{ fontSize: 10, fontFamily: 'var(--font-mono)' }} />
                          <Tooltip 
                            contentStyle={{ backgroundColor: 'var(--color-canvas)', borderColor: 'var(--color-hairline)', borderRadius: 6, fontSize: 11 }}
                          />
                          <Area type="monotone" dataKey="fcf" name="Free Cash Flow" stroke="var(--color-link)" fill="var(--color-link-bg-soft)" opacity={0.7} />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>
              )}

              {/* Projections Table */}
              <div className="bg-canvas border border-hairline rounded-md overflow-hidden">
                <div className="px-6 py-4 border-b border-hairline">
                  <h3 className="text-body-sm-strong text-ink font-semibold uppercase tracking-tight font-mono">
                    LBO Financial Forecast & Deleveraging Schedule
                  </h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="vercel-table font-sans">
                    <thead>
                      <tr>
                        <th>Year</th>
                        <th>EBITDA</th>
                        <th>Beg. Debt</th>
                        <th>Interest (Avg)</th>
                        <th>Capex</th>
                        <th>Taxes</th>
                        <th>Free Cash Flow</th>
                        <th>End. Debt</th>
                        <th>Accum. Cash</th>
                      </tr>
                    </thead>
                    <tbody>
                      {lboOutputs.forecast.map((row) => (
                        <tr key={row.year} className={row.year === 0 ? 'bg-canvas-soft font-mono text-mute' : 'font-mono'}>
                          <td className="font-semibold text-ink">Year {row.year}</td>
                          <td>{formatCurrency(row.ebitda)}</td>
                          <td>{formatCurrency(row.beginningDebt)}</td>
                          <td>{row.year === 0 ? '—' : formatCurrency(row.interest)}</td>
                          <td>{row.year === 0 ? '—' : formatCurrency(row.capex)}</td>
                          <td>{row.year === 0 ? '—' : formatCurrency(row.tax)}</td>
                          <td className={row.year === 0 ? 'text-mute' : row.fcf >= 0 ? 'text-success font-semibold' : 'text-error'}>
                            {row.year === 0 ? '—' : formatCurrency(row.fcf)}
                          </td>
                          <td className="font-semibold text-ink">{formatCurrency(row.endingDebt)}</td>
                          <td className="text-link">{formatCurrency(row.accumulatedCash)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>

          </div>
        )}

        {/* Tab 3: Sensitivity Grid */}
        {activeTab === 'sensitivities' && compsData && (
          <div className="bg-canvas border border-hairline rounded-md p-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-hairline pb-4 mb-6 gap-4">
              <div>
                <h3 className="text-body-lg text-ink font-semibold tracking-tight">
                  PE Valuation Sensitivity Grid
                </h3>
                <p className="text-xs text-mute mt-1">
                  Analyze the impact of Exit Multiples and Leverage Levels on underwriting returns.
                </p>
              </div>

              {/* Metric Toggle */}
              <div className="flex items-center gap-1 bg-canvas-soft border border-hairline rounded-full p-0.5 self-start">
                <button 
                  onClick={() => setSensitivityMetric('irr')}
                  className={`px-4 py-1.5 rounded-full text-xs font-semibold cursor-pointer transition-all ${sensitivityMetric === 'irr' ? 'bg-primary text-on-primary shadow-xs' : 'text-mute hover:text-body'}`}
                >
                  IRR %
                </button>
                <button 
                  onClick={() => setSensitivityMetric('moic')}
                  className={`px-4 py-1.5 rounded-full text-xs font-semibold cursor-pointer transition-all ${sensitivityMetric === 'moic' ? 'bg-primary text-on-primary shadow-xs' : 'text-mute hover:text-body'}`}
                >
                  MOIC
                </button>
              </div>
            </div>

            {/* Matrix table */}
            <div className="overflow-x-auto border border-hairline rounded-md">
              <table className="w-full border-collapse font-sans text-xs text-center">
                <thead>
                  {/* Top header row exit multiples */}
                  <tr className="bg-canvas-soft border-b border-hairline">
                    <th className="p-3 text-left font-mono font-semibold uppercase tracking-wider text-mute border-r border-hairline w-28">
                      Debt / EBITDA
                    </th>
                    <th colSpan={5} className="p-2 font-mono font-semibold uppercase tracking-wider text-mute">
                      Exit EV / EBITDA Multiple
                    </th>
                  </tr>
                  <tr className="bg-canvas-soft border-b border-hairline font-mono font-semibold text-ink">
                    <th className="p-2 border-r border-hairline"></th>
                    {sensitivityMatrix[0].map((cell, i) => (
                      <th key={i} className="p-3 border-r border-hairline last:border-r-0">
                        {cell.exitMultiple.toFixed(1)}x
                        <span className="block text-[10px] font-normal text-mute">
                          ({(cell.exitMultiple - lboInputs.entryMultiple) >= 0 ? '+' : ''}{(cell.exitMultiple - lboInputs.entryMultiple).toFixed(1)}x)
                        </span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {sensitivityMatrix.map((row, rowIndex) => (
                    <tr key={rowIndex} className="border-b border-hairline last:border-b-0">
                      {/* Left header column leverage */}
                      <td className="p-3 font-mono font-semibold text-ink bg-canvas-soft border-r border-hairline text-left">
                        {row[0].leverageMultiple.toFixed(1)}x
                      </td>
                      {/* Cells */}
                      {row.map((cell, colIndex) => {
                        const isBaseMultiple = cell.exitMultiple === lboInputs.exitMultiple;
                        const isBaseLeverage = cell.leverageMultiple === lboInputs.leverageMultiple;
                        const isBaseCase = isBaseMultiple && isBaseLeverage;

                        // Cell color logic based on IRR
                        let bgColor = 'bg-canvas';
                        let textColor = 'text-ink';
                        
                        if (sensitivityMetric === 'irr') {
                          if (cell.irr >= 0.25) {
                            bgColor = 'bg-success/20';
                            textColor = 'text-success font-semibold';
                          } else if (cell.irr >= 0.18) {
                            bgColor = 'bg-success/10';
                            textColor = 'text-link-deep';
                          } else if (cell.irr >= 0.12) {
                            bgColor = 'bg-warning-soft';
                            textColor = 'text-warning-deep';
                          } else if (cell.irr > 0) {
                            bgColor = 'bg-error-soft/30';
                            textColor = 'text-error';
                          } else {
                            bgColor = 'bg-error-soft/60';
                            textColor = 'text-error-deep font-semibold';
                          }
                        } else {
                          // MOIC color coding
                          if (cell.moic >= 2.5) {
                            bgColor = 'bg-success/20';
                            textColor = 'text-success font-semibold';
                          } else if (cell.moic >= 2.0) {
                            bgColor = 'bg-success/10';
                            textColor = 'text-link-deep';
                          } else if (cell.moic >= 1.5) {
                            bgColor = 'bg-warning-soft';
                            textColor = 'text-warning-deep';
                          } else if (cell.moic >= 1.0) {
                            bgColor = 'bg-error-soft/30';
                            textColor = 'text-error';
                          } else {
                            bgColor = 'bg-error-soft/60';
                            textColor = 'text-error-deep font-semibold';
                          }
                        }

                        return (
                          <td 
                            key={colIndex} 
                            className={`p-4 border-r border-hairline last:border-r-0 font-mono transition-all hover:brightness-95 ${bgColor} ${textColor} ${isBaseCase ? 'ring-2 ring-primary ring-inset font-bold' : ''}`}
                            title={`Leverage: ${cell.leverageMultiple}x, Exit: ${cell.exitMultiple}x`}
                          >
                            <div className="relative">
                              {sensitivityMetric === 'irr' 
                                ? `${(cell.irr * 100).toFixed(1)}%` 
                                : `${cell.moic.toFixed(2)}x`
                              }
                              {isBaseCase && (
                                <span className="absolute -top-3.5 -right-2 text-[8px] font-sans font-normal uppercase bg-primary text-on-primary px-1 py-0.2 rounded-full tracking-wider scale-90">
                                  Base
                                </span>
                              )}
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Explanatory legend */}
            <div className="flex flex-wrap gap-4 justify-between mt-6 text-xs text-mute font-mono">
              <div className="flex gap-4 items-center">
                <span>Legend:</span>
                <span className="flex items-center gap-1.5"><span className="h-3 w-3 bg-success/20 border border-success/30 rounded-xs"></span> Target (≥20% IRR / ≥2.0x)</span>
                <span className="flex items-center gap-1.5"><span className="h-3 w-3 bg-warning-soft border border-warning/30 rounded-xs"></span> Defensive (12-18% / 1.5-2.0x)</span>
                <span className="flex items-center gap-1.5"><span className="h-3 w-3 bg-error-soft/60 border border-error-soft rounded-xs"></span> Loss / Negative Return</span>
              </div>
              <div>
                *Highlighted cell indicates current active LBO inputs.
              </div>
            </div>

          </div>
        )}

        {/* Tab 4: Precedent Transactions */}
        {activeTab === 'precedents' && compsData && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Transactions Table */}
            <div className="lg:col-span-2 bg-canvas border border-hairline rounded-md overflow-hidden">
              <div className="px-6 py-4 border-b border-hairline">
                <h3 className="text-body-sm-strong text-ink font-semibold uppercase tracking-tight font-mono">
                  Sector M&A Precedent Transactions ({compsData.sector})
                </h3>
              </div>
              <div className="overflow-x-auto">
                <table className="vercel-table font-sans">
                  <thead>
                    <tr>
                      <th>Year</th>
                      <th>Target Company</th>
                      <th>Acquirer</th>
                      <th>Deal Size ($M)</th>
                      <th>EV / EBITDA</th>
                      <th>EV / Revenue</th>
                    </tr>
                  </thead>
                  <tbody>
                    {compsData.precedentDeals.map((deal: any, index: number) => (
                      <tr key={index}>
                        <td className="font-mono text-mute">{deal.year}</td>
                        <td className="font-semibold text-ink">{deal.target}</td>
                        <td className="text-body">{deal.acquirer}</td>
                        <td className="font-mono">{formatCurrency(deal.dealSize)}</td>
                        <td className="font-mono text-body font-semibold">{deal.evToEBITDA > 0 ? `${deal.evToEBITDA.toFixed(1)}x` : '—'}</td>
                        <td className="font-mono text-body">{deal.evToRevenue > 0 ? `${deal.evToRevenue.toFixed(1)}x` : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Valuation Analysis View Card */}
            <div className="flex flex-col gap-6">
              <div className="bg-canvas border border-hairline rounded-md p-6">
                <h3 className="text-body-sm-strong text-ink font-semibold uppercase tracking-tight font-mono mb-4">
                  Target vs. Precedent Deals
                </h3>
                
                <div className="space-y-4">
                  <div className="p-4 bg-canvas-soft border border-hairline rounded-md">
                    <div className="text-caption-mono text-mute uppercase mb-1">Precedents Median Multiple</div>
                    <div className="text-display-md text-ink font-bold font-mono">
                      {getPrecedentMedian().toFixed(1)}x
                    </div>
                    <div className="text-[10px] text-mute mt-1">EBITDA multiple benchmark paid in sector transactions</div>
                  </div>

                  <div className="p-4 bg-canvas-soft border border-hairline rounded-md">
                    <div className="text-caption-mono text-mute uppercase mb-1">Underwritten Entry Multiple</div>
                    <div className="text-display-md text-ink font-bold font-mono">
                      {lboInputs.entryMultiple.toFixed(1)}x
                    </div>
                  </div>

                  {/* Cheap / Expensive Flag Badge */}
                  <div className="pt-2">
                    <div className="text-caption-mono text-mute uppercase mb-2">Deal Pricing Flag</div>
                    
                    {precedentValuationFlag() === 'Cheap (Discount)' && (
                      <div className="border border-success/30 bg-success/5 text-success rounded-md p-4 flex items-start gap-2.5">
                        <CheckCircle2 className="h-5 w-5 text-success shrink-0 mt-0.5" />
                        <div>
                          <h4 className="text-xs font-bold font-mono">CHEAP (DISCOUNT VALUATION)</h4>
                          <p className="text-[11px] font-sans text-body mt-1">
                            The underwritten multiple ({lboInputs.entryMultiple.toFixed(1)}x) is below the sector precedent deals median of {getPrecedentMedian().toFixed(1)}x. This represents an attractive margin of safety at entry.
                          </p>
                        </div>
                      </div>
                    )}

                    {precedentValuationFlag() === 'Fair (Parity)' && (
                      <div className="border border-warning/30 bg-warning/5 text-warning-deep rounded-md p-4 flex items-start gap-2.5">
                        <AlertTriangle className="h-5 w-5 text-warning shrink-0 mt-0.5" />
                        <div>
                          <h4 className="text-xs font-bold font-mono">FAIR (PARITY VALUATION)</h4>
                          <p className="text-[11px] font-sans text-body mt-1">
                            The underwritten entry multiple of {lboInputs.entryMultiple.toFixed(1)}x is in line with precedent deals. Underwriting relies entirely on EBITDA growth and debt paydown deleveraging to generate returns.
                          </p>
                        </div>
                      </div>
                    )}

                    {precedentValuationFlag() === 'Rich (Expensive)' && (
                      <div className="border border-error/30 bg-error/5 text-error rounded-md p-4 flex items-start gap-2.5">
                        <ShieldAlert className="h-5 w-5 text-error shrink-0 mt-0.5" />
                        <div>
                          <h4 className="text-xs font-bold font-mono">RICH (PREMIUM VALUATION)</h4>
                          <p className="text-[11px] font-sans text-body mt-1">
                            The target entry multiple of {lboInputs.entryMultiple.toFixed(1)}x represents a premium to historic precedents. High multiple contraction risk exists, which will contract returns if exit multiples revert to median.
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

          </div>
        )}

        {/* Tab 5: Investment Committee Memo */}
        {activeTab === 'memo' && (
          <div className="max-w-[850px] w-full mx-auto flex flex-col gap-6">
            
            {/* Memo Toolbar */}
            <div className="bg-canvas border border-hairline rounded-md p-4 flex justify-between items-center print:hidden shadow-sm">
              <div className="flex items-center gap-2">
                <FileText className="h-4.5 w-4.5 text-mute" />
                <span className="text-xs font-mono font-medium uppercase text-mute">
                  IC Investment Thesis Summary
                </span>
              </div>
              <div className="flex gap-2">
                <button 
                  onClick={generateMemo}
                  disabled={memoLoading}
                  className="px-3 py-1.5 border border-hairline rounded-pill hover:bg-canvas-soft text-body hover:text-ink text-xs font-semibold flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <RefreshCw className={`h-3 w-3 ${memoLoading ? 'animate-spin' : ''}`} />
                  Regenerate
                </button>
                <button 
                  onClick={handlePrint}
                  className="px-3 py-1.5 bg-primary text-on-primary rounded-pill hover:opacity-90 text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                >
                  <Printer className="h-3.5 w-3.5" />
                  Print / PDF
                </button>
              </div>
            </div>

            {/* Memo Content Card */}
            <div className="bg-canvas border border-hairline rounded-md p-8 md:p-12 shadow-md print:border-none print:shadow-none print:p-0 print:bg-white text-ink leading-relaxed">
              {memoLoading ? (
                <div className="py-24 flex flex-col items-center justify-center gap-4">
                  <Loader2 className="h-8 w-8 animate-spin text-mute" />
                  <p className="text-body-sm text-mute font-mono">
                    Compiling investment thesis via Llama-3...
                  </p>
                </div>
              ) : memoText ? (
                <div className="flex flex-col font-sans select-text">
                  {/* KKR-Style Institutional Header */}
                  <div className="flex flex-col items-center justify-center border-b border-hairline pb-5 mb-5 text-center">
                    <div className="border-2 border-ink p-2.5 mb-2 w-14 h-14 flex items-center justify-center">
                      <span className="font-mono text-xl font-bold tracking-widest text-ink select-none">DF</span>
                    </div>
                    <span className="font-mono text-[11px] tracking-[0.25em] font-bold text-ink uppercase">DEALFLOW CAPITAL</span>
                    <span className="text-[9px] text-mute font-mono mt-1 tracking-wider uppercase">
                      NEW YORK &bull; LONDON &bull; HONG KONG &nbsp;&bull;&nbsp; MEMO@DEALFLOW.AI
                    </span>
                  </div>

                  {/* Document Title */}
                  <div className="text-center my-4 py-3 border-y border-hairline-strong">
                    <h2 className="text-lg md:text-xl font-extrabold text-ink uppercase tracking-wider font-sans">
                      Private Equity Investment Memo
                    </h2>
                  </div>

                  {/* Metadata block wrapped in thin horizontal lines */}
                  <div className="grid grid-cols-[70px_1fr] gap-y-2 py-4 px-1 border-b border-hairline text-xs font-sans mb-6">
                    <span className="font-bold text-ink uppercase tracking-wider text-[10px]">To:</span>
                    <span className="text-body text-body-sm">Investment Committee</span>
                    
                    <span className="font-bold text-ink uppercase tracking-wider text-[10px]">From:</span>
                    <span className="text-body text-body-sm">Dealflow Acquisition Group</span>
                    
                    <span className="font-bold text-ink uppercase tracking-wider text-[10px]">Date:</span>
                    <span className="text-body text-body-sm">
                      {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                    </span>
                    
                    <span className="font-bold text-ink uppercase tracking-wider text-[10px]">Subject:</span>
                    <span className="font-bold text-ink text-body-sm">
                      ACQUISITION PROPOSAL FOR {compsData.target.companyName.toUpperCase()} ({compsData.target.symbol.toUpperCase()})
                    </span>
                  </div>

                  {/* Structured Body Content */}
                  <div className="prose prose-sm max-w-none prose-headings:font-sans prose-headings:font-bold prose-headings:tracking-tight prose-headings:text-ink prose-p:text-body prose-li:text-body prose-hr:border-hairline">
                    {renderMarkdown(cleanMemoContent(memoText))}
                  </div>
                </div>
              ) : (
                <div className="py-24 flex flex-col items-center justify-center text-center gap-4">
                  <FileText className="h-12 w-12 text-mute opacity-55" />
                  <div>
                    <h3 className="text-body-md font-semibold tracking-tight text-ink">
                      Generate Investment Committee Memo
                    </h3>
                    <p className="text-body-sm text-mute mt-1 max-w-md">
                      Pulls comps metrics, LBO outputs, and precedent flags to compile a institutional-grade investment thesis.
                    </p>
                  </div>
                  <button 
                    onClick={generateMemo}
                    className="px-5 py-2.5 bg-primary text-on-primary rounded-pill text-body-sm font-semibold hover:opacity-90 cursor-pointer flex items-center gap-1.5"
                  >
                    <RefreshCw className="h-3.5 w-3.5" />
                    Compile Memo
                  </button>
                </div>
              )}
            </div>

          </div>
        )}
        
          </>
        )}

      </div>
    </div>
  );
}

// Cleanses LLM raw headers by skipping everything until the first numbered section (1. Section)
function cleanMemoContent(text: string): string {
  if (!text) return '';
  const lines = text.split('\n');
  
  let startIndex = 0;
  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim();
    // Match headers starting with "1. " or "### 1. " or "**1. "
    if (trimmed.match(/^(###\s+|#\s+|\*\*|\d+\.\s+)?1\.\s+/)) {
      startIndex = i;
      break;
    }
  }
  
  return lines.slice(startIndex).join('\n');
}

// Simple and lightweight custom markdown parser matching standard PE firm report aesthetics
function renderMarkdown(markdown: string) {
  if (!markdown) return null;

  const lines = markdown.split('\n');
  return lines.map((line, idx) => {
    const trimmed = line.trim();

    // 1. Match Major Numbered Headings (e.g. "1. Executive Summary" or "### 1. Executive Summary")
    // Use length constraint (< 80) to avoid matching long numbered list items (e.g. "1. Risk: ...")
    if (trimmed.match(/^(###\s+)?\d+\.\s+/) && trimmed.length < 80) {
      const headingText = trimmed.replace(/^(###\s+)?\d+\.\s+/, '').replace(/\*\*/g, '');
      const numberMatch = trimmed.match(/^\d+/) || trimmed.match(/^(###\s+)?(\d+)/);
      const displayNum = numberMatch ? numberMatch[numberMatch.length - 1] : '';

      return (
        <div key={idx} className="mt-6 mb-3">
          {idx > 0 && <hr className="border-hairline my-5" />}
          <h3 className="text-base md:text-lg font-bold text-ink font-sans select-text">
            {displayNum}. {headingText}
          </h3>
        </div>
      );
    }

    // 2. Match Subheadings (e.g. "A. Company Overview" or "**B. Market Position**")
    // Use length constraint (< 80) to avoid matching long list items starting with letters
    if ((trimmed.match(/^(####\s+)?([A-Z]\.\s+)/) || (trimmed.startsWith('**') && trimmed.match(/^\*\*([A-Z]\.\s+)/))) && trimmed.length < 80) {
      const headingText = trimmed
        .replace(/^(####\s+)?([A-Z]\.\s+)/, '')
        .replace(/^\*\*([A-Z]\.\s+)/, '')
        .replace(/\*\*/g, '');
      const letterMatch = trimmed.match(/[A-Z]\./);
      const displayLetter = letterMatch ? letterMatch[0] : '';

      return (
        <h4 key={idx} className="text-sm md:text-base font-bold text-ink font-sans mt-4 mb-2 select-text">
          {displayLetter} {headingText}
        </h4>
      );
    }

    // 3. Match general section headers like "# Section Header" or "### Section Header" or short bold lines
    if (trimmed.startsWith('#') || (trimmed.startsWith('**') && trimmed.endsWith('**') && !trimmed.includes(':', 2) && trimmed.length < 80)) {
      const headingText = trimmed.startsWith('#') 
        ? trimmed.replace(/^[#]+\s+/, '').replace(/\*\*/g, '')
        : trimmed.substring(2, trimmed.length - 2);

      return (
        <div key={idx} className="mt-5 mb-2.5">
          <h3 className="text-sm md:text-base font-bold text-ink font-sans select-text">
            {headingText}
          </h3>
        </div>
      );
    }

    // 4. Over-bolded Paragraph Heuristic Split (e.g. "**1. Leverage Constraint: The target's debt...**")
    if (trimmed.startsWith('**') && trimmed.endsWith('**') && trimmed.length > 80) {
      const cleanLine = trimmed.substring(2, trimmed.length - 2);
      const colonIdx = cleanLine.indexOf(':');
      if (colonIdx !== -1 && colonIdx < 50) {
        const boldPrefix = cleanLine.substring(0, colonIdx + 1);
        const regularSuffix = cleanLine.substring(colonIdx + 1);
        return (
          <p key={idx} className="text-body text-xs md:text-sm leading-relaxed mb-3 font-sans text-left select-text">
            <strong className="font-bold text-ink">{boldPrefix}</strong>
            {regularSuffix}
          </p>
        );
      }
    }

    // 5. Match Bullet list items (including over-bolded bullet heuristic)
    if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
      const bulletContent = trimmed.replace(/^[-*]\s+/, '');
      
      // Check if bullet content is fully bolded but has a colon
      if (bulletContent.startsWith('**') && bulletContent.endsWith('**') && bulletContent.length > 80) {
        const cleanBullet = bulletContent.substring(2, bulletContent.length - 2);
        const colonIdx = cleanBullet.indexOf(':');
        if (colonIdx !== -1 && colonIdx < 50) {
          const boldPrefix = cleanBullet.substring(0, colonIdx + 1);
          const regularSuffix = cleanBullet.substring(colonIdx + 1);
          return (
            <li key={idx} className="ml-4 list-disc text-body text-xs md:text-sm leading-relaxed mb-1.5 pl-1 select-text">
              <strong className="font-bold text-ink">{boldPrefix}</strong>
              {regularSuffix}
            </li>
          );
        }
      }

      return (
        <li key={idx} className="ml-4 list-disc text-body text-xs md:text-sm leading-relaxed mb-1.5 pl-1 select-text">
          {parseInline(bulletContent)}
        </li>
      );
    }

    // 6. Match Empty Lines
    if (!trimmed) {
      return <div key={idx} className="h-2.5" />;
    }

    // 7. Default Paragraphs
    return (
      <p key={idx} className="text-body text-xs md:text-sm leading-relaxed mb-3 font-sans text-left select-text">
        {parseInline(line)}
      </p>
    );
  });
}

// Inline parser for bold styling tags (e.g. **bold text**)
function parseInline(text: string) {
  const parts = [];
  let remaining = text;
  
  while (remaining.length > 0) {
    const boldIndex = remaining.indexOf('**');
    if (boldIndex === -1) {
      parts.push(remaining);
      break;
    }
    
    // Push preceding text
    if (boldIndex > 0) {
      parts.push(remaining.substring(0, boldIndex));
    }
    
    // Locate closing tag
    const endBoldIndex = remaining.indexOf('**', boldIndex + 2);
    if (endBoldIndex === -1) {
      parts.push(remaining.substring(boldIndex));
      break;
    }
    
    // Push formatted bold segment
    const boldText = remaining.substring(boldIndex + 2, endBoldIndex);
    parts.push(
      <strong key={remaining.length + boldIndex} className="font-bold text-ink">
        {boldText}
      </strong>
    );
    
    remaining = remaining.substring(endBoldIndex + 2);
  }
  
  return parts;
}
