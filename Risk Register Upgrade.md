
full_ssd = """
# MINRISK — SYSTEM SPECIFICATION DOCUMENT (SSD)
### (Style 3 — Hybrid SME + Technical)

## 1. PRODUCT OVERVIEW  
MinRisk is an enterprise risk-management application designed to capture, analyze, mitigate, and monitor risks using a cause-driven, impact-aware model. The system uses structured ERM logic to derive refined risk statements, suggest KRIs/KCIs, and recommend controls with DIME scoring to calculate residual risk.

MinRisk assists organizations in moving from “risk descriptions” to risk intelligence by enabling risk decomposition into Event → Root Cause → Impact.

## 2. CORE CONCEPTS & DEFINITIONS

### EVENT  
The observable failure / breakdown / situation / uncertainty.  
*UI footnote: “Describe what is happening or could happen — not why or with what consequences.”*

### ROOT CAUSE  
The underlying driver that makes the event likely to occur.  
*Only one root cause can be selected per risk instance.*

### IMPACT  
The primary material consequence if the event occurs.  
*Only one impact can be selected per risk instance.*

### RISK INSTANCE  
A single combination of:  
`Event + Root Cause + Impact`

If more than one Root Cause is relevant, each forms a separate risk.  
If more than one Impact is relevant, each forms a separate risk.

## 3. RISK RELATIONSHIP MODEL

### Valid mappings:
ONE Event + ONE Root Cause + ONE Impact = ONE Risk

### Not allowed:
ONE Risk → MULTIPLE Root Causes  
ONE Risk → MULTIPLE Impacts

**Reasoning:**  
controls, KRIs, owners, remediation steps differ for each driver.

## 4. SYSTEM CATEGORIZATION LOGIC  (Option B)
Users DO NOT select risk category manually.

Instead, MinRisk will:
1. Analyze the EVENT text  
2. Analyze selected ROOT CAUSE  
3. Analyze selected IMPACT  
4. Apply semantic mapping  
5. Auto-assign Risk Category and Sub-category  

Example:  
User writes: “Unauthorized access attempt detected in trading server logs.”  
Category → Cybersecurity  
Subcategory → Intrusion / Access Control Failure  

## 5. INTELLIGENT INPUT FIELDS

### Event Input Box  
- Natural language text  
- Parsed with keyword extraction  
- Used for auto-classification  

### Root Cause Box  
- Smart autocomplete  
- Draws from the Root Cause Register  
- User can propose new causes (subject to Admin approval)  
- UI footnote: “Select the underlying driver — not the event itself.”

### Impact Box  
- Smart autocomplete  
- Draws from the Impact Register  
- UI footnote: “Select the consequence — not the cause.”

## 6. CONTROL MODEL (DIME + Control Type)

Controls are tagged:
- Likelihood-reducing  
OR  
- Impact-reducing  

DIME scoring determines control strength:
- Design  
- Implementation  
- Monitoring  
- Evaluation  

Residual risk is calculated differently depending on whether controls affect likelihood or impact.

## 7. RISK MONITORING MODEL (KRI/KCI)

KRIs (for Root Causes)  
KCIs (for Impacts)

Example:  
Root cause: Poor capacity planning  
KRIs: server utilization, API failure rates, concurrent user pressure  
Impact: Customer dissatisfaction  
KCIs: complaints/10k users, social sentiment, SLA breaches  

## 8. ADMIN VS USER PERMISSION MODEL

### USER Can:
- Create risks  
- Select existing root causes & impacts  
- Suggest new ones  
- Suggest KRIs/KCIs  
- Suggest controls  

### ADMIN Can:
- Approve or reject new additions  
- Maintain global registers  
- Maintain global KRI & KCI libraries  
- Maintain control library  
- Maintain risk categorization dictionaries  
- Override misclassified risks  

## 9. OUTPUT: REFINED RISK STATEMENT

Generated automatically:

User entered:  
“Mobile banking transactions intermittently fail.”  
Root Cause: Poor capacity planning  
Impact: Customer dissatisfaction  

Refined:  
“Due to poor capacity planning, mobile banking transactions intermittently fail, resulting in customer dissatisfaction and reputational damage.”

## 10. EXAMPLE RISK CREATION PROCESS (UI FLOW)

1. User enters Event  
2. System analyzes  
3. System suggests root causes  
4. User selects one  
5. System suggests impacts  
6. User selects one  
7. System auto-assigns category  
8. System suggests KRIs/KCIs  
9. System suggests controls  
10. User applies DIME scoring  
11. Residual Risk calculated  
12. Stored as a risk instance  

## 11. FILES & EXTERNAL REFERENCES

Referenced as filenames only:

- ROOT_CAUSE_REGISTER.md  
- IMPACT_REGISTER.md  
- MASTER_CONTROL_LIBRARY.md  
- KCI_KRI_LIBRARY.md  
- CONTROL_MAPPING_TABLE.md  

## 12. DESIGN REQUIREMENT SUMMARY

- Multiple risks per event allowed  
- No multi-cause risks  
- No multi-impact risks  
- Controls are typed  
- Full traceability  
- System auto-categorizes  
- Admin controls global libraries  
- AI suggestions  
- Clean one-event-one-cause-one-impact logic  
"""

# update md file
with open('/mnt/data/minrisk_ssd.md','w') as f:
    f.write(full_ssd)

# update docx file
from docx import Document
doc = Document()
for line in full_ssd.split('\n'):
    doc.add_paragraph(line)
doc.save('/mnt/data/minrisk_ssd.docx')

"Full SSD text inserted successfully."

