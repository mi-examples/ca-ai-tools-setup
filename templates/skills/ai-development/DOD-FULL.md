# Definition of Done — Portal Page Development (full reference)

> Living document — update when team policy changes.

## Code Quality Requirements

- All code follows established coding standards and style guides — [coding standards gist](https://gist.github.com/cdiggins/338a6c31b43f5d88a73bd2aafb4204fb).
  - Consistent naming for variables, functions, classes, files.
  - Indentation/formatting per language guidelines.
  - Max line length (typically 80–120 characters).
  - Sensible whitespace and line breaks; consistent module layout.
- **Code review** with at least **two** team members:
  - PR reviews completed; all comments addressed.
  - Checklist covers logic/edge cases, errors/logging, security, performance, resources, integrations.
  - Final approval by authorized members; discussion documented on the PR.
- **Comments / docs:** public APIs documented (purpose, params, returns, examples, errors). Comments explain non-obvious business logic only; no redundant comments. TODOs resolved or tracked as debt. README/docs updated.
- **Complexity:** cyclomatic complexity, function length, nesting depth, class size, inheritance depth, cognitive complexity within team thresholds. Duplication below threshold (e.g. &lt;5%).
- **Static analysis:** no critical/high issues; medium issues triaged (fix, defer with justification, or debt ticket). Coverage thresholds (line/branch/function) per team.
- **Technical debt:** intentional shortcuts tracked with description, justification, impact, timeline, risk, severity, code links.
- **Hygiene:** remove debug logs, commented-out blocks, dead code, unused imports, dev-only config, hardcoded magic without constants, temporary hacks without debt items; isolate test-only code; no secrets in comments/strings.

## Testing Requirements

- **Unit tests** (e.g. Jest + React Testing Library), **≥80%** coverage where required:
  - Custom hooks; components: initial render, props, interactions, state, errors, lifecycle, mocked deps; Arrange-Act-Assert; snapshots where stable; no leaks/warnings.
- **Integration tests:** composition, context, router, forms, APIs, error boundaries, loading; MSW for APIs; auth flows; success/error paths.
- **E2E** (Cypress or Playwright) for critical journeys: auth, navigation, forms, CRUD, uploads, settings; staging; visual regression where needed; network errors; cross-browser baseline.
- **Cross-browser:** Chrome, Firefox, Safari, Edge (latest two versions each); visuals; touch on mobile browsers; fallbacks; no browser-specific console noise.
- **Responsive:** breakpoints (e.g. 320, 375, 428, 768, 834, 1024, 1280, 1440); real iOS/Android devices; touch targets; no horizontal scroll; font/image behavior.
- **Performance:** Lighthouse targets (e.g. Performance/Accessibility/Best Practices/SEO &gt;90); React profiler; bundle budgets; FCP/TTI/TBT budgets; memory checks; network waterfall; images.
- **Security testing:** XSS, CSRF, injection, authn/z, dependency scans, headers, sanitization of errors/API data.
- **Accessibility:** axe/WAVE/Lighthouse; keyboard, screen reader, focus, ARIA, contrast, scaling; semantic HTML; alt text; forms; dynamic announcements; skip links; heading hierarchy; touch targets.
- **Other:** error tracking (e.g. Sentry), analytics, third-party integrations, source maps, env parity with prod, CI runs all suites, test docs updated.

## Documentation Requirements

- Feature docs in team wiki; API docs if applicable; README for config/setup; release notes; known issues; user docs if applicable.

## UI/UX Requirements

- Matches approved mockups; empty/loading/error/success states; responsive; smooth motion; contrast; design system consistency; copy reviewed.

## Performance Requirements

- Page load under target on reference devices/networks; Lighthouse thresholds; optimized assets; caching; no memory leaks.

## Security Requirements

- OWASP Top 10 awareness; security headers; input validation; XSS/CSRF; encryption for sensitive data; authn/z on APIs.

## DevOps Requirements

- Feature branch merged per process; **CI/CD green**; deployment docs; monitoring/logging; env vars documented; migrations tested; backup/rollback documented.

## Product Requirements

- PO review; acceptance criteria verified; feature flags; analytics; A/B if applicable; legal (privacy/terms) if applicable.

## Release Readiness

- No blocking bugs; critical/high resolved; performance/load met; rollback plan; stakeholder sign-off.

## Sign-off Requirements

- Dev, QA, PO, tech lead, UX (for UI), security (sensitive features) per policy.

## Additional Considerations

- Third-party integrations tested; error tracking; user feedback; compliance; scaling.

---

*This file mirrors team Definition of Done policy. Trim or expand bullets per initiative scope — not every line applies to every PR.*
