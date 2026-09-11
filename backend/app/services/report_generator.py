import os
import io
import csv
import logging
from typing import Dict, Any, Tuple
from motor.motor_asyncio import AsyncIOMotorDatabase
from bson import ObjectId

from reportlab.lib.pagesizes import letter
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib import colors

logger = logging.getLogger("app.services.report_generator")

async def generate_assessment_report(
    db: AsyncIOMotorDatabase,
    assessment_id: str,
    export_format: str = "pdf"
) -> Tuple[bytes, str, str]:
    """
    Generates a structured PDF or CSV report for an assessment.
    Returns tuple: (file_bytes, filename, media_type)
    """
    # Fetch assessment, inputs, recommendations, facility
    assessment = await db.assessments.find_one({"_id": assessment_id})
    if not assessment and ObjectId.is_valid(assessment_id):
        assessment = await db.assessments.find_one({"_id": ObjectId(assessment_id)})

    if not assessment:
        raise ValueError("Assessment not found")

    facility_id = assessment.get("facility_id")
    facility = await db.facilities.find_one({"_id": facility_id})
    if not facility and ObjectId.is_valid(facility_id):
        facility = await db.facilities.find_one({"_id": ObjectId(facility_id)})

    facility_name = facility.get("name", "Industrial Facility") if facility else "Industrial Facility"
    industry = facility.get("industry", "N/A") if facility else "N/A"

    cursor_inputs = db.process_inputs.find({"assessment_id": assessment_id})
    inputs = await cursor_inputs.to_list(length=500)

    cursor_recs = db.recommendations.find({"assessment_id": assessment_id})
    recs = await cursor_recs.to_list(length=100)

    total_co2e = float(assessment.get("total_co2e", 0.0))

    if export_format.lower() == "csv":
        output = io.StringIO()
        writer = csv.writer(output)

        writer.writerow(["ASSESSMENT EMISSIONS & CIRCULAR RECOMMENDATION REPORT"])
        writer.writerow(["Facility Name", facility_name])
        writer.writerow(["Industry", industry])
        writer.writerow(["Assessment ID", assessment_id])
        writer.writerow(["Total Calculated CO2e (tonnes)", total_co2e])
        writer.writerow([])

        writer.writerow(["PROCESS INPUT LINE ITEMS"])
        writer.writerow(["Category", "Subtype", "Quantity", "Unit", "Computed CO2e (tonnes)"])
        for inp in inputs:
            writer.writerow([
                inp.get("category"),
                inp.get("subtype"),
                inp.get("quantity"),
                inp.get("unit"),
                inp.get("computed_co2e", 0.0)
            ])
        writer.writerow([])

        writer.writerow(["RECOMMENDED CIRCULAR INTERVENTIONS"])
        writer.writerow(["Intervention Name", "Category", "Score", "Score Source", "Cost Range ($)", "CO2 Reduction Range (%)", "Applicable Leak Point"])
        for r in recs:
            intv = r.get("intervention", {})
            c_range = r.get("estimated_cost_range", [0, 0])
            r_range = r.get("estimated_co2_reduction_range", [0, 0])
            writer.writerow([
                intv.get("name"),
                intv.get("category"),
                r.get("score"),
                r.get("score_source"),
                f"${c_range[0]} - ${c_range[1]}",
                f"{r_range[0]}% - {r_range[1]}%",
                r.get("applicable_leak_point")
            ])

        csv_bytes = output.getvalue().encode("utf-8")
        filename = f"assessment_report_{assessment_id}.csv"
        return csv_bytes, filename, "text/csv"

    # Default: PDF format using ReportLab
    pdf_buffer = io.BytesIO()
    doc = SimpleDocTemplate(pdf_buffer, pagesize=letter, rightMargin=36, leftMargin=36, topMargin=36, bottomMargin=36)
    styles = getSampleStyleSheet()

    title_style = ParagraphStyle(
        'DocTitle',
        parent=styles['Heading1'],
        fontName='Helvetica-Bold',
        fontSize=20,
        textColor=colors.HexColor('#0F172A'),
        spaceAfter=6
    )
    subtitle_style = ParagraphStyle(
        'DocSubTitle',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=10,
        textColor=colors.HexColor('#64748B'),
        spaceAfter=15
    )
    heading2_style = ParagraphStyle(
        'Heading2',
        parent=styles['Heading2'],
        fontName='Helvetica-Bold',
        fontSize=14,
        textColor=colors.HexColor('#1E293B'),
        spaceBefore=12,
        spaceAfter=8
    )

    story = []
    story.append(Paragraph("Industrial Emission Leak-Point & Circular Action Report", title_style))
    story.append(Paragraph(f"Facility: <b>{facility_name}</b> | Industry: <b>{industry.capitalize()}</b> | Date: {assessment.get('created_at', '2026-09-12')}", subtitle_style))
    story.append(HRFlowable(width="100%", thickness=1.5, color=colors.HexColor('#2563EB'), spaceAfter=15))

    # Summary KPI table
    kpi_data = [
        ["Total CO2e Footprint", "Status", "Total Process Inputs", "Recommendations"],
        [f"{total_co2e:.2f} t CO2e", assessment.get("status", "complete").upper(), str(len(inputs)), str(len(recs))]
    ]
    kpi_table = Table(kpi_data, colWidths=[130, 130, 130, 130])
    kpi_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#F1F5F9')),
        ('TEXTCOLOR', (0,0), (-1,0), colors.HexColor('#334155')),
        ('FONTNAME', (0,0), (-1,0), 'Helvetica-Bold'),
        ('FONTSIZE', (0,0), (-1,-1), 10),
        ('ALIGN', (0,0), (-1,-1), 'CENTER'),
        ('BOTTOMPADDING', (0,0), (-1,-1), 8),
        ('TOPPADDING', (0,0), (-1,-1), 8),
        ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor('#CBD5E1')),
    ]))
    story.append(kpi_table)
    story.append(Spacer(1, 15))

    # Process Inputs Table
    story.append(Paragraph("1. Process Activity & Emission Breakdown (Calculated)", heading2_style))
    input_table_data = [["Category", "Subtype / Material", "Quantity", "Unit", "Computed CO2e (t)"]]
    for inp in inputs:
        input_table_data.append([
            inp.get("category", "").capitalize(),
            inp.get("subtype", "").replace("_", " ").title(),
            f"{float(inp.get('quantity', 0)):,.2f}",
            inp.get("unit", ""),
            f"{float(inp.get('computed_co2e', 0.0)):.4f}"
        ])
    
    input_table = Table(input_table_data, colWidths=[90, 160, 90, 80, 100])
    input_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#1E293B')),
        ('TEXTCOLOR', (0,0), (-1,0), colors.white),
        ('FONTNAME', (0,0), (-1,0), 'Helvetica-Bold'),
        ('FONTSIZE', (0,0), (-1,-1), 9),
        ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor('#E2E8F0')),
        ('TOPPADDING', (0,0), (-1,-1), 6),
        ('BOTTOMPADDING', (0,0), (-1,-1), 6),
    ]))
    story.append(input_table)
    story.append(Spacer(1, 15))

    # Recommendations Table
    story.append(Paragraph("2. Ranked Circular Economy Interventions (Scored & Costed)", heading2_style))
    rec_table_data = [["Rank / Score", "Intervention Name", "Est. Investment", "CO2 Cut (%)", "Source"]]
    for r in recs[:10]:
        intv = r.get("intervention", {})
        c_range = r.get("estimated_cost_range", [0, 0])
        r_range = r.get("estimated_co2_reduction_range", [0, 0])
        rec_table_data.append([
            f"{r.get('score')}/100",
            intv.get("name", ""),
            f"${c_range[0]:,} - ${c_range[1]:,}",
            f"{r_range[0]}% - {r_range[1]}%",
            r.get("score_source", "ml").upper()
        ])
    
    rec_table = Table(rec_table_data, colWidths=[80, 190, 110, 80, 60])
    rec_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#0F766E')),
        ('TEXTCOLOR', (0,0), (-1,0), colors.white),
        ('FONTNAME', (0,0), (-1,0), 'Helvetica-Bold'),
        ('FONTSIZE', (0,0), (-1,-1), 9),
        ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor('#E2E8F0')),
        ('TOPPADDING', (0,0), (-1,-1), 6),
        ('BOTTOMPADDING', (0,0), (-1,-1), 6),
    ]))
    story.append(rec_table)

    doc.build(story)
    pdf_bytes = pdf_buffer.getvalue()
    filename = f"assessment_report_{assessment_id}.pdf"
    return pdf_bytes, filename, "application/pdf"
