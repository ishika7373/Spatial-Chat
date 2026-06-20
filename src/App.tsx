import React, { useState, useMemo } from 'react';
import {
  TrendingUp,
  Share2,
  Users,
  Sparkles,
  Lightbulb,
  BookOpen
} from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell
} from 'recharts';

// Preset configurations
const PRESETS = {
  conservative: {
    seedRate: 2,
    avgMembers: 80,
    conversionRate: 3.0,
    acv: 3600,
    name: 'Conservative'
  },
  base: {
    seedRate: 5,
    avgMembers: 120,
    conversionRate: 5.0,
    acv: 4800,
    name: 'Base'
  },
  aggressive: {
    seedRate: 10,
    avgMembers: 180,
    conversionRate: 8.0,
    acv: 7200,
    name: 'Aggressive'
  }
};

type ScenarioType = 'conservative' | 'base' | 'aggressive' | 'custom';

export default function App() {
  // Global simulator state (numbers used for models)
  const [seedRate, setSeedRate] = useState<number>(PRESETS.base.seedRate);
  const [avgMembers, setAvgMembers] = useState<number>(PRESETS.base.avgMembers);
  const [conversionRate, setConversionRate] = useState<number>(PRESETS.base.conversionRate);
  const [acv, setAcv] = useState<number>(PRESETS.base.acv);
  const [scenario, setScenario] = useState<ScenarioType>('base');
  const [activeTab, setActiveTab] = useState<string>('growth');

  // Local string inputs for text boxes to avoid React controlled input cursor/decimal loss
  const [seedRateStr, setSeedRateStr] = useState<string>(PRESETS.base.seedRate.toString());
  const [avgMembersStr, setAvgMembersStr] = useState<string>(PRESETS.base.avgMembers.toString());
  const [conversionRateStr, setConversionRateStr] = useState<string>(PRESETS.base.conversionRate.toString());
  const [acvStr, setAcvStr] = useState<string>(PRESETS.base.acv.toString());

  // Apply scenario presets
  const handleScenarioChange = (type: ScenarioType) => {
    setScenario(type);
    if (type !== 'custom') {
      const preset = PRESETS[type];
      setSeedRate(preset.seedRate);
      setSeedRateStr(preset.seedRate.toString());
      setAvgMembers(preset.avgMembers);
      setAvgMembersStr(preset.avgMembers.toString());
      setConversionRate(preset.conversionRate);
      setConversionRateStr(preset.conversionRate.toString());
      setAcv(preset.acv);
      setAcvStr(preset.acv.toString());
    }
  };

  // Helper to handle slider changes
  const handleSliderChange = (
    setterNum: React.Dispatch<React.SetStateAction<number>>,
    setterStr: React.Dispatch<React.SetStateAction<string>>,
    value: number
  ) => {
    setterNum(value);
    setterStr(value.toString());
    setScenario('custom');
  };

  // Helper to handle manual number input changes (allows empty strings and typing decimals)
  const handleNumberInputChange = (
    setterNum: React.Dispatch<React.SetStateAction<number>>,
    setterStr: React.Dispatch<React.SetStateAction<string>>,
    text: string
  ) => {
    setterStr(text);
    setScenario('custom');
    
    const parsed = Number(text);
    if (!isNaN(parsed) && text !== '') {
      setterNum(parsed);
    } else if (text === '') {
      setterNum(0); // calculation fallback for empty state
    }
  };

  // Helper to clamp values on blur
  const handleNumberInputBlur = (
    setterNum: React.Dispatch<React.SetStateAction<number>>,
    setterStr: React.Dispatch<React.SetStateAction<string>>,
    value: number,
    min: number,
    max: number
  ) => {
    const clamped = Math.max(min, Math.min(max, value));
    setterNum(clamped);
    setterStr(clamped.toString());
  };

  // Mathematical model calculation for 18 months
  const calculateDataForModel = (sRate: number, aMembers: number, cRate: number, annualVal: number) => {
    const data = [];
    for (let m = 1; m <= 18; m++) {
      const cumulativeCommunities = sRate * m;
      const totalCommunities = cumulativeCommunities * 1.08; // 8% referral bonus
      const totalMembers = totalCommunities * aMembers;
      const payingAccounts = totalMembers * (cRate / 100);
      const arr = payingAccounts * annualVal * (m / 18);
      
      data.push({
        month: m,
        cumulativeCommunities,
        totalCommunities,
        totalMembers,
        payingAccounts,
        arr
      });
    }
    return data;
  };

  // Pre-calculate data series
  const currentSeries = useMemo(() => {
    return calculateDataForModel(seedRate, avgMembers, conversionRate, acv);
  }, [seedRate, avgMembers, conversionRate, acv]);

  const conservativeSeries = useMemo(() => {
    const p = PRESETS.conservative;
    return calculateDataForModel(p.seedRate, p.avgMembers, p.conversionRate, p.acv);
  }, []);

  const aggressiveSeries = useMemo(() => {
    const p = PRESETS.aggressive;
    return calculateDataForModel(p.seedRate, p.avgMembers, p.conversionRate, p.acv);
  }, []);

  // Combine data for Chart.js / Recharts
  const chartData = useMemo(() => {
    return Array.from({ length: 18 }, (_, i) => {
      const m = i + 1;
      return {
        name: `Month ${m}`,
        monthNum: m,
        'Current Model': Math.round(currentSeries[i].arr / 1000), // in $K
        'Conservative preset': Math.round(conservativeSeries[i].arr / 1000), // in $K
        'Aggressive preset': Math.round(aggressiveSeries[i].arr / 1000) // in $K
      };
    });
  }, [currentSeries, conservativeSeries, aggressiveSeries]);

  // Current metric values at month 18
  const m18Metrics = useMemo(() => {
    const m18Data = currentSeries[17];
    const m1Data = currentSeries[0];
    const multiplier = m1Data.arr > 0 ? m18Data.arr / m1Data.arr : 0;
    
    return {
      arr: m18Data.arr,
      communities: m18Data.totalCommunities,
      payingAccounts: m18Data.payingAccounts,
      multiplier: multiplier
    };
  }, [currentSeries]);

  // Dynamic insight sentence logic
  // Find month where ARR crosses $250K
  const targetThreshold = 250000;
  const crossMonth = useMemo(() => {
    const idx = currentSeries.findIndex(d => d.arr >= targetThreshold);
    return idx !== -1 ? idx + 1 : null;
  }, [currentSeries]);

  // Format currency
  const formatCurrency = (val: number) => {
    if (val >= 1000000) {
      return `$${(val / 1000000).toFixed(2)}M`;
    }
    return `$${(val / 1000).toFixed(1)}K`;
  };

  // Tab 3 Revenue details
  const revenueDistribution = useMemo(() => {
    const totalARR = m18Metrics.arr;
    return [
      { name: 'Community hosting fees', percentage: 45, value: totalARR * 0.45, color: '#7F77DD' },
      { name: 'Event upsells', percentage: 28, value: totalARR * 0.28, color: '#D97706' },
      { name: 'Enterprise seat expansion', percentage: 18, value: totalARR * 0.18, color: '#1D9E75' },
      { name: 'Partnership revenue', percentage: 9, value: totalARR * 0.09, color: '#6B7280' }
    ];
  }, [m18Metrics.arr]);

  return (
    <div className="app-layout">
      {/* Header */}
      <header className="app-header">
        <div className="header-container">
          <div className="brand-section">
            <div className="brand-logo">S</div>
            <div>
              <h1 className="brand-title">SpatialChat CLG Flywheel Simulator</h1>
              <p className="brand-subtitle">Simulate community-led growth and monetization dynamics</p>
            </div>
          </div>

          <div className="tabs-container">
            <button
              onClick={() => setActiveTab('growth')}
              className={`tab-btn ${activeTab === 'growth' ? 'active' : ''}`}
            >
              Growth model
            </button>
            <button
              onClick={() => setActiveTab('flywheel')}
              className={`tab-btn ${activeTab === 'flywheel' ? 'active' : ''}`}
            >
              Flywheel logic
            </button>
            <button
              onClick={() => setActiveTab('revenue')}
              className={`tab-btn ${activeTab === 'revenue' ? 'active' : ''}`}
            >
              Revenue streams
            </button>
            <button
              onClick={() => setActiveTab('playbook')}
              className={`tab-btn ${activeTab === 'playbook' ? 'active' : ''}`}
            >
              Activation playbook
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="app-content">
        {/* Metric Cards Row */}
        <section className="metrics-grid">
          <div className="metric-card">
            <span className="metric-label">Month 18 ARR</span>
            <span className="metric-value">{formatCurrency(m18Metrics.arr)}</span>
            <div className="metric-trend" style={{ color: 'var(--color-purple)' }}>
              <TrendingUp size={14} />
              <span>Target run-rate ARR</span>
            </div>
          </div>

          <div className="metric-card">
            <span className="metric-label">Total communities</span>
            <span className="metric-value">{Math.round(m18Metrics.communities)}</span>
            <div className="metric-trend" style={{ color: 'var(--color-green)' }}>
              <Share2 size={14} />
              <span>Includes 8% referral bonus</span>
            </div>
          </div>

          <div className="metric-card">
            <span className="metric-label">Paying accounts</span>
            <span className="metric-value">{Math.round(m18Metrics.payingAccounts)}</span>
            <div className="metric-trend" style={{ color: '#3B82F6' }}>
              <Users size={14} />
              <span>From community members</span>
            </div>
          </div>

          <div className="metric-card">
            <span className="metric-label">Flywheel multiplier</span>
            <span className="metric-value">{m18Metrics.multiplier.toFixed(1)}x</span>
            <div className="metric-trend" style={{ color: 'var(--color-amber)' }}>
              <Sparkles size={14} />
              <span>Month 18 vs Month 1 ARR</span>
            </div>
          </div>
        </section>

        {/* Tab 1: Growth Model */}
        {activeTab === 'growth' && (
          <div className="simulator-layout">
            {/* Control Panel */}
            <div className="card controls-card">
              <div>
                <h3 className="card-title" style={{ marginBottom: '0.25rem' }}>Scenario preset</h3>
                <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', marginBottom: '0.75rem' }}>Select standard models or adjust levers below</p>
                <div className="scenario-toggle">
                  <button
                    onClick={() => handleScenarioChange('conservative')}
                    className={`scenario-btn ${scenario === 'conservative' ? 'active-conservative' : ''}`}
                  >
                    Conservative
                  </button>
                  <button
                    onClick={() => handleScenarioChange('base')}
                    className={`scenario-btn ${scenario === 'base' ? 'active-base' : ''}`}
                  >
                    Base
                  </button>
                  <button
                    onClick={() => handleScenarioChange('aggressive')}
                    className={`scenario-btn ${scenario === 'aggressive' ? 'active-aggressive' : ''}`}
                  >
                    Aggressive
                  </button>
                  <button
                    onClick={() => handleScenarioChange('custom')}
                    className={`scenario-btn ${scenario === 'custom' ? 'active-custom' : ''}`}
                  >
                    Custom
                  </button>
                </div>
              </div>

              {/* Lever 1 */}
              <div className="lever-group">
                <div className="lever-header">
                  <label className="lever-label" htmlFor="seed-rate-slider">Anchor communities seeded/month</label>
                  <span className="lever-value-badge">{seedRate}</span>
                </div>
                <div className="lever-slider-container">
                  <input
                    id="seed-rate-slider"
                    type="range"
                    min="1"
                    max="25"
                    step="1"
                    value={seedRate}
                    onChange={(e) => handleSliderChange(setSeedRate, setSeedRateStr, Number(e.target.value))}
                    className="lever-slider"
                  />
                  <input
                    type="text"
                    value={seedRateStr}
                    aria-label="Anchor communities seeded/month value input"
                    onChange={(e) => handleNumberInputChange(setSeedRate, setSeedRateStr, e.target.value)}
                    onBlur={() => handleNumberInputBlur(setSeedRate, setSeedRateStr, seedRate, 1, 25)}
                    className="lever-number-input"
                  />
                </div>
              </div>

              {/* Lever 2 */}
              <div className="lever-group">
                <div className="lever-header">
                  <label className="lever-label" htmlFor="avg-members-slider">Avg members per community</label>
                  <span className="lever-value-badge">{avgMembers}</span>
                </div>
                <div className="lever-slider-container">
                  <input
                    id="avg-members-slider"
                    type="range"
                    min="10"
                    max="500"
                    step="10"
                    value={avgMembers}
                    onChange={(e) => handleSliderChange(setAvgMembers, setAvgMembersStr, Number(e.target.value))}
                    className="lever-slider"
                  />
                  <input
                    type="text"
                    value={avgMembersStr}
                    aria-label="Avg members per community value input"
                    onChange={(e) => handleNumberInputChange(setAvgMembers, setAvgMembersStr, e.target.value)}
                    onBlur={() => handleNumberInputBlur(setAvgMembers, setAvgMembersStr, avgMembers, 10, 500)}
                    className="lever-number-input"
                  />
                </div>
              </div>

              {/* Lever 3 */}
              <div className="lever-group">
                <div className="lever-header">
                  <label className="lever-label" htmlFor="conversion-slider">Member-to-paid conversion rate %</label>
                  <span className="lever-value-badge">{conversionRate.toFixed(1)}%</span>
                </div>
                <div className="lever-slider-container">
                  <input
                    id="conversion-slider"
                    type="range"
                    min="0.5"
                    max="20"
                    step="0.5"
                    value={conversionRate}
                    onChange={(e) => handleSliderChange(setConversionRate, setConversionRateStr, Number(e.target.value))}
                    className="lever-slider lever-slider-green"
                  />
                  <input
                    type="text"
                    value={conversionRateStr}
                    aria-label="Member-to-paid conversion rate percentage value input"
                    onChange={(e) => handleNumberInputChange(setConversionRate, setConversionRateStr, e.target.value)}
                    onBlur={() => handleNumberInputBlur(setConversionRate, setConversionRateStr, conversionRate, 0.5, 20)}
                    className="lever-number-input"
                  />
                </div>
              </div>

              {/* Lever 4 */}
              <div className="lever-group">
                <div className="lever-header">
                  <label className="lever-label" htmlFor="acv-slider">Avg ACV in USD</label>
                  <span className="lever-value-badge">${acv.toLocaleString()}</span>
                </div>
                <div className="lever-slider-container">
                  <input
                    id="acv-slider"
                    type="range"
                    min="500"
                    max="25000"
                    step="500"
                    value={acv}
                    onChange={(e) => handleSliderChange(setAcv, setAcvStr, Number(e.target.value))}
                    className="lever-slider lever-slider-amber"
                  />
                  <input
                    type="text"
                    value={acvStr}
                    aria-label="Avg ACV value input"
                    onChange={(e) => handleNumberInputChange(setAcv, setAcvStr, e.target.value)}
                    onBlur={() => handleNumberInputBlur(setAcv, setAcvStr, acv, 500, 25000)}
                    className="lever-number-input"
                  />
                </div>
              </div>
            </div>

            {/* Chart Area */}
            <div className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div>
                <h3 className="card-title">18-month ARR trajectory</h3>
                <div style={{ width: '100%', height: 350 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                      data={chartData}
                      margin={{ top: 10, right: 30, left: 10, bottom: 10 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
                      <XAxis
                        dataKey="name"
                        stroke="#9CA3AF"
                        fontSize={11}
                        tickLine={false}
                      />
                      <YAxis
                        stroke="#9CA3AF"
                        fontSize={11}
                        tickFormatter={(value) => `$${value}k`}
                        tickLine={false}
                        axisLine={false}
                      />
                      <Tooltip
                        formatter={(value) => [`$${Number(value).toLocaleString()}K`, '']}
                        contentStyle={{
                          backgroundColor: '#FFF',
                          border: '1px solid #E5E7EB',
                          borderRadius: '8px',
                          fontSize: '12px'
                        }}
                      />
                      <Legend
                        verticalAlign="top"
                        height={36}
                        iconType="circle"
                        wrapperStyle={{ fontSize: '12px' }}
                      />
                      <Line
                        type="monotone"
                        dataKey="Conservative preset"
                        stroke="#9CA3AF"
                        strokeWidth={1.5}
                        strokeDasharray="5 5"
                        dot={false}
                      />
                      <Line
                        type="monotone"
                        dataKey="Aggressive preset"
                        stroke="#1D9E75"
                        strokeWidth={1.5}
                        strokeDasharray="5 5"
                        dot={false}
                      />
                      <Line
                        type="monotone"
                        dataKey="Current Model"
                        stroke="#7F77DD"
                        strokeWidth={2.5}
                        activeDot={{ r: 6 }}
                        dot={false}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Dynamic Insight Sentence */}
              <div className="insight-box">
                <Lightbulb size={20} className="insight-icon" />
                <div className="insight-text">
                  {crossMonth ? (
                    <span>
                      At this trajectory, the flywheel crosses the <span className="insight-highlight">$250K ARR</span> threshold around <span className="insight-highlight">month {crossMonth}</span>.
                    </span>
                  ) : (
                    <span>
                      At this trajectory, the flywheel does not cross the $250K ARR threshold within the 18-month window (reaches <span className="insight-highlight">{formatCurrency(m18Metrics.arr)}</span> at month 18).
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Flywheel Logic */}
        {activeTab === 'growth' ? null : activeTab === 'flywheel' ? (
          <div className="flywheel-grid">
            <div className="flywheel-diagram-container">
              {/* Top Right Callout */}
              <div className="flywheel-node-badge">
                <span style={{ fontWeight: 600, display: 'block', marginBottom: '0.25rem' }}>Active nodes:</span>
                Harvard, MIT, Stanford are existing nodes to activate.
              </div>

              {/* SVG Loop Diagram */}
              <svg width="650" height="420" viewBox="0 0 650 420" style={{ maxWidth: '100%' }}>
                {/* Definitions for arrow marker */}
                <defs>
                  <marker id="arrow-purple" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                    <path d="M 0 0 L 10 5 L 0 10 z" fill="#7F77DD" />
                  </marker>
                  <marker id="arrow-green" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                    <path d="M 0 0 L 10 5 L 0 10 z" fill="#1D9E75" />
                  </marker>
                  <marker id="arrow-amber" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                    <path d="M 0 0 L 10 5 L 0 10 z" fill="#D97706" />
                  </marker>
                  <marker id="arrow-gray" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                    <path d="M 0 0 L 10 5 L 0 10 z" fill="#9CA3AF" />
                  </marker>
                </defs>

                {/* --- Main Circular Flow Arrows --- */}
                {/* 1 to 2 */}
                <path d="M 325 80 Q 425 90 480 150" fill="none" stroke="#9CA3AF" strokeWidth="2" markerEnd="url(#arrow-gray)" />
                {/* 2 to 3 */}
                <path d="M 480 200 Q 460 270 395 315" fill="none" stroke="#9CA3AF" strokeWidth="2" markerEnd="url(#arrow-gray)" />
                {/* 3 to 4 */}
                <path d="M 355 330 Q 250 330 205 285" fill="none" stroke="#9CA3AF" strokeWidth="2" markerEnd="url(#arrow-gray)" />
                {/* 4 to 5 */}
                <path d="M 180 260 Q 150 200 170 160" fill="none" stroke="#9CA3AF" strokeWidth="2" markerEnd="url(#arrow-gray)" />
                {/* 5 to 1 */}
                <path d="M 195 125 Q 240 70 300 70" fill="none" stroke="#9CA3AF" strokeWidth="2" markerEnd="url(#arrow-gray)" />

                {/* --- Labeled Feedback Loops --- */}
                {/* Event Loop: From Stage 3 (Members invite) back to Stage 2 (Host events) */}
                <path d="M 385 295 Q 430 230 460 195" fill="none" stroke="#7F77DD" strokeWidth="2.5" strokeDasharray="6 4" markerEnd="url(#arrow-purple)" className="flow-arrow-animated" />
                <text x="445" y="245" fill="#7F77DD" fontSize="11" fontWeight="600" textAnchor="start">Event loop</text>

                {/* Referral Loop: From Stage 4 (New community signups) back to Stage 1 (Seed anchor) */}
                <path d="M 215 260 Q 250 160 300 100" fill="none" stroke="#1D9E75" strokeWidth="2.5" strokeDasharray="6 4" markerEnd="url(#arrow-green)" className="flow-arrow-animated" />
                <text x="235" y="165" fill="#1D9E75" fontSize="11" fontWeight="600" textAnchor="end">Referral loop</text>

                {/* Upsell Core: Pointing from 5 (Upsell) to Center or reinforcing */}
                <path d="M 170 130 Q 130 110 115 130 T 135 155" fill="none" stroke="#D97706" strokeWidth="2" markerEnd="url(#arrow-amber)" />
                <text x="110" y="115" fill="#D97706" fontSize="10" fontWeight="600" textAnchor="middle">Upsell loop</text>

                {/* --- Stages Nodes (Centered on computed coordinates) --- */}
                {/* Node 1: Seed anchor community */}
                <g transform="translate(325, 65)">
                  <rect x="-90" y="-20" width="180" height="40" rx="8" fill="white" stroke="#E5E7EB" strokeWidth="1.5" />
                  <rect x="-90" y="-20" width="180" height="4" rx="2" fill="#7F77DD" />
                  <text x="0" y="5" textAnchor="middle" fontSize="11" fontWeight="600" fill="#1F2937">Seed anchor community</text>
                  <circle cx="-75" cy="0" r="10" fill="#7F77DD" />
                  <text x="-75" y="3" textAnchor="middle" fontSize="10" fontWeight="700" fill="white">1</text>
                </g>

                {/* Node 2: Host events on SpatialChat */}
                <g transform="translate(490, 175)">
                  <rect x="-90" y="-20" width="180" height="40" rx="8" fill="white" stroke="#E5E7EB" strokeWidth="1.5" />
                  <rect x="-90" y="-20" width="180" height="4" rx="2" fill="#7F77DD" />
                  <text x="0" y="5" textAnchor="middle" fontSize="11" fontWeight="600" fill="#1F2937">Host events on SpatialChat</text>
                  <circle cx="-75" cy="0" r="10" fill="#7F77DD" />
                  <text x="-75" y="3" textAnchor="middle" fontSize="10" fontWeight="700" fill="white">2</text>
                </g>

                {/* Node 3: Members invite networks */}
                <g transform="translate(415, 335)">
                  <rect x="-90" y="-20" width="180" height="40" rx="8" fill="white" stroke="#E5E7EB" strokeWidth="1.5" />
                  <rect x="-90" y="-20" width="180" height="4" rx="2" fill="#7F77DD" />
                  <text x="0" y="5" textAnchor="middle" fontSize="11" fontWeight="600" fill="#1F2937">Members invite networks</text>
                  <circle cx="-75" cy="0" r="10" fill="#7F77DD" />
                  <text x="-75" y="3" textAnchor="middle" fontSize="10" fontWeight="700" fill="white">3</text>
                </g>

                {/* Node 4: New community signups */}
                <g transform="translate(170, 290)">
                  <rect x="-90" y="-20" width="180" height="40" rx="8" fill="white" stroke="#E5E7EB" strokeWidth="1.5" />
                  <rect x="-90" y="-20" width="180" height="4" rx="2" fill="#7F77DD" />
                  <text x="0" y="5" textAnchor="middle" fontSize="11" fontWeight="600" fill="#1F2937">New community signups</text>
                  <circle cx="-75" cy="0" r="10" fill="#7F77DD" />
                  <text x="-75" y="3" textAnchor="middle" fontSize="10" fontWeight="700" fill="white">4</text>
                </g>

                {/* Node 5: Upsell to paid tier */}
                <g transform="translate(155, 140)">
                  <rect x="-90" y="-20" width="180" height="40" rx="8" fill="white" stroke="#E5E7EB" strokeWidth="1.5" />
                  <rect x="-90" y="-20" width="180" height="4" rx="2" fill="#D97706" strokeWidth="1" />
                  <text x="0" y="5" textAnchor="middle" fontSize="11" fontWeight="600" fill="#1F2937">Upsell to paid tier</text>
                  <circle cx="-75" cy="0" r="10" fill="#D97706" />
                  <text x="-75" y="3" textAnchor="middle" fontSize="10" fontWeight="700" fill="white">5</text>
                </g>
              </svg>
            </div>

            {/* Profile Tags Card */}
            <div className="card">
              <h3 className="card-title" style={{ textAlign: 'center' }}>Target community profile segments</h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', textAlign: 'center', marginBottom: '1.25rem' }}>
                Activate existing networks to seed the flywheel flow and optimize conversion
              </p>
              <div className="profile-tags-container">
                <span className="profile-tag">university chapters</span>
                <span className="profile-tag">professional associations</span>
                <span className="profile-tag">remote-first startup networks</span>
                <span className="profile-tag">EdTech cohorts</span>
                <span className="profile-tag">nonprofits</span>
                <span className="profile-tag">DAO/Web3 groups</span>
              </div>
            </div>
          </div>
        ) : activeTab === 'revenue' ? (
          <div className="card">
            <h3 className="card-title">Monetization distribution</h3>
            
            <div className="revenue-layout">
              {/* Horizontal Bars */}
              <div className="revenue-bucket-list">
                {revenueDistribution.map((bucket, index) => (
                  <div key={index} className="revenue-bucket-item">
                    <div className="bucket-info">
                      <span className="bucket-name">{bucket.name}</span>
                      <div className="bucket-values">
                        <span className="bucket-percentage">{bucket.percentage}%</span>
                        <span className="bucket-dollars">{formatCurrency(bucket.value)}</span>
                      </div>
                    </div>
                    <div className="progress-bar-bg">
                      <div
                        className="progress-bar-fill"
                        style={{
                          width: `${bucket.percentage}%`,
                          backgroundColor: bucket.color
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>

              {/* Doughnut Chart */}
              <div className="doughnut-container">
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie
                      data={revenueDistribution}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={85}
                      paddingAngle={4}
                      dataKey="value"
                    >
                      {revenueDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value) => [`$${Math.round(Number(value)).toLocaleString()}`, '']}
                      contentStyle={{
                        backgroundColor: '#FFF',
                        border: '1px solid #E5E7EB',
                        borderRadius: '8px',
                        fontSize: '12px'
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Benchmarks Section */}
            <div className="benchmarks-box">
              <h4 style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--color-text-main)', marginBottom: '0.75rem' }}>
                Competitive benchmarks and validation
              </h4>
              <div className="benchmarks-grid">
                <div className="benchmark-card">
                  <span className="benchmark-label">Bevy ACV range</span>
                  <span className="benchmark-val">$12K – $60K</span>
                </div>
                <div className="benchmark-card">
                  <span className="benchmark-label">Hivebrite ACV range</span>
                  <span className="benchmark-val">$8.4K – $36K</span>
                </div>
                <div className="benchmark-card">
                  <span className="benchmark-label">Median conversion</span>
                  <span className="benchmark-val">5% = B2B median, 9–11% top quartile</span>
                </div>
              </div>
            </div>
          </div>
        ) : activeTab === 'playbook' ? (
          <div className="card" style={{ padding: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', padding: '0 0.5rem' }}>
              <BookOpen size={18} style={{ color: 'var(--color-purple)' }} />
              <h3 className="card-title" style={{ margin: 0 }}>Community activation playbook</h3>
            </div>
            
            <div className="table-container">
              <table className="playbook-table">
                <thead>
                  <tr>
                    <th>Step</th>
                    <th>Action description</th>
                    <th>Tool/Channel</th>
                    <th>Success metric</th>
                    <th>Owner</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="playbook-step">01</td>
                    <td>Target key community leaders and champions at anchor universities (Harvard, MIT, Stanford) and startup hubs.</td>
                    <td><span className="badge-gray">LinkedIn Navigator</span></td>
                    <td>25% response rate, 15 intro calls booked</td>
                    <td><span className="badge-owner">SDR Team</span></td>
                  </tr>
                  <tr>
                    <td className="playbook-step">02</td>
                    <td>Host interactive sessions on SpatialChat demonstrating spatial audio, custom backgrounds, and networking rooms.</td>
                    <td><span className="badge-purple">SpatialChat Demo Room</span></td>
                    <td>80% satisfaction score, 10 trial rooms created</td>
                    <td><span className="badge-owner">AE Team</span></td>
                  </tr>
                  <tr>
                    <td className="playbook-step">03</td>
                    <td>Launch free pilot spaces for selected student chapters, EdTech cohorts, or remote startup networks.</td>
                    <td><span className="badge-gray">Admin Console</span></td>
                    <td>3 active events hosted in week 1 per community</td>
                    <td><span className="badge-owner">CSM Team</span></td>
                  </tr>
                  <tr>
                    <td className="playbook-step">04</td>
                    <td>Promote the initial seed communities through joint social media posts, newsletter callouts, and local campus networks.</td>
                    <td><span className="badge-gray">X, LinkedIn, Slack</span></td>
                    <td>500+ members joined across all seed nodes</td>
                    <td><span className="badge-owner">Marketing</span></td>
                  </tr>
                  <tr>
                    <td className="playbook-step">05</td>
                    <td>Host run-throughs and coordinate technical checks for event organizers to build confidence with SpatialChat controls.</td>
                    <td><span className="badge-purple">SpatialChat & Loom</span></td>
                    <td>100% of organizers pass sandbox run-through</td>
                    <td><span className="badge-owner">CSM Team</span></td>
                  </tr>
                  <tr>
                    <td className="playbook-step">06</td>
                    <td>Assist the anchor community in hosting their first large-scale virtual event (e.g. career fair, startup pitch night).</td>
                    <td><span className="badge-purple">SpatialChat Event</span></td>
                    <td>100+ concurrent attendees, &gt;15 mins avg stay time</td>
                    <td><span className="badge-owner">Event Team</span></td>
                  </tr>
                  <tr>
                    <td className="playbook-step">07</td>
                    <td>Prompt event attendees during wrap-up and via automated follow-up emails to spin up their own free spaces for sub-groups.</td>
                    <td><span className="badge-gray">In-app prompts & Email</span></td>
                    <td>8% virality coefficient (8 new signups per 100 members)</td>
                    <td><span className="badge-owner">Product</span></td>
                  </tr>
                  <tr>
                    <td className="playbook-step">08</td>
                    <td>Identify highly active communities exceeding free tiers (e.g., &gt;30 members, &gt;2 events/month) for upsell opportunities.</td>
                    <td><span className="badge-green">Mixpanel & HubSpot</span></td>
                    <td>15 qualified leads flagged per month</td>
                    <td><span className="badge-owner">Growth PM</span></td>
                  </tr>
                  <tr>
                    <td className="playbook-step">09</td>
                    <td>Present premium community plans (custom domains, white labeling, advanced moderation tools, enterprise seats).</td>
                    <td><span className="badge-gray">Video Pitch & PDF</span></td>
                    <td>5% member-to-paid conversion rate</td>
                    <td><span className="badge-owner">Sales Reps</span></td>
                  </tr>
                  <tr>
                    <td className="playbook-step">10</td>
                    <td>Document success stories of top performing communities (e.g. Harvard Web3 Club) and publish as marketing collateral.</td>
                    <td><span className="badge-green">SpatialChat Blog</span></td>
                    <td>1 case study published, 3 organic community referrals</td>
                    <td><span className="badge-owner">Content Team</span></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        ) : null}
      </main>
    </div>
  );
}
