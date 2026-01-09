# MinRisk Changelog

## [2026-01-08] - Organizational Structure & Enhanced Cleanup

### New Features

#### Division-Department Hierarchy
- **Hierarchical Structure**: Departments can now be assigned to divisions, creating a clear organizational hierarchy
- **Database Tables**: New `divisions` and `departments` tables with proper foreign key relationships
- **Admin UI**: New "Organizational Structure" tab in Risk Configuration for managing divisions and departments
  - Add/edit/delete divisions
  - Add/edit/delete departments
  - Assign departments to divisions
  - View departments grouped by division
- **Cascading Dropdowns**: Risk form now has cascading department selection
  - Select a division first
  - Department dropdown automatically filters to show only departments in that division

#### Enhanced Data Cleanup
- **Taxonomy Reset Option**: New "Also reset Risk Taxonomy" checkbox in Data Cleanup
  - When checked, clears risk categories and subcategories
  - Reseeds with industry-specific default categories
- **Extended Cleanup Scope**: Now also clears:
  - Divisions and Departments
  - Organization libraries (org_root_causes, org_impacts, org_controls, org_kri_kci)
- **Improved Error Handling**: Cleanup now continues on FK constraint errors and reports per-table status

### Bug Fixes

#### Library Generator
- **Fixed**: "Your Current Library" section now correctly queries org-specific tables (`org_*`) instead of global tables (`global_*`)
- This ensures the counts accurately reflect your organization's generated library data

### Technical Details

| Commit | Description |
|--------|-------------|
| `8aae1b3` | Division-Department hierarchy with cascading dropdowns |
| `8d2ae38` | Enhanced data cleanup with taxonomy reset option |
| `f6117c8` | Remove superuser-only session_replication_role |
| `fc27b4e` | Add error handling for FK violations in cleanup |
| `fbeccdb` | Fix Your Current Library to query org tables |

---

## [2026-01-07] - Stakeholder Reports & Library Improvements

### New Features
- **Stakeholder Reports**: CEO Executive Summary, Board Risk Committee Report, Regulatory Compliance Report
- **Library Filtering**: Industry-specific library items filtered by organization's industry type
- **AI Model Standardization**: Switched to Claude Sonnet for consistent AI operations

---

*Previous changelog entries available in git history*
