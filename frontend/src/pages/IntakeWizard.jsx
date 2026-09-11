import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Plus,
  Trash2,
  ArrowRight,
  ArrowLeft,
  Calculator,
  Save,
  CheckCircle2,
  Sparkles,
  Zap,
  Box,
  Recycle,
  FileCheck2,
  Info,
} from 'lucide-react';
import StepperNav from '../components/StepperNav';
import ErrorBanner from '../components/ErrorBanner';
import { assessmentsApi } from '../api/assessments';
import { useFacilityAssessment } from '../context/FacilityAssessmentContext';
import { INITIAL_DEMO_INPUTS } from '../api/mockData';

const WIZARD_STEPS = [
  { id: 'facility', label: 'Facility', sublabel: 'Review context' },
  { id: 'energy', label: 'Energy', sublabel: 'Grid & Fuels' },
  { id: 'materials', label: 'Materials', sublabel: 'Raw feedstocks' },
  { id: 'waste', label: 'Waste', sublabel: 'Disposal streams' },
  { id: 'review', label: 'Review', sublabel: 'Verify inputs' },
  { id: 'calculate', label: 'Calculate', sublabel: 'Deterministic run' },
];

const SUBTYPE_OPTIONS = {
  energy: [
    { value: 'electricity', label: 'Grid Electricity', defaultUnit: 'kwh', units: ['kwh', 'mwh'] },
    { value: 'diesel', label: 'Diesel Fuel (Generators/Boilers)', defaultUnit: 'l', units: ['l', 'gallon'] },
    { value: 'natural_gas', label: 'Natural Gas Pipeline', defaultUnit: 'm3', units: ['m3'] },
  ],
  material: [
    { value: 'virgin_plastic', label: 'Virgin Polymer Resin (PP/PE/HDPE)', defaultUnit: 'kg', units: ['kg', 'tonne'] },
    { value: 'recycled_plastic', label: 'Post-Consumer Recycled Resin (PCR)', defaultUnit: 'kg', units: ['kg', 'tonne'] },
    { value: 'virgin_textile_fiber', label: 'Virgin Cotton / Polyester Yarn', defaultUnit: 'kg', units: ['kg', 'tonne'] },
    { value: 'dye', label: 'Textile Dyes & Processing Chemicals', defaultUnit: 'kg', units: ['kg'] },
    { value: 'packaging_material', label: 'Corrugated Paper Packaging', defaultUnit: 'kg', units: ['kg', 'tonne'] },
    { value: 'raw_food_material', label: 'Agricultural Food Inputs', defaultUnit: 'kg', units: ['kg', 'tonne'] },
    { value: 'process_scrap', label: 'Internal Production Scrap', defaultUnit: 'kg', units: ['kg'] },
  ],
  waste: [
    { value: 'plastic_waste', label: 'Industrial Plastic Waste / Trimmings', defaultUnit: 'kg', units: ['kg', 'tonne'] },
    { value: 'textile_waste', label: 'Fabric Cutting Waste', defaultUnit: 'kg', units: ['kg', 'tonne'] },
    { value: 'organic_waste', label: 'Organic / Food Sludge', defaultUnit: 'kg', units: ['kg', 'tonne'] },
    { value: 'general_waste', label: 'General Solid Refuse', defaultUnit: 'kg', units: ['kg', 'tonne'] },
    { value: 'wastewater', label: 'Industrial Process Effluent', defaultUnit: 'm3', units: ['m3'] },
  ],
};

const WASTE_TREATMENTS = [
  { value: 'landfill', label: 'Landfill Disposal' },
  { value: 'recycling', label: 'Off-site Recycling' },
  { value: 'incineration', label: 'Incineration' },
  { value: 'energy_recovery', label: 'Waste to Energy' },
];

export default function IntakeWizard() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { activeFacility, activeAssessment, setActiveAssessment, addToast } = useFacilityAssessment();

  const [currentStep, setCurrentStep] = useState(1);
  const [inputs, setInputs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [calculating, setCalculating] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function loadDraft() {
      const assessmentId = activeAssessment?.id || 'asm-abc-001';
      try {
        setLoading(true);
        const res = await assessmentsApi.getById(assessmentId);
        if (res?.data?.inputs && res.data.inputs.length > 0) {
          setInputs(res.data.inputs);
        } else {
          setInputs(INITIAL_DEMO_INPUTS);
        }
      } catch (err) {
        console.error('Failed to load inputs:', err);
      } finally {
        setLoading(false);
      }
    }
    loadDraft();
  }, [activeAssessment]);

  const addRow = (category) => {
    const defaultSubtype = SUBTYPE_OPTIONS[category][0];
    const newRow = {
      id: `inp-temp-${Date.now()}`,
      category,
      subtype: defaultSubtype.value,
      quantity: '',
      unit: defaultSubtype.defaultUnit,
      ...(category === 'waste' ? { treatment: 'landfill' } : {}),
    };
    setInputs((prev) => [...prev, newRow]);
  };

  const removeRow = (rowId) => {
    setInputs((prev) => prev.filter((r) => r.id !== rowId));
  };

  const updateRow = (rowId, key, value) => {
    setInputs((prev) =>
      prev.map((r) => {
        if (r.id !== rowId) return r;
        const updated = { ...r, [key]: value };
        if (key === 'subtype') {
          const subOpt = SUBTYPE_OPTIONS[r.category]?.find((o) => o.value === value);
          if (subOpt) {
            updated.unit = subOpt.defaultUnit;
          }
        }
        return updated;
      })
    );
  };

  const validateStep = (stepIdx) => {
    setError(null);
    let categoryToCheck = null;
    if (stepIdx === 1) categoryToCheck = 'energy';
    if (stepIdx === 2) categoryToCheck = 'material';
    if (stepIdx === 3) categoryToCheck = 'waste';

    if (categoryToCheck) {
      const rows = inputs.filter((r) => r.category === categoryToCheck);
      if (rows.length === 0) {
        setError(`Please record at least one ${categoryToCheck} input row before proceeding.`);
        return false;
      }
      for (const row of rows) {
        if (!row.quantity || Number(row.quantity) <= 0) {
          setError(`Input quantity for "${row.subtype}" must be greater than zero.`);
          return false;
        }
      }
    }
    return true;
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      setCurrentStep((prev) => Math.min(prev + 1, WIZARD_STEPS.length - 1));
    }
  };

  const handleBack = () => {
    setError(null);
    setCurrentStep((prev) => Math.max(prev - 1, 0));
  };

  const handleCalculate = async () => {
    if (inputs.length === 0) {
      setError('Please add at least one operational input line.');
      return;
    }

    setCalculating(true);
    setError(null);

    try {
      const asmId = activeAssessment?.id || 'asm-abc-001';
      localStorage.setItem('carbotrack_inputs', JSON.stringify(inputs));
      const res = await assessmentsApi.calculate(asmId);

      if (res?.data?.assessment) {
        setActiveAssessment(res.data.assessment);
        addToast(
          `Calculation successful: ${res.data.assessment.total_co2e} t CO₂e computed across ${inputs.length} lines!`
        );
        navigate(`/assessment/${asmId}/overview`);
      }
    } catch (err) {
      setError(err.message || 'Calculation engine failed');
    } finally {
      setCalculating(false);
    }
  };

  const handleFillDemo = () => {
    setInputs(INITIAL_DEMO_INPUTS);
    addToast('Populated with ABC Plastics demo dataset.');
  };

  return (
    <div className="max-w-4xl mx-auto py-4 space-y-6">
      {/* Stepper Navigation Card */}
      <div className="panel-card p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5 border-b border-gray-100 pb-4">
          <div>
            <h1 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <span>Guided Activity Data Intake</span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-50 text-[#5546E8] border border-indigo-100 font-medium">
                {activeFacility?.name || 'ABC Plastics'}
              </span>
            </h1>
            <p className="text-xs text-gray-500 mt-0.5">
              Enter verified consumption logs. Deterministic GHG arithmetic occurs upon calculation.
            </p>
          </div>

          <button
            type="button"
            onClick={handleFillDemo}
            className="btn-secondary text-xs py-1.5 px-3 flex items-center gap-1.5 self-start sm:self-center"
          >
            <Sparkles className="w-3.5 h-3.5 text-[#5546E8]" />
            <span>Pre-fill ABC Plastics Data</span>
          </button>
        </div>

        <StepperNav
          steps={WIZARD_STEPS}
          currentStep={currentStep}
          onSelectStep={(idx) => {
            if (idx < currentStep || validateStep(currentStep)) {
              setCurrentStep(idx);
            }
          }}
        />
      </div>

      {error && <ErrorBanner message={error} onDismiss={() => setError(null)} />}

      {/* Step Content */}
      <div className="panel-card p-6 sm:p-8 min-h-[380px] flex flex-col justify-between shadow-card">
        {/* Step 0: Facility Overview Check */}
        {currentStep === 0 && (
          <div className="space-y-4">
            <h2 className="text-sm sm:text-base font-bold text-gray-900">1. Facility Scope Review</h2>
            <p className="text-xs text-gray-500">
              Confirm your operational boundary and regional grid baseline parameters before recording consumption rows.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-xl bg-gray-50 border border-gray-200 text-xs">
              <div>
                <span className="text-gray-400">Facility Name:</span>
                <p className="font-semibold text-gray-900 mt-0.5">{activeFacility?.name || 'ABC Plastics Manufacturing'}</p>
              </div>
              <div>
                <span className="text-gray-400">Industry:</span>
                <p className="font-semibold text-[#5546E8] capitalize mt-0.5">{activeFacility?.industry || 'plastic'}</p>
              </div>
              <div>
                <span className="text-gray-400">Regional Grid:</span>
                <p className="font-semibold text-gray-900 mt-0.5">{activeFacility?.region || 'Gujarat, India'}</p>
              </div>
              <div>
                <span className="text-gray-400">Scale:</span>
                <p className="font-semibold text-gray-900 capitalize mt-0.5">{activeFacility?.facility_size || 'medium'} (SME)</p>
              </div>
            </div>
          </div>
        )}

        {/* Step 1: Energy Inputs */}
        {currentStep === 1 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm sm:text-base font-bold text-gray-900 flex items-center gap-2">
                  <Zap className="w-4 h-4 text-amber-500" />
                  <span>2. Energy & Fuel Activity Inputs (Scope 1 & 2)</span>
                </h2>
                <p className="text-xs text-gray-500 mt-0.5">
                  Record monthly utility electricity draw, generator diesel, and natural gas usage.
                </p>
              </div>

              <button
                type="button"
                onClick={() => addRow('energy')}
                className="btn-secondary text-xs py-1.5 px-3 flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5 text-[#5546E8]" />
                <span>Add Energy Line</span>
              </button>
            </div>

            <div className="space-y-3 pt-2">
              {inputs.filter((r) => r.category === 'energy').map((row) => (
                <div
                  key={row.id}
                  className="p-3.5 rounded-xl bg-gray-50/70 border border-gray-200 flex flex-col sm:flex-row items-stretch sm:items-center gap-3"
                >
                  <div className="flex-1">
                    <label className="block text-[10px] uppercase font-bold text-gray-500 mb-1">
                      Energy Subtype
                    </label>
                    <select
                      value={row.subtype}
                      onChange={(e) => updateRow(row.id, 'subtype', e.target.value)}
                      className="input-field text-xs"
                    >
                      {SUBTYPE_OPTIONS.energy.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="w-full sm:w-44">
                    <label className="block text-[10px] uppercase font-bold text-gray-500 mb-1">
                      Quantity
                    </label>
                    <input
                      type="number"
                      min="0.1"
                      step="any"
                      required
                      value={row.quantity}
                      onChange={(e) => updateRow(row.id, 'quantity', e.target.value)}
                      placeholder="e.g. 5000"
                      className="input-field text-xs font-mono"
                    />
                  </div>

                  <div className="w-full sm:w-28">
                    <label className="block text-[10px] uppercase font-bold text-gray-500 mb-1">
                      Unit
                    </label>
                    <select
                      value={row.unit}
                      onChange={(e) => updateRow(row.id, 'unit', e.target.value)}
                      className="input-field text-xs uppercase font-mono"
                    >
                      {SUBTYPE_OPTIONS.energy
                        .find((o) => o.value === row.subtype)
                        ?.units.map((u) => (
                          <option key={u} value={u}>
                            {u}
                          </option>
                        ))}
                    </select>
                  </div>

                  <div className="sm:pt-5 flex justify-end">
                    <button
                      type="button"
                      onClick={() => removeRow(row.id)}
                      className="p-2 text-gray-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors"
                      title="Delete input line"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Step 2: Materials Inputs */}
        {currentStep === 2 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm sm:text-base font-bold text-gray-900 flex items-center gap-2">
                  <Box className="w-4 h-4 text-blue-500" />
                  <span>3. Raw Material & Feedstock Ingestion (Scope 3)</span>
                </h2>
                <p className="text-xs text-gray-500 mt-0.5">
                  Record polymer resins, virgin/recycled feedstocks, and packaging purchased during the period.
                </p>
              </div>

              <button
                type="button"
                onClick={() => addRow('material')}
                className="btn-secondary text-xs py-1.5 px-3 flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5 text-[#5546E8]" />
                <span>Add Material Line</span>
              </button>
            </div>

            <div className="space-y-3 pt-2">
              {inputs.filter((r) => r.category === 'material').map((row) => (
                <div
                  key={row.id}
                  className="p-3.5 rounded-xl bg-gray-50/70 border border-gray-200 flex flex-col sm:flex-row items-stretch sm:items-center gap-3"
                >
                  <div className="flex-1">
                    <label className="block text-[10px] uppercase font-bold text-gray-500 mb-1">
                      Material Feedstock Subtype
                    </label>
                    <select
                      value={row.subtype}
                      onChange={(e) => updateRow(row.id, 'subtype', e.target.value)}
                      className="input-field text-xs"
                    >
                      {SUBTYPE_OPTIONS.material.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="w-full sm:w-44">
                    <label className="block text-[10px] uppercase font-bold text-gray-500 mb-1">
                      Purchased Volume
                    </label>
                    <input
                      type="number"
                      min="0.1"
                      step="any"
                      required
                      value={row.quantity}
                      onChange={(e) => updateRow(row.id, 'quantity', e.target.value)}
                      placeholder="e.g. 20000"
                      className="input-field text-xs font-mono"
                    />
                  </div>

                  <div className="w-full sm:w-28">
                    <label className="block text-[10px] uppercase font-bold text-gray-500 mb-1">
                      Unit
                    </label>
                    <select
                      value={row.unit}
                      onChange={(e) => updateRow(row.id, 'unit', e.target.value)}
                      className="input-field text-xs uppercase font-mono"
                    >
                      {SUBTYPE_OPTIONS.material
                        .find((o) => o.value === row.subtype)
                        ?.units.map((u) => (
                          <option key={u} value={u}>
                            {u}
                          </option>
                        ))}
                    </select>
                  </div>

                  <div className="sm:pt-5 flex justify-end">
                    <button
                      type="button"
                      onClick={() => removeRow(row.id)}
                      className="p-2 text-gray-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors"
                      title="Delete material line"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Step 3: Waste Inputs */}
        {currentStep === 3 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm sm:text-base font-bold text-gray-900 flex items-center gap-2">
                  <Recycle className="w-4 h-4 text-emerald-600" />
                  <span>4. Waste Generation & Treatment Route (Scope 3)</span>
                </h2>
                <p className="text-xs text-gray-500 mt-0.5">
                  Record scrap, trimmings, purge lumps, and wastewater along with disposal destination.
                </p>
              </div>

              <button
                type="button"
                onClick={() => addRow('waste')}
                className="btn-secondary text-xs py-1.5 px-3 flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5 text-[#5546E8]" />
                <span>Add Waste Line</span>
              </button>
            </div>

            <div className="space-y-3 pt-2">
              {inputs.filter((r) => r.category === 'waste').map((row) => (
                <div
                  key={row.id}
                  className="p-3.5 rounded-xl bg-gray-50/70 border border-gray-200 flex flex-col sm:flex-row items-stretch sm:items-center gap-3"
                >
                  <div className="flex-1">
                    <label className="block text-[10px] uppercase font-bold text-gray-500 mb-1">
                      Waste Subtype
                    </label>
                    <select
                      value={row.subtype}
                      onChange={(e) => updateRow(row.id, 'subtype', e.target.value)}
                      className="input-field text-xs"
                    >
                      {SUBTYPE_OPTIONS.waste.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="w-full sm:w-36">
                    <label className="block text-[10px] uppercase font-bold text-gray-500 mb-1">
                      Treatment
                    </label>
                    <select
                      value={row.treatment || 'landfill'}
                      onChange={(e) => updateRow(row.id, 'treatment', e.target.value)}
                      className="input-field text-xs"
                    >
                      {WASTE_TREATMENTS.map((t) => (
                        <option key={t.value} value={t.value}>
                          {t.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="w-full sm:w-32">
                    <label className="block text-[10px] uppercase font-bold text-gray-500 mb-1">
                      Quantity
                    </label>
                    <input
                      type="number"
                      min="0.1"
                      step="any"
                      required
                      value={row.quantity}
                      onChange={(e) => updateRow(row.id, 'quantity', e.target.value)}
                      placeholder="e.g. 3000"
                      className="input-field text-xs font-mono"
                    />
                  </div>

                  <div className="w-full sm:w-24">
                    <label className="block text-[10px] uppercase font-bold text-gray-500 mb-1">
                      Unit
                    </label>
                    <select
                      value={row.unit}
                      onChange={(e) => updateRow(row.id, 'unit', e.target.value)}
                      className="input-field text-xs uppercase font-mono"
                    >
                      {SUBTYPE_OPTIONS.waste
                        .find((o) => o.value === row.subtype)
                        ?.units.map((u) => (
                          <option key={u} value={u}>
                            {u}
                          </option>
                        ))}
                    </select>
                  </div>

                  <div className="sm:pt-5 flex justify-end">
                    <button
                      type="button"
                      onClick={() => removeRow(row.id)}
                      className="p-2 text-gray-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors"
                      title="Delete waste line"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Step 4: Review Summary Table */}
        {currentStep === 4 && (
          <div className="space-y-4">
            <div>
              <h2 className="text-sm sm:text-base font-bold text-gray-900 flex items-center gap-2">
                <FileCheck2 className="w-4 h-4 text-emerald-600" />
                <span>5. Verification Summary Table</span>
              </h2>
              <p className="text-xs text-gray-500 mt-0.5">
                Verify recorded quantities before initiating the deterministic calculation engine.
              </p>
            </div>

            <div className="overflow-x-auto border border-gray-200 rounded-xl overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-gray-50 text-gray-500 uppercase text-[11px] border-b border-gray-200">
                  <tr>
                    <th className="py-2.5 px-3 font-semibold">Category</th>
                    <th className="py-2.5 px-3 font-semibold">Activity Subtype</th>
                    <th className="py-2.5 px-3 font-semibold text-right">Quantity</th>
                    <th className="py-2.5 px-3 font-semibold">Unit</th>
                    <th className="py-2.5 px-3 font-semibold">Treatment / Destination</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 bg-white font-medium">
                  {inputs.map((r, i) => (
                    <tr key={r.id || i} className="hover:bg-gray-50">
                      <td className="py-2.5 px-3 uppercase text-[11px] font-bold text-gray-500">
                        {r.category}
                      </td>
                      <td className="py-2.5 px-3 text-gray-900 capitalize">
                        {r.subtype.replace(/_/g, ' ')}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-[#5546E8] font-bold">
                        {Number(r.quantity).toLocaleString()}
                      </td>
                      <td className="py-2.5 px-3 uppercase font-mono text-gray-600">
                        {r.unit}
                      </td>
                      <td className="py-2.5 px-3 text-gray-500 capitalize">
                        {r.treatment || 'Direct Consumption'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="p-3.5 rounded-xl bg-indigo-50 border border-indigo-100 text-xs text-indigo-900 flex items-start gap-2">
              <Info className="w-4 h-4 text-[#5546E8] shrink-0 mt-0.5" />
              <span>
                <strong>Audit Compliance Guarantee:</strong> Submitting computes emission values using static, citable emission factors (DEFRA / IPCC 2024 Tier 1).
              </span>
            </div>
          </div>
        )}

        {/* Step 5: Final Calculate */}
        {currentStep === 5 && (
          <div className="space-y-6 text-center py-6">
            <div className="w-16 h-16 rounded-2xl bg-indigo-50 border border-indigo-100 text-[#5546E8] flex items-center justify-center mx-auto shadow-sm">
              <Calculator className="w-8 h-8" />
            </div>

            <div className="max-w-md mx-auto space-y-2">
              <h2 className="text-xl font-bold text-gray-900">Execute Deterministic CO₂ Engine</h2>
              <p className="text-xs text-gray-500 leading-relaxed">
                Ready to compute GHG footprint for <strong>{inputs.length} operational lines</strong>. The engine will calculate category subtotals, rank leak points, and initialize ML recommendations.
              </p>
            </div>

            <div className="p-4 max-w-md mx-auto rounded-xl bg-gray-50 border border-gray-200 text-xs text-gray-700 space-y-2 text-left">
              <div className="flex justify-between">
                <span className="text-gray-400">Activity Rows:</span>
                <span className="font-mono text-gray-900 font-semibold">{inputs.length} lines</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Target Facility:</span>
                <span className="text-gray-900 font-medium">{activeFacility?.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Factor Sourcing:</span>
                <span className="text-emerald-700 font-medium">DEFRA / IPCC 2024 Tier 1</span>
              </div>
            </div>

            <button
              type="button"
              disabled={calculating}
              onClick={handleCalculate}
              className="btn-primary py-3 px-8 text-sm font-bold shadow-md shadow-[#5546E8]/20"
            >
              <Calculator className="w-4 h-4" />
              <span>{calculating ? 'Computing Emissions...' : 'Submit & Calculate Emissions'}</span>
            </button>
          </div>
        )}

        {/* Wizard Controls */}
        <div className="pt-6 border-t border-gray-100 mt-6 flex items-center justify-between">
          <button
            type="button"
            onClick={handleBack}
            disabled={currentStep === 0 || calculating}
            className="btn-secondary text-xs"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back</span>
          </button>

          <div className="flex items-center gap-3">
            {currentStep < 5 && (
              <button
                type="button"
                onClick={handleNext}
                className="btn-primary text-xs"
              >
                <span>Next</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
