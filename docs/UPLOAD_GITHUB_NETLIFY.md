# New GitHub repository + Netlify deployment (Windows)

Recommended repository name: `ANN-KOREA/GARD-P2P-Asset-Market`.

## A. Web UI (GitHub CLI not required)

1. Open https://github.com/new, owner **ANN-KOREA**, name **GARD-P2P-Asset-Market**.
2. Set **Private** for source-code confidentiality (Netlify can deploy a public site from a private repo when your integration has access). Leave **Add a README**, **.gitignore** and **license** unchecked because those files are already in this package.
3. Click **Create repository**.
4. Extract `GARD_P2P_Asset_Market_Email_Setup_v1.2.zip` to a local directory. **Do not upload the ZIP as one file.**
5. In the new repository choose **uploading an existing file** and upload all extracted files and folders including `js`, `docs`, `scripts`, `tests` and `.github/workflows`. Note: some operating-system upload interfaces hide dotfiles/folders; use Git CLI if the `.github` directory is omitted.
6. Commit to `main`. The repo should contain **`index.html`, `owner.html`, `buyer.html`, `catalog.json`, `netlify.toml` at its root**.

## B. Optional one-command creation from Windows PowerShell

Requires Git (https://git-scm.com/downloads), GitHub CLI (https://cli.github.com/) and authentication (`gh auth login`).

In the extracted project folder, run:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\Create-GitHub-Repo-Windows.ps1
```

The PowerShell script creates the **new** `ANN-KOREA/GARD-P2P-Asset-Market` repository and pushes all project files if the repository does not already exist and the account has sufficient permissions. Default visibility: **private**. Use `-Public` to intentionally create a public source repository. It does **not** create the Netlify site or transfer private assets.

## C. Netlify

1. Netlify team dashboard → Add new project → Import an existing project → GitHub.
2. Grant repository access and select `ANN-KOREA/GARD-P2P-Asset-Market`.
3. Build command **empty**, publish directory **`.`**, base directory empty. `netlify.toml` includes these settings.
4. Deploy; verify pages `https://<your-netlify-domain>/`, `/owner.html`, `/buyer.html`.
5. Register your own **public contact email** in `/owner.html` → **STEP 1: 오너 거래 문의용 이메일 등록** and click **이메일 저장**. The settings tab is an alternative.
6. Create a real asset in owner local storage, explicitly approve its promo metadata and **save**. Use the prominent `↓ 승인 자산 JSON 다운로드` button below the dashboard metrics or the `공개·배포` tab to download `catalog.json`. Commit only that JSON in GitHub. Netlify then performs a new deployment.
7. Use `docs/TESTING.md` and record real-device QA results. Tests not executed remain `NOT_RUN`.

## Note on privacy

**Never commit** owner backup JSON, buyer backup JSON, raw paid ZIPs, customer emails, bank receipts, or unpublished original assets to GitHub (public *or* private), unless there is an independently assessed reason and security plan. The site must read only the approved promotional catalog.

## v1.1 — Updating an existing Netlify site

If v1.0 is already deployed at Netlify, do not create another project. Replace the **existing repository source files** with the v1.1 package (preserve your real `catalog.json` if it contains approved data; do not overwrite it with this ZIP's empty sample). Commit the changes and check the Netlify Deploys view. If the site was originally deployed by **manual ZIP drag-and-drop**, deploy the extracted v1.1 folder again in the same Netlify project.

**Important:** Replacing HTML/JS/static source files does **not** transfer the IndexedDB owner assets from one browser origin to another. Keep the existing Netlify URL if possible and back up the owner data before changing sites.

## v1.2 — Updating the existing deployed app without losing assets

If you have already entered real assets in the browser, first open the **same Netlify owner URL** and use **백업·복원 → 전체 백업 JSON 내보내기**. Save it privately (never commit it to GitHub). Replace the prior app's HTML/JS/CSS files in your repository with the corresponding files from v1.2. **If your current `catalog.json` contains real public assets, DO NOT overwrite it with the empty `catalog.json` from the upgrade ZIP.** The public file should be replaced only by a newly exported approved catalog. Keep the same Netlify site URL and the same browser profile; IndexedDB then remains accessible. Check **STEP 1** and **STEP 2** on the updated owner page. If an older page persists, use Ctrl+Shift+R or close and reopen the tab once the new Netlify deployment succeeds.

The owner inbox email is public; the buyer email is private to local deal records. Saving an address locally does not update the deployed `catalog.json` until you upload the newly exported file.
