# GARD 3대 상품 공통 제작엔진 · 기존 P2P 웹앱 추가형 업데이트

**버전**: v1.0 / 2026-11-20  
**기준 저장소**: `ANN-KOREA/GARD-P2P-Asset-Market-2` (기존 v1.2.0 설계)  
**업데이트 방식**: 비파괴 추가형(PATCH). 기존 `catalog.json`, `js/db.js`, `js/owner.js`, `js/buyer.js`, `js/storefront.js`를 교체하지 않습니다.

## 1. 무엇이 업데이트되는가?

| 신규 경로 | 역할 | 실제 실행 범위 |
|---|---|---|
| `/products.html` | 공개 3대 상품 전시장 | 49만원·300만원·500만원 가격/범위 안내, 기존 공개 카탈로그 이메일로 상담 초안 생성 |
| `/product-studio.html` | 오너 상품 제작 원장 | 상품 프로젝트·Fact 분류·증거수준·AI/인간 역할·권리·책임·QA·승인용 JSON 내보내기 |
| `/product-review.html` | 구매자/검토자 독립 검수 | 검토용 JSON 읽기, 현재 파일 SHA-256 계산, 시험별 별도 검토, 검토 결과 JSON 인도 |
| `/js/gard-product-core.mjs` | 3상품 공통엔진 | SKU, 공통 구조, QA 기본값, 검수판정, 비공개 필드 제외 인도 생성 |
| `/js/gard-product-db.mjs` | 신규 로컬 저장 | 기존 P2P 데이터와 분리한 `gard-product-studio-2026-v1` IndexedDB |
| `/js/gard-product-studio.mjs` | 제작 원장 동작 | 기존 P2P 자산 *ID/제목만* 읽기, 프로젝트 CRUD, Fact2Asset v1 JSON 가져오기 |
| `/js/gard-product-review.mjs` | 인도 검수 동작 | 자체 주장과 독립 검토를 분리. 근거 없는 PASS 거부 |
| `/styles-products.css` | 새 화면 스타일 | 기존 스타일과 클래스 충돌을 최소화한 별도 CSS |
| `/apply_update.py` | 기존 내비게이션 메뉴 확장 | 기존 세 HTML의 `navlinks` 메뉴에 새 경로 추가. 나머지 내용 보존 |

**중요:** 이 패키지는 기존 저장소를 대체할 전체 배포 ZIP이 아닙니다. 기존 파일 위에 *추가*하는 업데이트입니다. `catalog.json`이 들어 있지 않은 것은 기존 공개 자산을 보호하기 위한 의도적 설계입니다.

## 2. Windows · GitHub → Netlify 갱신 순서

1. 기존 저장소의 **최신 파일을 다운로드하거나 `git clone`** 합니다. 기존 로컬 수정과 공개 카탈로그를 먼저 백업하세요. 가능하면 새 Git 브랜치에서 적용합니다.
2. 이 ZIP을 압축 해제하고 `products.html`, `product-studio.html`, `product-review.html`, `styles-products.css`, `js/` 안의 `gard-product-*.mjs`, `apply_update.py` 등을 기존 저장소 루트에 추가합니다. 기존 같은 이름의 파일이 있다면 덮어쓰기 전에 버전을 비교합니다.
3. 기존 저장소의 `index.html`, `owner.html`, `buyer.html` 메뉴에 새 상품 링크를 추가합니다. Python 설치 시 기존 저장소 루트에서 `py apply_update.py .`를 실행하면 자동으로 메뉴만 보강합니다. 먼저 `py apply_update.py . --dry-run`으로 검사할 수 있습니다.
4. `catalog.json`, `js/db.js`, `js/owner.js`, `README.md`, 거래/원본 데이터 파일은 수정하거나 교체하지 마세요.
5. 로컬 시험: `py -m http.server 8080` (또는 Python 설치 환경의 `python -m http.server 8080`)을 실행하여 `http://localhost:8080/products.html`, `/product-studio.html`, `/product-review.html`을 확인합니다. `file://` 직접 열기는 ESM 모듈 정책 때문에 실패할 수 있습니다.
6. Node.js 20+가 있다면 `node --test tests/test-product-core.mjs`를 실행합니다. 기존 저장소 검증도 `npm run preflight`로 다시 실행하세요.
7. 추가·변경 파일을 GitHub의 **별도 테스트 브랜치**에 커밋하고, 기존 Netlify 사이트의 Deploy Preview에서 3개 페이지와 기존 전시장·오너·구매자 앱을 확인합니다.
8. 확인 후 기본 브랜치에 병합하여 Netlify 배포를 완료합니다. 실제 배포 전까지 공개사이트가 업데이트되었다고 간주하지 마세요.

### 명령 예시 (기존 저장소 폴더에서)

```powershell
py apply_update.py . --dry-run
py apply_update.py .
node --test tests/test-product-core.mjs
npm run preflight
py -m http.server 8080
```

Python이 없다면 기존 HTML 세 파일의 `<nav class="navlinks"> ... </nav>` 내부에 다음 링크만 수동 추가해도 됩니다.

```html
<a href="./products.html">3대 상품</a>
<a href="./product-studio.html">상품 제작 원장</a>
<a href="./product-review.html">상품 독립검수</a>
```

## 3. 기존 GARD 공통기술 연결

- 기존 `owner.html`의 자산 ID와 제목을 **읽기 전용으로 연결**할 수 있습니다. 파일·거래 이력·기존 원장을 새로운 제품 원장에 자동 복제하지 않습니다.
- 기존 자산 전시장은 예전 `catalog.json` 구조를 계속 읽습니다. 새 상품 공개 페이지는 기존 `catalog.json`의 `publisher.email`을 **읽기만** 합니다.
- 신규 프로젝트는 별도의 `gard-product-studio-2026-v1` IndexedDB에 저장합니다. 기존 `gard-p2p-market-2026-v1` 데이터베이스 및 구조를 변경하지 않습니다.
- 이전에 만든 `GARD_Fact2Asset_OWNER_PRIVATE_v1_20261119.zip` 내 Owner JSON(`schema_version: gard-fact2asset-v1`)을 **비공개 프로젝트 초안**으로 가져올 수 있습니다. 이관 시 인간 승인/권리 확인/공개 승인은 자동 적용하지 않습니다.

## 4. 3상품을 사용하는 단계

**49만원 개인 키트**: 개인이 자신의 경험을 등록 → PF·EF·ACT·PART 등 분류 → 증거 수준과 인간 판단을 구분 → JSON 백업·복구와 비공개 자료 공개 방지 시험.

**300만원 워크숍**: 계약·교육 대상 프로젝트 생성 → 참여자가 작성한 사실과 결과를 기록 → 교육 제공 및 독립 재현 시험을 별도 QA에 기록 → 능력 이전 증거를 정리.

**500만원 30일 PoC**: 계약 범위·기준선 정의 → P01~P10 기술·운영 시험 기록 → 고객 담당자/검토자가 근거 기재 → PASS/CONDITIONAL/FAIL/NOT_TESTED 판단 → 검토용 JSON을 별도 전달.

### 상태 판정 규칙

- 생성 시 모든 시험 `NOT_RUN`.
- 각 PASS에는 **근거 위치**와 **확인자** 입력 필수.
- 시험 미수행이나 PASS 근거 부족이 있으면 전체 `NOT_TESTED`.
- 한 건이라도 FAIL이면 전체 `FAIL`. 한 건 이상 CONDITIONAL이 있으면 전체 `CONDITIONAL`(미수행이 없는 경우).
- 이것은 내부 기록의 논리적 일관성을 검사합니다. 확인자의 신원과 근거 진실성을 증명하지 않습니다.
- `/product-review.html`에서는 오너 측 자체 판정과 다른 독립 검토 내용을 작성하며, 검토자의 실제 신원·독립성·서명을 자동 인증하지 않습니다.

## 5. 자료·권리·보안 주의사항

- `/product-studio.html`은 **암호화 금고가 아니며 로그인/서버 인증이 없습니다.** 같은 기기/브라우저 프로필을 다른 사람이 사용하면 정보가 노출될 수 있습니다. 브라우저에서 쿠키/사이트데이터를 지우면 원장이 사라질 수 있으므로 `비공개 전체 백업`을 정기적으로 사용하십시오.
- 공개 GitHub 저장소에는 **비공개 백업 JSON, 환자·건강정보, 고객 개인정보, 계약원본, 영업비밀 파일**을 올리지 마세요.
- `검토용 JSON`은 명시적으로 허용된 공개 필드만 포함하도록 생성하지만, 공개 요약에 사용자가 직접 비밀정보를 써넣을 수 있습니다. 전송 전에 수동 검토가 필수입니다.
- 새 상품 전시장은 결제·계약·이메일 발송을 자동 수행하지 않습니다.
- SHA-256은 파일 바이트 식별을 위한 값이며 신원, 저작권, 계약상 권리, 사실의 진실성을 증명하지 않습니다.
- ICF Personal Factors는 WHO의 공식 세부 코드체계가 아닙니다. GARD는 독자적인 PF-First 사용방식을 제안합니다.
- 이 상품들은 기본적으로 비임상적 지식·실행 자산 제작에 목적이 있습니다. 진단/치료/환자별 예측 기능은 포함하지 않습니다. 다만 실제 이용목적에 따라 규제·개인정보 법률을 별도 검토하세요.

## 6. 갱신 후 실제 확인할 사항

자세한 수용기준은 `docs/PRODUCT_ACCEPTANCE_QA_KO.md`를 확인하세요.

**현재 완료된 시험**: 새 공통엔진의 Node 단위테스트 8건, Python 내비게이션 패치의 신규 적용 및 반복 적용 시험, 정적 페이지 레이아웃 확인.

**현재 완료되지 않은 시험**: 실제 GitHub 저장소에 패치를 병합하고 Netlify 운영 URL에서 E2E 브라우저 시험, 기존 오너/구매자 기능 전체 회귀시험, 보안 침투시험 및 상용 결제·거래.

---
GARD · 기존 자료를 덮어쓰지 않는 추가형 업데이트 / 오너의 최종 승인과 판단권 유지.
