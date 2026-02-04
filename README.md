# MinRisk - Enterprise Risk Management System

A comprehensive web-based risk management platform for identifying, assessing, and monitoring organizational risks with AI-powered insights.

## Overview

MinRisk is a modern risk management system designed to help organizations manage their risk taxonomy, track controls, monitor continuous risk factors, and generate comprehensive risk reports. The platform integrates with external data sources including RSS feeds for real-time risk intelligence and uses AI to enhance risk analysis.

## Key Features

### Risk Management
- **Risk Taxonomy Management** - Import and manage comprehensive risk hierarchies
- **Risk Assessment** - Structured risk identification and evaluation framework
- **Control Register** - Track and manage risk controls and their effectiveness
- **Risk Response Planning** - Document and monitor risk mitigation strategies

### Continuous Monitoring
- **RSS Feed Integration** - Monitor external news and intelligence sources
- **Automated Risk Scanning** - Continuous surveillance of risk indicators
- **Real-time Alerts** - Notifications for emerging risks and control failures

### AI-Powered Analysis
- **AI Risk Insights** - Leverages Anthropic's Claude AI for risk analysis
- **Intelligent Recommendations** - AI-generated risk responses and control suggestions
- **Risk Pattern Recognition** - Identify trends and correlations across risk data

### Reporting & Visualization
- **Interactive Dashboards** - Visual risk heatmaps and analytics
- **Risk Reports** - Generate comprehensive risk assessment reports
- **Export Capabilities** - Export data to PDF, Excel, and Word formats
- **Custom Charts** - Risk visualization using Recharts

### Data Management
- **CSV/Excel Import** - Bulk import risk data and taxonomies
- **Database Migrations** - Structured data schema management
- **Multi-user Support** - Role-based access with Supabase authentication

## Tech Stack

- **Frontend**: React 18 + TypeScript + Vite
- **UI Framework**: Radix UI + Tailwind CSS
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth
- **AI Integration**: Anthropic Claude API
- **Charts**: Recharts
- **Document Generation**: jsPDF, docx, html2pdf
- **Data Processing**: PapaParse, XLSX

## Getting Started

### Prerequisites

- Node.js 18+ and npm/yarn
- Supabase account and project
- Anthropic API key (for AI features)

### Installation

\`\`\`bash
# Clone the repository
git clone <repository-url>
cd New-MinRisk

# Install dependencies
npm install
\`\`\`

### Configuration

Create a \`.env.local\` file in the root directory:

\`\`\`env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_ANTHROPIC_API_KEY=your_anthropic_api_key
\`\`\`

### Database Setup

Run the database migrations:

\`\`\`bash
npm run migrate
\`\`\`

Import the risk taxonomy (optional):

\`\`\`bash
npm run import-taxonomy
\`\`\`

### Running the Application

\`\`\`bash
# Development mode
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
\`\`\`

The application will be available at \`http://localhost:5173\`

## Project Structure

\`\`\`
src/
├── components/      # React components
├── services/        # Business logic and API integrations
├── utils/           # Utility functions
├── types/           # TypeScript type definitions
├── hooks/           # Custom React hooks
└── scripts/         # Database and utility scripts
\`\`\`

## Available Scripts

- \`npm run dev\` - Start development server
- \`npm run build\` - Build for production
- \`npm run build:check\` - Type-check and build
- \`npm run preview\` - Preview production build
- \`npm run migrate\` - Run database migrations
- \`npm run import-taxonomy\` - Import risk taxonomy data

## Key Documentation Files

- \`DEPLOYMENT_GUIDE.md\` - Production deployment instructions
- \`MINRISK_ARCHITECTURE_REFACTOR_CRITICAL_ANALYSIS.md\` - System architecture analysis
- \`MINRISK_REFACTOR_IMPLEMENTATION_GUIDE.md\` - Implementation guidelines
- \`CLAUDE.md\` - Development guide for working with Claude Code

## Features in Detail

### Risk Taxonomy
Import and manage hierarchical risk classifications covering operational, financial, strategic, and compliance risks.

### Control Framework
Document and track preventive, detective, and corrective controls with effectiveness ratings.

### Continuous Risk Intelligence
Integrate RSS feeds from industry sources, regulatory bodies, and news outlets for real-time risk monitoring.

### AI-Enhanced Risk Analysis
Use Claude AI to analyze risk scenarios, suggest controls, and generate risk narratives.

## Contributing

This is a private project. For development guidelines, see \`CLAUDE_CODE_DEVELOPMENT_GUIDE.md\`.

## License

Private - All Rights Reserved

## Support

For issues and questions, refer to the documentation in the \`/docs\` directory or consult the implementation guides.
