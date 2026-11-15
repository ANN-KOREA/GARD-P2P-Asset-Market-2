# GARD P2P security & disclosure controls

## Threat boundaries

- Public `catalog.json` contains only an owner-approved whitelist: ID, title, summary, category, tags, evidence summary, price policy and offer, license summary, version, approval metadata, publisher name and **public** inquiry email. Never publish original files, buyer emails, deal ledger, or bank evidence.
- No backend endpoints, analytics, external fonts, trackers, remote scripts, payment API, or AI API. No login means no protection for someone with physical access to the same browser profile; consider OS-level disk encryption and a separate browser profile.
- No website can safely hide a secret in frontend JavaScript. The public pages are not an authorization mechanism.
- Email and manual bank transfer are outside the app's trust boundary. `PAID_CONFIRMED` represents an **explicit human claim backed by a local reference**, not a bank API attestation.
- ZIP SHA-256 and CRC32 detect accidental tampering and inconsistency, not a malicious seller who changes both file and manifest. For authenticity, independent signatures and verified identities would be a future feature.
- Backups are JSON with embedded file bytes encoded in base64. They are **not encrypted**. Store in encrypted disk/cloud vault controlled by the owner. Do not upload them to a public repository.
- GitHub and Netlify site URLs, publication metadata, and owner email can be indexed or scraped. Recommend a dedicated public contact mailbox. Redaction from later catalogs cannot withdraw previously copied information.
- Use an isolated test profile and synthetic entries; never mistake simulated transactions for actual paid evidence.

## Known MVP constraints

- IndexedDB storage quotas differ by browser/device, attachment limit is 20 MB. ZIP intake accepts STORE (no compression), max 60 MB. This format is readable by common unzip apps; third-party deflate ZIPs are not supported by the buyer parser.
- Identity, account ownership, intellectual property title, tax treatment, payment confirmation, anti-fraud screening, and consumer rights are outside the automated verifier.
- The agreed asset version and file hash are snapshotted at `AGREED`. A later asset edit blocks delivery until the parties make a new agreement; this MVP does not provide an automated change-agreement flow.
- All pages share the site's origin; to keep owner/buyer data separate, use separate devices/browser profiles or separate origins. The app's storage records are logically separate but not protected from same-origin scripts.

- v1.2: the owner's public contact email is a **publicly published field** (`publisher.email`). Do not use an address you intend to keep private. Buyer emails remain exclusively in local owner deal records.
