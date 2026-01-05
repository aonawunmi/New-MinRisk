/**
 * Help Tab Component
 *
 * Comprehensive user manual and documentation for NEW-MINRISK
 * Accordion-style sections with search functionality
 * 
 * VERSION 2.0 - Updated January 2026
 * Added: KRI, Analytics, Risk Appetite, Import/Export, Data Cleanup
 */

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { BookOpen, Search, ChevronRight, ChevronDown } from 'lucide-react';

export default function HelpTab() {
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['getting-started']));

  const toggleSection = (sectionId: string) => {
    setExpandedSections(prev => {
      const newSet = new Set(prev);
      if (newSet.has(sectionId)) {
        newSet.delete(sectionId);
      } else {
        newSet.add(sectionId);
      }
      return newSet;
    });
  };

  const expandAll = () => {
    setExpandedSections(new Set(sections.map(s => s.id)));
  };

  const collapseAll = () => {
    setExpandedSections(new Set());
  };

  const filterContent = (text: string) => {
    if (!searchQuery) return true;
    return text.toLowerCase().includes(searchQuery.toLowerCase());
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="h-5 w-5" />
                User Manual & Help
              </CardTitle>
              <CardDescription>
                Complete guide to using NEW-MINRISK effectively
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <button
                onClick={expandAll}
                className="text-sm text-blue-600 hover:underline"
              >
                Expand All
              </button>
              <span className="text-gray-300">|</span>
              <button
                onClick={collapseAll}
                className="text-sm text-blue-600 hover:underline"
              >
                Collapse All
              </button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search manual... (e.g., 'DIME', 'KRI', 'appetite', 'cleanup')"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Manual Sections */}
      <div className="space-y-4">
        {sections.map((section) => {
          const isExpanded = expandedSections.has(section.id);
          const matchesSearch = !searchQuery || filterContent(section.title + ' ' + section.content);

          if (!matchesSearch) return null;

          return (
            <Card key={section.id}>
              <CardHeader
                className="cursor-pointer hover:bg-gray-50"
                onClick={() => toggleSection(section.id)}
              >
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg flex items-center gap-2">
                    {section.icon}
                    {section.title}
                  </CardTitle>
                  {isExpanded ? (
                    <ChevronDown className="h-5 w-5 text-gray-500" />
                  ) : (
                    <ChevronRight className="h-5 w-5 text-gray-500" />
                  )}
                </div>
              </CardHeader>
              {isExpanded && (
                <CardContent>
                  <div
                    className="prose prose-sm max-w-none"
                    dangerouslySetInnerHTML={{ __html: section.content }}
                  />
                </CardContent>
              )}
            </Card>
          );
        })}
      </div>

      {/* Version Info */}
      <Card>
        <CardContent className="pt-6 text-center text-sm text-gray-500">
          <p>NEW-MINRISK User Manual - Version 2.0</p>
          <p>Last Updated: January 5, 2026</p>
          <p className="mt-2 text-xs">✨ Includes KRI Module, Analytics, Risk Appetite Framework, and Data Cleanup</p>
        </CardContent>
      </Card>
    </div>
  );
}

// Manual content sections
const sections = [
  {
    id: 'getting-started',
    title: 'Getting Started',
    icon: '🚀',
    content: `
      <h3>First Time Login</h3>
      <ol>
        <li><strong>Access the Application</strong> - Navigate to your NEW-MINRISK URL</li>
        <li><strong>Sign Up</strong> - Click "Sign up", enter email and password</li>
        <li><strong>Wait for Admin Approval</strong> - Your account starts with "Pending" status</li>
        <li><strong>Log In</strong> - Once approved, sign in with your credentials</li>
      </ol>

      <h3>User Roles</h3>
      <ul>
        <li><strong>👁️ view</strong> - Can view all data, cannot make changes</li>
        <li><strong>✏️ edit</strong> - Can add and edit risks, incidents, controls</li>
        <li><strong>👑 primary_admin</strong> - Full access to their organization including Admin panel</li>
        <li><strong>🌐 super_admin</strong> - Cross-organization access, can manage all organizations</li>
      </ul>

      <h3>Navigation Tabs</h3>
      <h4>All Users:</h4>
      <ul>
        <li><strong>Dashboard</strong> - Overview of risk metrics, heatmaps, and KPIs</li>
        <li><strong>Risks</strong> - Risk Register with Import/Export</li>
        <li><strong>Controls</strong> - Control Register with DIME framework</li>
        <li><strong>Incidents</strong> - Incident tracking with void system</li>
        <li><strong>AI</strong> - AI Assistant for risk analysis</li>
      </ul>
      
      <h4>Admin Only (Risk Management Team):</h4>
      <ul>
        <li><strong>Analytics</strong> - Advanced analysis and Risk History</li>
        <li><strong>KRI</strong> - Key Risk Indicator monitoring</li>
        <li><strong>Intel</strong> - Risk Intelligence with RSS feeds</li>
        <li><strong>Admin</strong> - System configuration</li>
      </ul>
    `,
  },
  {
    id: 'risk-register',
    title: 'Risk Register',
    icon: '📋',
    content: `
      <h3>Adding a New Risk</h3>
      <ol>
        <li>Click <strong>"Add Risk"</strong> button</li>
        <li>Fill in required fields:
          <ul>
            <li><strong>Risk Code</strong> - Auto-generated (e.g., "RISK-001")</li>
            <li><strong>Risk Title</strong> - Short description (max 150 chars)</li>
            <li><strong>Division, Department, Category</strong> - Select from dropdowns</li>
            <li><strong>Likelihood & Impact</strong> - Rate 1-5 for inherent risk</li>
          </ul>
        </li>
        <li>Add controls if needed</li>
        <li>Click <strong>"Save Risk"</strong></li>
      </ol>

      <h3>Import/Export</h3>
      <p>Access via <strong>Risks → Import/Export</strong> tab:</p>
      <ul>
        <li><strong>Export to CSV</strong> - Download all risks as spreadsheet</li>
        <li><strong>Export to JSON</strong> - Download for backup or migration</li>
        <li><strong>Import from CSV</strong> - Bulk upload risks</li>
        <li><strong>Import from JSON</strong> - Restore from backup</li>
      </ul>

      <h3>Filtering & Searching</h3>
      <p>Use the filter bar to narrow down risks by:</p>
      <ul>
        <li>Search text (searches all fields)</li>
        <li>Division (multi-select)</li>
        <li>Department (multi-select)</li>
        <li>Category</li>
        <li>Status</li>
        <li>Owner (filter by risk owner name)</li>
      </ul>
    `,
  },
  {
    id: 'controls',
    title: 'Control Register & DIME Framework',
    icon: '🛡️',
    content: `
      <h3>About DIME Framework</h3>
      <p>Controls are assessed using the DIME framework:</p>

      <h4>Design (D) - How well designed?</h4>
      <ul>
        <li><strong>3 - Well designed:</strong> Control specifically addresses the risk</li>
        <li><strong>2 - Partially designed:</strong> Control partially addresses the risk</li>
        <li><strong>1 - Poorly designed:</strong> Control minimally addresses the risk</li>
        <li><strong>0 - Not designed:</strong> Control does not address the risk</li>
      </ul>

      <h4>Implementation (I) - How well implemented?</h4>
      <ul>
        <li><strong>3 - Always applied:</strong> Control is always applied as intended</li>
        <li><strong>2 - Generally operational:</strong> Control is usually applied correctly</li>
        <li><strong>1 - Sometimes applied:</strong> Control is applied inconsistently</li>
        <li><strong>0 - Not applied:</strong> Control is not applied</li>
      </ul>

      <h4>Monitoring (M) - How well monitored?</h4>
      <ul>
        <li><strong>3 - Always monitored:</strong> Continuously monitored</li>
        <li><strong>2 - Usually monitored:</strong> Regularly monitored</li>
        <li><strong>1 - Ad-hoc monitoring:</strong> Monitored on ad-hoc basis</li>
        <li><strong>0 - Not monitored:</strong> Not monitored at all</li>
      </ul>

      <h4>Effectiveness Evaluation (E) - How well evaluated?</h4>
      <ul>
        <li><strong>3 - Regularly evaluated:</strong> Regularly assessed</li>
        <li><strong>2 - Occasionally evaluated:</strong> Occasionally assessed</li>
        <li><strong>1 - Infrequently evaluated:</strong> Rarely assessed</li>
        <li><strong>0 - Never evaluated:</strong> Never assessed</li>
      </ul>

      <h3>Control Effectiveness Calculation</h3>
      <p>Formula: <strong>((D + I + M + E) / 12) × 100</strong></p>
      <p><strong>Special Rule:</strong> If Design=0 or Implementation=0, effectiveness is automatically 0%</p>

      <h3>Control Register Features</h3>
      <ul>
        <li><strong>Add Control</strong> - Create independent controls</li>
        <li><strong>Link to Risks</strong> - Associate controls with risks</li>
        <li><strong>DIME Scoring</strong> - Score each dimension 0-3</li>
        <li><strong>Import/Export</strong> - Bulk management via CSV/JSON</li>
      </ul>
    `,
  },
  {
    id: 'kri',
    title: 'KRI Monitoring (Key Risk Indicators)',
    icon: '📉',
    content: `
      <h3>About KRIs</h3>
      <p>Key Risk Indicators (KRIs) are early warning signals that help predict when risks may materialize.</p>

      <h3>KRI Definitions</h3>
      <p>Create and manage KRI definitions:</p>
      <ul>
        <li><strong>KRI Code</strong> - Auto-generated (KRI-001, KRI-002, etc.)</li>
        <li><strong>Name</strong> - Descriptive name for the indicator</li>
        <li><strong>Type</strong> - Leading, Lagging, or Concurrent</li>
        <li><strong>Unit</strong> - Measurement unit (%, count, days, etc.)</li>
        <li><strong>Collection Frequency</strong> - Daily, Weekly, Monthly, Quarterly, Annually</li>
        <li><strong>Thresholds</strong> - Yellow (warning) and Red (critical) levels</li>
        <li><strong>Direction</strong> - Above, Below, or Between target</li>
      </ul>

      <h3>Data Entry</h3>
      <p>Record KRI measurements:</p>
      <ol>
        <li>Select KRI from list</li>
        <li>Enter measurement value</li>
        <li>Select measurement date</li>
        <li>Add notes if needed</li>
        <li>System automatically calculates alert status (Green/Yellow/Red)</li>
      </ol>

      <h3>Alerts</h3>
      <p>KRI breaches generate alerts:</p>
      <ul>
        <li><strong>Yellow Alert</strong> - Warning threshold breached</li>
        <li><strong>Red Alert</strong> - Critical threshold breached</li>
        <li><strong>Acknowledge</strong> - Mark alert as seen</li>
        <li><strong>Resolve</strong> - Close alert with resolution notes</li>
      </ul>

      <h3>Risk Linking</h3>
      <p>Connect KRIs to risks to track which indicators predict which risks.</p>
    `,
  },
  {
    id: 'analytics',
    title: 'Analytics & Reporting',
    icon: '📊',
    content: `
      <h3>Current Analysis</h3>
      <p>View current risk landscape:</p>
      <ul>
        <li><strong>Risk Heatmap</strong> - Visual 5x5 matrix of likelihood vs impact</li>
        <li><strong>Category Distribution</strong> - Pie chart of risks by category</li>
        <li><strong>Trend Analysis</strong> - How risk scores change over time</li>
        <li><strong>Top Risks</strong> - Highest scoring risks requiring attention</li>
        <li><strong>Control Coverage</strong> - Risks with/without controls</li>
      </ul>

      <h3>Risk History</h3>
      <p>Track risk evolution over time:</p>
      <ul>
        <li><strong>Period Comparison</strong> - Compare risk profiles across periods</li>
        <li><strong>Historical Snapshots</strong> - View past risk states</li>
        <li><strong>Change Tracking</strong> - See what changed between periods</li>
      </ul>

      <h3>Export Reports</h3>
      <p>Generate reports for Board and management:</p>
      <ul>
        <li>Risk Register exports</li>
        <li>Control effectiveness reports</li>
        <li>KRI status reports</li>
      </ul>
    `,
  },
  {
    id: 'appetite',
    title: 'Risk Appetite Framework',
    icon: '🎯',
    content: `
      <h3>Understanding Risk Appetite</h3>
      <p>Risk Appetite defines how much risk your organization is willing to accept.</p>

      <h3>Key Concepts</h3>
      <table border="1" cellpadding="8" style="border-collapse: collapse; width: 100%;">
        <tr>
          <th>Concept</th>
          <th>Definition</th>
          <th>Breach Behavior</th>
        </tr>
        <tr>
          <td><strong>Tolerance Limit</strong></td>
          <td>Hard boundary - the maximum acceptable level</td>
          <td>Governance event, Board notification</td>
        </tr>
        <tr>
          <td><strong>KRI Threshold</strong></td>
          <td>Early warning signal (Green/Amber/Red)</td>
          <td>Expected, triggers management attention</td>
        </tr>
      </table>

      <h3>Admin Configuration</h3>
      <p>Access via <strong>Admin → Appetite & Tolerance</strong>:</p>

      <h4>1. Risk Appetite Statements</h4>
      <ul>
        <li>Create organization-wide appetite statements</li>
        <li>Define effective dates</li>
        <li>Version control for audit trail</li>
      </ul>

      <h4>2. Risk Appetite Categories</h4>
      <ul>
        <li>Set appetite level per risk category (Conservative, Moderate, Aggressive)</li>
        <li>Define tolerance limits per category</li>
        <li>Link to overall appetite statement</li>
      </ul>

      <h4>3. Risk Indicators (KRIs)</h4>
      <ul>
        <li>Define early warning thresholds (Green/Amber/Red)</li>
        <li>These operate <strong>inside</strong> tolerance limits</li>
        <li>Designed to breach frequently as warnings</li>
      </ul>

      <h3>Important Distinction</h3>
      <p><strong>KRI alerts are expected</strong> - they signal attention needed.<br>
      <strong>Tolerance breaches are rare</strong> - they trigger governance escalation.</p>
    `,
  },
  {
    id: 'incidents',
    title: 'Incident Management (Void System)',
    icon: '🚨',
    content: `
      <h3>Recording an Incident</h3>
      <ol>
        <li>Navigate to <strong>Incidents</strong> tab</li>
        <li>Click <strong>"Report Incident"</strong> button</li>
        <li>Fill in incident details:
          <ul>
            <li><strong>Title & Description:</strong> What happened</li>
            <li><strong>Incident Date:</strong> When it occurred</li>
            <li><strong>Type:</strong> Loss Event, Near Miss, Control Failure, Breach, Other</li>
            <li><strong>Severity:</strong> 1-5 scale (1=Minimal, 5=Critical)</li>
            <li><strong>Financial Impact:</strong> Monetary loss amount</li>
            <li><strong>Status:</strong> Reported → Under Investigation → Resolved → Closed</li>
          </ul>
        </li>
        <li>Link to risks if applicable</li>
        <li>Click <strong>"Save Incident"</strong></li>
      </ol>

      <h3>Void System (Soft Delete)</h3>
      <p>NEW-MINRISK uses a "void" pattern instead of hard delete:</p>
      <ul>
        <li><strong>Void Button:</strong> Click void button on incident detail view</li>
        <li><strong>Provide Reason:</strong> Required - explain why incident is being voided</li>
        <li><strong>Audit Trail:</strong> All voids logged in incident_lifecycle_history</li>
        <li><strong>Status Change:</strong> incident_status changes from ACTIVE to VOIDED</li>
        <li><strong>Preservation:</strong> Record stays in database for compliance</li>
        <li><strong>Admin View:</strong> Admins can view voided incidents in audit tab</li>
      </ul>

      <h3>Why Void Instead of Delete?</h3>
      <ul>
        <li><strong>Compliance:</strong> Regulatory requirements to preserve records</li>
        <li><strong>Audit Trail:</strong> Full history of why incidents were removed</li>
        <li><strong>Reversibility:</strong> Can be reviewed later if needed</li>
      </ul>
    `,
  },
  {
    id: 'ai-features',
    title: 'AI Features (Claude AI)',
    icon: '🤖',
    content: `
      <h3>Overview</h3>
      <p>NEW-MINRISK includes advanced AI capabilities powered by <strong>Claude 3.5 Sonnet:</strong></p>

      <h3>1. AI Risk Generation</h3>
      <p>Generate context-specific risks based on your industry:</p>
      <ul>
        <li>Specify industry/sector</li>
        <li>Optionally narrow to business unit</li>
        <li>AI generates 1-10 relevant risks</li>
        <li>Review and select which to save</li>
      </ul>

      <h3>2. AI Control Recommendations</h3>
      <p>Get AI suggestions for effective controls:</p>
      <ul>
        <li>AI analyzes risk and suggests 3-5 controls</li>
        <li>Each suggestion includes DIME scores</li>
        <li>Provides rationale for suggestion</li>
      </ul>

      <h3>3. AI Risk Classification</h3>
      <ul>
        <li>Auto-classify risks against taxonomy</li>
        <li>Confidence score (0-100%)</li>
        <li>Reasoning explanation</li>
      </ul>

      <h3>4. AI Statement Refinement</h3>
      <ul>
        <li>Improve risk statements professionally</li>
        <li>Maintains original meaning</li>
        <li>Follows industry best practices</li>
      </ul>

      <h3>Best Practices</h3>
      <ul>
        <li><strong>Review all suggestions:</strong> AI is a starting point, not final answer</li>
        <li><strong>Be specific in prompts:</strong> More context = better results</li>
        <li><strong>Professional review:</strong> Have risk experts validate AI output</li>
      </ul>
    `,
  },
  {
    id: 'risk-intelligence',
    title: 'Risk Intelligence Monitor',
    icon: '🧠',
    content: `
      <h3>About Risk Intelligence</h3>
      <p>Monitor external threats and events that may impact your risk profile.</p>

      <h3>RSS Source Management</h3>
      <p>Configure news sources to monitor:</p>
      <ul>
        <li><strong>Add RSS Sources</strong> - Enter feed URLs</li>
        <li><strong>Categorize</strong> - Assign to risk categories</li>
        <li><strong>Enable/Disable</strong> - Control which sources are active</li>
        <li><strong>Auto-Scan</strong> - System periodically fetches new articles</li>
      </ul>

      <h3>Keyword Management</h3>
      <p>Define keywords to watch for:</p>
      <ul>
        <li><strong>Risk Keywords</strong> - Terms that indicate potential risks</li>
        <li><strong>Category Mapping</strong> - Link keywords to risk categories</li>
        <li><strong>AI Matching</strong> - AI analyzes articles for relevance</li>
      </ul>

      <h3>Alert Management</h3>
      <ul>
        <li><strong>Pending Alerts</strong> - Review AI-flagged articles</li>
        <li><strong>Accept Alert</strong> - Add to treatment log</li>
        <li><strong>Reject Alert</strong> - Dismiss with reason</li>
        <li><strong>Treatment Log</strong> - Track accepted alerts</li>
      </ul>

      <h3>How It Works</h3>
      <ol>
        <li>RSS sources are scanned for new articles</li>
        <li>AI analyzes articles against your risk keywords</li>
        <li>Relevant articles (confidence ≥ 70%) create alerts</li>
        <li>Risk managers review and treat alerts</li>
      </ol>
    `,
  },
  {
    id: 'admin-panel',
    title: 'Admin Panel',
    icon: '👑',
    content: `
      <h3>Admin Capabilities</h3>
      <p>NEW-MINRISK Admin Panel has 9 sections:</p>

      <h4>1. Risk Taxonomy</h4>
      <ul>
        <li>Manage risk categories and subcategories</li>
        <li>Import/Export taxonomy</li>
        <li>Align with industry standards</li>
      </ul>

      <h4>2. Risk Configuration</h4>
      <ul>
        <li>Divisions and Departments</li>
        <li>Risk categories and labels</li>
        <li>Custom fields</li>
      </ul>

      <h4>3. Appetite & Tolerance</h4>
      <ul>
        <li>Risk Appetite Statements</li>
        <li>Risk Appetite Categories</li>
        <li>Risk Indicators (KRIs)</li>
        <li>Tolerance Limits</li>
      </ul>

      <h4>4. User Management</h4>
      <ul>
        <li>Approve/reject pending users</li>
        <li>Change user roles (view/edit/admin)</li>
        <li>View user statistics</li>
        <li>Delete users (with confirmation)</li>
      </ul>

      <h4>5. Owner Mapping</h4>
      <ul>
        <li>Map risks to owners</li>
        <li>Bulk assignment</li>
        <li>Owner reporting</li>
      </ul>

      <h4>6. Period Management</h4>
      <ul>
        <li>Manage reporting periods</li>
        <li>Set active period</li>
        <li>Historical period tracking</li>
      </ul>

      <h4>7. Audit Trail</h4>
      <ul>
        <li>Complete activity log of all system actions</li>
        <li>8 filters: search, risk code, user, action type, entity type, dates, limit</li>
        <li>Before/after comparison for all changes</li>
        <li>CSV export for reporting</li>
        <li>Immutable - no edits or deletes allowed</li>
      </ul>

      <h4>8. Help</h4>
      <ul>
        <li>This user manual</li>
        <li>Search functionality</li>
      </ul>

      <h4>9. Organization Settings</h4>
      <ul>
        <li>Configure organization details</li>
        <li>DIME scale configuration</li>
        <li>Likelihood/Impact scales</li>
        <li><strong>⚠️ Danger Zone: Data Cleanup</strong> - Delete operational data</li>
      </ul>

      <h3>Data Cleanup (Danger Zone)</h3>
      <p>Located in Organization Settings. Allows admins to delete operational data:</p>
      <ul>
        <li><strong>Scope Selection:</strong> Current org only or all organizations (super_admin)</li>
        <li><strong>Two-Step Confirmation:</strong> Must type "DELETE ALL DATA" to confirm</li>
        <li><strong>Preserved:</strong> User accounts, organizations, taxonomy</li>
        <li><strong>Deleted:</strong> Risks, controls, KRIs, incidents, audit logs, intelligence</li>
      </ul>
      <p style="color: red;"><strong>⚠️ WARNING: This action is irreversible!</strong></p>
    `,
  },
  {
    id: 'best-practices',
    title: 'Best Practices',
    icon: '💡',
    content: `
      <h3>Risk Management</h3>
      <ul>
        <li><strong>Regular Updates:</strong> Review risks quarterly minimum</li>
        <li><strong>Honest DIME Ratings:</strong> Be realistic in control effectiveness scores</li>
        <li><strong>Document Changes:</strong> Audit trail tracks everything automatically</li>
        <li><strong>Link KRIs:</strong> Connect early warning indicators to risks</li>
      </ul>

      <h3>Control Assessment</h3>
      <ul>
        <li><strong>Use AI Recommendations:</strong> Start with AI suggestions, customize for your context</li>
        <li><strong>Rate Honestly:</strong> DIME scores should reflect reality, not aspirations</li>
        <li><strong>Monitor Regularly:</strong> Update DIME scores as controls mature</li>
      </ul>

      <h3>Incident Management</h3>
      <ul>
        <li><strong>Use Void for Mistakes:</strong> Don't delete - use void with clear reason</li>
        <li><strong>Link to Risks:</strong> Connect incidents to related risks</li>
        <li><strong>Document Root Causes:</strong> Helps prevent recurrence</li>
      </ul>

      <h3>KRI Management</h3>
      <ul>
        <li><strong>Leading Indicators:</strong> Focus on predictive metrics</li>
        <li><strong>Regular Data Entry:</strong> Keep measurements current</li>
        <li><strong>Respond to Alerts:</strong> Don't let alerts go stale</li>
      </ul>

      <h3>Admin Operations</h3>
      <ul>
        <li><strong>User Approval:</strong> Verify identity, start with 'view' role</li>
        <li><strong>Audit Trail Review:</strong> Regularly check for unusual activity</li>
        <li><strong>Backup Before Cleanup:</strong> Export data before using cleanup function</li>
      </ul>
    `,
  },
  {
    id: 'troubleshooting',
    title: 'Troubleshooting',
    icon: '🔧',
    content: `
      <h3>Login Issues</h3>
      <p><strong>Can't log in after signup:</strong><br>
      Wait for admin approval. Your account shows "Pending" until admin approves.</p>

      <p><strong>Forgot password:</strong><br>
      Use "Forgot password?" link on login screen.</p>

      <h3>Permission Issues</h3>
      <p><strong>Can't add/edit risks:</strong><br>
      Your role is 'view'. Request admin to upgrade to 'edit'.</p>

      <p><strong>Can't access Admin Panel:</strong><br>
      Only admins can access. Contact your organization's admin.</p>

      <p><strong>Can't see Analytics/KRI/Intel tabs:</strong><br>
      These are admin-only features for Risk Management team.</p>

      <h3>Data Issues</h3>
      <p><strong>Risk code already exists:</strong><br>
      Risk codes must be unique. System auto-generates unique codes.</p>

      <p><strong>Can't void incident:</strong><br>
      Only admins can void incidents. Contact your admin.</p>

      <p><strong>KRI alert not showing:</strong><br>
      Check threshold direction matches your measurement. Refresh the page.</p>

      <h3>AI Features</h3>
      <p><strong>AI not generating risks:</strong><br>
      AI calls are proxied through Supabase Edge Functions. Check if functions are deployed.</p>

      <p><strong>AI suggestions seem off:</strong><br>
      Provide more context in the prompt. AI works better with specific information.</p>

      <h3>Data Cleanup Issues</h3>
      <p><strong>Cleanup button not visible:</strong><br>
      Only primary_admin and super_admin can see the cleanup function.</p>

      <p><strong>Cleanup not deleting everything:</strong><br>
      Some tables may have different names. Contact system administrator.</p>

      <h3>Getting Support</h3>
      <ul>
        <li>Contact your administrator for account issues</li>
        <li>Refer to this manual for usage questions</li>
        <li>Check CLAUDE.md in project root for technical documentation</li>
      </ul>
    `,
  },
];
