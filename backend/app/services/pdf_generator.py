from fpdf import FPDF
from datetime import datetime
from typing import List
from app.schemas import InteractionDetail

class ReportPDF(FPDF):
    def header(self):
        self.set_font('Arial', 'B', 15)
        self.cell(0, 10, 'Clinical Drug Interaction Report', 0, 1, 'C')
        self.set_font('Arial', 'I', 10)
        self.cell(0, 10, f'Generated on: {datetime.now().strftime("%Y-%m-%d %H:%M:%S")}', 0, 1, 'C')
        self.ln(10)

    def footer(self):
        self.set_y(-15)
        self.set_font('Arial', 'I', 8)
        self.cell(0, 10, f'Page {self.page_no()}', 0, 0, 'C')

def generate_interaction_pdf(interactions: List[InteractionDetail], risk_score: int, highest_severity: str) -> bytes:
    pdf = ReportPDF()
    pdf.add_page()
    
    pdf.set_font("Arial", "B", 12)
    pdf.cell(0, 10, f"Overall Risk Score: {risk_score}/100", 0, 1)
    pdf.cell(0, 10, f"Highest Severity: {highest_severity if highest_severity else 'None'}", 0, 1)
    pdf.ln(5)

    if not interactions:
        pdf.set_font("Arial", "", 12)
        pdf.cell(0, 10, "No dangerous interactions found.", 0, 1)
    else:
        for i, inter in enumerate(interactions, 1):
            pdf.set_font("Arial", "B", 11)
            # We don't have drug names directly in InteractionDetail, just IDs and class names (if class interaction).
            # If the frontend passes drug names in the request, we could use them. But for now we just show IDs or class names.
            # Usually we'd want to query the DB for the names if only IDs are provided.
            title = f"Interaction {i}: Drug ID {inter.drug1_id} and Drug ID {inter.drug2_id}"
            if inter.is_class_interaction:
                title += f" (Class: {inter.class1_name} + {inter.class2_name})"
            
            pdf.cell(0, 10, title, 0, 1)
            
            pdf.set_font("Arial", "", 10)
            pdf.cell(0, 8, f"Severity: {inter.severity}", 0, 1)
            pdf.multi_cell(0, 8, f"Description: {inter.description or 'No description provided.'}")
            
            if inter.evidence_url:
                pdf.cell(0, 8, f"Evidence: {inter.evidence_url}", 0, 1)
            pdf.ln(5)

    return bytes(pdf.output())
