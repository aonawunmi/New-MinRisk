# MinRisk — Lessons Learned

**Purpose:** Patterns to avoid repeating mistakes. Updated after every user correction.

---

## Development Patterns

1. **Check git-tracked files first** when local works but production doesn't — compiled `.js` files in `src/` caused invisible production bugs (2025-12-05)
2. **Run `npm run build`** before declaring a fix — TypeScript errors caught at build time, not just dev server
3. **Test ALL affected locations** — a label change in ControlForm.tsx must also update RiskForm.tsx (2025-12-05)
4. **Edge Functions need secrets set separately** — `ANTHROPIC_API_KEY` must be configured in Supabase dashboard, not just `.env.development`
5. **Always verify which Supabase project is linked** before deploying Edge Functions — staging vs production
6. **RLS blocks cross-user queries** — use Edge Functions with service role for owner enrichment, never expose service role to client
7. **Clerk Dev Mode doesn't deliver emails reliably** — invitation flow requires Production mode or custom email provider
8. **Old Clerk instances break on third-party cookie deprecation** — Pre-Dec 2022 instances need "URL-based session syncing" toggle. If toggle missing, create a new Clerk app. Changing instance requires updating: `.env.local`, Vercel Preview env var, Supabase Third-Party Auth domain. Users must re-register (2026-02-25)
9. **Never use `LIMIT 1` without explicit WHERE for self-lookup queries** — When RLS grants visibility to multiple rows (super_admin sees all), `LIMIT 1` returns the wrong profile. Always add `.eq('clerk_id', clerkUser.id)` for profile self-lookups (2026-02-25)
10. **`claim_profile_by_email` is not in source control** — Critical DB function applied directly, not in any migration file. Must be committed to prevent reproducibility issues (2026-02-25)

---

## Architecture Decisions

1. **Governance vs Operations separation** — KRI Monitoring is operational (measure), Appetite & Tolerance is governance (decide acceptable)
2. **Parent-level-only appetite** — Board sets appetite at parent category level, subcategories inherit
3. **Dual AI config files** — `src/config/ai-models.ts` (client) and `supabase/functions/_shared/ai-models.ts` (Edge Functions) — keep in sync
4. **Three admin roles** — `super_admin`, `primary_admin`, `secondary_admin` — always check all three

---

_Updated: 2026-02-25_
