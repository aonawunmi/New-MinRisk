# MinRisk - Enterprise Risk Management Platform

**Production URL:** [https://new-minrisk-production.vercel.app](https://new-minrisk-production.vercel.app)

A comprehensive, multi-tenant risk management system for enterprise organizations, providing risk assessment, control monitoring, incident management, and risk intelligence capabilities.

---

## 📋 Overview

MinRisk is a full-stack web application designed for professional risk management teams. The platform supports multiple organizations with role-based access control, real-time analytics, and comprehensive audit trails.

### Key Features

- **Risk Register Management** - Create, assess, and monitor organizational risks
- **Control Register** - Document and track risk controls and mitigation strategies
- **Incident Management** - Log and track risk incidents with detailed reporting
- **Risk Intelligence** - AI-powered RSS feed monitoring for emerging risks
- **Key Risk Indicators (KRI)** - Monitor and track critical risk metrics
- **Multi-tenant Architecture** - Secure organization isolation with RBAC
- **Role-Based Access Control** - 5-tier permission system
- **Real-time Analytics** - Dashboard with risk heatmaps and trend analysis
- **Audit Trails** - Comprehensive activity logging for compliance

---

## 🏗️ Technology Stack

### Frontend
- **Framework:** React 18 with TypeScript
- **Build Tool:** Vite
- **Routing:** React Router
- **State Management:** React Context + Custom Hooks

### Backend & Database
- **Platform:** Supabase (PostgreSQL)
- **Authentication:** Supabase Auth with Row-Level Security (RLS)
- **Database:** PostgreSQL with comprehensive RLS policies
- **Real-time:** Supabase real-time subscriptions

### Deployment
- **Hosting:** Vercel (Production)
- **Database Hosting:** Supabase Cloud
- **CI/CD:** GitHub Actions
- **Testing:** Playwright (E2E tests)

---

## 🚀 Getting Started

### Prerequisites

- Node.js v18 or higher
- npm v9 or higher
- Supabase Account
- Git

### Installation

1. **Clone the repository**
```bash
   git clone https://github.com/aonawunmi/New-MinRisk.git
   cd New-MinRisk
```

2. **Install dependencies**
```bash
   npm install
```

3. **Set up environment variables**
   Create a `.env` file:
```env
   VITE_SUPABASE_URL=your_supabase_project_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

4. **Start development server**
```bash
   npm run dev
```

---

## 👥 User Roles

| Role | Permissions |
|------|-------------|
| **Super Admin** | Manage all organizations, billing, platform settings |
| **Primary Admin** | Full org access, user management, analytics |
| **Secondary Admin** | Full org access, user management, analytics |
| **Org Editor** | Create/edit risks, controls, incidents |
| **Org Viewer** | Read-only access |
| **Guest** | Minimal read-only access |

---

## 🔐 Security

- Row-Level Security (RLS) on all tables
- Multi-tenant data isolation
- Comprehensive audit logging
- Secure authentication via Supabase

---

## 📚 Documentation

- **[Deployment Guide](docs/DEPLOYMENT_GUIDE.md)**
- **[Solution Specification](docs/MinRisk_Solution_Specification.md)**
- **[User Manual](docs/MinRisk_User_Manual.md)**

---

## 📦 Deployment

Production deployment to Vercel happens automatically on push to `main` branch.

**Production URL:** https://new-minrisk-production.vercel.app

---

## 👨‍💻 Author

**Ayodele Onawunmi**
- GitHub: [@aonawunmi](https://github.com/aonawunmi)
- Email: ayodele.onawunmi@gmail.com

---

## 📄 License

Proprietary - All rights reserved

---

**Built for enterprise risk management professionals**


# Staging deployment triggered: Sun Feb  1 22:43:51 UTC 2026
# Deployment with corrected staging database: Sun Feb  1 22:57:59 UTC 2026
# Staging deployment with verified anon key: Sun Feb  1 23:06:42 UTC 2026
