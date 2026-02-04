-- ============================================================================
-- MinRisk Phase 1a: PCI Templates Seed Data
-- Date: 2026-02-03
-- Description: Seeds the 16 PCI templates and their 160 secondary controls
-- ============================================================================

BEGIN;

-- ============================================================================
-- PCI-01: Activity Prohibition / Exclusion Rule
-- ============================================================================
INSERT INTO pci_templates (id, name, category, objective_default, purpose, parameters_schema) VALUES
('PCI-01', 'Activity Prohibition / Exclusion Rule', 'Exposure & Activity Constraints', 'likelihood',
 'Prevent risk by disallowing a defined activity/exposure.',
 '{"required": ["prohibited_activity", "scope_boundary", "enforcement_mechanism", "owner_role"], "optional": ["exceptions", "exception_authority"]}'
);

INSERT INTO secondary_control_templates (pci_template_id, code, dimension, criticality, prompt_text) VALUES
('PCI-01', 'D1', 'D', 'critical', 'Prohibition aligns to the risk driver(s) and response intent'),
('PCI-01', 'D2', 'D', 'important', 'Scope, boundaries, and permitted exceptions are explicitly defined'),
('PCI-01', 'I1', 'I', 'critical', 'Prohibition is enforced (system/process prevents execution)'),
('PCI-01', 'I2', 'I', 'important', 'Exception approval workflow is configured and restricted'),
('PCI-01', 'I3', 'I', 'important', 'Training/communication completed for impacted users'),
('PCI-01', 'M1', 'M', 'critical', 'Violations are detected and logged (alerts/reports)'),
('PCI-01', 'M2', 'M', 'important', 'Exceptions are periodically reviewed and validated'),
('PCI-01', 'M3', 'M', 'optional', 'Periodic relevance review occurs (context/risk changes)'),
('PCI-01', 'E1', 'E', 'critical', 'Violation trend is tracked/attested and drives corrective action'),
('PCI-01', 'E2', 'E', 'important', 'Evidence-on-demand readiness confirmed (can produce proof on request)');

-- ============================================================================
-- PCI-02: Exposure / Concentration Constraint
-- ============================================================================
INSERT INTO pci_templates (id, name, category, objective_default, purpose, parameters_schema) VALUES
('PCI-02', 'Exposure / Concentration Constraint', 'Exposure & Activity Constraints', 'both',
 'Cap exposure to reduce likelihood and/or impact of adverse outcomes.',
 '{"required": ["exposure_metric", "limit_value", "measurement_method", "frequency", "breach_action", "owner_role"], "optional": []}'
);

INSERT INTO secondary_control_templates (pci_template_id, code, dimension, criticality, prompt_text) VALUES
('PCI-02', 'D1', 'D', 'critical', 'Limit metric and method are fit-for-purpose and measurable'),
('PCI-02', 'D2', 'D', 'important', 'Boundaries/aggregation rules (what counts) are explicitly defined'),
('PCI-02', 'I1', 'I', 'critical', 'Limits are enforced in workflow/system (not advisory)'),
('PCI-02', 'I2', 'I', 'important', 'Breach actions are defined (block/escalate/remediate)'),
('PCI-02', 'I3', 'I', 'important', 'Data inputs for measurement are available and reliable'),
('PCI-02', 'M1', 'M', 'critical', 'Exposure and headroom are monitored at required frequency'),
('PCI-02', 'M2', 'M', 'important', 'Breaches are tracked to closure with escalation where needed'),
('PCI-02', 'M3', 'M', 'optional', 'Limit changes are governed (approval + audit trail)'),
('PCI-02', 'E1', 'E', 'critical', 'Breach frequency/trend is tracked/attested and drives action'),
('PCI-02', 'E2', 'E', 'important', 'Evidence-on-demand readiness confirmed');

-- ============================================================================
-- PCI-03: Role-Based Access Control
-- ============================================================================
INSERT INTO pci_templates (id, name, category, objective_default, purpose, parameters_schema) VALUES
('PCI-03', 'Role-Based Access Control', 'Authority & Access Management', 'likelihood',
 'Restrict actions to authorized roles to prevent unauthorized or erroneous activity.',
 '{"required": ["protected_actions", "allowed_roles", "least_privilege_approach", "grant_revoke_workflow", "owner_role"], "optional": []}'
);

INSERT INTO secondary_control_templates (pci_template_id, code, dimension, criticality, prompt_text) VALUES
('PCI-03', 'D1', 'D', 'critical', 'Least-privilege role design exists for in-scope actions'),
('PCI-03', 'D2', 'D', 'important', 'Access request/approval criteria and responsibilities are defined'),
('PCI-03', 'I1', 'I', 'critical', 'Access controls are technically enforced (permissions active)'),
('PCI-03', 'I2', 'I', 'important', 'Joiner-Mover-Leaver process exists and is applied'),
('PCI-03', 'I3', 'I', 'important', 'Elevated permissions require stronger constraints (where applicable)'),
('PCI-03', 'M1', 'M', 'critical', 'Periodic access reviews are performed and documented'),
('PCI-03', 'M2', 'M', 'important', 'Access changes are logged and reviewed'),
('PCI-03', 'M3', 'M', 'optional', 'Role conflict checks (segregation conflicts) are performed'),
('PCI-03', 'E1', 'E', 'critical', 'Unauthorized access events/attempts are tracked/attested and acted upon'),
('PCI-03', 'E2', 'E', 'important', 'Evidence-on-demand readiness confirmed');

-- ============================================================================
-- PCI-04: Privileged Access Control
-- ============================================================================
INSERT INTO pci_templates (id, name, category, objective_default, purpose, parameters_schema) VALUES
('PCI-04', 'Privileged Access Control', 'Authority & Access Management', 'likelihood',
 'Extra controls for admin/superuser capabilities that can cause outsized harm.',
 '{"required": ["privileged_functions", "eligibility", "approval_rules", "time_bounded_access", "owner_role"], "optional": []}'
);

INSERT INTO secondary_control_templates (pci_template_id, code, dimension, criticality, prompt_text) VALUES
('PCI-04', 'D1', 'D', 'critical', 'Privileged activities are defined and minimized to necessity'),
('PCI-04', 'D2', 'D', 'important', 'Approval criteria and conditions for privileged access are defined'),
('PCI-04', 'I1', 'I', 'critical', 'Privileged access is controlled/enforced (not informal)'),
('PCI-04', 'I2', 'I', 'important', 'Time-bound access / session controls are implemented where applicable'),
('PCI-04', 'I3', 'I', 'important', 'Emergency ("break-glass") access is governed and traceable'),
('PCI-04', 'M1', 'M', 'critical', 'Privileged activity is logged and monitored'),
('PCI-04', 'M2', 'M', 'important', 'Periodic review of privileged accounts/rights is performed'),
('PCI-04', 'M3', 'M', 'optional', 'Independent review of privileged activity logs occurs periodically'),
('PCI-04', 'E1', 'E', 'critical', 'Privileged misuse incidents are tracked/attested and reduced'),
('PCI-04', 'E2', 'E', 'important', 'Evidence-on-demand readiness confirmed');

-- ============================================================================
-- PCI-05: Maker-Checker Approval
-- ============================================================================
INSERT INTO pci_templates (id, name, category, objective_default, purpose, parameters_schema) VALUES
('PCI-05', 'Maker-Checker Approval', 'Segregation & Dual Control', 'likelihood',
 'Independent review before execution to reduce error/fraud.',
 '{"required": ["actions_covered", "approver_rules", "rejection_flow", "override_rules", "owner_role"], "optional": []}'
);

INSERT INTO secondary_control_templates (pci_template_id, code, dimension, criticality, prompt_text) VALUES
('PCI-05', 'D1', 'D', 'critical', 'Maker/checker independence rules prevent self-approval'),
('PCI-05', 'D2', 'D', 'important', 'Approval criteria and required checks are explicitly defined'),
('PCI-05', 'I1', 'I', 'critical', 'Workflow enforces separation of initiation and approval'),
('PCI-05', 'I2', 'I', 'important', 'Approver eligibility and delegation rules are controlled'),
('PCI-05', 'I3', 'I', 'important', 'Overrides are restricted, justified, and logged'),
('PCI-05', 'M1', 'M', 'critical', 'Approval activity is monitored for anomalies and patterns'),
('PCI-05', 'M2', 'M', 'important', 'Override frequency is reviewed and escalated when needed'),
('PCI-05', 'M3', 'M', 'optional', 'Sampling review of approvals for quality/consistency is performed'),
('PCI-05', 'E1', 'E', 'critical', 'Post-approval leakage (errors/incidents) is tracked/attested and reduced'),
('PCI-05', 'E2', 'E', 'important', 'Evidence-on-demand readiness confirmed');

-- ============================================================================
-- PCI-06: Dual Authorization
-- ============================================================================
INSERT INTO pci_templates (id, name, category, objective_default, purpose, parameters_schema) VALUES
('PCI-06', 'Dual Authorization', 'Segregation & Dual Control', 'likelihood',
 'Two approvals required for high-impact actions.',
 '{"required": ["actions_requiring_dual_auth", "approver_pool", "independence_rules", "owner_role"], "optional": []}'
);

INSERT INTO secondary_control_templates (pci_template_id, code, dimension, criticality, prompt_text) VALUES
('PCI-06', 'D1', 'D', 'critical', 'High-impact actions requiring dual authorization are clearly defined'),
('PCI-06', 'D2', 'D', 'important', 'Independence requirements between approvers are defined'),
('PCI-06', 'I1', 'I', 'critical', 'Dual authorization is enforced (cannot proceed with one)'),
('PCI-06', 'I2', 'I', 'important', 'Approver eligibility is controlled and periodically refreshed'),
('PCI-06', 'I3', 'I', 'important', 'Delegation/substitution is governed with audit trail'),
('PCI-06', 'M1', 'M', 'critical', 'Dual-auth usage and exceptions are monitored'),
('PCI-06', 'M2', 'M', 'important', 'Exception cases are reviewed and escalated where needed'),
('PCI-06', 'M3', 'M', 'optional', 'Periodic review of dual-auth scope remains appropriate'),
('PCI-06', 'E1', 'E', 'critical', 'High-impact errors/incidents reduce or are contained (tracked/attested)'),
('PCI-06', 'E2', 'E', 'important', 'Evidence-on-demand readiness confirmed');

-- ============================================================================
-- PCI-07: Pre-Action Threshold Gate
-- ============================================================================
INSERT INTO pci_templates (id, name, category, objective_default, purpose, parameters_schema) VALUES
('PCI-07', 'Pre-Action Threshold Gate', 'Rules, Thresholds & Limits Enforcement', 'likelihood',
 'Prevent execution when thresholds exceeded or route to escalation.',
 '{"required": ["thresholds", "measurement_logic", "escalation_path", "change_governance", "owner_role"], "optional": []}'
);

INSERT INTO secondary_control_templates (pci_template_id, code, dimension, criticality, prompt_text) VALUES
('PCI-07', 'D1', 'D', 'critical', 'Thresholds align to risk tolerance/criteria and are justified'),
('PCI-07', 'D2', 'D', 'important', 'Measurement logic (inputs + calculation + boundaries) is defined'),
('PCI-07', 'I1', 'I', 'critical', 'Gate blocks/escalates as specified (no bypass except governed)'),
('PCI-07', 'I2', 'I', 'important', 'Threshold changes require approval and are audit-logged'),
('PCI-07', 'I3', 'I', 'important', 'Data inputs are timely and reliable for gate operation'),
('PCI-07', 'M1', 'M', 'critical', 'Breach events are logged and monitored'),
('PCI-07', 'M2', 'M', 'important', 'Escalations are tracked to resolution/decision'),
('PCI-07', 'M3', 'M', 'optional', 'Periodic threshold review occurs for relevance and calibration'),
('PCI-07', 'E1', 'E', 'critical', 'Prevention effectiveness is tracked/attested (breaches avoided/contained)'),
('PCI-07', 'E2', 'E', 'important', 'Evidence-on-demand readiness confirmed');

-- ============================================================================
-- PCI-08: Post-Action Breach Detection + Escalation Workflow
-- ============================================================================
INSERT INTO pci_templates (id, name, category, objective_default, purpose, parameters_schema) VALUES
('PCI-08', 'Post-Action Breach Detection + Escalation Workflow', 'Rules, Thresholds & Limits Enforcement', 'both',
 'Detect breaches after execution and drive remediation/escalation.',
 '{"required": ["breach_definitions", "severity_tiers", "workflow", "slas", "owner_role"], "optional": []}'
);

INSERT INTO secondary_control_templates (pci_template_id, code, dimension, criticality, prompt_text) VALUES
('PCI-08', 'D1', 'D', 'critical', 'Breach definition and severity classification are clear and measurable'),
('PCI-08', 'D2', 'D', 'important', 'Escalation and remediation workflow is clearly designed'),
('PCI-08', 'I1', 'I', 'critical', 'Detection runs as scheduled/event-driven and captures breaches'),
('PCI-08', 'I2', 'I', 'important', 'Escalation routes and ownership are configured'),
('PCI-08', 'I3', 'I', 'important', 'Remediation actions are defined with timelines and accountability'),
('PCI-08', 'M1', 'M', 'critical', 'Breach aging/backlog is monitored; overdue escalated'),
('PCI-08', 'M2', 'M', 'important', 'Closure effectiveness and recurrence are reviewed'),
('PCI-08', 'M3', 'M', 'optional', 'Root cause is captured and feeds improvement actions'),
('PCI-08', 'E1', 'E', 'critical', 'Breach recurrence reduces or response time improves (tracked/attested)'),
('PCI-08', 'E2', 'E', 'important', 'Evidence-on-demand readiness confirmed');

-- ============================================================================
-- PCI-09: Input / Transaction Validation Ruleset
-- ============================================================================
INSERT INTO pci_templates (id, name, category, objective_default, purpose, parameters_schema) VALUES
('PCI-09', 'Input / Transaction Validation Ruleset', 'Input & Transaction Validation', 'likelihood',
 'Prevent invalid data/transactions at point of entry.',
 '{"required": ["ruleset", "allowed_overrides", "reject_rework_path", "owner_role"], "optional": []}'
);

INSERT INTO secondary_control_templates (pci_template_id, code, dimension, criticality, prompt_text) VALUES
('PCI-09', 'D1', 'D', 'critical', 'Validation rules cover known error modes and required fields'),
('PCI-09', 'D2', 'D', 'important', 'Ruleset governance (ownership/change approval) is defined'),
('PCI-09', 'I1', 'I', 'critical', 'Validation is enforced before acceptance/execution'),
('PCI-09', 'I2', 'I', 'important', 'Overrides are constrained, justified, and logged'),
('PCI-09', 'I3', 'I', 'important', 'Reject/rework process exists and is understood by users'),
('PCI-09', 'M1', 'M', 'critical', 'Validation failure rates are monitored and acted upon'),
('PCI-09', 'M2', 'M', 'important', 'False positives/negatives are reviewed and rules tuned'),
('PCI-09', 'M3', 'M', 'optional', 'Periodic review updates rules for new issues and changes'),
('PCI-09', 'E1', 'E', 'critical', 'Downstream error/incidents from invalid inputs reduce (tracked/attested)'),
('PCI-09', 'E2', 'E', 'important', 'Evidence-on-demand readiness confirmed');

-- ============================================================================
-- PCI-10: Reference / Master Data Change Control
-- ============================================================================
INSERT INTO pci_templates (id, name, category, objective_default, purpose, parameters_schema) VALUES
('PCI-10', 'Reference / Master Data Change Control', 'Input & Transaction Validation', 'likelihood',
 'Prevent incorrect reference/master data updates causing systemic errors.',
 '{"required": ["critical_data_elements", "approval_workflow", "versioning", "owner_role"], "optional": []}'
);

INSERT INTO secondary_control_templates (pci_template_id, code, dimension, criticality, prompt_text) VALUES
('PCI-10', 'D1', 'D', 'critical', 'Critical data elements and acceptable ranges/standards are defined'),
('PCI-10', 'D2', 'D', 'important', 'Change approval criteria and segregation requirements are defined'),
('PCI-10', 'I1', 'I', 'critical', 'Change workflow is enforced (no informal change path)'),
('PCI-10', 'I2', 'I', 'important', 'Versioning/history exists for changes'),
('PCI-10', 'I3', 'I', 'important', 'Access to change master data is restricted to authorized roles'),
('PCI-10', 'M1', 'M', 'critical', 'Changes are reviewed periodically for appropriateness'),
('PCI-10', 'M2', 'M', 'important', 'Anomalous/high-risk changes are flagged and investigated'),
('PCI-10', 'M3', 'M', 'optional', 'Data quality checks/metrics are monitored'),
('PCI-10', 'E1', 'E', 'critical', 'Incidents attributable to master data reduce (tracked/attested)'),
('PCI-10', 'E2', 'E', 'important', 'Evidence-on-demand readiness confirmed');

-- ============================================================================
-- PCI-11: Independent Verification / Reconciliation
-- ============================================================================
INSERT INTO pci_templates (id, name, category, objective_default, purpose, parameters_schema) VALUES
('PCI-11', 'Independent Verification / Reconciliation', 'Independent Verification & Reconciliation', 'likelihood',
 'Compare sources, identify breaks, resolve with workflow.',
 '{"required": ["sources", "frequency", "matching_rules", "sla", "owner_role"], "optional": []}'
);

INSERT INTO secondary_control_templates (pci_template_id, code, dimension, criticality, prompt_text) VALUES
('PCI-11', 'D1', 'D', 'critical', 'Sources-of-truth and reconciliation scope are explicitly defined'),
('PCI-11', 'D2', 'D', 'important', 'Matching rules, tolerances, and break definitions are defined'),
('PCI-11', 'I1', 'I', 'critical', 'Reconciliation is performed at required frequency'),
('PCI-11', 'I2', 'I', 'important', 'Break ownership and resolution SLAs exist and are followed'),
('PCI-11', 'I3', 'I', 'important', 'Break classification and root-cause capture exist'),
('PCI-11', 'M1', 'M', 'critical', 'Break aging/backlog is monitored; overdue escalated'),
('PCI-11', 'M2', 'M', 'important', 'Repeat breaks are analyzed and drive systemic fixes'),
('PCI-11', 'M3', 'M', 'optional', 'Sampling/QA review of reconciliation quality occurs'),
('PCI-11', 'E1', 'E', 'critical', 'Residual breaks/impact reduce (tracked/attested)'),
('PCI-11', 'E2', 'E', 'important', 'Evidence-on-demand readiness confirmed');

-- ============================================================================
-- PCI-12: Monitoring & Alerting with Exception Queue
-- ============================================================================
INSERT INTO pci_templates (id, name, category, objective_default, purpose, parameters_schema) VALUES
('PCI-12', 'Monitoring & Alerting with Exception Queue', 'Monitoring, Surveillance & Exception Handling', 'both',
 'Detect anomalies and route them to owners with SLA/escalation.',
 '{"required": ["signals", "thresholds", "routing", "sla", "owner_role"], "optional": []}'
);

INSERT INTO secondary_control_templates (pci_template_id, code, dimension, criticality, prompt_text) VALUES
('PCI-12', 'D1', 'D', 'critical', 'Signals monitored are linked to risk drivers and are meaningful'),
('PCI-12', 'D2', 'D', 'important', 'Threshold logic and exception definitions are documented'),
('PCI-12', 'I1', 'I', 'critical', 'Alerts route reliably to accountable owners'),
('PCI-12', 'I2', 'I', 'important', 'SLA and escalation paths are configured'),
('PCI-12', 'I3', 'I', 'important', 'False-positive management/tuning process exists'),
('PCI-12', 'M1', 'M', 'critical', 'Queue health (aging/backlog) is monitored'),
('PCI-12', 'M2', 'M', 'important', 'Recurring exceptions drive tuning/system fixes'),
('PCI-12', 'M3', 'M', 'optional', 'Periodic review of thresholds/logic occurs'),
('PCI-12', 'E1', 'E', 'critical', 'Detection timeliness improves or incidents reduce (tracked/attested)'),
('PCI-12', 'E2', 'E', 'important', 'Evidence-on-demand readiness confirmed');

-- ============================================================================
-- PCI-13: Exposure Offsetting Arrangement
-- ============================================================================
INSERT INTO pci_templates (id, name, category, objective_default, purpose, parameters_schema) VALUES
('PCI-13', 'Exposure Offsetting Arrangement', 'Risk Offsetting Mechanisms', 'impact',
 'Offset adverse outcomes through a defined counter-mechanism.',
 '{"required": ["exposure", "offset_method", "coverage_target", "refresh_rules", "owner_role"], "optional": []}'
);

INSERT INTO secondary_control_templates (pci_template_id, code, dimension, criticality, prompt_text) VALUES
('PCI-13', 'D1', 'D', 'critical', 'Offsetting logic matches exposure characteristics and time horizon'),
('PCI-13', 'D2', 'D', 'important', 'Coverage targets and assumptions are defined and justified'),
('PCI-13', 'I1', 'I', 'critical', 'Offsetting arrangement is executed as specified'),
('PCI-13', 'I2', 'I', 'important', 'Mismatch risk (basis/proxy) is assessed and documented'),
('PCI-13', 'I3', 'I', 'important', 'Refresh/rebalance process exists and is followed'),
('PCI-13', 'M1', 'M', 'critical', 'Coverage level is monitored; drift triggers action'),
('PCI-13', 'M2', 'M', 'important', 'Exceptions/failures are logged and escalated'),
('PCI-13', 'M3', 'M', 'optional', 'Assumptions/parameters reviewed periodically'),
('PCI-13', 'E1', 'E', 'critical', 'Impact reduction observed/attested (loss swings/variance reduced)'),
('PCI-13', 'E2', 'E', 'important', 'Evidence-on-demand readiness confirmed');

-- ============================================================================
-- PCI-14: Financial Protection / Loss Absorption Arrangement
-- ============================================================================
INSERT INTO pci_templates (id, name, category, objective_default, purpose, parameters_schema) VALUES
('PCI-14', 'Financial Protection / Loss Absorption Arrangement', 'Financial Protection & Risk Transfer', 'impact',
 'Transfer/absorb losses using contractual/financial arrangement.',
 '{"required": ["coverage_scope", "limits", "exclusions", "activation_claims", "provider", "owner_role"], "optional": []}'
);

INSERT INTO secondary_control_templates (pci_template_id, code, dimension, criticality, prompt_text) VALUES
('PCI-14', 'D1', 'D', 'critical', 'Coverage aligns to realistic loss scenarios'),
('PCI-14', 'D2', 'D', 'important', 'Exclusions/limits understood and documented'),
('PCI-14', 'I1', 'I', 'critical', 'Arrangement is active/in force and enforceable'),
('PCI-14', 'I2', 'I', 'important', 'Provider/counterparty due diligence exists'),
('PCI-14', 'I3', 'I', 'important', 'Activation/claims process is documented and owned'),
('PCI-14', 'M1', 'M', 'critical', 'Coverage adequacy reviewed periodically'),
('PCI-14', 'M2', 'M', 'important', 'Provider status monitored (renewals/changes)'),
('PCI-14', 'M3', 'M', 'optional', 'Post-incident learning incorporated into coverage decisions'),
('PCI-14', 'E1', 'E', 'critical', 'Claims/activation outcomes reviewed (performed as expected) - tracked/attested'),
('PCI-14', 'E2', 'E', 'important', 'Evidence-on-demand readiness confirmed');

-- ============================================================================
-- PCI-15: Resilience / Continuity / Recovery Capability
-- ============================================================================
INSERT INTO pci_templates (id, name, category, objective_default, purpose, parameters_schema) VALUES
('PCI-15', 'Resilience / Continuity / Recovery Capability', 'Resilience, Continuity & Recovery', 'impact',
 'Maintain continuity and recover within targets.',
 '{"required": ["recovery_targets", "procedures", "test_cadence", "roles", "owner_role"], "optional": []}'
);

INSERT INTO secondary_control_templates (pci_template_id, code, dimension, criticality, prompt_text) VALUES
('PCI-15', 'D1', 'D', 'critical', 'Recovery objectives/targets are defined (time/quality)'),
('PCI-15', 'D2', 'D', 'important', 'Strategy covers key dependencies and failure modes'),
('PCI-15', 'I1', 'I', 'critical', 'Procedures and resources are implemented and accessible'),
('PCI-15', 'I2', 'I', 'important', 'Roles/communications plan is defined and current'),
('PCI-15', 'I3', 'I', 'important', 'Backups/recovery resources are available and maintained'),
('PCI-15', 'M1', 'M', 'critical', 'Tests/exercises conducted as scheduled'),
('PCI-15', 'M2', 'M', 'important', 'Findings are tracked to remediation'),
('PCI-15', 'M3', 'M', 'optional', 'Plan updated when environment/process changes'),
('PCI-15', 'E1', 'E', 'critical', 'Test outcomes meet targets or deviations are addressed - tracked/attested'),
('PCI-15', 'E2', 'E', 'important', 'Evidence-on-demand readiness confirmed');

-- ============================================================================
-- PCI-16: People Capability & Operating Discipline
-- ============================================================================
INSERT INTO pci_templates (id, name, category, objective_default, purpose, parameters_schema) VALUES
('PCI-16', 'People Capability & Operating Discipline', 'People Capability & Operating Discipline', 'likelihood',
 'Reduce human error through competence, discipline, and supervision.',
 '{"required": ["required_competencies", "sop_scope", "training_cadence", "supervision_model", "owner_role"], "optional": []}'
);

INSERT INTO secondary_control_templates (pci_template_id, code, dimension, criticality, prompt_text) VALUES
('PCI-16', 'D1', 'D', 'critical', 'Required competencies defined for the role/process'),
('PCI-16', 'D2', 'D', 'important', 'SOPs/operating procedures are defined and accessible'),
('PCI-16', 'I1', 'I', 'critical', 'Training/qualification completed for in-scope staff'),
('PCI-16', 'I2', 'I', 'important', 'Role onboarding/refresh cadence defined and applied'),
('PCI-16', 'I3', 'I', 'important', 'Supervision/quality review mechanism exists'),
('PCI-16', 'M1', 'M', 'critical', 'Compliance with SOPs monitored (sampling/attested)'),
('PCI-16', 'M2', 'M', 'important', 'Deviations tracked and corrected'),
('PCI-16', 'M3', 'M', 'optional', 'Competency gaps reviewed periodically'),
('PCI-16', 'E1', 'E', 'critical', 'Error/incident rate linked to human factors tracked/attested'),
('PCI-16', 'E2', 'E', 'important', 'Evidence-on-demand readiness confirmed');

-- ============================================================================
-- VERIFY SEED DATA
-- ============================================================================

-- Should be 16 templates
DO $$
DECLARE
    template_count INTEGER;
    control_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO template_count FROM pci_templates;
    SELECT COUNT(*) INTO control_count FROM secondary_control_templates;

    IF template_count != 16 THEN
        RAISE EXCEPTION 'Expected 16 PCI templates, got %', template_count;
    END IF;

    IF control_count != 160 THEN
        RAISE EXCEPTION 'Expected 160 secondary control templates, got %', control_count;
    END IF;

    RAISE NOTICE 'Seed data verified: % PCI templates, % secondary control templates', template_count, control_count;
END $$;

COMMIT;

-- ============================================================================
-- END OF SEED DATA MIGRATION
-- ============================================================================
