# QA Report — Cymek MVP (CYM-7)

**Date:** 2026-06-17
**Status:** Test infrastructure complete, all basic tests passing
**Agent:** QA Engineer (ae714a4c)

---

## Summary

26 tests passing across 5 JS/TS packages + 1 Python service. Test infrastructure, CI pipeline, and design compliance audit tooling are in place. Full integration/smoke/performance tests are blocked on service implementation (CYM-2 through CYM-5).

---

## Test Results

| Package | Tests | Status |
|---|---|---|
| `@cymek/shared` | 16 | ✅ All pass |
| `@cymek/orchestrator` | 5 | ✅ All pass |
| `@cymek/db` | 1 | ✅ All pass |
| `@cymek/web` | 1 | ✅ All pass |
| `@cymek/embed` | 1 | ✅ All pass |
| Python sidecar | 2 | ✅ All pass |
| **Total** | **26** | **✅ 100%** |

---

## Test Infrastructure Created

### JS/TS (Vitest)
- `vitest.workspace.ts` — root workspace config
- `packages/shared/vitest.config.ts` + 2 test files (constants, exports)
- `packages/db/vitest.config.ts` + 1 test file (schema exports)
- `packages/embed/vitest.config.ts` + 1 test file
- `apps/orchestrator/vitest.config.ts` + 2 test files (health, integration skeleton)
- `apps/web/vitest.config.ts` + 1 test file (layout)

### Python (pytest)
- `apps/sidecar/pyproject.toml` — pytest configuration
- `apps/sidecar/tests/test_health.py` — FastAPI health endpoint test
- `apps/sidecar/tests/test_extraction.py` — placeholder + fixture validation
- `apps/sidecar/tests/fixtures/sample.txt` — sample document

### CI Pipeline
- `.github/workflows/ci.yml` — 4 jobs: typecheck, JS tests, Python tests, design audit
- Design compliance audit runs via `scripts/audit-design-tokens.ts`

### Design Compliance Audit
- `scripts/audit-design-tokens.ts` — scans all `.ts`, `.tsx`, `.css` files
- Checks: hardcoded colors against DESIGN.md tokens, twilight stripe presence in layouts
- Skips: `node_modules`, `dist`, `.next`, `__tests__`

---

## Coverage by Acceptance Criteria

| Criteria | Status | Notes |
|---|---|---|
| Integration tests pass for all services | 🟡 Partial | Unit tests pass; integration tests need pipeline code |
| Pipeline smoke test passes | 🔴 Blocked | Needs CYM-4 (orchestrator) + CYM-2 (sidecar) |
| No design token violations | 🟡 Partial | Audit tool runs; 2 known violations (expected — CYM-3 not done) |
| Chat latency within thresholds | 🔴 Blocked | Needs chat endpoint (CYM-4) |
| Test coverage report generated | 🟡 Ready | CI generates test reports on each run |

---

## Known Design Violations

1. `apps/web/app/globals.css:8-10` — hardcoded colors `#F8F6F0`, `#1A1525` used directly instead of Tailwind theme tokens
2. `apps/web/app/layout.tsx` — no twilight stripe gradient present
3. `apps/web/app/globals.css` — no twilight stripe gradient in base styles

**Expected:** CYM-3 (Design System) is still `todo`. These will be resolved when the Twilight design system is implemented.

---

## Next Steps When Code Lands

1. **After CYM-2 (Sidecar):** Write extraction unit tests — `test_pdf_extraction.py`, `test_txt_extraction.py`, `test_docx_extraction.py`, `test_url_extraction.py`
2. **After CYM-4 (Orchestrator):** Write pipeline integration tests — SSE stream ordering, eval threshold logic, retry behavior
3. **After CYM-3 (Design System):** Run design audit, fix violations, add visual regression tests
4. **After CYM-5 (Frontend):** Write responsive layout tests, page-level integration tests
5. **After CYM-6 (Embed):** Write widget interaction tests (already has placeholder)
6. **Final:** Full pipeline smoke test + performance benchmarks

---

## Files Created

| File | Purpose |
|---|---|
| `packages/shared/vitest.config.ts` | Vitest config |
| `packages/shared/__tests__/constants.test.ts` | 15 constant value tests |
| `packages/shared/__tests__/types.test.ts` | Module export test |
| `packages/db/vitest.config.ts` | Vitest config |
| `packages/db/__tests__/schema.test.ts` | Schema export test |
| `packages/embed/vitest.config.ts` | Vitest config |
| `packages/embed/__tests__/placeholder.test.ts` | Placeholder test |
| `apps/orchestrator/vitest.config.ts` | Vitest config |
| `apps/orchestrator/__tests__/health.test.ts` | Health endpoint test |
| `apps/orchestrator/__tests__/integration.test.ts` | Pipeline smoke test skeleton |
| `apps/web/vitest.config.ts` | Vitest config |
| `apps/web/__tests__/layout.test.tsx` | Layout export test |
| `apps/sidecar/pyproject.toml` | Pytest config |
| `apps/sidecar/tests/__init__.py` | Test package init |
| `apps/sidecar/tests/test_health.py` | FastAPI health test |
| `apps/sidecar/tests/test_extraction.py` | Extraction fixture test |
| `apps/sidecar/tests/fixtures/sample.txt` | Sample document fixture |
| `scripts/audit-design-tokens.ts` | Design compliance audit script |
| `vitest.workspace.ts` | Workspace-level vitest config |
| `.github/workflows/ci.yml` | Updated CI with test jobs |
