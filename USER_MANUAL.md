# MinRisk User Manual

**Version:** 2.0
**Last Updated:** December 2024
**Application:** MinRisk - Enterprise Risk Management Platform

---

## Table of Contents

1. [Introduction](#introduction)
2. [Getting Started](#getting-started)
3. [User Roles](#user-roles)
4. [Dashboard Overview](#dashboard-overview)
5. [Risk Register](#risk-register)
6. [Risk Analytics & Reports](#risk-analytics--reports)
7. [Risk Intelligence](#risk-intelligence)
8. [Period Management](#period-management)
9. [Admin Functions](#admin-functions)
10. [Best Practices](#best-practices)
11. [FAQ](#faq)

---

## Introduction

### What is MinRisk?

MinRisk is an enterprise risk management platform that helps organizations:
- **Identify and track risks** across the organization
- **Assess risk severity** using likelihood and impact scoring
- **Manage controls** to mitigate risks
- **Monitor key risk indicators (KRIs)** in real-time
- **Track historical risk data** across quarters
- **Generate analytics and reports** for stakeholders

### Key Features

✅ **Continuous Risk Management** - Risks maintain their identity across time periods
✅ **Historical Tracking** - View risks as they existed in past quarters
✅ **Residual Risk Calculation** - Automatic calculation based on control effectiveness
✅ **Visual Analytics** - Interactive heatmaps, trends, and comparisons
✅ **AI-Powered Intelligence** - Automated risk alerts from external threat feeds
✅ **Multi-tenant** - Secure data isolation for each organization

---

## Getting Started

### First Login

1. **Access the Application**
   - Navigate to your organization's MinRisk URL
   - Example: `https://minrisk.yourcompany.com`

2. **Login Credentials**
   - Enter your email address
   - Enter your password
   - Click "Sign In"

3. **First-Time Setup** (New Users)
   - You'll be prompted to set your password
   - Choose a strong password (minimum 8 characters)
   - Complete your profile information

### Dashboard Orientation

After logging in, you'll see the **Dashboard** - your home base:

```
┌─────────────────────────────────────────────────┐
│  Risk Dashboard                                  │
├─────────────────────────────────────────────────┤
│  Total Risks: 42  |  Avg Inherent: 12.5         │
│  Extreme: 5       |  High: 12                   │
├─────────────────────────────────────────────────┤
│  [Risk Level Distribution Chart]                │
│  [Risk Status Chart]                            │
└─────────────────────────────────────────────────┘
```

---

## User Roles

### Regular User
**What you can do:**
- ✅ View risks in your division/department
- ✅ View the dashboard and analytics
- ✅ View risk history
- ❌ Cannot add/edit/delete risks
- ❌ Cannot access admin functions

### Risk Manager
**What you can do:**
- ✅ Everything a Regular User can do, PLUS:
- ✅ Add new risks
- ✅ Edit existing risks
- ✅ Add controls and KRIs
- ✅ Update risk assessments
- ❌ Cannot access admin functions

### Admin
**What you can do:**
- ✅ Everything a Risk Manager can do, PLUS:
- ✅ Manage users (approve, assign roles)
- ✅ Configure organization settings
- ✅ Commit quarterly periods
- ✅ Manage risk intelligence
- ✅ Access all admin functions

---

## Dashboard Overview

### Key Metrics Cards

**Total Risks**
- Shows the count of all active risks
- Color: Blue
- Click to view Risk Register

**Avg Inherent Risk**
- Average risk score before controls
- Color: Orange
- Formula: Average of (Likelihood × Impact) for all risks

**Avg Residual Risk**
- Average risk score after controls
- Color: Blue
- Lower is better (shows control effectiveness)

**Control Quality**
- Average DIME score across all controls
- Color: Green
- Shows percentage (0-100%)
- DIME = Design, Implementation, Monitoring, Evaluation

### Charts

**Risk Level Distribution**
- Bar chart showing count by severity:
  - Extreme (Red): Score ≥ 15
  - High (Orange): Score 10-14
  - Medium (Yellow): Score 5-9
  - Low (Green): Score < 5

**Risk Status Distribution**
- Shows risks by status:
  - OPEN: Newly identified
  - MONITORING: Under active monitoring
  - APPROVED: Accepted by management
  - CLOSED: Mitigated or no longer applicable

**Risks by Division/Department**
- Pie chart showing risk distribution
- Helps identify high-risk areas

**Top 10 Risks Table**
- Lists highest inherent risks
- Click any risk to view details

---

## Risk Register

The **Risk Register** is your central repository for all organizational risks.

### Viewing Risks

**Current Period Banner**
```
┌─────────────────────────────────────────────────┐
│ 📅 Current Period: Q4 2024                      │
└─────────────────────────────────────────────────┘
```
- Shows which quarter you're currently working in
- All new risks are created in this period

**Risk Table Columns:**

| Column | Description |
|--------|-------------|
| **Code** | Unique identifier (e.g., OPS-001) |
| **Title** | Brief risk description |
| **Category** | Risk type (Operational, Financial, etc.) |
| **Status** | Current status (OPEN, MONITORING, etc.) |
| **Inherent** | Risk score before controls (L×I) |
| **Residual** | Risk score after controls (L×I) |
| **Level** | EXTREME, HIGH, MEDIUM, LOW |
| **Created** | Date risk was added |

### Adding a New Risk

1. Click **"+ Add Risk"** button
2. Fill in the form:

**Basic Information:**
- **Risk Code**: Auto-generated (e.g., OPS-001)
- **Risk Title**: Clear, concise description
- **Risk Description**: Detailed explanation of the risk
- **Category**: Select from dropdown
  - Operational
  - Strategic
  - Financial
  - Compliance
  - Technology
  - Market
  - Reputational

**Division & Ownership:**
- **Division**: Select organizational division
- **Department**: Select department
- **Owner**: Risk owner (responsible person)

**Inherent Risk Assessment** (Before Controls):
- **Likelihood**: 1-5 scale
  - 1 = Rare
  - 2 = Unlikely
  - 3 = Possible
  - 4 = Likely
  - 5 = Almost Certain

- **Impact**: 1-5 scale
  - 1 = Minimal
  - 2 = Low
  - 3 = Moderate
  - 4 = High
  - 5 = Severe

- **Inherent Score**: Auto-calculated (Likelihood × Impact)

3. Click **"Save Risk"**

### Editing a Risk

1. Click the **Edit** button (✏️) next to any risk
2. Modify any fields
3. Update likelihood/impact if changed
4. Click **"Save Changes"**

**Note:** Changes are tracked in the risk history.

### Adding Controls

Controls are mitigation actions that reduce risk.

1. Open a risk for editing
2. Scroll to **"Controls"** section
3. Click **"+ Add Control"**
4. Fill in control details:
   - **Control Name**: What is being done
   - **Control Description**: How it works
   - **Control Type**:
     - Preventive (stops risk from occurring)
     - Detective (identifies when risk occurs)
     - Corrective (fixes impact after occurrence)
   - **DIME Scores** (0-3 each):
     - **Design**: How well designed? (0=None, 3=Excellent)
     - **Implementation**: How well implemented?
     - **Monitoring**: How well monitored?
     - **Evaluation**: How regularly evaluated?

5. Click **"Save Control"**

**Residual Risk** is automatically recalculated based on control effectiveness.

### Residual Risk Calculation

The system automatically calculates residual risk:

```
Residual Likelihood = Inherent Likelihood - (Control Reduction)
Residual Impact = Inherent Impact - (Control Reduction)

Control Reduction = (Average DIME Score / 100) × Max Reduction Factor
```

**Example:**
- Inherent: Likelihood=4, Impact=5 (Score=20, EXTREME)
- 3 controls with average DIME=75%
- Residual: Likelihood=2, Impact=3 (Score=6, MEDIUM)
- Risk reduced from EXTREME to MEDIUM! ✅

---

## Risk Analytics & Reports

### Advanced Risk Heatmap

**Purpose:** Visualize risk distribution across likelihood and impact.

**Features:**
- **Matrix Size**: 5×5 or 6×6
- **View Toggle**: Show Inherent / Residual risks
- **Filters**: Search, division, department, category, owner, status
- **Period Selector**: View current or historical data
- **Export**: Download as PNG or JPEG

**How to Use:**

1. Navigate to **Analytics → Risk Analysis**
2. Select **Matrix Size** (5×5 or 6×6)
3. Toggle **Show Inherent** / **Show Residual**
4. Apply filters as needed
5. Select **View Period**:
   - **Current (Live Data)**: Real-time risk data
   - **Q3 2024**: Historical snapshot
6. Click cells to see risks in that category
7. Click **Export Heatmap** to download

**Color Coding:**
- 🟥 Red: EXTREME risk (Score ≥ 15)
- 🟧 Orange: HIGH risk (Score 10-14)
- 🟨 Yellow: MEDIUM risk (Score 5-9)
- 🟩 Green: LOW risk (Score < 5)

### Period Comparison

**Purpose:** Compare risk profiles between two quarters.

**How to Use:**

1. Navigate to **Analytics → Period Comparison**
2. Select **Period 1** (earlier)
3. Select **Period 2** (later)
4. Click **"Compare"**

**What You'll See:**
- **Comparison Summary**:
  - Total risk count change
  - Average inherent risk change
  - Average residual risk change
  - Risk reduction percentage

- **Side-by-Side Heatmaps**:
  - Left: Period 1 risks
  - Right: Period 2 risks
  - Color-coded borders show changes

- **Risk Migration Analysis**:
  - Escalated risks (got worse)
  - De-escalated risks (got better)

### Trends

**Purpose:** Track risk metrics over multiple quarters.

**Charts Available:**

1. **Risk Count Trends**
   - Line chart showing total risks, extreme, and high over time

2. **Risk Level Distribution Over Time**
   - Stacked area chart showing LOW/MEDIUM/HIGH/EXTREME

3. **Risk Status Distribution by Period**
   - Bar chart showing IDENTIFIED/UNDER REVIEW/APPROVED/MONITORING/CLOSED

4. **Risk Migration Analysis**
   - Select two periods
   - See which risks changed severity levels

**Summary Cards:**
- Total Risks (with period-over-period change)
- Extreme Risks (with trend indicator)
- High Risks
- Periods Tracked

---

## Risk Intelligence

**Purpose:** Automated monitoring of external threat intelligence to identify relevant risks.

### How It Works

1. **External Events**:
   - Admins add cybersecurity threats, market changes, regulatory updates
   - Can integrate RSS feeds for automation

2. **AI Analysis**:
   - Claude AI analyzes each event
   - Matches events to your existing risks
   - Assigns confidence score (0-100%)

3. **Alerts Generated**:
   - High-confidence matches create alerts
   - Shows suggested controls
   - Provides impact assessment

### Viewing Alerts

1. Navigate to **Risk Intelligence** tab
2. See list of alerts:
   - **Pending**: Awaiting review
   - **Accepted**: Applied to risks
   - **Rejected**: Dismissed
   - **Archived**: Historical

3. For each alert:
   - View matched risk
   - Read AI reasoning
   - See suggested controls
   - View impact assessment

### Acting on Alerts

**Accept Alert:**
1. Click **"Accept"**
2. Confirm you want to apply changes
3. Risk is automatically updated:
   - Likelihood/impact may increase
   - Treatment log entry created
   - Alert marked as "Accepted"

**Reject Alert:**
1. Click **"Reject"**
2. Provide reason (optional)
3. Alert marked as "Rejected"

**Undo Applied Alert:**
1. Click **"Undo"** on accepted alert
2. Risk reverts to previous state
3. Treatment log entry created

---

## Period Management

### Understanding Periods

MinRisk uses **quarterly periods** (Q1, Q2, Q3, Q4) to organize risk data:

- **Current Period**: The quarter you're currently working in
- **Historical Periods**: Past quarters with committed snapshots
- **Continuous Model**: Risks maintain same ID across all periods (never cloned/deleted)

### Period Lifecycle

```
Q1 2024 (Current) → Commit Period → Q1 2024 (Historical)
                                   ↓
                         Q2 2024 becomes Current
```

### Viewing Period History

1. Navigate to **Analytics → Risk History**
2. Select a period from dropdown
3. View risks as they existed in that quarter
4. See summary statistics:
   - Total risks
   - Average inherent/residual scores
   - Risk reduction percentage

**Note:** Historical data is **read-only** (immutable).

---

## Admin Functions

### User Management

**Accessing User Management:**
1. Click **Admin Panel** (admin users only)
2. Select **User Management** tab

**Approving New Users:**
1. See list of pending users
2. Review user details
3. Click **"Approve"**
4. Assign role:
   - User (view only)
   - Risk Manager (can edit)
   - Admin (full access)

**Changing User Roles:**
1. Find user in list
2. Select new role from dropdown
3. Click **"Update Role"**

**Rejecting Users:**
1. Click **"Reject"** next to user
2. User is removed from pending list

### Period Commit (Quarter Close)

**⚠️ Important:** This action creates immutable historical snapshots.

**When to Commit:**
- At the end of each quarter
- After completing risk assessments
- Before moving to next quarter

**How to Commit:**

1. Navigate to **Admin Panel → Period Management**
2. Review current period (e.g., Q4 2024)
3. Add **Notes** (optional):
   - "Q4 2024 - Year-end risk review completed"
   - "10 new risks identified, 3 closed"
4. Click **"Commit Q4 2024"**
5. Confirm in dialog:
   - "This will snapshot all current risks"
   - "Risks will remain editable (continuous model)"
   - "Active period will advance to Q1 2025"
6. Click **"Confirm Commit"**

**What Happens:**
- ✅ All current risks are snapshotted to `risk_history`
- ✅ Residual risk is calculated and saved
- ✅ Period commit audit log entry created
- ✅ Active period advances to next quarter
- ✅ **Risks remain in Risk Register** (not deleted!)

**After Commit:**
- You can now work in Q1 2025
- Q4 2024 data is historical (read-only)
- You can compare Q4 2024 to Q1 2025
- You can view Q4 2024 in Risk History

### Organization Settings

1. Navigate to **Admin Panel → Organization Settings**
2. Configure:
   - **Matrix Size**: 5×5 or 6×6
   - **Risk Appetite Statement**: Organization's risk tolerance
   - **Risk Tolerance Level**: Acceptable risk threshold
   - **Active Period**: Current quarter (auto-managed)

---

## Best Practices

### Risk Identification

✅ **DO:**
- Use clear, specific risk titles
- Include root cause in description
- Assign appropriate owner
- Select accurate category

❌ **DON'T:**
- Create duplicate risks
- Use vague descriptions like "Bad things might happen"
- Leave owner unassigned
- Ignore related controls

### Risk Assessment

✅ **DO:**
- Base likelihood on historical data or expert judgment
- Consider worst-case impact
- Reassess quarterly
- Document reasoning

❌ **DON'T:**
- Guess randomly
- Always use "Medium" to avoid attention
- Overestimate to get management focus
- Ignore feedback from stakeholders

### Control Management

✅ **DO:**
- Link controls to risks
- Update DIME scores regularly
- Document control evidence
- Monitor control effectiveness

❌ **DON'T:**
- Add controls just to lower scores
- Claim 100% effectiveness without proof
- Forget to update when controls change
- Ignore detective and corrective controls

### Period Management

✅ **DO:**
- Commit periods at regular intervals
- Add meaningful notes to commits
- Review all risks before committing
- Verify residual calculations

❌ **DON'T:**
- Commit periods too frequently (stick to quarters)
- Skip period commits for long periods
- Forget to communicate commit to team
- Commit without reviewing data quality

---

## FAQ

### General Questions

**Q: Can I delete a risk?**
A: Risks are not deleted, they are closed. Set status to "CLOSED" and they'll be excluded from active reports but remain in history.

**Q: Can I edit historical risk data?**
A: No. Historical snapshots are immutable. You can only edit current period risks.

**Q: What happens if I change a risk's inherent score?**
A: The residual score is automatically recalculated based on your controls.

**Q: Can I restore a previous version of a risk?**
A: Not directly, but you can view historical data and manually copy values if needed.

### Risk Assessment

**Q: What's the difference between Inherent and Residual risk?**
A:
- **Inherent**: Risk assuming NO controls exist
- **Residual**: Risk AFTER controls are applied
- Formula: Residual = Inherent - (Control Effectiveness)

**Q: How many controls should a risk have?**
A: It depends on the risk severity:
- EXTREME/HIGH: 3-5 controls recommended
- MEDIUM: 2-3 controls
- LOW: 1-2 controls

**Q: What is DIME scoring?**
A: DIME assesses control effectiveness across four dimensions:
- **D**esign: Is the control well-designed?
- **I**mplementation: Is it properly implemented?
- **M**onitoring: Is it actively monitored?
- **E**valuation: Is it regularly evaluated?

Each scored 0-3, average determines control strength.

### Period Management

**Q: What happens to risks when I commit a period?**
A: A snapshot is created in risk_history, but the risks remain in the Risk Register for continued editing.

**Q: Can I undo a period commit?**
A: No. Period commits are permanent. This ensures data integrity.

**Q: How do I compare two quarters?**
A: Use Analytics → Period Comparison, select both periods, and click Compare.

**Q: Can I work in multiple periods at once?**
A: No. Only one period is "active" at a time. Historical periods are read-only.

### Technical Issues

**Q: The app is running slowly. What should I do?**
A: Try:
1. Refresh your browser
2. Clear browser cache
3. Check your internet connection
4. Contact your admin if issue persists

**Q: I can't see the Admin Panel tab.**
A: Only users with Admin role can see this tab. Contact your organization's admin.

**Q: Risk Intelligence alerts aren't appearing.**
A: Check:
1. Are you an admin? (only admins see this feature)
2. Have events been added?
3. Contact support if issue persists

**Q: Export isn't working.**
A: Ensure pop-ups are not blocked by your browser. Check browser settings.

---

## Need Help?

### Contact Support

**Email:** support@minrisk.com
**Response Time:** Within 24 hours

### Video Tutorials

Visit our YouTube channel for video walkthroughs:
- Getting Started with MinRisk (10 min)
- Risk Assessment Best Practices (15 min)
- Period Management Explained (8 min)
- Using Analytics & Reports (12 min)

### Release Notes

Check the **Release Notes** section in the app for:
- New features
- Bug fixes
- Performance improvements
- Breaking changes

---

**Document Version:** 2.0
**Last Updated:** December 2024
**Next Review:** March 2025

**Feedback:** Have suggestions for this manual? Email docs@minrisk.com
