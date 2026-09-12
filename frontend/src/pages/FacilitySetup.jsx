import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, ArrowRight, Lock, ShieldAlert, ArrowLeft } from 'lucide-react';
import { facilitiesApi } from '../api/facilities';
import { assessmentsApi } from '../api/assessments';
import { useFacilityAssessment } from '../context/FacilityAssessmentContext';
import ErrorBanner from '../components/ErrorBanner';

export default function FacilitySetup() {
  const navigate = useNavigate();
  const { addFacility, addToast, user, activeAssessment } = useFacilityAssessment();

  const [name, setName] = useState('');
  const [industry, setIndustry] = useState('plastic');
  const [facilitySize, setFacilitySize] = useState('medium');
  const [region, setRegion] = useState('');
  const [productionVolume, setProductionVolume] = useState('');
  const [assessmentPassword, setAssessmentPassword] = useState('manager123');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const isEmployee = user?.role === 'employee';

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Facility name is required');
      return;
    }
    if (!region.trim()) {
      setError('Geographical region is required for emission factor grid baselines');
      return;
    }
    if (productionVolume && Number(productionVolume) <= 0) {
      setError('Monthly production volume must be greater than zero');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const facRes = await facilitiesApi.create({
        name: name.trim(),
        industry,
        facility_size: facilitySize,
        region: region.trim(),
        production_volume: productionVolume ? Number(productionVolume) : null,
      });

      const newFacility = facRes.data.facility;
      const newAssessment = facRes.data.assessment;

      // Save manager-created assessment passcode
      await assessmentsApi.setPassword(newAssessment.id, assessmentPassword.trim() || 'manager123');

      addFacility(newFacility, newAssessment);

      addToast(`Facility "${newFacility.name}" registered and baseline carbon audit generated!`);
      navigate(`/assessment/${newAssessment.id}/overview`);
    } catch (err) {
      setError(err.message || 'Failed to create facility profile');
    } finally {
      setLoading(false);
    }
  };

  if (isEmployee) {
    const asmId = activeAssessment?.id || 'asm-abc-001';
    return (
      <div className="max-w-md mx-auto py-16 px-4 text-center">
        <div className="panel-card p-8 shadow-card border-indigo-100">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center mb-4">
            <ShieldAlert className="w-7 h-7" />
          </div>
          <span className="px-2.5 py-1 rounded-full bg-amber-100/80 text-amber-900 text-[11px] font-bold uppercase tracking-wider">
            Employee Role • Access Restricted
          </span>
          <h2 className="text-lg font-bold text-gray-900 mt-3">
            Facility Setup Reserved for Managers
          </h2>
          <p className="text-xs text-gray-500 mt-2 leading-relaxed">
            Only Plant Managers have administrative permissions to register new industrial facilities and initialize new assessment intakes.
          </p>
          <button
            onClick={() => navigate(`/assessment/${asmId}/overview`)}
            className="btn-primary w-full py-2.5 text-xs font-semibold mt-6 flex items-center justify-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Return to Overview Dashboard</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto py-6">
      {/* Page Header */}
      <div className="mb-6 flex items-center justify-between border-b border-gray-200 pb-4">
        <div>
          <span className="text-[11px] font-bold uppercase tracking-wider text-[#5546E8] font-mono">
            Setup Step 0 of 6
          </span>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 mt-1">
            Facility Identity & Baseline Context
          </h1>
          <p className="text-xs sm:text-sm text-gray-500 mt-1">
            Configure manufacturing plant parameters for localized grid baselines and benchmark models.
          </p>
        </div>
        <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 text-[#5546E8] flex items-center justify-center shrink-0">
          <Building2 className="w-5 h-5" />
        </div>
      </div>

      <div className="panel-card p-6 sm:p-8">
        {error && <ErrorBanner message={error} className="mb-5" />}

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Facility Name */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">
              Plant / Facility Legal Name <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Apex Polymer Solutions Unit 2"
              className="input-field text-xs"
            />
          </div>

          {/* Industry Selection */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                Primary Industry Classification <span className="text-rose-500">*</span>
              </label>
              <select
                value={industry}
                onChange={(e) => setIndustry(e.target.value)}
                className="input-field text-xs capitalize"
              >
                <option value="plastic">Plastic Manufacturing & Extrusion</option>
                <option value="textile">Textile & Garment Manufacturing</option>
                <option value="food_processing">Food & Beverage Processing</option>
              </select>
              <p className="text-[11px] text-gray-400 mt-1">
                Calibrates material factor library & circular recommendations.
              </p>
            </div>

            {/* Facility Size */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                Facility Operational Scale <span className="text-rose-500">*</span>
              </label>
              <select
                value={facilitySize}
                onChange={(e) => setFacilitySize(e.target.value)}
                className="input-field text-xs capitalize"
              >
                <option value="small">Small (&lt; 50 employees / Tier 3)</option>
                <option value="medium">Medium (50–250 employees / SME)</option>
                <option value="large">Large (&gt; 250 employees / Multi-line)</option>
              </select>
              <p className="text-[11px] text-gray-400 mt-1">
                Used to tune investment ranges and payback expectations.
              </p>
            </div>
          </div>

          {/* Region & Production Volume */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                Plant Location / Regional Grid <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={region}
                onChange={(e) => setRegion(e.target.value)}
                placeholder="e.g. Gujarat, India or Ohio, USA"
                className="input-field text-xs"
              />
              <p className="text-[11px] text-gray-400 mt-1">
                Determines regional electricity grid emission factor.
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                Monthly Production Output <span className="text-gray-400 font-normal">(optional)</span>
              </label>
              <div className="relative">
                <input
                  type="number"
                  min="1"
                  step="any"
                  value={productionVolume}
                  onChange={(e) => setProductionVolume(e.target.value)}
                  placeholder="e.g. 50000"
                  className="input-field text-xs pr-14 font-mono"
                />
                <span className="text-[11px] text-gray-400 absolute right-3 top-1/2 -translate-y-1/2">
                  kg/mo
                </span>
              </div>
              <p className="text-[11px] text-gray-400 mt-1">
                Enables specific carbon intensity per unit output.
              </p>
            </div>
          </div>

          {/* Assessment Security Passcode (Created by Manager) */}
          <div className="p-4 rounded-xl bg-purple-50/60 border border-purple-100 space-y-2">
            <label className="block text-xs font-semibold text-gray-900">
              Assessment Intake Security Passcode <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-[#5546E8] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                required
                value={assessmentPassword}
                onChange={(e) => setAssessmentPassword(e.target.value)}
                placeholder="manager123"
                className="input-field pl-9 text-xs font-mono bg-white"
              />
            </div>
            <p className="text-[11px] text-gray-500">
              Passcode created by manager for this assessment. Employees can enter this passcode or their employee account password to directly access and modify company intake records.
            </p>
          </div>

          {/* Form Actions */}
          <div className="pt-5 border-t border-gray-100 flex items-center justify-between">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="btn-secondary text-xs"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary text-xs"
            >
              <span>{loading ? 'Creating Facility...' : 'Save & Continue to Data Intake'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
