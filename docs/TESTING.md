# QA · acceptance checklist (no automatic PASS)

**QA rule:** every item is `PASS` only if observed on the actual target deployment with evidence. `NOT_RUN` is not PASS. Synthetic data is not a real-world transaction.

| ID | Test | Acceptance | Default |
|---|---|---|---|
| QA-01 | local app loads | pages and modules load without console errors at localhost HTTPS/HTTP | NOT_RUN |
| QA-02 | owner settings | email/name persist after reload; public email configurable | NOT_RUN |
| QA-03 | private asset | draft asset absent in exported catalog | NOT_RUN |
| QA-04 | promotion approval | only `PROMOTION + approved` appears; no file bytes, email inquiries, deal logs | NOT_RUN |
| QA-05 | publication | GitHub catalog commit appears in live Netlify site | NOT_RUN |
| QA-06 | storefront enquiry | correct email recipient/asset ID/body appears in mail app (desktop/mobile) | NOT_RUN |
| QA-07 | inquiry record | owner can enter buyer email and deal notes; auto intake is NOT claimed | NOT_RUN |
| QA-08 | agreement gate | `AGREED` requires quotation reference & human confirmation evidence | NOT_RUN |
| QA-09 | payment gate | `PAID_CONFIRMED` cannot pass without bank record check | NOT_RUN |
| QA-10 | delivery gate | cannot create ZIP before paid; cannot mark delivered before ZIP + human confirmation | NOT_RUN |
| QA-11 | buyer hash | valid ZIP passes, tampered payload fails SHA-256/CRC32 | NOT_RUN |
| QA-12 | owner backup | backup + restore yields same assets/deals/files in separate clean browser profile | NOT_RUN |
| QA-13 | buyer backup | backup + restore yields same buyer assets | NOT_RUN |
| QA-14 | offline | after first visit + SW activation, `owner.html` and `buyer.html` load offline | NOT_RUN |
| QA-15 | privacy | browser DevTools Network: no private record transmitted; no third-party API | NOT_RUN |
| QA-16 | revoke | republish catalog without asset; live Netlify site stops listing it | NOT_RUN |
| QA-17 | actual payment | actual bank entry independently checked and matched to transaction | NOT_RUN |
| QA-18 | actual external buyer | external buyer independently imports ZIP and confirms receipt | NOT_RUN |

## Target deployment smoke steps

1. Export the local backup, keep it separate; do not put it on GitHub.
2. Register private draft asset with an attachment, create a new promo asset, explicitly approve promo.
3. Download `catalog.json`; inspect for private description, files, buyer email, deal notes (must be absent).
4. Replace repo `catalog.json`, wait for Netlify deploy, refresh public site.
5. Open inquiry button in mail app and check generated title/body; send only with deliberate user action.
6. In owner app record simulated deal; test forbidden status transitions.
7. Require human-reported bank check evidence before `PAID_CONFIRMED`; use synthetic test labels in nonproduction QA.
8. Create ZIP and import through buyer app; verify file download matches source.
9. Mutate an asset byte or a CRC field and check failure; SHA verifies against manifest only, not sender identity.
10. Test backup/restore in clean private browser profile and verify record counts, hashes and emails.
11. Verify offline owner/buyer after initial online loading; public catalog deliberately does not cache for offline listing.

## Reporting template

`Test ID / device / browser / URL / time / result (PASS, FAIL, NOT_RUN, BLOCKED) / observation / evidence / owner / next action`

Never claim that an automated unit test proves an actual bank deposit, copyright, remote Netlify deployment, legal compliance, or a successful real-world sale.

## v1.2 — Email configuration user acceptance

1. Open `/owner.html` with a fresh browser profile. Verify the visible STEP 1 **오너 거래 문의용 이메일 등록** box and that public catalog export is disabled without an email.
2. Enter a synthetic inbox (e.g. qa-owner@example.org) and press **이메일 저장**. Verify the status changes to saved and export becomes enabled.
3. Open **설정·감사기록**, verify the same email appears. Edit it there and verify STEP 1 also updates.
4. Reload the page and verify the email persists in IndexedDB.
5. Approve a synthetic asset, download `catalog.json` and inspect `publisher.email`. It must equal the saved owner address; private original description and buyer emails must be absent.
6. Replace the deployed `catalog.json` in GitHub and verify Netlify's storefront email inquiry link points to the saved owner address. This last step requires a real deployment and is **not** covered by local tests.
