# QA results at source package creation — 2026-11-15

| QA gate | Result | Evidence | Scope |
|---|---|---|---|
| JS syntax | PASS | `node --check js/*.js sw.js` | Parse only; not runtime |
| Unit tests | PASS (7/7) | `npm test` | ZIP roundtrip, CRC, catalog whitelist, HTML escaping, SHA256, transition mapping, CSV quoting |
| Public catalog whitelist | PASS | `npm run check:catalog` | Initial empty catalog only |
| HTML references and IDs | PASS | Python stdlib static parse | All three pages, local references, duplicate IDs |
| HTTP static file response | PASS | `curl -I http://127.0.0.1:8765/owner.html` | HTTP 200 from development server, not UI |
| Full browser journey | BLOCKED | Chromium/Playwright navigation error `ERR_BLOCKED_BY_ADMINISTRATOR` on local HTTP, file and test URLs | Not treated as PASS; runnable smoke test included |
| New GitHub repo creation | NOT_DONE | Connected GitHub actions in current environment did not expose `create_repository` | ZIP prepared; user can create repository through GitHub UI or Windows script |
| Netlify deployed site | NOT_RUN | No authorized Netlify deployment performed | Pending user repository and Netlify connection |
| Real email, bank payment, buyer | NOT_RUN | No external participants or bank transactions | Must be independently verified |

The README and `docs/TESTING.md` include acceptance criteria. Do not infer customer demand, paid conversion, rights clearance or legal compliance from test data.


## v1.2 — owner public email input / catalog export enhancement

| QA gate | Result | Evidence / limitation |
|---|---|---|
| Owner email input visibly accessible | PASS (static layout review) | `owner.html` has a permanently visible `STEP 1` form above `STEP 2` JSON download |
| Email saved and synced to settings | PASS (Chromium DOM mock) | `python3 tests/owner_email_dom_smoke.py` runs the real HTML and actual `js/owner.js` event handlers with an **in-memory DB stub**; not a real IndexedDB test |
| Export disabled when no email | PASS (Chromium DOM mock) | Disabled without email; becomes enabled after email form save |
| Published owner email in JSON | PASS (Chromium DOM mock) | `publisher.email` matches owner email, `assets` contains only approved promo data |
| Buyer email/private description leakage | PASS (Chromium DOM mock) | Absent from exported JSON sample |
| JavaScript syntax | PASS | `node --check` for all JS files |
| Unit tests | PASS (7/7) | `npm run preflight` |
| Full persistent IndexedDB and end-to-end browser E2E | BLOCKED | Browser navigation to `http://127.0.0.1` and test HTTPS origins returns `ERR_BLOCKED_BY_ADMINISTRATOR` in this sandbox; the stand-alone browser smoke test is included for local execution |
| Existing Netlify site smoke test and email delivery | NOT_RUN | Requires deploy to owner's site and a manually operated email client |

Do not treat the mocked DOM test as evidence of production deployment, cross-browser compatibility, user email delivery, or bank transfer. Use `docs/TESTING.md` to complete field verification after deployment.
