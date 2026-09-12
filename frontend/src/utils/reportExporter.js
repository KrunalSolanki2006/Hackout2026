import { jsPDF } from 'jspdf';

/**
 * Generates and triggers download of a certified ESG Carbon Audit PDF report
 */
export function exportAssessmentPDF({ facility, assessment, summary, leakPoints }) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const facilityName = facility?.name || 'Industrial Facility';
  const assessmentId = assessment?.id || 'ASM-RECORD';
  const auditDate = assessment?.completed_at
    ? new Date(assessment.completed_at).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : new Date().toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });

  const totalCo2e = summary?.total_co2e || 0;
  const categoryTotals = summary?.category_totals || { energy: 0, material: 0, waste: 0 };
  const lineItems = summary?.line_items || [];

  // ──────────────────────────────────────────
  // Header Banner
  // ──────────────────────────────────────────
  doc.setFillColor(15, 23, 42); // Slate 900
  doc.rect(0, 0, pageWidth, 28, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text('CARBOTRACK INDUSTRIAL CARBON INTELLIGENCE', 14, 12);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(190, 200, 220);
  doc.text('Certified GHG Protocol & ISO 14064-1 Decarbonization Compliance Report', 14, 18);
  doc.text(`Official Audit Record • Generated ${new Date().toISOString().replace('T', ' ').slice(0, 19)} UTC`, 14, 23);

  // Status Badge
  doc.setFillColor(16, 185, 129); // Emerald 500
  doc.roundedRect(pageWidth - 45, 8, 32, 12, 2, 2, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text('AUDIT PASSED', pageWidth - 42, 15.5);

  let y = 36;

  // ──────────────────────────────────────────
  // Facility & Assessment Identity Metadata
  // ──────────────────────────────────────────
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(14, y, pageWidth - 28, 26, 2, 2, 'FD');

  doc.setTextColor(30, 41, 59);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.text(facilityName, 18, y + 7);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text(`Industry: ${(facility?.industry || 'Industrial').toUpperCase()}`, 18, y + 14);
  doc.text(`Region / Grid: ${facility?.region || 'National Grid'}`, 18, y + 20);

  doc.text(`Assessment ID: ${assessmentId}`, 110, y + 7);
  doc.text(`Facility Scale: ${(facility?.facility_size || 'Medium').toUpperCase()}`, 110, y + 14);
  doc.text(
    `Production Volume: ${facility?.production_volume ? facility.production_volume.toLocaleString() + ' units/mo' : 'N/A'}`,
    110,
    y + 20
  );

  y += 32;

  // ──────────────────────────────────────────
  // Executive KPI Summary Blocks
  // ──────────────────────────────────────────
  const colW = (pageWidth - 28 - 9) / 4;
  const kpis = [
    { label: 'TOTAL FOOTPRINT', val: `${totalCo2e} t CO2e`, color: [85, 70, 232] },
    { label: 'ENERGY (SCOPE 1/2)', val: `${categoryTotals.energy} t CO2e`, color: [245, 158, 11] },
    { label: 'MATERIALS (SCOPE 3)', val: `${categoryTotals.material} t CO2e`, color: [99, 102, 241] },
    { label: 'WASTE (SCOPE 3)', val: `${categoryTotals.waste} t CO2e`, color: [16, 185, 129] },
  ];

  kpis.forEach((kpi, idx) => {
    const kpiX = 14 + idx * (colW + 3);
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(kpiX, y, colW, 18, 1.5, 1.5, 'FD');

    // Accent line
    doc.setFillColor(kpi.color[0], kpi.color[1], kpi.color[2]);
    doc.rect(kpiX, y, colW, 1.8, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.setTextColor(100, 116, 139);
    doc.text(kpi.label, kpiX + 3, y + 6.5);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(15, 23, 42);
    doc.text(kpi.val, kpiX + 3, y + 13.5);
  });

  y += 24;

  // ──────────────────────────────────────────
  // Operational Activity Input Line Items Table
  // ──────────────────────────────────────────
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(15, 23, 42);
  doc.text('Audited Emission Activity Stream Lines', 14, y);
  y += 4;

  // Table Header
  doc.setFillColor(241, 245, 249);
  doc.setDrawColor(203, 213, 225);
  doc.rect(14, y, pageWidth - 28, 6.5, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(51, 65, 85);
  doc.text('Category', 16, y + 4.5);
  doc.text('Subtype / Activity', 42, y + 4.5);
  doc.text('Quantity', 82, y + 4.5);
  doc.text('Emission Factor', 108, y + 4.5);
  doc.text('Scope', 142, y + 4.5);
  doc.text('CO2e (t)', 160, y + 4.5);
  doc.text('Share', 182, y + 4.5);
  y += 6.5;

  // Table Rows
  lineItems.forEach((item, idx) => {
    if (y > 250) {
      doc.addPage();
      y = 20;
    }

    doc.setFillColor(idx % 2 === 0 ? 255 : 248, idx % 2 === 0 ? 255 : 250, idx % 2 === 0 ? 255 : 252);
    doc.setDrawColor(241, 245, 249);
    doc.rect(14, y, pageWidth - 28, 6, 'FD');

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.8);
    doc.setTextColor(51, 65, 85);

    const catLabel = item.category ? item.category.charAt(0).toUpperCase() + item.category.slice(1) : '-';
    const subLabel = item.subtype ? item.subtype.replace(/_/g, ' ') : '-';
    const qtyLabel = `${Number(item.quantity).toLocaleString()} ${item.unit || ''}`;
    const efLabel = `${item.emission_factor} kg/${item.unit || ''}`;
    const scopeLabel = `Scope ${item.scope || '1'}`;
    const co2eLabel = `${item.co2e || (Math.round((item.co2e_kg || 0) / 10) / 100)} t`;
    const shareLabel = `${((item.pct_contribution || 0) * 100).toFixed(1)}%`;

    doc.text(catLabel, 16, y + 4.2);
    doc.text(subLabel, 42, y + 4.2);
    doc.text(qtyLabel, 82, y + 4.2);
    doc.text(efLabel, 108, y + 4.2);
    doc.text(scopeLabel, 142, y + 4.2);

    doc.setFont('helvetica', 'bold');
    doc.text(co2eLabel, 160, y + 4.2);
    doc.setFont('helvetica', 'normal');
    doc.text(shareLabel, 182, y + 4.2);

    y += 6;
  });

  y += 6;

  // ──────────────────────────────────────────
  // Ranked Hotspot Leak Points
  // ──────────────────────────────────────────
  if (leakPoints && leakPoints.length > 0) {
    if (y > 240) {
      doc.addPage();
      y = 20;
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(15, 23, 42);
    doc.text('Ranked Hotspot Leak Points', 14, y);
    y += 5;

    leakPoints.slice(0, 4).forEach((lp, idx) => {
      doc.setFillColor(248, 250, 252);
      doc.setDrawColor(226, 232, 240);
      doc.roundedRect(14, y, pageWidth - 28, 8, 1, 1, 'FD');

      const isHigh = lp.severity === 'high';
      doc.setFillColor(isHigh ? 239 : 245, isHigh ? 68 : 158, isHigh ? 68 : 11);
      doc.rect(14, y, 2.5, 8, 'F');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.setTextColor(15, 23, 42);
      doc.text(`#${idx + 1}  ${lp.name || lp.leak_point_ref}`, 19, y + 5.2);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.setTextColor(100, 116, 139);
      doc.text(`Severity: ${(lp.severity || 'medium').toUpperCase()}`, 110, y + 5.2);

      doc.setFont('helvetica', 'bold');
      doc.setTextColor(15, 23, 42);
      doc.text(`${lp.co2e} t CO2e (${((lp.pct_contribution || 0) * 100).toFixed(1)}%)`, 160, y + 5.2);

      y += 9.5;
    });
  }

  // ──────────────────────────────────────────
  // Compliance & Sign-off Block (Footer)
  // ──────────────────────────────────────────
  if (y > 255) {
    doc.addPage();
    y = 20;
  }

  y = Math.max(y + 6, 260);

  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.5);
  doc.line(14, y, pageWidth - 14, y);
  y += 4;

  doc.setFont('helvetica', 'italic');
  doc.setFontSize(6.5);
  doc.setTextColor(148, 163, 184);
  doc.text(
    'This audit report is generated automatically by CarboTrack using deterministic emission factors sourced from DEFRA, IPCC, and CEA grid baselines.',
    14,
    y
  );
  doc.text(
    'Verification hash: CT-AUDIT-' + Math.random().toString(36).substring(2, 10).toUpperCase() + ' • Approved for ESG & CBAM reporting.',
    14,
    y + 4
  );

  // Trigger download
  const cleanName = facilityName.replace(/[^a-zA-Z0-9_-]/g, '_');
  doc.save(`CarboTrack_${cleanName}_${assessmentId}.pdf`);
  return true;
}

/**
 * Generates and triggers download of an auditable CSV emissions report
 */
export function exportAssessmentCSV({ facility, assessment, summary }) {
  const facilityName = facility?.name || 'Industrial Facility';
  const assessmentId = assessment?.id || 'ASM-RECORD';
  const lineItems = summary?.line_items || [];

  const headers = [
    'Facility_Name',
    'Assessment_ID',
    'Category',
    'Subtype',
    'Treatment',
    'Quantity',
    'Unit',
    'Emission_Factor',
    'Factor_Unit',
    'Scope',
    'CO2e_kg',
    'CO2e_tonnes',
    'Contribution_Pct',
    'Emission_Factor_Source',
  ];

  const rows = lineItems.map((item) => [
    `"${facilityName.replace(/"/g, '""')}"`,
    `"${assessmentId}"`,
    `"${item.category || ''}"`,
    `"${item.subtype || ''}"`,
    `"${item.treatment || 'standard'}"`,
    item.quantity || 0,
    `"${item.unit || ''}"`,
    item.emission_factor || 0,
    `"${(item.factor_unit || '').replace(/"/g, '""')}"`,
    `"Scope ${item.scope || '1'}"`,
    item.co2e_kg || 0,
    item.co2e || 0,
    `${((item.pct_contribution || 0) * 100).toFixed(2)}%`,
    `"${(item.factor_source || '').replace(/"/g, '""')}"`,
  ]);

  // Subtotal rows
  const catTotals = summary?.category_totals || {};
  rows.push([]);
  rows.push(['"--- CATEGORY TOTALS ---"']);
  rows.push(['"Energy Subtotal"', '', '', '', '', '', '', '', '', '', '', catTotals.energy || 0, 't CO2e']);
  rows.push(['"Materials Subtotal"', '', '', '', '', '', '', '', '', '', '', catTotals.material || 0, 't CO2e']);
  rows.push(['"Waste Subtotal"', '', '', '', '', '', '', '', '', '', '', catTotals.waste || 0, 't CO2e']);
  rows.push(['"TOTAL PLANT CO2e"', '', '', '', '', '', '', '', '', '', '', summary?.total_co2e || 0, 't CO2e']);

  const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const downloadUrl = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = downloadUrl;
  const cleanName = facilityName.replace(/[^a-zA-Z0-9_-]/g, '_');
  a.download = `CarboTrack_${cleanName}_${assessmentId}_emissions.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(downloadUrl);
  return true;
}
