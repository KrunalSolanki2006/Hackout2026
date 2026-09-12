const { v4: uuidv4 } = require('uuid');

/**
 * Generate a CSV report string for an assessment
 */
function generateCSV(facility, assessment, summary, leakPoints, recommendations) {
  const rows = [];

  // Header
  rows.push('HACKOUT 2026 – Industrial Emission Reduction Platform');
  rows.push(`Certified Emission Report — ${new Date().toISOString()}`);
  rows.push('');

  // Facility Info
  rows.push('FACILITY INFORMATION');
  rows.push(`Name,${facility.name}`);
  rows.push(`Industry,${facility.industry}`);
  rows.push(`Size,${facility.facility_size}`);
  rows.push(`Region,${facility.region}`);
  rows.push(`Production Volume,${facility.production_volume || 'N/A'}`);
  rows.push('');

  // Assessment Overview
  rows.push('EMISSION OVERVIEW');
  rows.push(`Total CO2e (tonnes),${summary.total_co2e}`);
  rows.push(`Assessment Status,${assessment.status}`);
  rows.push(`Completed At,${assessment.completed_at || 'N/A'}`);
  rows.push(`Energy Emissions (t CO2e),${summary.category_totals?.energy || 0}`);
  rows.push(`Material Emissions (t CO2e),${summary.category_totals?.material || 0}`);
  rows.push(`Waste Emissions (t CO2e),${summary.category_totals?.waste || 0}`);
  rows.push('');

  // Line Items
  rows.push('PROCESS INPUTS & EMISSION LINE ITEMS');
  rows.push('ID,Category,Subtype,Quantity,Unit,Emission Factor,Factor Unit,CO2e (tonnes),% Contribution');
  for (const item of (summary.line_items || [])) {
    rows.push([
      item.id, item.category, item.subtype, item.quantity, item.unit,
      item.emission_factor, item.factor_unit,
      item.co2e, (item.pct_contribution * 100).toFixed(1) + '%'
    ].join(','));
  }
  rows.push('');

  // Leak Points
  rows.push('EMISSION LEAK POINTS (RANKED)');
  rows.push('Rank,Category,Subtype,CO2e (tonnes),% Contribution,Severity');
  for (const lp of (leakPoints || [])) {
    rows.push([
      lp.rank, lp.category, lp.subtype, lp.co2e,
      (lp.pct_contribution * 100).toFixed(1) + '%', lp.severity
    ].join(','));
  }
  rows.push('');

  // Recommendations
  rows.push('TOP RECOMMENDATIONS');
  rows.push('Rank,Intervention,Category,Score,CO2 Reduction (t/yr),Cost Range (USD),Payback (months),Difficulty');
  const topRecs = (recommendations || []).slice(0, 5);
  topRecs.forEach((rec, idx) => {
    rows.push([
      idx + 1,
      `"${rec.intervention?.name || rec.name}"`,
      rec.intervention?.category || rec.category,
      rec.score,
      `${rec.estimated_co2_reduction_range?.[0]}-${rec.estimated_co2_reduction_range?.[1]}`,
      `$${rec.estimated_cost_range?.[0]}-$${rec.estimated_cost_range?.[1]}`,
      rec.payback_period_months,
      rec.implementation_difficulty
    ].join(','));
  });

  rows.push('');
  rows.push(`Report Generated,${new Date().toISOString()}`);
  rows.push('Platform,HackOut 2026 — Industrial Emission Reduction Platform');

  return rows.join('\n');
}

/**
 * Generate a text-based PDF-like report (returned as text/plain when pdfkit unavailable)
 */
function generateTextReport(facility, assessment, summary, leakPoints, recommendations) {
  const sep = '═'.repeat(60);
  const lines = [];

  lines.push(sep);
  lines.push('  HACKOUT 2026 — CERTIFIED EMISSION REPORT');
  lines.push(`  Generated: ${new Date().toISOString()}`);
  lines.push(sep);
  lines.push('');

  lines.push('FACILITY');
  lines.push(`  Name:             ${facility.name}`);
  lines.push(`  Industry:         ${facility.industry}`);
  lines.push(`  Size:             ${facility.facility_size}`);
  lines.push(`  Region:           ${facility.region}`);
  lines.push('');

  lines.push('EMISSION OVERVIEW');
  lines.push(`  Total CO₂e:       ${summary.total_co2e} tonnes`);
  lines.push(`  Energy:           ${summary.category_totals?.energy || 0} t CO₂e`);
  lines.push(`  Material:         ${summary.category_totals?.material || 0} t CO₂e`);
  lines.push(`  Waste:            ${summary.category_totals?.waste || 0} t CO₂e`);
  lines.push('');

  lines.push('TOP LEAK POINTS');
  (leakPoints || []).slice(0, 5).forEach((lp) => {
    lines.push(`  ${lp.rank}. [${lp.severity.toUpperCase()}] ${lp.subtype} — ${lp.co2e} t CO₂e (${(lp.pct_contribution * 100).toFixed(1)}%)`);
  });
  lines.push('');

  lines.push('TOP RECOMMENDATIONS');
  (recommendations || []).slice(0, 5).forEach((rec, idx) => {
    lines.push(`  ${idx + 1}. ${rec.intervention?.name || rec.name} (Score: ${rec.score})`);
    lines.push(`     CO₂ Reduction: ${rec.estimated_co2_reduction_range?.[0]}-${rec.estimated_co2_reduction_range?.[1]} t/yr`);
    lines.push(`     Cost: $${rec.estimated_cost_range?.[0]}-$${rec.estimated_cost_range?.[1]} | Payback: ${rec.payback_period_months} months`);
  });
  lines.push('');
  lines.push(sep);

  return lines.join('\n');
}

module.exports = { generateCSV, generateTextReport };
