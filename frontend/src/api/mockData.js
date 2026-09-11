// Static sourced emission factors and intervention library
// Derived from authoritative GHG protocol, DEFRA, and industrial benchmarks

export const EMISSION_FACTORS = [
  // Energy
  {
    id: 'ef-energy-diesel',
    category: 'energy',
    subtype: 'diesel',
    unit: 'l',
    emission_factor: 2.68, // kg CO2e / l
    factor_unit: 'kg CO2e / l',
    source: 'DEFRA / IPCC Tier 1 (Scope 1 direct combustion)',
    scope: '1',
    last_updated: '2025-01-15'
  },
  {
    id: 'ef-energy-diesel-gal',
    category: 'energy',
    subtype: 'diesel',
    unit: 'gallon',
    emission_factor: 10.14, // 2.68 * 3.78541
    factor_unit: 'kg CO2e / gallon',
    source: 'DEFRA / US EPA Tier 1',
    scope: '1',
    last_updated: '2025-01-15'
  },
  {
    id: 'ef-energy-electricity',
    category: 'energy',
    subtype: 'electricity',
    unit: 'kwh',
    emission_factor: 0.82, // kg CO2e / kWh (regional industrial grid average)
    factor_unit: 'kg CO2e / kWh',
    source: 'National Grid Baseline / CEA CO2 Baseline Database (Scope 2)',
    scope: '2',
    last_updated: '2025-02-01'
  },
  {
    id: 'ef-energy-electricity-mwh',
    category: 'energy',
    subtype: 'electricity',
    unit: 'mwh',
    emission_factor: 820.0,
    factor_unit: 'kg CO2e / MWh',
    source: 'National Grid Baseline / CEA CO2 Baseline Database',
    scope: '2',
    last_updated: '2025-02-01'
  },
  {
    id: 'ef-energy-gas',
    category: 'energy',
    subtype: 'natural_gas',
    unit: 'm3',
    emission_factor: 1.93,
    factor_unit: 'kg CO2e / m3',
    source: 'EPA GHG Emission Factors Hub',
    scope: '1',
    last_updated: '2024-11-20'
  },

  // Material
  {
    id: 'ef-mat-virgin-plastic',
    category: 'material',
    subtype: 'virgin_plastic',
    unit: 'kg',
    emission_factor: 2.10, // kg CO2e / kg
    factor_unit: 'kg CO2e / kg',
    source: 'PlasticsEurope Eco-profiles (Virgin HDPE/PP cradle-to-gate)',
    scope: '3',
    last_updated: '2025-01-10'
  },
  {
    id: 'ef-mat-virgin-plastic-tonne',
    category: 'material',
    subtype: 'virgin_plastic',
    unit: 'tonne',
    emission_factor: 2100.0,
    factor_unit: 'kg CO2e / tonne',
    source: 'PlasticsEurope Eco-profiles',
    scope: '3',
    last_updated: '2025-01-10'
  },
  {
    id: 'ef-mat-recycled-plastic',
    category: 'material',
    subtype: 'recycled_plastic',
    unit: 'kg',
    emission_factor: 0.45,
    factor_unit: 'kg CO2e / kg',
    source: 'Association of Plastic Recyclers (PCR LCA dataset)',
    scope: '3',
    last_updated: '2025-01-10'
  },
  {
    id: 'ef-mat-textile-virgin',
    category: 'material',
    subtype: 'virgin_textile_fiber',
    unit: 'kg',
    emission_factor: 5.80,
    factor_unit: 'kg CO2e / kg',
    source: 'Higg Materials Sustainability Index',
    scope: '3',
    last_updated: '2024-12-05'
  },
  {
    id: 'ef-mat-dye',
    category: 'material',
    subtype: 'dye',
    unit: 'kg',
    emission_factor: 4.20,
    factor_unit: 'kg CO2e / kg',
    source: 'Textile Exchange Life Cycle Data',
    scope: '3',
    last_updated: '2024-12-05'
  },
  {
    id: 'ef-mat-packaging',
    category: 'material',
    subtype: 'packaging_material',
    unit: 'kg',
    emission_factor: 1.45,
    factor_unit: 'kg CO2e / kg',
    source: 'DEFRA Paper and Board Factors',
    scope: '3',
    last_updated: '2024-10-18'
  },
  {
    id: 'ef-mat-raw-food',
    category: 'material',
    subtype: 'raw_food_material',
    unit: 'kg',
    emission_factor: 1.85,
    factor_unit: 'kg CO2e / kg',
    source: 'FAO Agricultural Life Cycle Factors',
    scope: '3',
    last_updated: '2024-09-12'
  },
  {
    id: 'ef-mat-scrap',
    category: 'material',
    subtype: 'process_scrap',
    unit: 'kg',
    emission_factor: 0.25,
    factor_unit: 'kg CO2e / kg',
    source: 'Circular Economy Benchmark Database',
    scope: '3',
    last_updated: '2025-01-10'
  },

  // Waste
  {
    id: 'ef-waste-plastic-landfill',
    category: 'waste',
    subtype: 'plastic_waste',
    unit: 'kg',
    treatment: 'landfill',
    emission_factor: 1.25, // kg CO2e / kg
    factor_unit: 'kg CO2e / kg',
    source: 'IPCC Waste Model & EPA WARM v15 (Landfill methane + handling)',
    scope: '3',
    last_updated: '2025-01-15'
  },
  {
    id: 'ef-waste-plastic-recycling',
    category: 'waste',
    subtype: 'plastic_waste',
    unit: 'kg',
    treatment: 'recycling',
    emission_factor: 0.15,
    factor_unit: 'kg CO2e / kg',
    source: 'EPA WARM v15 (Recycling transportation & pre-sort)',
    scope: '3',
    last_updated: '2025-01-15'
  },
  {
    id: 'ef-waste-textile-landfill',
    category: 'waste',
    subtype: 'textile_waste',
    unit: 'kg',
    treatment: 'landfill',
    emission_factor: 2.10,
    factor_unit: 'kg CO2e / kg',
    source: 'DEFRA Waste Disposal Factors',
    scope: '3',
    last_updated: '2024-11-12'
  },
  {
    id: 'ef-waste-organic-landfill',
    category: 'waste',
    subtype: 'organic_waste',
    unit: 'kg',
    treatment: 'landfill',
    emission_factor: 0.95,
    factor_unit: 'kg CO2e / kg',
    source: 'IPCC Anaerobic Degradation Factors',
    scope: '3',
    last_updated: '2024-11-12'
  },
  {
    id: 'ef-waste-general-landfill',
    category: 'waste',
    subtype: 'general_waste',
    unit: 'kg',
    treatment: 'landfill',
    emission_factor: 0.58,
    factor_unit: 'kg CO2e / kg',
    source: 'DEFRA Municipal Solid Waste Factors',
    scope: '3',
    last_updated: '2024-11-12'
  },
  {
    id: 'ef-waste-water',
    category: 'waste',
    subtype: 'wastewater',
    unit: 'm3',
    treatment: 'energy_recovery',
    emission_factor: 0.72,
    factor_unit: 'kg CO2e / m3',
    source: 'Water UK Industrial Effluent GHG Factor',
    scope: '3',
    last_updated: '2024-10-05'
  }
];

// Curated Intervention Library
export const INTERVENTION_LIBRARY = [
  {
    id: 'INT-001',
    name: 'Solar Rooftop + Grid Hybrid System',
    category: 'energy',
    description: 'Install 100 kWp rooftop solar photovoltaic array with hybrid inverter to displace diesel generator runtime and daylight grid draw.',
    supported_industries: ['plastic', 'textile', 'food_processing'],
    applicable_leak_types: ['diesel_generator', 'electricity'],
    estimated_cost_min: 40000,
    estimated_cost_max: 65000,
    estimated_co2_reduction_min: 15,
    estimated_co2_reduction_max: 26,
    co2_reduction_unit: 't CO2e/year',
    implementation_difficulty: 'high',
    payback_period_months: 30,
    roi_pct: 24,
    explanation: [
      'High emission contribution from diesel generator',
      'Strong industry fit with standard industrial roofing',
      'High CO2 reduction potential (replaces Scope 1 diesel)',
      'Favorable ROI under 3 years'
    ]
  },
  {
    id: 'INT-002',
    name: 'Peak Shaving Battery Energy Storage (BESS)',
    category: 'energy',
    description: 'Deploy 80 kWh lithium-ion storage to store off-peak energy and eliminate reliance on backup diesel generators during brownouts.',
    supported_industries: ['plastic', 'textile', 'food_processing'],
    applicable_leak_types: ['diesel_generator', 'electricity'],
    estimated_cost_min: 25000,
    estimated_cost_max: 42000,
    estimated_co2_reduction_min: 8,
    estimated_co2_reduction_max: 14,
    co2_reduction_unit: 't CO2e/year',
    implementation_difficulty: 'medium',
    payback_period_months: 26,
    roi_pct: 20,
    explanation: [
      'Reduces peak tariff demand charges',
      'Replaces diesel spinning reserve',
      'Direct integration with existing plant switchgear'
    ]
  },
  {
    id: 'INT-003',
    name: 'IE4 Premium Efficiency Motors & VFD Retrofit',
    category: 'energy',
    description: 'Upgrade hydraulic pump and extruder drive motors to IE4 super-premium efficiency with variable frequency drives.',
    supported_industries: ['plastic', 'textile', 'food_processing'],
    applicable_leak_types: ['electricity'],
    estimated_cost_min: 12000,
    estimated_cost_max: 20000,
    estimated_co2_reduction_min: 6,
    estimated_co2_reduction_max: 10,
    co2_reduction_unit: 't CO2e/year',
    implementation_difficulty: 'low',
    payback_period_months: 14,
    roi_pct: 36,
    explanation: [
      'Fast payback under 15 months',
      '18% drop in motor electricity consumption',
      'Minimal plant downtime during installation'
    ]
  },
  {
    id: 'INT-004',
    name: 'Biodiesel (B20/B100) Drop-in Fuel Switching',
    category: 'energy',
    description: 'Transition generator fuel supply from petroleum diesel to standardized waste-derived biodiesel blends.',
    supported_industries: ['plastic', 'textile', 'food_processing'],
    applicable_leak_types: ['diesel_generator'],
    estimated_cost_min: 4000,
    estimated_cost_max: 9000,
    estimated_co2_reduction_min: 8,
    estimated_co2_reduction_max: 13,
    co2_reduction_unit: 't CO2e/year',
    implementation_difficulty: 'low',
    payback_period_months: 10,
    roi_pct: 32,
    explanation: [
      'Immediate 60-70% lifecycle carbon reduction for gen-sets',
      'Negligible capital expenditure / drop-in fuel compatibility',
      'Rapid deployment within 2 weeks'
    ]
  },
  {
    id: 'INT-005',
    name: 'Open Access Renewable Energy Wheeling',
    category: 'energy',
    description: 'Contract green power purchase agreement (PPA) via regional open access transmission.',
    supported_industries: ['plastic', 'textile', 'food_processing'],
    applicable_leak_types: ['electricity'],
    estimated_cost_min: 6000,
    estimated_cost_max: 12000,
    estimated_co2_reduction_min: 18,
    estimated_co2_reduction_max: 30,
    co2_reduction_unit: 't CO2e/year',
    implementation_difficulty: 'low',
    payback_period_months: 8,
    roi_pct: 48,
    explanation: [
      'Lowest unit cost per avoided tonne of CO2e',
      'Zero on-site construction requirement',
      'Direct green tariff certification for ESG compliance'
    ]
  },
  {
    id: 'INT-006',
    name: 'Post-Consumer Recycled (PCR) Resin Blending (30%)',
    category: 'materials',
    description: 'Incorporate 30% certified post-consumer recycled polymer pellets into primary extrusion lines.',
    supported_industries: ['plastic'],
    applicable_leak_types: ['virgin_plastic'],
    estimated_cost_min: 15000,
    estimated_cost_max: 28000,
    estimated_co2_reduction_min: 12,
    estimated_co2_reduction_max: 21,
    co2_reduction_unit: 't CO2e/year',
    implementation_difficulty: 'medium',
    payback_period_months: 16,
    roi_pct: 28,
    explanation: [
      'Targets dominant material Scope 3 footprint',
      'Meets tightening brand packaging recycled-content mandates',
      'Cost-competitive secondary resin procurement'
    ]
  },
  {
    id: 'INT-007',
    name: 'Inline Edge-Trim Scrap Regrind System',
    category: 'materials',
    description: 'Install pneumatic closed-loop scrap granulator to immediately feed clean edge trims back into the hopper.',
    supported_industries: ['plastic'],
    applicable_leak_types: ['virgin_plastic', 'process_scrap'],
    estimated_cost_min: 8000,
    estimated_cost_max: 16000,
    estimated_co2_reduction_min: 4,
    estimated_co2_reduction_max: 8,
    co2_reduction_unit: 't CO2e/year',
    implementation_difficulty: 'low',
    payback_period_months: 9,
    roi_pct: 44,
    explanation: [
      'Recovers 95%+ of clean extrusion scrap',
      'Direct raw virgin resin savings',
      'Payback under 1 year from material recovery'
    ]
  },
  {
    id: 'INT-008',
    name: 'Bio-Circular Polymer & Mineral Filler Substitution',
    category: 'materials',
    description: 'Formulate with 20% calcium carbonate mineral masterbatch and bio-attributed PP/PE grades.',
    supported_industries: ['plastic'],
    applicable_leak_types: ['virgin_plastic'],
    estimated_cost_min: 20000,
    estimated_cost_max: 36000,
    estimated_co2_reduction_min: 7,
    estimated_co2_reduction_max: 12,
    co2_reduction_unit: 't CO2e/year',
    implementation_difficulty: 'high',
    payback_period_months: 34,
    roi_pct: 16,
    explanation: [
      'Lowers product density and raw resin volume',
      'Enhanced thermal deflection properties',
      'Longer qualification cycle for food-contact compliance'
    ]
  },
  {
    id: 'INT-009',
    name: 'Zero-Waste-to-Landfill Segregation & Pelleting',
    category: 'waste',
    description: 'Transform purge lumps and degraded purge scrap into clean uncolored reprocessed pellets for secondary molding.',
    supported_industries: ['plastic'],
    applicable_leak_types: ['plastic_waste'],
    estimated_cost_min: 18000,
    estimated_cost_max: 32000,
    estimated_co2_reduction_min: 5,
    estimated_co2_reduction_max: 9,
    co2_reduction_unit: 't CO2e/year',
    implementation_difficulty: 'medium',
    payback_period_months: 18,
    roi_pct: 30,
    explanation: [
      'Diverts 100% of polymer waste from local landfill',
      'Avoids methane and landfill tipping fees',
      'Generates secondary revenue stream'
    ]
  },
  {
    id: 'INT-010',
    name: 'Source Color & Polymer Sorting Workstations',
    category: 'waste',
    description: 'Deploy 5S optical-coded waste sort bins at every production cell to prevent contamination of clear polymer scrap.',
    supported_industries: ['plastic', 'textile', 'food_processing'],
    applicable_leak_types: ['plastic_waste', 'general_waste'],
    estimated_cost_min: 2500,
    estimated_cost_max: 5500,
    estimated_co2_reduction_min: 2,
    estimated_co2_reduction_max: 4,
    co2_reduction_unit: 't CO2e/year',
    implementation_difficulty: 'low',
    payback_period_months: 5,
    roi_pct: 65,
    explanation: [
      'Ultra-fast ROI under 6 months',
      'Increases scrap resale valuation by 40%',
      'Boosts plant floor safety and housekeeping'
    ]
  },
  {
    id: 'INT-011',
    name: 'Wastewater Heat Recovery Exchanger',
    category: 'waste',
    description: 'Recover residual thermal heat from wash tanks and cooling circuits to preheat feed lines.',
    supported_industries: ['textile', 'food_processing', 'plastic'],
    applicable_leak_types: ['wastewater', 'energy'],
    estimated_cost_min: 14000,
    estimated_cost_max: 26000,
    estimated_co2_reduction_min: 5,
    estimated_co2_reduction_max: 9,
    co2_reduction_unit: 't CO2e/year',
    implementation_difficulty: 'medium',
    payback_period_months: 20,
    roi_pct: 22,
    explanation: [
      'Cuts process water heating energy by 25%',
      'Protects chiller compressors from thermal overload'
    ]
  },
  {
    id: 'INT-012',
    name: 'Industrial Symbiosis Byproduct Offtake Exchange',
    category: 'waste',
    description: 'Establish supply agreement with local construction block manufacturers to utilize mineral sludge and reject slag.',
    supported_industries: ['plastic', 'textile', 'food_processing'],
    applicable_leak_types: ['general_waste', 'plastic_waste'],
    estimated_cost_min: 5000,
    estimated_cost_max: 11000,
    estimated_co2_reduction_min: 3,
    estimated_co2_reduction_max: 6,
    co2_reduction_unit: 't CO2e/year',
    implementation_difficulty: 'low',
    payback_period_months: 11,
    roi_pct: 38,
    explanation: [
      'Transforms disposal cost center into neutral resource stream',
      'Regional circular economy collaboration model'
    ]
  }
];

// Demo facility: ABC Plastics
export const INITIAL_DEMO_FACILITY = {
  id: 'fac-abc-001',
  owner_user_id: 'usr-001',
  name: 'ABC Plastics Manufacturing Ltd.',
  industry: 'plastic',
  facility_size: 'medium',
  region: 'Sanand Industrial Estate, Gujarat, India',
  production_volume: 50000, // kg/month
  created_at: '2026-03-01T09:00:00Z'
};

// Initial inputs for ABC Plastics demo
export const INITIAL_DEMO_INPUTS = [
  {
    id: 'inp-001',
    assessment_id: 'asm-abc-001',
    category: 'energy',
    subtype: 'diesel',
    quantity: 5000,
    unit: 'l',
    computed_co2e: null
  },
  {
    id: 'inp-002',
    assessment_id: 'asm-abc-001',
    category: 'energy',
    subtype: 'electricity',
    quantity: 40000,
    unit: 'kwh',
    computed_co2e: null
  },
  {
    id: 'inp-003',
    assessment_id: 'asm-abc-001',
    category: 'material',
    subtype: 'virgin_plastic',
    quantity: 20000,
    unit: 'kg',
    computed_co2e: null
  },
  {
    id: 'inp-004',
    assessment_id: 'asm-abc-001',
    category: 'waste',
    subtype: 'plastic_waste',
    treatment: 'landfill',
    quantity: 3000,
    unit: 'kg',
    computed_co2e: null
  }
];

// Historical assessments for trend analysis
export const INITIAL_ASSESSMENT_HISTORY = [
  {
    assessment_id: 'asm-abc-baseline',
    facility_id: 'fac-abc-001',
    total_co2e: 162.4,
    recorded_at: '2025-09-15T11:00:00Z',
    status: 'complete',
    interventions_applied: 0
  },
  {
    assessment_id: 'asm-abc-q4',
    facility_id: 'fac-abc-001',
    total_co2e: 148.6,
    recorded_at: '2025-12-20T14:30:00Z',
    status: 'complete',
    interventions_applied: 1
  }
];
