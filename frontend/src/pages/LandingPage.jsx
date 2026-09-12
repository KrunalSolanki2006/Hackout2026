import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Activity,
  ArrowRight,
  ArrowUpRight,
  BarChart3,
  CheckCircle2,
  Factory,
  Flame,
  Layers,
  Lightbulb,
  Lock,
  PieChart,
  ShieldCheck,
  Sliders,
  Sparkles,
  TrendingDown,
  Zap,
  ChevronRight,
  Cpu,
  FileText,
  Check,
  Play,
  RotateCcw,
  X,
  ExternalLink,
  HelpCircle,
  Clock,
  Coins,
  Compass,
} from 'lucide-react';
import { useFacilityAssessment } from '../context/FacilityAssessmentContext';

export default function LandingPage() {
  const navigate = useNavigate();
  const { activeAssessment } = useFacilityAssessment();
  const defaultAssessmentId = activeAssessment?.id || 'asm-abc-001';

  // ─────────────────────────────────────────────────────────────
  // 1. SCROLL PROGRESS & SCROLL REVEAL ANIMATION OBSERVER
  // ─────────────────────────────────────────────────────────────
  const [scrollProgress, setScrollProgress] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      const totalHeight = document.documentElement.scrollHeight - window.innerHeight;
      if (totalHeight > 0) {
        const progress = (window.scrollY / totalHeight) * 100;
        setScrollProgress(progress);
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Scroll Reveal via IntersectionObserver
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-revealed');
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: '0px 0px -40px 0px' }
    );

    const elements = document.querySelectorAll('.reveal-on-scroll');
    elements.forEach((el, index) => {
      if (!el.style.transitionDelay) {
        el.style.transitionDelay = `${(index % 4) * 90}ms`;
      }
      observer.observe(el);
    });

    return () => observer.disconnect();
  }, []);

  // ─────────────────────────────────────────────────────────────
  // 2. DYNAMIC TEXT ANIMATION (ROTATING TYPEWRITER HEADLINE)
  // ─────────────────────────────────────────────────────────────
  const phrases = [
    'Costed Circular Solutions.',
    'Pareto Leak Diagnostics.',
    'Overlap-Aware Simulations.',
    'Auditable Decarbonization.',
  ];

  const [phraseIndex, setPhraseIndex] = useState(0);
  const [displayedText, setDisplayedText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const currentPhrase = phrases[phraseIndex];
    let typingSpeed = isDeleting ? 40 : 80;

    if (!isDeleting && displayedText === currentPhrase) {
      // Pause at full phrase
      const timeout = setTimeout(() => setIsDeleting(true), 2000);
      return () => clearTimeout(timeout);
    } else if (isDeleting && displayedText === '') {
      // Switch phrase
      setIsDeleting(false);
      setPhraseIndex((prev) => (prev + 1) % phrases.length);
      return;
    }

    const timer = setTimeout(() => {
      setDisplayedText((prev) =>
        isDeleting
          ? currentPhrase.substring(0, prev.length - 1)
          : currentPhrase.substring(0, prev.length + 1)
      );
    }, typingSpeed);

    return () => clearTimeout(timer);
  }, [displayedText, isDeleting, phraseIndex]);

  // ─────────────────────────────────────────────────────────────
  // 3. POPUP MODALS & TOAST NOTIFICATION STATES
  // ─────────────────────────────────────────────────────────────
  const [tourModalOpen, setTourModalOpen] = useState(false);
  const [activeSectorModal, setActiveSectorModal] = useState(null);

  // ─────────────────────────────────────────────────────────────
  // 4. INTERACTIVE LIVE QUICK ESTIMATOR
  // ─────────────────────────────────────────────────────────────
  const [sector, setSector] = useState('plastics');
  const [electricityMWh, setElectricityMWh] = useState(45);
  const [dieselLiters, setDieselLiters] = useState(1800);

  const elecEmissions = Number((electricityMWh * 0.82).toFixed(1));
  const dieselEmissions = Number((dieselLiters * 0.00268).toFixed(1));
  const totalQuickCO2e = Number((elecEmissions + dieselEmissions).toFixed(1));

  const quickInterventions = {
    plastics: {
      name: 'Plastics Extrusion & Injection',
      leak: 'Extruder Barrel Heat & Motor Drive',
      fix: 'Induction Heating Retrofit & 25% PCR Blending',
      potentialReductionPct: 34,
      paybackMonths: 14,
      costEstimate: '₹2,80,000',
      details:
        'Replaces resistive band heaters with high-frequency electromagnetic induction coils, cutting thermal dissipation by 32% while blending recycled regrind pellets.',
    },
    textiles: {
      name: 'Textile Spinning & Wet Dyeing',
      leak: 'Wet Dyeing Boiler Exhaust',
      fix: 'Stenter Exhaust Waste Heat Recovery Unit',
      potentialReductionPct: 29,
      paybackMonths: 11,
      costEstimate: '₹3,50,000',
      details:
        'Recovers latent heat from stenter drying exhausts using air-to-water heat exchangers, preheating boiler feed water to 65°C.',
    },
    food: {
      name: 'Food & Cold Storage Processing',
      leak: 'Continuous Chiller Compressors',
      fix: 'Cascaded Ammonia/CO₂ Refrigeration Transition',
      potentialReductionPct: 38,
      paybackMonths: 18,
      costEstimate: '₹4,20,000',
      details:
        'Upgrades legacy fluorocarbon chillers to natural refrigerant cascade cycles with variable frequency drive compressor staging.',
    },
  };

  const activeQuick = quickInterventions[sector];
  const projectedQuickCO2e = Number(
    (totalQuickCO2e * (1 - activeQuick.potentialReductionPct / 100)).toFixed(1)
  );
  const co2eSaved = Number((totalQuickCO2e - projectedQuickCO2e).toFixed(1));

  return (
    <div className="min-h-screen bg-[#07091E] text-slate-100 font-sans selection:bg-[#5546E8] selection:text-white relative overflow-x-hidden">
      {/* ───────────────────────────────────────────────────────────── */}
      {/* SCROLL PROGRESS INDICATOR BAR                                 */}
      {/* ───────────────────────────────────────────────────────────── */}
      <div
        className="fixed top-0 left-0 h-1 bg-gradient-to-r from-[#5546E8] via-[#7C3AED] to-[#10B981] z-50 transition-all duration-100 ease-out"
        style={{ width: `${scrollProgress}%` }}
      />

      {/* ───────────────────────────────────────────────────────────── */}
      {/* AMBIENT BACKGROUND GLOW EFFECTS WITH FLOATING ANIMATION       */}
      {/* ───────────────────────────────────────────────────────────── */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-[700px] overflow-hidden pointer-events-none z-0">
        <div className="absolute -top-40 left-1/4 w-[650px] h-[650px] bg-gradient-to-tr from-[#5546E8]/25 to-[#7C3AED]/20 rounded-full blur-[140px] animate-float-slow" />
        <div className="absolute top-28 right-1/4 w-[520px] h-[520px] bg-gradient-to-br from-[#10B981]/20 to-[#06B6D4]/15 rounded-full blur-[130px] animate-float-slow" style={{ animationDelay: '-2.5s' }} />
      </div>

      {/* Subtle Grid Lines Overlay */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#1E254820_1px,transparent_1px),linear-gradient(to_bottom,#1E254820_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] pointer-events-none z-0" />

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 1. TOP NAVBAR                                                 */}
      {/* ───────────────────────────────────────────────────────────── */}
      <nav className="sticky top-0 z-40 backdrop-blur-md bg-[#07091E]/85 border-b border-[#1E2548]/70 px-6 py-4 transition-all">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          {/* Brand Logo */}
          <Link to="/" className="flex items-center gap-2.5 group">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#5546E8] to-[#7C3AED] flex items-center justify-center text-white shadow-lg shadow-[#5546E8]/30 group-hover:scale-105 transition-transform">
              <Activity className="w-5 h-5" />
            </div>
            <span className="text-xl font-black tracking-tight text-white">
              Carbo<span className="text-[#5546E8]">Track</span>
            </span>
          </Link>

          {/* Center Links */}
          <div className="hidden md:flex items-center gap-8 text-xs font-medium text-slate-300">
            <a href="#pipeline" className="hover:text-white transition-colors">
              Diagnostic Pipeline
            </a>
            <a href="#trust" className="hover:text-white transition-colors">
              Trust Architecture
            </a>
            <a href="#simulator" className="hover:text-white transition-colors">
              Live Estimator
            </a>
            <a href="#sectors" className="hover:text-white transition-colors">
              Industrial Sectors
            </a>
          </div>

          {/* Right Action CTAs */}
          <div className="flex items-center gap-3">
            <Link
              to="/login"
              className="text-xs font-semibold text-slate-300 hover:text-white px-3 py-2 rounded-lg hover:bg-white/5 transition-colors"
            >
              Sign In
            </Link>
            <Link
              to="/signup"
              className="inline-flex items-center justify-center text-xs font-semibold rounded-xl bg-gradient-to-r from-[#5546E8] to-[#10B981] hover:from-[#4335D6] hover:to-[#059669] text-white px-4 py-2 shadow-md shadow-[#5546E8]/20 transition-all active:scale-95"
            >
              <span>Create Account</span>
            </Link>
          </div>
        </div>
      </nav>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 2. HERO SECTION WITH TEXT & POPUP ANIMATIONS                  */}
      {/* ───────────────────────────────────────────────────────────── */}
      <section className="relative z-10 pt-16 pb-20 px-6 max-w-7xl mx-auto text-center">
        {/* Animated Tagline Pill with Shimmer */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#1A1F3D]/80 border border-[#2E3768] text-xs text-indigo-300 mb-8 backdrop-blur-sm shadow-inner shadow-indigo-500/10 animate-float-slow">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="font-semibold tracking-wide">HACKOUT 2026</span>
          <span className="text-slate-500">•</span>
          <span className="text-slate-300">Renewable Energy & Circular Carbon Ecosystem</span>
        </div>

        {/* Hero Title with Dynamic Rotating Typewriter Text Animation - Adjusted into 2 Clean Lines */}
        <h1 className="text-2xl sm:text-4xl md:text-5xl lg:text-6xl font-extrabold tracking-tight text-white max-w-5xl mx-auto leading-[1.2] flex flex-col items-center justify-center">
          <span className="block">Turn Factory Emission Leaks</span>
          <span className="block mt-1.5 sm:mt-2.5">
            <span className="text-white mr-2.5 sm:mr-3.5">into</span>
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-[#818CF8] via-[#C084FC] to-[#34D399] animate-text-shimmer inline-block">
              {displayedText}
              <span className="text-emerald-400 font-normal animate-pulse ml-0.5">|</span>
            </span>
          </span>
        </h1>

        {/* Hero Subtitle */}
        <p className="mt-5 text-sm sm:text-base text-slate-300 max-w-2xl mx-auto leading-relaxed">
          The auditable carbon intelligence platform engineered for manufacturing SMEs.
          Deterministic GHG Protocol arithmetic, Pareto leak diagnostics, and ML-recommended
          circular alternatives with transparent ROI.
        </p>

        {/* CTA Button Group - Sign In or Create Account */}
        <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            to="/signup"
            className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-gradient-to-r from-[#5546E8] to-[#4335D6] hover:from-[#4335D6] hover:to-[#372AB8] text-white font-semibold text-sm shadow-lg shadow-[#5546E8]/30 flex items-center justify-center gap-2 transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            <span>Create Account</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
          <Link
            to="/login"
            className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-[#131938] hover:bg-[#1A224D] border border-[#2B3566] text-slate-200 font-semibold text-sm flex items-center justify-center gap-2 transition-all hover:border-indigo-400/40"
          >
            <span>Sign In</span>
          </Link>
        </div>

        {/* Animated Metric Highlight Cards */}
        <div className="mt-14 grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto text-left">
          {[
            { label: 'Deterministic Math', value: '100%', sub: 'Zero AI Hallucination' },
            { label: 'CO₂e Abatement', value: 'Up to 42%', sub: 'Verified by Sector' },
            { label: 'Curated Interventions', value: '30+', sub: 'Costed & Benchmarked' },
            { label: 'Audit Trail', value: 'Scopes 1-3', sub: 'GHG Protocol Aligned' },
          ].map((stat, i) => (
            <div
              key={i}
              className="bg-[#0C102A]/80 border border-[#1E2548] p-4 rounded-2xl backdrop-blur-xs hover:border-[#5546E8]/50 transition-all hover:-translate-y-0.5"
            >
              <p className="text-2xl font-black text-white font-mono">{stat.value}</p>
              <p className="text-xs font-bold text-slate-200 mt-1">{stat.label}</p>
              <p className="text-[11px] text-slate-400 mt-0.5">{stat.sub}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 3. INTERACTIVE LIVE ESTIMATOR (WITH SCROLL REVEAL)            */}
      {/* ───────────────────────────────────────────────────────────── */}
      <section id="simulator" className="py-16 px-6 max-w-7xl mx-auto relative z-10 reveal-on-scroll">
        <div className="bg-gradient-to-b from-[#111636] to-[#0A0D24] border border-[#232A55] rounded-3xl p-6 sm:p-10 shadow-2xl relative overflow-hidden">
          {/* Top Bar */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-8 border-b border-[#232A55]">
            <div>
              <div className="flex items-center gap-2 text-xs font-mono text-emerald-400 uppercase tracking-widest font-semibold mb-1">
                <Sliders className="w-4 h-4" />
                <span>Interactive Live Engine Simulator</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-bold text-white">
                Test the Emission Diagnostic Engine in Real-Time
              </h2>
              <p className="text-xs sm:text-sm text-slate-400 mt-1">
                Adjust the sliders below to see instant Pareto leak-point detection and circular mitigation metrics.
              </p>
            </div>

            {/* Sector Selector */}
            <div className="flex items-center bg-[#07091E] p-1 rounded-xl border border-[#232A55] self-start">
              {[
                { id: 'plastics', label: 'Plastics' },
                { id: 'textiles', label: 'Textiles' },
                { id: 'food', label: 'Food & Beverage' },
              ].map((s) => (
                <button
                  key={s.id}
                  onClick={() => setSector(s.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    sector === s.id
                      ? 'bg-[#5546E8] text-white shadow-xs'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          {/* Estimator Content Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 pt-8 items-center">
            {/* Left Controls (6 cols) */}
            <div className="lg:col-span-6 space-y-6">
              {/* Electricity Slider */}
              <div className="bg-[#0D122E] p-5 rounded-2xl border border-[#1E2548]">
                <div className="flex justify-between items-center mb-2">
                  <label className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                    <Zap className="w-4 h-4 text-amber-400" />
                    <span>Monthly Grid Electricity</span>
                  </label>
                  <span className="text-xs font-mono font-bold text-[#818CF8]">
                    {electricityMWh} MWh/mo
                  </span>
                </div>
                <input
                  type="range"
                  min="10"
                  max="150"
                  step="5"
                  value={electricityMWh}
                  onChange={(e) => setElectricityMWh(Number(e.target.value))}
                  className="w-full accent-[#5546E8] bg-[#1E2548] h-2 rounded-lg cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-slate-500 font-mono mt-2">
                  <span>10 MWh</span>
                  <span>Scope 2: {elecEmissions} t CO₂e</span>
                  <span>150 MWh</span>
                </div>
              </div>

              {/* Diesel Slider */}
              <div className="bg-[#0D122E] p-5 rounded-2xl border border-[#1E2548]">
                <div className="flex justify-between items-center mb-2">
                  <label className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                    <Flame className="w-4 h-4 text-rose-400" />
                    <span>Diesel Generator Backup Fuel</span>
                  </label>
                  <span className="text-xs font-mono font-bold text-[#818CF8]">
                    {dieselLiters.toLocaleString()} Liters/mo
                  </span>
                </div>
                <input
                  type="range"
                  min="500"
                  max="10000"
                  step="250"
                  value={dieselLiters}
                  onChange={(e) => setDieselLiters(Number(e.target.value))}
                  className="w-full accent-[#5546E8] bg-[#1E2548] h-2 rounded-lg cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-slate-500 font-mono mt-2">
                  <span>500 L</span>
                  <span>Scope 1: {dieselEmissions} t CO₂e</span>
                  <span>10,000 L</span>
                </div>
              </div>
            </div>

            {/* Right Live Computed Cards (6 cols) */}
            <div className="lg:col-span-6 bg-gradient-to-br from-[#141B44] to-[#0D122E] border border-[#2D366B] rounded-2xl p-6 relative">
              <div className="flex items-center justify-between pb-4 border-b border-[#2D366B]">
                <span className="text-xs font-mono uppercase text-slate-400 font-bold">
                  Engine Readout
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  Pareto Ranked
                </span>
              </div>

              {/* Footprint Delta Callouts */}
              <div className="grid grid-cols-2 gap-4 my-5">
                <div className="bg-[#080B1E]/80 p-3.5 rounded-xl border border-[#1E2548]">
                  <span className="text-[10px] uppercase font-mono text-slate-400">
                    Baseline Emissions
                  </span>
                  <p className="text-2xl font-black text-white mt-1">
                    {totalQuickCO2e}{' '}
                    <span className="text-xs font-normal text-slate-400">t CO₂e/mo</span>
                  </p>
                </div>
                <div className="bg-emerald-950/40 p-3.5 rounded-xl border border-emerald-500/30">
                  <span className="text-[10px] uppercase font-mono text-emerald-400 font-bold">
                    Projected Footprint
                  </span>
                  <p className="text-2xl font-black text-emerald-400 mt-1">
                    {projectedQuickCO2e}{' '}
                    <span className="text-xs font-normal text-emerald-300">t CO₂e/mo</span>
                  </p>
                </div>
              </div>

              {/* Identified Leak & Recommended Fix */}
              <div className="space-y-3 text-xs bg-[#090D25] p-4 rounded-xl border border-[#1E2548]">
                <div className="flex items-start justify-between gap-2">
                  <span className="text-slate-400 font-mono text-[11px]">Primary Leak Point:</span>
                  <span className="font-bold text-rose-300 font-mono text-right">
                    {activeQuick.leak}
                  </span>
                </div>
                <div className="flex items-start justify-between gap-2">
                  <span className="text-slate-400 font-mono text-[11px]">Circular Remedy:</span>
                  <span className="font-bold text-indigo-300 text-right">
                    {activeQuick.fix}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-2 pt-2 border-t border-[#1E2548] text-[11px]">
                  <span className="text-emerald-400 font-bold">
                    ↓ {activeQuick.potentialReductionPct}% Abatement (~{co2eSaved} t CO₂e)
                  </span>
                  <span className="text-slate-400 font-mono">
                    Payback: <strong className="text-white">{activeQuick.paybackMonths} mo</strong>
                  </span>
                </div>
              </div>

              {/* CTA to Sign Up */}
              <button
                onClick={() => navigate('/signup')}
                className="mt-5 w-full py-2.5 rounded-xl bg-[#5546E8] hover:bg-[#4335D6] text-white font-semibold text-xs transition-colors flex items-center justify-center gap-1.5 shadow-md shadow-[#5546E8]/20 hover:scale-[1.01] active:scale-[0.99]"
              >
                <span>Create Account to Run Full Diagnostic</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 4. THE 3-TIER TRUST ARCHITECTURE (SCROLL REVEAL)              */}
      {/* ───────────────────────────────────────────────────────────── */}
      <section id="trust" className="py-16 px-6 max-w-7xl mx-auto relative z-10">
        <div className="text-center max-w-3xl mx-auto mb-14 reveal-on-scroll">
          <span className="text-xs font-mono uppercase tracking-widest text-[#818CF8] font-bold">
            Zero Hallucination Architecture
          </span>
          <h2 className="text-2xl sm:text-4xl font-extrabold text-white mt-2">
            The Three-Tier Trust Model
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 mt-2">
            Emissions calculations are never generated by AI. We enforce an uncompromising
            separation between arithmetic auditability and prescriptive decision ranking.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Tier 1 */}
          <div className="bg-[#0C102A] border border-[#1E2548] rounded-2xl p-6 relative hover:border-[#5546E8]/60 transition-all duration-300 hover:-translate-y-1.5 group reveal-on-scroll">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mb-4 group-hover:scale-110 transition-transform">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-mono uppercase font-bold text-emerald-400 tracking-wider">
              Tier 1 • Absolute Truth
            </span>
            <h3 className="text-lg font-bold text-white mt-1">Deterministic Calculation</h3>
            <p className="text-xs text-slate-400 mt-2 leading-relaxed">
              Every emission line is computed as <code>Quantity × Emission Factor</code>, sourced from
              versioned, public datasets. Verifiable by auditors and consultants without black-box math.
            </p>
            <div className="mt-4 pt-4 border-t border-[#1E2548] text-[11px] font-mono text-slate-400 flex items-center justify-between">
              <span>Scope 1, 2, 3</span>
              <span className="text-emerald-400 font-semibold">100% Deterministic</span>
            </div>
          </div>

          {/* Tier 2 */}
          <div className="bg-[#0C102A] border border-[#1E2548] rounded-2xl p-6 relative hover:border-[#5546E8]/60 transition-all duration-300 hover:-translate-y-1.5 group reveal-on-scroll">
            <div className="w-10 h-10 rounded-xl bg-sky-500/10 border border-sky-500/30 flex items-center justify-center text-sky-400 mb-4 group-hover:scale-110 transition-transform">
              <Layers className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-mono uppercase font-bold text-sky-400 tracking-wider">
              Tier 2 • Domain Research
            </span>
            <h3 className="text-lg font-bold text-white mt-1">Curated Circular Catalog</h3>
            <p className="text-xs text-slate-400 mt-2 leading-relaxed">
              Engineering-backed intervention library detailing capital expenditure ranges,
              payback timelines, ROI coefficients, and technical feasibility for industrial processes.
            </p>
            <div className="mt-4 pt-4 border-t border-[#1E2548] text-[11px] font-mono text-slate-400 flex items-center justify-between">
              <span>Cost / Abatement</span>
              <span className="text-sky-400 font-semibold">Range Sourced</span>
            </div>
          </div>

          {/* Tier 3 */}
          <div className="bg-[#0C102A] border border-[#1E2548] rounded-2xl p-6 relative hover:border-[#5546E8]/60 transition-all duration-300 hover:-translate-y-1.5 group reveal-on-scroll">
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400 mb-4 group-hover:scale-110 transition-transform">
              <Cpu className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-mono uppercase font-bold text-purple-400 tracking-wider">
              Tier 3 • Decision Support
            </span>
            <h3 className="text-lg font-bold text-white mt-1">ML + Rule-Based Ranking</h3>
            <p className="text-xs text-slate-400 mt-2 leading-relaxed">
              GradientBoosting model ranks interventions against SME affordability. Guaranteed
              fallback to rule-based scoring ensures uninterrupted uptime and full explainability.
            </p>
            <div className="mt-4 pt-4 border-t border-[#1E2548] text-[11px] font-mono text-slate-400 flex items-center justify-between">
              <span>Scoring Engine</span>
              <span className="text-purple-400 font-semibold">Self-Explaining</span>
            </div>
          </div>
        </div>
      </section>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 5. WORKFLOW & PIPELINE STEPPER (SCROLL REVEAL)                */}
      {/* ───────────────────────────────────────────────────────────── */}
      <section id="pipeline" className="py-16 px-6 max-w-7xl mx-auto relative z-10">
        <div className="text-center max-w-3xl mx-auto mb-14 reveal-on-scroll">
          <span className="text-xs font-mono uppercase tracking-widest text-emerald-400 font-bold">
            End-to-End Workflow
          </span>
          <h2 className="text-2xl sm:text-4xl font-extrabold text-white mt-2">
            The Diagnostic-to-Prescription Pipeline
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 mt-2">
            From raw plant fuel slips to regulator-ready decarbonization roadmaps in five steps.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {[
            {
              step: '01',
              title: 'Guided Intake',
              desc: 'Energy, utilities, raw virgin polymers, and waste effluents with live unit conversion.',
              icon: FileText,
            },
            {
              step: '02',
              title: 'Pareto Leak Points',
              desc: 'Automated ranking of carbon emission hotspots with high, medium, and low severity tiers.',
              icon: BarChart3,
            },
            {
              step: '03',
              title: 'Circular Matcher',
              desc: 'Matching costed circular alternatives with plain-language explainability flags.',
              icon: Lightbulb,
            },
            {
              step: '04',
              title: 'What-If Simulation',
              desc: 'Interactive scenario testing with anti-double-counting overlap logic.',
              icon: Sliders,
            },
            {
              step: '05',
              title: 'Phased Action Plan',
              desc: 'Phases 1 (Quick Wins), 2, and 3 with automated PDF audit certificate generation.',
              icon: ShieldCheck,
            },
          ].map((item, idx) => {
            const Icon = item.icon;
            return (
              <div
                key={idx}
                className="bg-[#0D122E] border border-[#1E2548] rounded-2xl p-5 relative flex flex-col justify-between hover:border-indigo-500/50 transition-all duration-300 hover:-translate-y-1 reveal-on-scroll"
              >
                <div>
                  <span className="text-2xl font-black font-mono text-[#5546E8]/40">
                    {item.step}
                  </span>
                  <div className="w-8 h-8 rounded-lg bg-[#5546E8]/15 text-[#818CF8] flex items-center justify-center my-3">
                    <Icon className="w-4 h-4" />
                  </div>
                  <h4 className="text-sm font-bold text-white">{item.title}</h4>
                  <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">{item.desc}</p>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 6. SUPPORTED INDUSTRIAL SECTORS (WITH POPUP INTERACTION)      */}
      {/* ───────────────────────────────────────────────────────────── */}
      <section id="sectors" className="py-16 px-6 max-w-7xl mx-auto relative z-10">
        <div className="text-center max-w-3xl mx-auto mb-14 reveal-on-scroll">
          <span className="text-xs font-mono uppercase tracking-widest text-[#818CF8] font-bold">
            Sector Coverage
          </span>
          <h2 className="text-2xl sm:text-4xl font-extrabold text-white mt-2">
            Engineered for Energy-Intensive SME Manufacturing
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 mt-2">
            Pre-seeded with public emission coefficients and proven circular alternatives. Click any sector card to view detailed engineering parameters.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            {
              id: 'plastics',
              name: 'Plastics Extrusion',
              sub: 'Molding & Pellets',
              icon: Factory,
              color: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/30',
              bullets: [
                'Extruder barrel induction heating retrofits',
                '30% Post-Consumer Recycled (PCR) resin blend',
                'Closed-loop in-house regrind systems',
              ],
            },
            {
              id: 'textiles',
              name: 'Textile Manufacturing',
              sub: 'Spinning & Dyeing',
              icon: Layers,
              color: 'text-purple-400 bg-purple-500/10 border-purple-500/30',
              bullets: [
                'Stenter exhaust waste heat recovery units',
                'Low-liquor ratio jet dyeing equipment',
                'Wastewater heat exchangers & liquor recycling',
              ],
            },
            {
              id: 'food',
              name: 'Food Processing',
              sub: 'Cold Chain & Boilers',
              icon: Zap,
              color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
              bullets: [
                'Cascaded ammonia/CO₂ chillers & VFD compressors',
                'Steam condensate heat return loops',
                'Anaerobic organic effluent digestion for biogas',
              ],
            },
          ].map((sec) => {
            const Icon = sec.icon;
            return (
              <div
                key={sec.id}
                onClick={() => setActiveSectorModal(sec.id)}
                className="bg-[#0B0F2A] border border-[#1E2548] rounded-2xl p-6 relative hover:border-[#5546E8]/60 transition-all duration-300 hover:-translate-y-1 cursor-pointer group reveal-on-scroll"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl border flex items-center justify-center ${sec.color}`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-white group-hover:text-[#818CF8] transition-colors">
                        {sec.name}
                      </h3>
                      <span className="text-[10px] font-mono text-slate-400">{sec.sub}</span>
                    </div>
                  </div>
                  <ArrowUpRight className="w-4 h-4 text-slate-500 group-hover:text-white transition-colors" />
                </div>

                <ul className="space-y-2 text-xs text-slate-300">
                  {sec.bullets.map((b, i) => (
                    <li key={i} className="flex items-center gap-2">
                      <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      <span>{b}</span>
                    </li>
                  ))}
                </ul>

                <div className="mt-4 pt-4 border-t border-[#1E2548] flex items-center justify-between text-[11px] text-indigo-400 font-semibold">
                  <span>View Engineering Deep-Dive</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 7. BOTTOM CALL TO ACTION BANNER (SCROLL REVEAL)               */}
      {/* ───────────────────────────────────────────────────────────── */}
      <section className="py-20 px-6 max-w-7xl mx-auto relative z-10 reveal-on-scroll">
        <div className="rounded-3xl bg-gradient-to-r from-[#5546E8] via-[#6366F1] to-[#10B981] p-0.5 shadow-2xl shadow-[#5546E8]/20">
          <div className="rounded-[23px] bg-[#0A0D28] px-8 py-12 sm:p-16 text-center">
            <h2 className="text-2xl sm:text-4xl font-extrabold text-white">
              Ready to Discover Your Facility's Carbon Leaks?
            </h2>
            <p className="mt-3 text-xs sm:text-sm text-slate-300 max-w-xl mx-auto">
              Launch the live interactive demonstration or register your manufacturing plant to start calculating emissions today.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                to="/signup"
                className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-white text-[#5546E8] font-bold text-sm hover:bg-slate-100 transition-all shadow-lg hover:scale-105 active:scale-95"
              >
                Create Account
              </Link>
              <Link
                to="/login"
                className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-white/10 hover:bg-white/15 text-white border border-white/20 font-semibold text-sm transition-all"
              >
                Sign In
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 8. FOOTER                                                     */}
      {/* ───────────────────────────────────────────────────────────── */}
      <footer className="border-t border-[#1E2548]/70 py-10 px-6 relative z-10 text-xs text-slate-400">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-[#5546E8] flex items-center justify-center text-white">
              <Activity className="w-3.5 h-3.5" />
            </div>
            <span className="font-bold text-white">CarboTrack Platform</span>
            <span className="text-slate-600">|</span>
            <span>HackOut 2026</span>
          </div>

          <div className="flex items-center gap-6">
            <Link to="/login" className="hover:text-white transition-colors">
              Sign In
            </Link>
            <Link to="/signup" className="hover:text-white transition-colors">
              Sign Up
            </Link>
            <Link to="/signup" className="hover:text-white transition-colors">
              Create Account
            </Link>
          </div>

          <p className="text-[11px] text-slate-500">
            © 2026 CarboTrack. Renewable Energy Intelligence & Circular Carbon Ecosystem.
          </p>
        </div>
      </footer>



      {/* ───────────────────────────────────────────────────────────── */}
      {/* 10. ARCHITECTURE & PLATFORM TOUR MODAL POPUP                  */}
      {/* ───────────────────────────────────────────────────────────── */}
      {tourModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-in fade-in duration-150">
          <div className="bg-[#0A0D28] border border-[#2B3566] rounded-3xl max-w-2xl w-full p-6 sm:p-8 relative shadow-2xl animate-popup overflow-hidden">
            <button
              onClick={() => setTourModalOpen(false)}
              className="absolute top-5 right-5 text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-[#5546E8] flex items-center justify-center text-white">
                <Activity className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">Platform Tour & Trust Model</h3>
                <p className="text-xs text-slate-400">
                  CarboTrack Master Architecture • HackOut 2026
                </p>
              </div>
            </div>

            <div className="space-y-4 my-6 text-xs text-slate-300">
              <div className="bg-[#060818] p-4 rounded-xl border border-[#1E2548]">
                <h4 className="font-bold text-emerald-400 mb-1 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>1. Authoritative Accounting (Deterministic)</span>
                </h4>
                <p className="text-slate-400 leading-relaxed">
                  Energy, material inputs, and waste quantities map strictly to published public emission factors.
                  Zero AI hallucination or arbitrary carbon claims.
                </p>
              </div>

              <div className="bg-[#060818] p-4 rounded-xl border border-[#1E2548]">
                <h4 className="font-bold text-indigo-400 mb-1 flex items-center gap-1.5">
                  <Lightbulb className="w-4 h-4" />
                  <span>2. Pareto Hotspot Diagnostics & ML Recommendation</span>
                </h4>
                <p className="text-slate-400 leading-relaxed">
                  Calculated emissions are sorted into high, medium, and low severity leak points.
                  Our GradientBoostingRegressor model matches costed circular interventions to each hotspot.
                </p>
              </div>

              <div className="bg-[#060818] p-4 rounded-xl border border-[#1E2548]">
                <h4 className="font-bold text-purple-400 mb-1 flex items-center gap-1.5">
                  <Sliders className="w-4 h-4" />
                  <span>3. Overlap-Aware Simulation & Phased Roadmaps</span>
                </h4>
                <p className="text-slate-400 leading-relaxed">
                  Avoids double-counting when multiple interventions target the same fuel or machine.
                  Generates downloadable, audit-ready PDF certificates for regulatory compliance.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2 border-t border-[#1E2548]">
              <button
                onClick={() => setTourModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-300 hover:text-white"
              >
                Close Tour
              </button>
              <button
                onClick={() => {
                  setTourModalOpen(false);
                  navigate('/signup');
                }}
                className="px-5 py-2 rounded-xl bg-[#5546E8] hover:bg-[#4335D6] text-white text-xs font-semibold transition-colors flex items-center gap-1.5"
              >
                <span>Create Account</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 11. SECTOR ENGINEERING DEEP-DIVE MODAL POPUP                 */}
      {/* ───────────────────────────────────────────────────────────── */}
      {activeSectorModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-in fade-in duration-150">
          <div className="bg-[#0A0D28] border border-[#2B3566] rounded-3xl max-w-xl w-full p-6 sm:p-8 relative shadow-2xl animate-popup">
            <button
              onClick={() => setActiveSectorModal(null)}
              className="absolute top-5 right-5 text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <span className="text-[10px] font-mono text-indigo-400 uppercase tracking-widest font-bold">
              Engineering Specification
            </span>
            <h3 className="text-xl font-bold text-white mt-1">
              {quickInterventions[activeSectorModal]?.name}
            </h3>
            <p className="text-xs text-slate-400 mt-2 leading-relaxed">
              {quickInterventions[activeSectorModal]?.details}
            </p>

            <div className="grid grid-cols-2 gap-3 my-5">
              <div className="bg-[#060818] p-3.5 rounded-xl border border-[#1E2548]">
                <span className="text-[10px] uppercase font-mono text-slate-500">
                  Target Emission Hotspot
                </span>
                <p className="text-xs font-bold text-rose-300 mt-1">
                  {quickInterventions[activeSectorModal]?.leak}
                </p>
              </div>
              <div className="bg-[#060818] p-3.5 rounded-xl border border-[#1E2548]">
                <span className="text-[10px] uppercase font-mono text-slate-500">
                  Est. Implementation CapEx
                </span>
                <p className="text-xs font-bold text-emerald-400 mt-1 font-mono">
                  {quickInterventions[activeSectorModal]?.costEstimate}
                </p>
              </div>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-[#1E2548] text-xs">
              <span className="text-slate-400 font-mono">
                Payback Timeframe: <strong>{quickInterventions[activeSectorModal]?.paybackMonths} Months</strong>
              </span>
              <button
                onClick={() => {
                  setActiveSectorModal(null);
                  navigate('/signup');
                }}
                className="px-4 py-2 rounded-xl bg-[#5546E8] hover:bg-[#4335D6] text-white font-semibold transition-colors flex items-center gap-1.5"
              >
                <span>Create Account to Audit</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
