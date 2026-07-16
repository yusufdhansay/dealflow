# ▲ Dealflow AI: LBO & Comparable-Deal Engine

**Dealflow AI** is a high-performance, institutional-grade valuation and screening platform designed for private equity, investment banking, and corporate development workflows. Built on a stark, premium Vercel-style aesthetic, the engine combines real-time public company comps, interactive Leveraged Buyout (LBO) returns projections, precedent deal mapping, and an AI-driven Investment Committee (IC) memorandum writer.

The application operates dynamically with live API integrations, and features a foolproof fallback architecture utilizing Llama-3.1 via Groq.

---

## 🚀 Core Platform Modules

### 1. Dynamic Comps Screener (US & Indian Markets)
*   **Sector-Matched Multiples:** Searches any public ticker (e.g. `AAPL`, `NVDA`) to aggregate key valuation statistics (EV/EBITDA, EV/Sales, P/E), gross margins, and growth.
*   **NSE/BSE Support:** Features built-in auto-resolution for Indian listed stocks (e.g. searching `TCS` or `RELIANCE` automatically resolves to `TCS.NS` or `RELIANCE.NS`), loading actual local peer comps (e.g. Infosys, Wipro, L&T, ONGC).
*   **Granular Cache Layer:** Response caches are stored locally for 24 hours at both the query level and symbol level, optimizing API credit utilization and performance.

### 2. Unlisted Target Mode (Private Company Valuation)
*   **Private to Public Benchmarking:** Toggle to `UNLISTED TARGET` to value a private company by selecting a sector, TTM Revenue, TTM EBITDA, and a custom Entry Multiple.
*   **Instant Feed Synchronization:** The dashboard automatically pulls the public peer comps group for that sector, overlays the target row with the private company's numbers, and dynamically updates the LBO simulator and Precedent deal benchmarks.

### 3. Interactive LBO Forecaster
*   **Debt Paydown Projection:** Solves a multi-year debt amortization model based on Entry/Exit Multiples, leverage, interest rate, tax rate, capex, and annual growth.
*   **Interest Amortization:** Models average-balance interest expenses (approximated non-circularly) to project cash accumulation and debt reduction.
*   **Returns Output:** Calculates and displays Equity Required, Exit Equity Value, Multiple on Invested Capital (MOIC), and Internal Rate of Return (IRR).

### 4. Heatmap Sensitivity Matrix
*   **IRR & MOIC Sensitivity:** Renders the classic PE grid plotting **Exit EBITDA Multiples** (Y-axis) vs. **Leverage Levels** (X-axis).
*   **Dynamic Spectrum:** Employs a defensive heat-map color spectrum (orange for defensive holds, green for profitable returns, red for capital losses).

### 5. KKR-Style PE Investment Memo
*   **Institutional Layout:** Formatted like a top-tier PE firm report (e.g. KKR/Zephara) featuring corporate logo headers, globally formatted metadata tables (To, From, Date, Subject), and structured section rules.
*   **Smart Markdown Parsing:** 
    *   *Sizing Hierarchy:* Custom parsing engine maps major sections (`1. Executive Summary`) and sub-sections (`A. Company Overview`) in clean sans-serif layouts separated by hairline dividers.
    *   *Over-Bolded Splits:* Detects if the LLM wrapped entire paragraphs inside bold tags and splits them at the first colon (`:`), bolding only the prefix label (e.g. **`1. Risk:`**) and keeping description text regular.
    *   *Metadata Filter:* Automatically strips duplicate text headers from the LLM or templates to start the body cleanly at Section 1.

---

## 🛠️ Foolproof AI Fallback Architecture

### 1. The FMP Key Regional Constraint
Free-tier FMP API keys restrict lookups to US exchanges. If a user queries an Indian stock (NSE/BSE), FMP returns a restriction error.

### 2. The Llama-3.1 Fallback Intercept
When an FMP metric query fails, **Dealflow AI** intercepts the error:
*   If a **Groq API Key** is present in `.env.local` or settings, the backend dynamically queries Groq's `llama-3.1-8b-instant` using **Structured JSON Mode**.
*   The LLM dynamically resolves the company's real-world sector, generates 5 actual listed peer competitors in that country, and estimates realistic local multiples, margins, and growth rates.
*   The front-end loads this data seamlessly, notifying you with a green badge: **`Dynamic comps generated via Groq AI (live fallback)`**.
*   *If both keys fail, the dashboard falls back to a curated offline mock database.*

---

## ⚙️ Installation & Setup

1.  **Clone the project and install dependencies:**
    ```bash
    npm install
    ```

2.  **Configure Environment Variables:**
    Create a `.env.local` file at the root of the project:
    ```env
    # Financial Modeling Prep (FMP) API Key
    FMP_API_KEY=your_fmp_api_key_here
    
    # Groq Cloud API Key
    GROQ_API_KEY=your_groq_api_key_here
    ```
    *Note: If no env file is configured, the dashboard will load in fallback mode. Users can also paste their keys dynamically inside the **Settings (gear icon)** modal in the dashboard UI, which stores them securely in the browser's `localStorage`.*

3.  **Run the Development Server:**
    ```bash
    npm run dev
    ```
    Open **[http://localhost:3000](http://localhost:3000)** (or the designated port) in your browser.

4.  **Production Compilation Check:**
    Verify typescript compilation and static site generation:
    ```bash
    npm run build
    ```

---

## 📁 Project Structure

```
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── comps/route.ts   # Comps API, caching, and Groq fallback
│   │   │   └── memo/route.ts    # Groq Llama-3.1 PE Memo writer
│   │   └── page.tsx
│   ├── components/
│   │   └── Dashboard.tsx        # Dashboard layout, LBO engine, Memo PDF print, Markdown parser
│   └── lib/
│       ├── cache.ts             # 24hr granular JSON cache layer
│       ├── lbo.ts               # Debt schedule, interest formulas, sensitivity matrix
│       └── mockData.ts          # Hand-curated offline US/Indian stock database
├── .env.local                   # Ignored local API keys (protected by gitignore)
├── .gitignore                   # Ignores .env* files and build folders
└── README.md                    # Platform documentation
```

---

## 📄 Print & Export Support
The Investment Memo is optimized for corporate print or **PDF Export**. Clicking the **Print / PDF** button uses `@media print` CSS configurations to automatically hide the dashboard sidebar, top navigation tab bar, settings modal, and scroll containers, rendering a clean, centered, multi-page document layout suitable for Investment Committee presentation.
