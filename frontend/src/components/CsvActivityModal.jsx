import React, { useState, useRef } from 'react';
import {
  UploadCloud,
  FileSpreadsheet,
  Download,
  CheckCircle2,
  AlertCircle,
  X,
  FileUp,
  Sparkles,
  Layers,
  ArrowRight,
} from 'lucide-react';
import { assessmentsApi } from '../api/assessments';
import { useFacilityAssessment } from '../context/FacilityAssessmentContext';

// Canonical supported subtypes & units mapping
const SUBTYPE_MAP = {
  // Energy
  electricity: { category: 'energy', subtype: 'electricity', defaultUnit: 'kwh', units: ['kwh', 'mwh'] },
  power: { category: 'energy', subtype: 'electricity', defaultUnit: 'kwh', units: ['kwh', 'mwh'] },
  grid: { category: 'energy', subtype: 'electricity', defaultUnit: 'kwh', units: ['kwh', 'mwh'] },
  diesel: { category: 'energy', subtype: 'diesel', defaultUnit: 'l', units: ['l', 'gallon'] },
  fuel: { category: 'energy', subtype: 'diesel', defaultUnit: 'l', units: ['l', 'gallon'] },
  gas: { category: 'energy', subtype: 'natural_gas', defaultUnit: 'm3', units: ['m3'] },
  natural_gas: { category: 'energy', subtype: 'natural_gas', defaultUnit: 'm3', units: ['m3'] },
  cng: { category: 'energy', subtype: 'natural_gas', defaultUnit: 'm3', units: ['m3'] },

  // Materials
  virgin_plastic: { category: 'material', subtype: 'virgin_plastic', defaultUnit: 'kg', units: ['kg', 'tonne'] },
  plastic_resin: { category: 'material', subtype: 'virgin_plastic', defaultUnit: 'kg', units: ['kg', 'tonne'] },
  polymer: { category: 'material', subtype: 'virgin_plastic', defaultUnit: 'kg', units: ['kg', 'tonne'] },
  hdpe: { category: 'material', subtype: 'virgin_plastic', defaultUnit: 'kg', units: ['kg', 'tonne'] },
  pp: { category: 'material', subtype: 'virgin_plastic', defaultUnit: 'kg', units: ['kg', 'tonne'] },
  recycled_plastic: { category: 'material', subtype: 'recycled_plastic', defaultUnit: 'kg', units: ['kg'] },
  pcr: { category: 'material', subtype: 'recycled_plastic', defaultUnit: 'kg', units: ['kg'] },
  textile_fiber: { category: 'material', subtype: 'virgin_textile_fiber', defaultUnit: 'kg', units: ['kg'] },
  cotton: { category: 'material', subtype: 'virgin_textile_fiber', defaultUnit: 'kg', units: ['kg'] },
  yarn: { category: 'material', subtype: 'virgin_textile_fiber', defaultUnit: 'kg', units: ['kg'] },
  dye: { category: 'material', subtype: 'dye', defaultUnit: 'kg', units: ['kg'] },
  packaging: { category: 'material', subtype: 'packaging_material', defaultUnit: 'kg', units: ['kg', 'tonne'] },
  packaging_material: { category: 'material', subtype: 'packaging_material', defaultUnit: 'kg', units: ['kg', 'tonne'] },
  corrugated_box: { category: 'material', subtype: 'packaging_material', defaultUnit: 'kg', units: ['kg', 'tonne'] },
  food_raw: { category: 'material', subtype: 'raw_food_material', defaultUnit: 'kg', units: ['kg', 'tonne'] },
  raw_food_material: { category: 'material', subtype: 'raw_food_material', defaultUnit: 'kg', units: ['kg', 'tonne'] },
  scrap: { category: 'material', subtype: 'process_scrap', defaultUnit: 'kg', units: ['kg'] },
  process_scrap: { category: 'material', subtype: 'process_scrap', defaultUnit: 'kg', units: ['kg'] },

  // Waste
  plastic_waste: { category: 'waste', subtype: 'plastic_waste', defaultUnit: 'kg', units: ['kg', 'tonne'], defaultTreatment: 'landfill' },
  scrap_waste: { category: 'waste', subtype: 'plastic_waste', defaultUnit: 'kg', units: ['kg', 'tonne'], defaultTreatment: 'landfill' },
  textile_waste: { category: 'waste', subtype: 'textile_waste', defaultUnit: 'kg', units: ['kg'], defaultTreatment: 'landfill' },
  organic_waste: { category: 'waste', subtype: 'organic_waste', defaultUnit: 'kg', units: ['kg'], defaultTreatment: 'landfill' },
  food_waste: { category: 'waste', subtype: 'organic_waste', defaultUnit: 'kg', units: ['kg'], defaultTreatment: 'landfill' },
  general_waste: { category: 'waste', subtype: 'general_waste', defaultUnit: 'kg', units: ['kg'], defaultTreatment: 'landfill' },
  wastewater: { category: 'waste', subtype: 'wastewater', defaultUnit: 'm3', units: ['m3'], defaultTreatment: 'energy_recovery' },
  effluent: { category: 'waste', subtype: 'wastewater', defaultUnit: 'm3', units: ['m3'], defaultTreatment: 'energy_recovery' },
};

export default function CsvActivityModal({ isOpen, onClose, assessmentId, onImportSuccess }) {
  const { setActiveAssessment, addToast } = useFacilityAssessment();
  const [file, setFile] = useState(null);
  const [parsedRows, setParsedRows] = useState([]);
  const [parseError, setParseError] = useState(null);
  const [mode, setMode] = useState('replace'); // 'replace' | 'append'
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef(null);

  if (!isOpen) return null;

  // Generate Sample CSV Template Download
  const handleDownloadTemplate = () => {
    const templateContent = [
      'Category,Subtype,Quantity,Unit,Treatment',
      'energy,electricity,45000,kwh,',
      'energy,diesel,3500,l,',
      'material,virgin_plastic,18000,kg,',
      'material,recycled_plastic,4000,kg,',
      'waste,plastic_waste,2500,kg,landfill',
      'waste,wastewater,600,m3,energy_recovery',
    ].join('\r\n');

    const blob = new Blob([templateContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'carbotrack_activity_template.csv';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    addToast('Activity CSV template downloaded!');
  };

  // CSV Text Parsing logic
  const parseCSVText = (text) => {
    const lines = text
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter((l) => l.length > 0);

    if (lines.length < 2) {
      throw new Error('CSV file must contain a header row and at least one data row.');
    }

    // Parse header
    const rawHeaders = lines[0].split(/[,;\t]/).map((h) => h.replace(/^["']|["']$/g, '').trim().toLowerCase());
    
    // Header index discovery
    const catIdx = rawHeaders.findIndex((h) => h.includes('cat'));
    const subIdx = rawHeaders.findIndex((h) => h.includes('sub') || h.includes('act') || h.includes('type') || h.includes('item'));
    const qtyIdx = rawHeaders.findIndex((h) => h.includes('quant') || h.includes('amount') || h.includes('val') || h.includes('vol'));
    const unitIdx = rawHeaders.findIndex((h) => h.includes('unit'));
    const treatIdx = rawHeaders.findIndex((h) => h.includes('treat') || h.includes('disp'));

    if (qtyIdx === -1) {
      throw new Error('Missing "Quantity" column in CSV header.');
    }

    const rows = [];
    for (let i = 1; i < lines.length; i++) {
      const parts = lines[i].split(/[,;\t]/).map((p) => p.replace(/^["']|["']$/g, '').trim());
      if (parts.length === 0 || (parts.length === 1 && !parts[0])) continue;

      const rawCategory = (catIdx !== -1 ? parts[catIdx] : '').toLowerCase();
      const rawSubtype = (subIdx !== -1 ? parts[subIdx] : '').toLowerCase().replace(/[\s-]+/g, '_');
      const rawQty = qtyIdx !== -1 ? parseFloat(parts[qtyIdx].replace(/,/g, '')) : NaN;
      const rawUnit = (unitIdx !== -1 ? parts[unitIdx] : '').toLowerCase();
      const rawTreatment = (treatIdx !== -1 ? parts[treatIdx] : '').toLowerCase();

      // Normalization lookup
      const lookup = SUBTYPE_MAP[rawSubtype] || null;
      const category = (lookup ? lookup.category : rawCategory) || 'energy';
      const subtype = lookup ? lookup.subtype : rawSubtype || 'electricity';
      const unit = rawUnit || (lookup ? lookup.defaultUnit : 'kwh');
      const treatment = rawTreatment || (category === 'waste' ? (lookup?.defaultTreatment || 'landfill') : undefined);

      const isValid = !isNaN(rawQty) && rawQty > 0;

      rows.push({
        id: `inp-csv-${Date.now()}-${i}`,
        assessment_id: assessmentId,
        category,
        subtype,
        quantity: isValid ? rawQty : 0,
        unit,
        ...(treatment ? { treatment } : {}),
        isValid,
        errorNote: isValid ? null : 'Quantity must be a positive number',
      });
    }

    if (rows.length === 0) {
      throw new Error('No valid activity records could be extracted from the file.');
    }

    return rows;
  };

  const handleFileChange = (e) => {
    const selected = e.target.files?.[0];
    if (!selected) return;

    setFile(selected);
    setParseError(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result || '';
        const rows = parseCSVText(text);
        setParsedRows(rows);
      } catch (err) {
        setParseError(err.message || 'Failed to parse CSV file');
        setParsedRows([]);
      }
    };
    reader.onerror = () => {
      setParseError('Unable to read the file.');
      setParsedRows([]);
    };
    reader.readAsText(selected);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const droppedFile = e.dataTransfer.files?.[0];
    if (droppedFile) {
      const fakeEvent = { target: { files: [droppedFile] } };
      handleFileChange(fakeEvent);
    }
  };

  const handleApply = async () => {
    const validRows = parsedRows.filter((r) => r.isValid);
    if (validRows.length === 0) {
      setParseError('No valid data lines available to import.');
      return;
    }

    setImporting(true);
    setParseError(null);

    try {
      let finalInputs = [];
      if (mode === 'append') {
        // Fetch existing inputs
        const res = await assessmentsApi.getById(assessmentId);
        const existing = res?.data?.inputs || [];
        finalInputs = [...existing, ...validRows];
      } else {
        // Replace
        finalInputs = validRows;
      }

      // Save to database / mock store
      await assessmentsApi.saveInputs(assessmentId, finalInputs);

      // Deterministically recalculate emissions
      const calcRes = await assessmentsApi.calculate(assessmentId);

      if (calcRes?.data?.assessment) {
        setActiveAssessment(calcRes.data.assessment);
        addToast(
          `Successfully imported ${validRows.length} CSV activity stream lines! Footprint recalculated to ${calcRes.data.assessment.total_co2e} t CO₂e.`
        );
        if (onImportSuccess) {
          onImportSuccess(calcRes.data.assessment);
        }
        onClose();
      }
    } catch (err) {
      setParseError(err.message || 'Failed to import and calculate activity data');
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full border border-gray-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="p-5 border-b border-gray-100 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#5546E8]/10 text-[#5546E8] flex items-center justify-center shrink-0">
              <FileUp className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#5546E8] font-mono">
                  Batch Activity Data Import
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] bg-purple-50 text-[#5546E8] font-mono">
                  CSV Engine
                </span>
              </div>
              <h3 className="text-base font-bold text-gray-900 mt-0.5">
                Upload Plant Operational CSV Data
              </h3>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          {/* Template Download Banner */}
          <div className="p-3.5 rounded-xl bg-indigo-50/50 border border-indigo-100 flex items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 text-indigo-950">
              <FileSpreadsheet className="w-4 h-4 text-[#5546E8] shrink-0" />
              <span>Need the standard format? Download the official activity stream CSV template.</span>
            </div>
            <button
              onClick={handleDownloadTemplate}
              className="px-2.5 py-1.5 rounded-lg bg-white border border-indigo-200 text-[#5546E8] hover:bg-indigo-50 font-semibold shadow-2xs flex items-center gap-1.5 shrink-0 transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Template</span>
            </button>
          </div>

          {/* Upload Dropzone */}
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-gray-300 hover:border-[#5546E8] bg-gray-50/50 hover:bg-indigo-50/10 rounded-xl p-6 text-center cursor-pointer transition-colors"
          >
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept=".csv,text/csv"
              className="hidden"
            />
            <div className="w-12 h-12 rounded-full bg-[#5546E8]/10 text-[#5546E8] mx-auto flex items-center justify-center mb-3">
              <UploadCloud className="w-6 h-6" />
            </div>
            <p className="text-xs font-semibold text-gray-800">
              {file ? file.name : 'Click to upload or drag & drop CSV file'}
            </p>
            <p className="text-[11px] text-gray-400 mt-1">
              Supports Energy (Electricity, Diesel, Gas), Materials (Polymers, Textile, Food), and Waste
            </p>
          </div>

          {parseError && (
            <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{parseError}</span>
            </div>
          )}

          {/* Parsed Preview */}
          {parsedRows.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-gray-800">Parsed Activity Records Preview</span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    {parsedRows.filter((r) => r.isValid).length} of {parsedRows.length} Valid
                  </span>
                </div>

                {/* Import Mode Selector */}
                <div className="flex items-center gap-1 text-[11px]">
                  <label className="flex items-center gap-1 cursor-pointer">
                    <input
                      type="radio"
                      name="importMode"
                      checked={mode === 'replace'}
                      onChange={() => setMode('replace')}
                      className="text-[#5546E8] focus:ring-[#5546E8]"
                    />
                    <span className={mode === 'replace' ? 'font-bold text-gray-900' : 'text-gray-500'}>
                      Replace All
                    </span>
                  </label>
                  <span className="text-gray-300">•</span>
                  <label className="flex items-center gap-1 cursor-pointer">
                    <input
                      type="radio"
                      name="importMode"
                      checked={mode === 'append'}
                      onChange={() => setMode('append')}
                      className="text-[#5546E8] focus:ring-[#5546E8]"
                    />
                    <span className={mode === 'append' ? 'font-bold text-gray-900' : 'text-gray-500'}>
                      Append
                    </span>
                  </label>
                </div>
              </div>

              {/* Table Preview */}
              <div className="max-h-52 overflow-y-auto border border-gray-200 rounded-xl">
                <table className="w-full text-left text-xs">
                  <thead className="bg-gray-50 text-gray-500 text-[10px] uppercase font-semibold sticky top-0 border-b border-gray-200">
                    <tr>
                      <th className="py-2 px-3">Category</th>
                      <th className="py-2 px-3">Subtype</th>
                      <th className="py-2 px-3 text-right">Quantity</th>
                      <th className="py-2 px-2">Unit</th>
                      <th className="py-2 px-2">Treatment</th>
                      <th className="py-2 px-2 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 bg-white">
                    {parsedRows.map((row, idx) => (
                      <tr key={idx} className={row.isValid ? 'hover:bg-gray-50' : 'bg-rose-50/50'}>
                        <td className="py-2 px-3 font-medium capitalize text-gray-900">
                          {row.category}
                        </td>
                        <td className="py-2 px-3 text-gray-700 capitalize">
                          {row.subtype.replace(/_/g, ' ')}
                        </td>
                        <td className="py-2 px-3 text-right font-mono font-bold text-gray-900">
                          {row.quantity.toLocaleString()}
                        </td>
                        <td className="py-2 px-2 font-mono text-gray-500">{row.unit}</td>
                        <td className="py-2 px-2 text-gray-500 capitalize">{row.treatment || '—'}</td>
                        <td className="py-2 px-2 text-center">
                          {row.isValid ? (
                            <span className="text-emerald-600 font-bold text-[10px]">Ready</span>
                          ) : (
                            <span className="text-rose-600 font-bold text-[10px]">Invalid</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-gray-100 bg-slate-50/70 flex items-center justify-between">
          <button
            onClick={onClose}
            className="btn-secondary text-xs py-2 px-3"
            disabled={importing}
          >
            Cancel
          </button>

          <button
            onClick={handleApply}
            disabled={importing || parsedRows.filter((r) => r.isValid).length === 0}
            className="btn-primary text-xs py-2 px-4 flex items-center gap-1.5 shadow-sm disabled:opacity-50"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>
              {importing
                ? 'Applying & Recalculating...'
                : `Apply ${parsedRows.filter((r) => r.isValid).length} Lines & Recalculate`}
            </span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
