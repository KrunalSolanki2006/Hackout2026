import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, ArrowRight } from 'lucide-react';
import { facilitiesApi } from '../api/facilities';
import { assessmentsApi } from '../api/assessments';
import { useFacilityAssessment } from '../context/FacilityAssessmentContext';
import ErrorBanner from '../components/ErrorBanner';

export default function FacilitySetup() {
  const navigate = useNavigate();
  const { setActiveFacility, setActiveAssessment, addToast } = useFacilityAssessment();

  const [name, setName] = useState('');
  const [industry, setIndustry] = useState('plastic');
  const [facilitySize, setFacilitySize] = useState('medium');
  const [region, setRegion] = useState('');
  const [productionVolume, setProductionVolume] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

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
      setActiveFacility(newFacility);

      const asmRes = await assessmentsApi.create(newFacility.id);
      const newAsm = asmRes.data.assessment;
      setActiveAssessment(newAsm);

      addToast(`Facility "${newFacility.name}" configured successfully!`);
      navigate(`/facility/${newFacility.id}/intake`);
    } catch (err) {
      setError(err.message || 'Failed to create facility profile');
    } finally {
      setLoading(false);
    }
  };

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
