# MinRisk Enterprise Risk Management Platform
## Cost Proposal and Infrastructure Pricing

**Document Date:** January 2026  
**Version:** 1.1

---

# Executive Summary

This document provides a comprehensive cost breakdown for deploying and operating the MinRisk Enterprise Risk Management platform. MinRisk is a cloud-native SaaS solution with variable costs based on usage, organization size, and AI feature consumption.

**Key Cost Drivers:**
- Database and backend infrastructure (Supabase)
- AI-powered features (Anthropic Claude API)
- Frontend hosting and delivery
- Optional enterprise features

---

# 1. Infrastructure Components

## 1.1 Backend Database and Services (Supabase)

MinRisk uses Supabase as the primary backend, providing PostgreSQL database, authentication, row-level security, and Edge Functions.

| Component | Free Tier | Pro Tier ($25/mo) | Team Tier ($599/mo) |
|-----------|-----------|-------------------|---------------------|
| Database Size | 500 MB | 8 GB | 100 GB |
| File Storage | 1 GB | 100 GB | 1 TB |
| Authenticated Users | 50,000 | Unlimited | Unlimited |
| Edge Function Invocations | 500,000/mo | 2,000,000/mo | 5,000,000/mo |
| Database Backups | 7 days | 14 days | 28 days |
| Support | Community | Email | Priority |
| SOC2 Compliance | No | No | Yes |
| SSO/SAML | No | No | Yes |

**Recommendation by Organization Size:**

| Organization Size | Users | Risks | Recommended Tier | Monthly Cost |
|-------------------|-------|-------|------------------|--------------|
| Small | 1-10 | <100 | Pro | $25 |
| Medium | 10-50 | 100-500 | Pro + Add-ons | $50-100 |
| Large | 50-200 | 500-2000 | Team | $599 |
| Enterprise | 200+ | 2000+ | Team + Custom | $599+ |

---

## 1.2 AI Features (Anthropic Claude API)

MinRisk integrates AI-powered features through the Anthropic Claude API for risk classification, control recommendations, and intelligence analysis.

### Pricing Model

Anthropic charges per token (input + output). MinRisk uses Claude 3.5 Haiku for cost-effective AI operations.

| Model | Input Cost | Output Cost |
|-------|-----------|-------------|
| Claude 3.5 Haiku | $0.25/1M tokens | $1.25/1M tokens |
| Claude 3.5 Sonnet | $3.00/1M tokens | $15.00/1M tokens |

### Estimated Usage per Feature

| Feature | Avg Tokens/Call | Est. Cost/Call |
|---------|----------------|----------------|
| Risk Statement Classification | 2,000 | $0.002 |
| Risk Statement Refinement | 1,500 | $0.002 |
| AI Risk Generation (5 risks) | 5,000 | $0.005 |
| Control Recommendations (3 controls) | 4,000 | $0.004 |
| Risk Intelligence Analysis | 3,000 | $0.003 |
| KRI/Tolerance Suggestions | 2,500 | $0.003 |
| Incident-to-Risk Mapping | 3,000 | $0.003 |

### Monthly AI Cost Estimates

| Usage Level | Operations/Month | Estimated Cost |
|-------------|------------------|----------------|
| Light | 100 | $0.50 |
| Moderate | 500 | $2.50 |
| Active | 2,000 | $10.00 |
| Heavy | 10,000 | $50.00 |
| Enterprise | 50,000 | $250.00 |

---

## 1.3 Frontend Hosting

| Platform | Free Tier | Paid Tier | Features |
|----------|-----------|-----------|----------|
| **Render** | $0 (with spin-down) | $7/mo (Starter) | Auto-deploy, SSL |
| **Vercel** | $0 (hobby) | $20/mo (Pro) | Edge network, analytics |
| **Netlify** | $0 (starter) | $19/mo (Pro) | Forms, functions |

**Recommendation:** Render Starter ($7/mo) for production without spin-down delays.

---

## 1.4 Domain and SSL

| Item | Cost | Frequency |
|------|------|-----------|
| Custom Domain (.com) | $12-15 | Annual |
| SSL Certificate | $0 | Included with hosting |

---

# 2. Pricing Tiers

## Tier 1: Starter ($26/month | $312/year)
**For small teams getting started with enterprise risk management**

| Component | Service | Monthly Cost |
|-----------|---------|--------------|
| Database | Supabase Pro | $25 |
| AI Features | Light usage (~100 calls) | $1 |
| Hosting | Render Free | $0 |
| **Total** | | **$26/month** |

**Features Included:**
- Up to 10 users, 100 risks
- Full Risk Register with taxonomy
- Controls Library with DIME scoring
- KRI Monitoring and threshold alerts
- Risk Appetite framework (4-tier)
- Incident Management
- Period/QoQ archiving
- Basic AI features (classification, suggestions)
- Audit trail
- Email support

---

## Tier 2: Professional ($61/month | $732/year)
**For growing organizations with active risk management programs**

| Component | Service | Monthly Cost |
|-----------|---------|--------------|
| Database | Supabase Pro + Compute | $50 |
| AI Features | Moderate usage (~500 calls) | $3 |
| Hosting | Render Starter | $7 |
| Domain | Annual amortized | $1 |
| **Total** | | **$61/month** |

**Features Included:**
- Everything in Starter, plus:
- Up to 50 users, 500 risks
- Full AI features (risk generation, control recommendations)
- Risk Intelligence (RSS scanning, AI analysis)
- Board reporting
- Custom domain
- No hosting spin-down delays
- Priority email support

---

## Tier 3: Enterprise ($670/month | $8,040/year)
**For large institutions with comprehensive risk management requirements**

| Component | Service | Monthly Cost |
|-----------|---------|--------------|
| Database | Supabase Team | $599 |
| AI Features | Heavy usage (~10,000 calls) | $50 |
| Hosting | Vercel Pro | $20 |
| Domain | Annual amortized | $1 |
| **Total** | | **$670/month** |

**Features Included:**
- Everything in Professional, plus:
- Unlimited users and risks
- SOC2 compliance
- SSO/SAML authentication
- 28-day database backups
- 100GB database
- Priority support

---

## Tier 4: Enterprise Plus ($1,150+/month | $13,800+/year)
**For systemically important institutions with custom requirements**

**Features Included:**
- Everything in Enterprise, plus:
- Dedicated database instance
- On-premise deployment option
- Dedicated account manager
- SLA guarantees
- Custom integrations

---

# 3. Cost Optimization Recommendations

## Reduce AI Costs
- Use AI features for initial classification, not every edit
- Cache AI responses for similar risk patterns
- Enable demo mode for training and testing

## Optimize Database Costs
- Regular cleanup of old audit logs (configurable retention)
- Archive historical data after compliance period
- Monitor database size growth

---

# 4. Implementation Costs (One-Time)

| Phase | Effort | Cost Estimate |
|-------|--------|---------------|
| Initial Setup & Configuration | 2-4 hours | Included |
| Taxonomy Customization | 4-8 hours | Optional consulting |
| Data Migration (from spreadsheets) | 4-16 hours | Optional consulting |
| User Training | 2-4 hours | Included (self-service) |
| Custom Integration | Variable | Custom quote |

---

# 5. Summary

| Tier | Monthly | Annual | Best For |
|------|---------|--------|----------|
| **Starter** | $26 | $312 | Small teams, startups |
| **Professional** | $61 | $732 | Mid-size organizations |
| **Enterprise** | $670 | $8,040 | Large institutions |
| **Enterprise Plus** | $1,150+ | $13,800+ | Systemically important |

---

# Appendix A: GRC Market Pricing Comparison

## Market Overview

| Platform | Annual Cost Range | Target Market | Implementation Time |
|----------|------------------|---------------|---------------------|
| **MinRisk** | **$312 - $8,040** | SMB to Enterprise | Hours |
| **Hyperproof** | $12,000 - $99,700 | SMB to Mid-Enterprise | Weeks |
| **LogicGate** | $13,765 - $130,041 | Mid-Enterprise | 4-12 weeks |
| **Archer (RSA)** | $14,000 - $55,000+ | Mid to Large Enterprise | 3-6 months |
| **ServiceNow GRC** | $40,000 - $500,000+ | Large Enterprise | 6-12 months |
| **MetricStream** | $75,000 - $1,000,000+ | Large/Global Enterprise | 6-18 months |

## Feature Capability Matrix

| Capability | MinRisk | Hyperproof | LogicGate | Archer | ServiceNow | MetricStream |
|------------|---------|------------|-----------|--------|------------|--------------|
| Risk Register | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Risk Taxonomy | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Controls Library | ✅ DIME | ⚠️ Basic | ✅ | ✅ | ✅ | ✅ |
| Control Effectiveness | ✅ DIME | ⚠️ Limited | ✅ | ✅ | ✅ | ✅ |
| Residual Risk Calc | ✅ Auto | ❌ | ⚠️ | ✅ | ✅ | ✅ |
| KRI Monitoring | ✅ | ⚠️ Limited | ✅ | ✅ | ✅ | ✅ |
| Risk Appetite | ✅ 4-Tier | ⚠️ Basic | ✅ | ✅ | ✅ | ✅ |
| Tolerance Metrics | ✅ 4 Types | ❌ | ⚠️ | ✅ | ✅ | ✅ |
| Incident Management | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| AI Risk Mapping | ✅ | ❌ | ❌ | ❌ | ⚠️ | ⚠️ |
| AI Classifications | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| AI Control Suggestions | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Risk Intelligence | ✅ RSS+AI | ❌ | ❌ | ⚠️ | ⚠️ | ✅ |
| Period/QoQ Archiving | ✅ | ⚠️ | ✅ | ✅ | ✅ | ✅ |
| Audit Trail | ✅ DB-Level | ✅ | ✅ | ✅ | ✅ | ✅ |
| SOC2 Compliance | ✅ Enterprise | ✅ | ✅ | ✅ | ✅ | ✅ |
| SSO/SAML | ✅ Enterprise | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Compliance Module** | ❌ Roadmap | ✅ Core | ✅ | ✅ | ✅ | ✅ |
| **Vendor Risk (VRM)** | ❌ Roadmap | ⚠️ | ✅ | ✅ | ✅ | ✅ |
| **Policy Management** | ❌ Roadmap | ⚠️ | ✅ | ✅ | ✅ | ✅ |
| **Audit Management** | ❌ Roadmap | ✅ Core | ✅ | ✅ | ✅ | ✅ |

**Legend:** ✅ Full | ⚠️ Limited | ❌ Not Available

## Total Cost of Ownership (3-Year)

| Platform | License (3yr) | Implementation | Total 3-Year TCO |
|----------|---------------|----------------|------------------|
| **MinRisk Pro** | $2,196 | $0 | **$2,196** |
| **MinRisk Enterprise** | $24,120 | $0 | **$24,120** |
| Hyperproof | $36,000-$150,000 | $5,000-$25,000 | $41,000-$175,000 |
| LogicGate | $40,000-$390,000 | $20,000-$100,000 | $60,000-$490,000 |
| Archer | $42,000-$165,000 | $50,000-$200,000 | $92,000-$365,000 |
| ServiceNow | $120,000-$1,500,000 | $100,000-$500,000 | $220,000-$2,000,000 |
| MetricStream | $225,000-$3,000,000 | $200,000-$1,000,000 | $425,000-$4,000,000 |

## MinRisk Competitive Advantage

| Differentiator | MinRisk | Industry Standard |
|----------------|---------|-------------------|
| Time to Deploy | Hours | Months |
| Implementation Cost | $0 (self-service) | 1-3x license cost |
| AI Features | Native, included | Add-on or absent |
| Price/User | ~$5-13/user/month | $50-500/user/month |
| Annual Contract | Month-to-month available | Annual minimum |
| Hidden Costs | None | Professional services |

---

**Contact Information**

For custom pricing, enterprise agreements, or implementation consulting, please contact:

[Your Contact Details Here]

---

*Prices based on January 2026 vendor pricing. Actual costs may vary based on usage patterns and vendor pricing changes.*
