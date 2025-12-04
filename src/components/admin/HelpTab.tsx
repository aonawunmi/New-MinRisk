/**
 * Help Tab Component
 *
 * Comprehensive user manual and documentation for NEW-MINRISK
 * Accordion-style sections with search functionality
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
              placeholder="Search manual... (e.g., 'DIME', 'audit trail', 'void incident')"
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
          <p>NEW-MINRISK User Manual - Version 1.0</p>
          <p>Last Updated: December 4, 2025</p>
          <p className="mt-2 text-xs">✨ Clean rebuild with enhanced AI, Audit Trail, and modern architecture</p>
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
        <li><strong>👑 admin</strong> - Full system access including configuration and user management</li>
      </ul>

      <h3>Navigation</h3>
      <ul>
        <li><strong>Dashboard</strong> - Overview of risk metrics and KPIs</li>
        <li><strong>Risk Register</strong> - Complete risk register with filtering</li>
        <li><strong>Control Register</strong> - DIME-based control management</li>
        <li><strong>Incidents</strong> - Incident tracking with void system</li>
        <li><strong>Risk Intelligence</strong> - Threat event monitoring (Phase 1)</li>
        <li><strong>Admin</strong> - System configuration (admin only)</li>
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
            <li><strong>Risk Code</strong> - Unique identifier (e.g., "RISK-001")</li>
            <li><strong>Risk Title</strong> - Short description (max 150 chars)</li>
            <li><strong>Division, Department, Category</strong> - Select from dropdowns</li>
            <li><strong>Period</strong> - Time period for this risk (periods-v2 continuous model)</li>
            <li><strong>Likelihood & Impact</strong> - Rate 1-5</li>
          </ul>
        </li>
        <li>Add controls if needed</li>
        <li>Click <strong>"Save Risk"</strong></li>
      </ol>

      <h3>Editing Risks</h3>
      <p>Click the pencil icon in the Actions column, modify fields, and save. All changes are automatically logged to Audit Trail.</p>

      <h3>Deleting Risks</h3>
      <ul>
        <li><strong>Edit users:</strong> Can delete their own risks</li>
        <li><strong>Admin users:</strong> Can delete any risk</li>
        <li>Note: Currently uses hard delete (not archived) - Archive Management coming soon</li>
      </ul>

      <h3>Filtering & Searching</h3>
      <p>Use the filter bar to narrow down risks by:</p>
      <ul>
        <li>Search text (searches all fields)</li>
        <li>Division (multi-select)</li>
        <li>Department (multi-select)</li>
        <li>Period (multi-select) - Filter by time period</li>
        <li>Category</li>
        <li>Status</li>
        <li>Owner (filter by risk owner)</li>
      </ul>

      <h3>Owner Filter</h3>
      <p>NEW in this version: Filter risks by owner name to see risks assigned to specific people.</p>
    `,
  },
  {
    id: 'controls',
    title: 'Control Register & DIME Framework',
    icon: '🛡️',
    content: `
      <h3>About DIME Framework</h3>
      <p>Controls are assessed using the DIME framework with updated labels:</p>

      <h4>Design (D) - How well designed is the control?</h4>
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
        <li><strong>0 - Not applied:</strong> Control is not applied or applied incorrectly</li>
      </ul>

      <h4>Monitoring (M) - How well monitored?</h4>
      <ul>
        <li><strong>3 - Always monitored:</strong> Control is continuously monitored</li>
        <li><strong>2 - Usually monitored:</strong> Control is regularly monitored</li>
        <li><strong>1 - Ad-hoc monitoring:</strong> Control is monitored on an ad-hoc basis</li>
        <li><strong>0 - Not monitored:</strong> Control is not monitored at all</li>
      </ul>

      <h4>Effectiveness Evaluation (E) - How well evaluated?</h4>
      <ul>
        <li><strong>3 - Regularly evaluated:</strong> Control effectiveness is regularly evaluated</li>
        <li><strong>2 - Occasionally evaluated:</strong> Control effectiveness is occasionally evaluated</li>
        <li><strong>1 - Infrequently evaluated:</strong> Control effectiveness is rarely evaluated</li>
        <li><strong>0 - Never evaluated:</strong> Control effectiveness is never evaluated</li>
      </ul>

      <h3>Control Effectiveness Calculation</h3>
      <p>Formula: <strong>((D + I + M + E) / 12) × 100</strong></p>
      <p><strong>Special Rule:</strong> If Design=0 or Implementation=0, effectiveness is automatically 0%</p>

      <h3>Adding Controls</h3>
      <ol>
        <li>When adding/editing a risk, scroll to Controls section</li>
        <li>Click "Add Control"</li>
        <li>Enter control description</li>
        <li>Select target: <strong>Likelihood</strong> or <strong>Impact</strong></li>
        <li>Rate all four DIME dimensions</li>
        <li>View calculated effectiveness score</li>
      </ol>
    `,
  },
  {
    id: 'incidents',
    title: 'Incident Management (Void System)',
    icon: '🚨',
    content: `
      <h3>About Incidents</h3>
      <p>Track operational incidents with NEW-MINRISK's enhanced void system (soft-delete pattern with full audit trail).</p>

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
        <li><strong>Audit Trail:</strong> All voids logged in incident_lifecycle_history table</li>
        <li><strong>Status Change:</strong> incident_status changes from ACTIVE to VOIDED</li>
        <li><strong>Preservation:</strong> Record stays in database for compliance</li>
        <li><strong>Admin View:</strong> Admins can view voided incidents in "Voided Incidents (Audit)" tab</li>
      </ul>

      <h3>Voided Incidents View (Admin Only)</h3>
      <p>Access via Admin → Incident Review → "Voided Incidents (Audit)" tab:</p>
      <ul>
        <li>Shows all voided incidents with void reason</li>
        <li>Displays who voided and when</li>
        <li>View lifecycle history for full audit trail</li>
        <li>Search and filter capabilities</li>
      </ul>

      <h3>Why Void Instead of Delete?</h3>
      <ul>
        <li><strong>Compliance:</strong> Regulatory requirements to preserve records</li>
        <li><strong>Audit Trail:</strong> Full history of why incidents were removed</li>
        <li><strong>Reversibility:</strong> Can be reviewed later if needed</li>
        <li><strong>Admin-Only Restriction:</strong> Only admins can void (ON DELETE RESTRICT prevents accidental loss)</li>
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
      <ol>
        <li><strong>AI Risk Generation</strong> - Generate context-specific risks</li>
        <li><strong>AI Control Recommendations</strong> - Get control suggestions with DIME scores</li>
        <li><strong>AI Risk Classification</strong> - Classify risks against taxonomy</li>
        <li><strong>AI Statement Refinement</strong> - Improve risk statements professionally</li>
        <li><strong>AI Revalidation</strong> - Re-validate edited statements</li>
      </ol>

      <h3>1. AI Risk Generation</h3>
      <p><strong>Purpose:</strong> Quickly generate relevant risks based on your industry and business context.</p>

      <h4>How to Use:</h4>
      <ol>
        <li>Go to <strong>Risk Register</strong> tab</li>
        <li>Look for <strong>"AI Risk Generator"</strong> section</li>
        <li>Click <strong>"Generate Risks"</strong> button</li>
        <li>Fill in context:
          <ul>
            <li><strong>Industry/Sector</strong> (required): Banking, Insurance, Healthcare, etc.</li>
            <li><strong>Business Unit</strong> (optional): Trading Desk, IT Operations, etc.</li>
            <li><strong>Risk Category</strong> (optional): Focus on specific category</li>
            <li><strong>Number of Risks</strong>: 1-10 (default: 5)</li>
            <li><strong>Additional Context</strong>: Specific concerns or projects</li>
          </ul>
        </li>
        <li>Click <strong>"Generate Risks"</strong></li>
        <li>Review AI-generated risks</li>
        <li>Select risks to save</li>
      </ol>

      <h3>2. AI Control Recommendations</h3>
      <p><strong>Purpose:</strong> Get AI suggestions for effective controls with DIME scores.</p>

      <h4>How to Use:</h4>
      <ol>
        <li>When viewing/editing a risk, find "Controls" section</li>
        <li>Click <strong>"Get AI Recommendations"</strong></li>
        <li>AI analyzes risk and suggests 3-5 controls</li>
        <li>Each suggestion includes:
          <ul>
            <li>Control description</li>
            <li>Target (Likelihood/Impact)</li>
            <li>Suggested DIME scores (D, I, M, E)</li>
            <li>Rationale for suggestion</li>
          </ul>
        </li>
        <li>Click <strong>"Add Control"</strong> to use suggestion</li>
        <li>Adjust DIME scores based on your implementation</li>
      </ol>

      <h3>3. AI Risk Classification</h3>
      <p><strong>Purpose:</strong> Automatically classify risks against your taxonomy.</p>
      <ul>
        <li>AI suggests category and subcategory</li>
        <li>Provides confidence score (0-100%)</li>
        <li>Explains reasoning for classification</li>
        <li>Normalizes risk statement for consistency</li>
      </ul>

      <h3>4. AI Statement Refinement</h3>
      <p><strong>Purpose:</strong> Improve risk statements to be more professional and clear.</p>
      <ul>
        <li>AI rewrites risk statement</li>
        <li>Lists improvements made</li>
        <li>Maintains original meaning</li>
        <li>Follows industry best practices</li>
      </ul>

      <h3>5. AI Revalidation</h3>
      <p><strong>Purpose:</strong> Re-validate edited risk statements.</p>
      <ul>
        <li>Check if classification still applies after edits</li>
        <li>Suggests reclassification if needed</li>
        <li>Ensures taxonomy alignment</li>
      </ul>

      <h3>Best Practices</h3>
      <ul>
        <li><strong>Review all suggestions:</strong> AI is a starting point, not final answer</li>
        <li><strong>Customize for your org:</strong> Adapt to your specific context</li>
        <li><strong>Be specific in prompts:</strong> More context = better results</li>
        <li><strong>Professional review:</strong> Have risk experts validate AI output</li>
      </ul>
    `,
  },
  {
    id: 'risk-intelligence',
    title: 'Risk Intelligence Monitor (Phase 1)',
    icon: '🎯',
    content: `
      <h3>About Risk Intelligence</h3>
      <p>NEW-MINRISK includes Phase 1 of Risk Intelligence: <strong>Manual Event Entry with Auto-Scan</strong></p>

      <h3>How It Works</h3>
      <ol>
        <li>Navigate to <strong>Risk Intelligence</strong> tab</li>
        <li>Click <strong>"Add External Event"</strong></li>
        <li>Enter threat event details:
          <ul>
            <li>Title (e.g., "Ransomware attack on healthcare sector")</li>
            <li>Source (e.g., news article URL)</li>
            <li>Event date</li>
            <li>Description</li>
            <li>Category (Cyber, Operational, etc.)</li>
          </ul>
        </li>
        <li><strong>Auto-Scan Triggers:</strong> AI automatically analyzes event against your risk register</li>
        <li>If relevant (confidence ≥ 70%), creates alert linking event to risk</li>
        <li>Review alerts in "Pending" tab</li>
      </ol>

      <h3>Alert Management</h3>
      <ul>
        <li><strong>Pending Alerts:</strong> Review AI suggestions</li>
        <li><strong>Accept Alert:</strong> Add to treatment log for manual application</li>
        <li><strong>Reject Alert:</strong> Dismiss with reason</li>
        <li><strong>Treatment Log:</strong> Track accepted alerts before applying to risk register</li>
      </ul>

      <h3>Phase 2 (Planned)</h3>
      <p>RSS automation with intelligent pre-filtering - see CLAUDE.md for details.</p>
    `,
  },
  {
    id: 'admin-panel',
    title: 'Admin Panel',
    icon: '👑',
    content: `
      <h3>Admin Capabilities</h3>
      <p>NEW-MINRISK Admin Panel has 6 sections:</p>

      <h4>1. Risk Taxonomy Management</h4>
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

      <h4>3. User Management</h4>
      <ul>
        <li>Approve/reject pending users</li>
        <li>Change user roles (view/edit/admin)</li>
        <li>View user statistics</li>
        <li>Delete users (with confirmation)</li>
      </ul>

      <h4>4. Period Management</h4>
      <ul>
        <li>Manage reporting periods (periods-v2 continuous model)</li>
        <li>Set active period</li>
        <li>Historical period tracking</li>
      </ul>

      <h4>5. Audit Trail ✨ NEW</h4>
      <ul>
        <li><strong>Complete activity log</strong> of all system actions</li>
        <li><strong>8 filters:</strong> search, risk code, user, action type, entity type, dates, limit</li>
        <li><strong>Automatic capture:</strong> Risks, controls, users logged via database triggers</li>
        <li><strong>Detail view:</strong> Before/after comparison for all changes</li>
        <li><strong>CSV export:</strong> Download audit log for reporting</li>
        <li><strong>Immutable:</strong> No edits or deletes allowed (compliance)</li>
        <li><strong>Color-coded actions:</strong> Create=green, Update=blue, Delete=red, etc.</li>
      </ul>

      <h4>6. Organization Settings</h4>
      <ul>
        <li>Configure organization details</li>
        <li>DIME scale configuration</li>
        <li>Likelihood/Impact scales</li>
        <li>System preferences</li>
      </ul>

      <h3>Accessing Admin Panel</h3>
      <p>Only users with <strong>role='admin'</strong> can access the Admin tab. If you don't see it, contact your administrator.</p>
    `,
  },
  {
    id: 'best-practices',
    title: 'Best Practices',
    icon: '💡',
    content: `
      <h3>Risk Management</h3>
      <ul>
        <li><strong>Consistent Codes:</strong> Use a naming convention (RISK-001, RISK-002, etc.)</li>
        <li><strong>Regular Updates:</strong> Review risks quarterly minimum</li>
        <li><strong>Honest DIME Ratings:</strong> Be realistic in control effectiveness scores</li>
        <li><strong>Document Changes:</strong> Audit trail tracks everything automatically</li>
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
        <li><strong>Link to Risks:</strong> Connect incidents to related risks for analysis</li>
        <li><strong>Document Root Causes:</strong> Helps prevent recurrence</li>
      </ul>

      <h3>Admin Operations</h3>
      <ul>
        <li><strong>User Approval:</strong> Verify identity, start with 'view' role</li>
        <li><strong>Audit Trail Review:</strong> Regularly check for unusual activity</li>
        <li><strong>Taxonomy Alignment:</strong> Keep categories aligned with industry standards</li>
      </ul>

      <h3>Data Quality</h3>
      <ul>
        <li><strong>Complete Information:</strong> Fill all fields thoroughly</li>
        <li><strong>Regular Cleanup:</strong> Use void system for outdated data</li>
        <li><strong>Training:</strong> Train all users on proper usage</li>
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

      <h3>Data Issues</h3>
      <p><strong>Risk code already exists:</strong><br>
      Risk codes must be unique. Try a different code.</p>

      <p><strong>Can't void incident:</strong><br>
      Only admins can void incidents. Contact your admin.</p>

      <p><strong>Audit trail not showing my actions:</strong><br>
      Audit trail may take a few seconds to update. Refresh the page.</p>

      <h3>AI Features</h3>
      <p><strong>AI not generating risks:</strong><br>
      Check Anthropic API key is configured in environment variables. Contact admin.</p>

      <p><strong>AI suggestions seem off:</strong><br>
      Provide more context in the prompt. AI works better with specific information.</p>

      <h3>Getting Support</h3>
      <ul>
        <li>Contact your administrator for account issues</li>
        <li>Refer to this manual for usage questions</li>
        <li>Check CLAUDE.md in project root for technical documentation</li>
        <li>Report bugs to your system administrator</li>
      </ul>
    `,
  },
];
