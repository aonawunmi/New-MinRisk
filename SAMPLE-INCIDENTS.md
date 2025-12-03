# Sample Incidents for Testing

**Copy and paste these into the UI to test the description quality guidance and AI risk mapping features.**

Go to: **Incidents → Incident Management → Report New Incident**

---

## 1. POOR Example - Ransomware

**Title:**
```
Ransomware attack
```

**Type:** Security Incident
**Severity:** HIGH
**Description:**
```
System got hit by ransomware
```

**Financial Impact:** (leave blank)

---

## 2. GOOD Example - Ransomware (Detailed)

**Title:**
```
WannaCry ransomware attack affecting finance department workstations
```

**Type:** Security Incident
**Severity:** HIGH
**Description:**
```
On December 2, 2025 at 9:47 AM, our finance department reported that 12 workstations were encrypted by WannaCry ransomware (CVE-2017-0144). The attack exploited an unpatched SMB vulnerability in Windows 7 systems.

Root Cause: Delayed patch deployment due to compatibility testing with legacy accounting software (SageAccounts v8.2).

Impact:
- 12 finance workstations encrypted and offline
- Q4 financial reporting delayed by 3 business days
- Invoice processing backlog of ₦45 million
- 8 staff members unable to work for 48 hours

Financial Impact: ₦8,500,000 (₦3.2M ransom NOT paid + ₦5.3M recovery costs including forensics, system rebuilds, and overtime)

Immediate Actions Taken:
- Isolated affected systems from network within 15 minutes
- Engaged external cybersecurity firm (CyberGuard Nigeria)
- Restored systems from backup taken 18 hours prior
- Emergency patching of all remaining Windows 7 systems
- Implemented network segmentation between finance and other departments

Technical Details: Hash of ransomware binary: 24d004a104d4d54034dbcffc2a4b19a11f39008a575aa614ea04703480b1022c
```

**Financial Impact:** `8500000`

---

## 3. POOR Example - Data Breach

**Title:**
```
Customer data leaked
```

**Type:** Data Breach
**Severity:** CRITICAL
**Description:**
```
Customer information was exposed online
```

**Financial Impact:** (leave blank)

---

## 4. GOOD Example - Data Breach (Detailed)

**Title:**
```
Unauthorized access to customer database via misconfigured S3 bucket
```

**Type:** Data Breach
**Severity:** CRITICAL
**Description:**
```
On December 1, 2025, a security researcher contacted us via responsible disclosure to report that our AWS S3 bucket "customer-exports-prod" was publicly accessible, exposing 47,823 customer records dating from January 2023 to November 2025.

Root Cause: DevOps engineer set bucket to public during troubleshooting session on Nov 28, 2025 and forgot to revert permissions. No peer review process for infrastructure changes.

Data Exposed:
- Full names, email addresses, phone numbers
- Account numbers and transaction history (last 12 months)
- National ID numbers for KYC records (15,234 customers)
- NO credit card data or passwords exposed (separate encrypted database)

Impact:
- 47,823 customers affected
- Potential regulatory fines from NDPR (Nigeria Data Protection Regulation)
- Reputational damage and customer trust erosion
- Mandatory notification to affected customers and regulators

Financial Impact: ₦125,000,000 (estimated: ₦50M regulatory fines + ₦45M legal fees + ₦30M customer compensation/credit monitoring)

Timeline:
- Nov 28, 2025 10:15 AM: Bucket permissions changed to public
- Dec 1, 2025 2:34 PM: Security researcher discovers exposure
- Dec 1, 2025 3:02 PM: Permissions reverted, bucket secured
- Dec 1, 2025 6:00 PM: Forensic investigation initiated
- Dec 2, 2025 9:00 AM: NDPR notification submitted

Immediate Actions:
- Bucket permissions corrected within 30 minutes of notification
- AWS CloudTrail logs analyzed for access patterns (3 external IPs detected)
- Implemented bucket policies requiring encryption and private ACLs by default
- Mandatory security training scheduled for all DevOps staff
- Engaged external law firm (Udo Udoma & Belo-Osagie) for regulatory compliance
```

**Financial Impact:** `125000000`

---

## 5. POOR Example - Operational Error

**Title:**
```
Payment processing error
```

**Type:** Operational Error
**Severity:** MEDIUM
**Description:**
```
Payments were processed incorrectly
```

**Financial Impact:** (leave blank)

---

## 6. GOOD Example - Operational Error (Detailed)

**Title:**
```
Duplicate payment processing due to database transaction retry logic failure
```

**Type:** Operational Error
**Severity:** HIGH
**Description:**
```
Between 2:15 AM and 4:47 AM on December 3, 2025, our payment processing system incorrectly processed 1,847 duplicate payments totaling ₦234 million due to a race condition in our database transaction retry logic.

Root Cause: Recent deployment (v3.2.1) introduced a bug in PostgreSQL transaction handling where network timeouts triggered automatic retries without checking for existing completed transactions. The issue only manifested under high load conditions (>500 TPS).

Impact:
- 1,847 customers charged twice
- ₦234 million in duplicate charges requiring reversal
- 463 customer complaints within first 6 hours
- Social media backlash (#DoubleCharge trending on Twitter Nigeria)
- Banking partner (Guaranty Trust Bank) placed processing on hold for 4 hours

Financial Impact: ₦18,750,000 (reversal processing fees ₦127 per transaction + ₦12M in customer compensation + ₦6.5M in operational costs for manual reconciliation)

Technical Details:
- Application: PaymentProcessor v3.2.1 (commit hash: 7f3d891)
- Database: PostgreSQL 14.5 (RDS instance: prod-payments-primary)
- Error pattern: "duplicate key value violates unique constraint" appearing in logs 2,156 times
- Load at time: 587 transactions per second (normal: 120-180 TPS)

Immediate Actions:
- Rolled back to v3.2.0 within 15 minutes of detection
- Identified all affected transactions via database query
- Automated reversal scripts executed for 1,847 duplicate charges
- All customers contacted via email and SMS within 8 hours
- ₦5,000 goodwill credit applied to affected accounts

Remediation:
- Enhanced transaction idempotency keys implemented
- Added distributed lock using Redis for payment processing
- Circuit breaker pattern implemented for database retries
- Load testing under high TPS scenarios (up to 1,000 TPS)
- Code review process updated to mandate database transaction testing
```

**Financial Impact:** `18750000`

---

## How to Test

1. **Test POOR descriptions:**
   - Copy examples #1, #3, and #5 (brief ones)
   - Watch the RED and ORANGE warnings appear as you type
   - See character count feedback

2. **Test GOOD descriptions:**
   - Copy examples #2, #4, and #6 (detailed ones)
   - Watch warnings turn BLUE → GREEN
   - Notice the helpful guidance

3. **Edit to improve:**
   - After creating POOR incident, click "Edit"
   - Replace with the GOOD version
   - See the quality improvement feedback

4. **Test AI Risk Mapping:**
   - Go to: Incidents → AI Review (ADMIN)
   - Select a GOOD description incident
   - Click "Run AI Analysis"
   - Review AI suggestions with confidence scores
   - Compare quality vs POOR examples

---

## Expected Results

### Description Quality Alerts

**POOR (<50 chars):**
- 🔴 RED: "Too brief - add more details"

**Brief (50-100 chars):**
- 🟠 ORANGE: "Brief description - consider adding more context"

**Good (100-200 chars):**
- 🔵 BLUE: "Good length - include specific details"

**Excellent (200+ chars):**
- 🟢 GREEN: "Excellent detail - will help AI provide accurate suggestions"

### AI Risk Mapping Results

**Ransomware incident (#2)** should map to:
- Cybersecurity Risk
- Technology Failure Risk
- Business Continuity Risk

**Data Breach incident (#4)** should map to:
- Data Protection/Privacy Risk
- Regulatory Compliance Risk
- Reputational Risk

**Operational Error incident (#6)** should map to:
- Operational Risk
- Transaction Processing Risk
- Customer Service Risk

---

**Notes:**
- All incidents will be in `PENDING_CLASSIFICATION` status initially
- Only ADMIN users can see the AI Review dashboard
- AI analysis may take 5-15 seconds to complete
- Confidence scores show how certain the AI is about each mapping
