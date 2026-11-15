"""Browser smoke test of real owner -> public JSON -> email -> paid deal -> ZIP -> buyer flow.
Run with `python3 tests/browser_smoke.py` after `python3 -m http.server 8765`.
Requires Python Playwright and a Chromium browser, not required by production runtime.
Tests only synthetic transactions; NEVER proves an actual sale or bank payment.
"""
import json,hashlib,zipfile,tempfile,os
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT=Path(__file__).resolve().parent.parent
URL=os.environ.get('GARD_BASE_URL','http://127.0.0.1:8765')
original_catalog=(ROOT/'catalog.json').read_bytes()
with tempfile.TemporaryDirectory() as tmp:
    target=Path(tmp)
    attachment=target/'synthetic-src.txt'
    attachment.write_text('SYNTHETIC BROWSER TEST DATA. NOT A REAL ASSET.\n',encoding='utf-8')
    try:
        with sync_playwright() as p:
            browser=p.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox'])
            context=browser.new_context(accept_downloads=True,viewport={'width':1360,'height':940})
            page=context.new_page()
            errors=[]
            page.on('pageerror',lambda e:errors.append(str(e)))
            page.on('dialog',lambda dlg:dlg.accept())
            page.goto(URL+'/owner.html',wait_until='networkidle')
            # New v1.2 inline setup: user can register the owner's public contact email
            # without finding a hidden settings tab. Confirm it syncs to full settings.
            assert page.locator('#quick-owner-email').is_visible()
            assert page.locator('#quick-export-catalog').is_disabled()
            page.locator('#quick-owner-email').fill('qa-owner@example.org')
            page.locator('#quick-save-email').click()
            page.wait_for_function("document.getElementById('quick-email-badge').textContent==='이메일 저장됨'")
            assert page.locator('#quick-export-catalog').is_enabled()
            page.get_by_role('tab',name='설정·감사기록').click()
            assert page.locator('#s-email').input_value()=='qa-owner@example.org'
            page.locator('#s-name').fill('GARD QA 가상 발행자')
            page.locator('#settings-form button[type=submit]').click()
            page.get_by_role('tab',name='자산 제작·관리').click()
            assert page.locator('#quick-owner-email').input_value()=='qa-owner@example.org'
            page.reload(wait_until='networkidle')
            assert page.locator('#quick-owner-email').input_value()=='qa-owner@example.org'
            assert page.locator('#quick-export-catalog').is_enabled()
            page.locator('#a-title').fill('SYNTHETIC 독립형 파일 패키지')
            page.locator('#a-summary').fill('합성 브라우저 동작 검증용 자산')
            page.locator('#a-description').fill('SECRET PRIVATE DESCRIPTION ONLY')
            page.locator('#a-evidence').fill('오직 가상 테스트 데이터임')
            page.locator('#a-category').select_option(label='데이터·JSON')
            page.locator('#a-file').set_input_files(str(attachment))
            page.locator('#a-status').select_option('PROMOTION')
            page.locator('#a-approval').check()
            page.locator('#asset-form button[type=submit]').click()
            page.wait_for_function("document.getElementById('metric-published').textContent==='1'")
            assert page.locator('#quick-export-catalog').is_visible()
            assert '로컬 공개 승인 1건' in page.locator('#quick-publish-status').inner_text()
            with page.expect_download() as di:
                page.locator('#quick-export-catalog').click()
            page.get_by_role('tab',name='공개·배포').click()
            assert page.locator('#export-catalog').is_visible()
            assert '다운로드 요청' in page.locator('#catalog-export-status').inner_text()
            item=di.value; item.save_as(target/'catalog.json')
            public=json.loads((target/'catalog.json').read_text(encoding='utf-8'))
            assert len(public['assets'])==1,public
            assert public['publisher']['email']=='qa-owner@example.org'
            assert 'description' not in public['assets'][0]
            assert 'SECRET PRIVATE' not in json.dumps(public)
            assert 'buyerEmail' not in json.dumps(public)
            asset_id=public['assets'][0]['id']
            (ROOT/'catalog.json').write_bytes((target/'catalog.json').read_bytes())
            showroom=context.new_page()
            showroom.goto(URL+'/index.html',wait_until='networkidle')
            showroom.get_by_role('button',name='자산 자세히').click()
            assert asset_id in showroom.locator('#inquiry-link').get_attribute('href')
            assert 'qa-owner%40example.org' in showroom.locator('#inquiry-link').get_attribute('href')
            showroom.screenshot(path=str(target/'showroom.png'),full_page=True)
            page.get_by_role('tab',name='거래·협상 원장').click()
            page.locator('#d-asset').select_option(asset_id)
            page.locator('#d-email').fill('buyer@example.org')
            page.locator('#d-name').fill('가상 구매자')
            page.locator('#d-subject').fill('합성 구매자 문의')
            page.locator('#d-amount').fill('1000')
            page.locator('#d-quote-ref').fill('QA-QUOTE-001')
            page.locator('#d-terms').fill('합성 테스트 목적에 한해 비독점 이용을 허가. 실제 거래 아님.')
            page.locator('#deal-form button[type=submit]').click()
            page.wait_for_function("document.getElementById('deal-current-status').textContent==='문의 접수'")
            assert page.locator('#delivery-zip').is_disabled()
            page.locator('#deal-next-status').select_option('QUOTED')
            page.locator('#apply-status').click()
            page.wait_for_function("document.getElementById('deal-current-status').textContent==='견적 발송'")
            page.locator('#deal-next-status').select_option('AGREED')
            page.locator('#transition-note').fill('가상 구매자 동의 테스트 메일 확인')
            page.locator('#apply-status').click()
            page.wait_for_function("document.getElementById('deal-current-status').textContent==='조건 합의'")
            page.locator('#deal-next-status').select_option('AWAITING_PAYMENT')
            page.locator('#apply-status').click()
            page.wait_for_function("document.getElementById('deal-current-status').textContent==='입금 대기'")
            # Try forbidden auto PASS: no actual bank evidence should not transition
            page.locator('#deal-next-status').select_option('PAID_CONFIRMED')
            page.locator('#apply-status').click()
            assert page.locator('#deal-current-status').inner_text()=='입금 대기','Payment gate allowed without evidence'
            page.locator('#bank-evidence').fill('SYNTHETIC QA - simulated bank ledger check (not a real payment)')
            page.locator('#bank-confirm').check()
            page.locator('#transition-note').fill('QA 합성 거래 시험')
            page.locator('#apply-status').click()
            page.wait_for_function("document.getElementById('deal-current-status').textContent==='입금 확인'")
            assert page.locator('#delivery-zip').is_enabled()
            with page.expect_download() as delivery_download:
                page.locator('#delivery-zip').click()
            delivery=delivery_download.value
            delivery.save_as(target/'delivery.zip')
            with zipfile.ZipFile(target/'delivery.zip') as z:
                z.testzip()
                manifest=json.loads(z.read('manifest.json'))
                data=z.read(manifest['file']['path'])
                assert manifest['payment']['status']=='SELLER_REPORTED_VERIFIED'
                assert hashlib.sha256(data).hexdigest()==manifest['file']['sha256']
            page.screenshot(path=str(target/'owner.png'),full_page=True)
            buyer=context.new_page()
            buyer.on('pageerror',lambda e:errors.append('buyer: '+str(e)))
            buyer.goto(URL+'/buyer.html',wait_until='networkidle')
            buyer.locator('#delivery-file').set_input_files(str(target/'delivery.zip'))
            buyer.locator('#verify-delivery').click()
            buyer.wait_for_function("document.getElementById('buyer-count').textContent.includes('1개')")
            assert buyer.get_by_text('SHA-256 일치').count()==1
            buyer.screenshot(path=str(target/'buyer.png'),full_page=True)
            with buyer.expect_download() as buyer_back:
                buyer.locator('#buyer-backup').click()
            buyer_back.value.save_as(target/'buyer-backup.json')
            with page.expect_download() as owner_back:
                page.get_by_role('tab',name='백업·복원').click()
                page.locator('#backup-download').click()
            owner_back.value.save_as(target/'owner-backup.json')
            backup=json.loads((target/'owner-backup.json').read_text(encoding='utf-8'))
            assert len(backup['assets'])==1 and len(backup['deals'])==1 and len(backup['files'])==1
            assert len(backup['files'][0]['data_base64'])>0
            clean=browser.new_context(accept_downloads=True)
            restored=clean.new_page()
            restored.on('dialog',lambda dlg:dlg.accept())
            restored.goto(URL+'/owner.html',wait_until='networkidle')
            restored.get_by_role('tab',name='백업·복원').click()
            restored.locator('#backup-file').set_input_files(str(target/'owner-backup.json'))
            restored.locator('#backup-restore').click()
            restored.wait_for_function("document.getElementById('metric-assets').textContent==='1' && document.getElementById('metric-deals').textContent==='1'")
            assert not errors,errors
            print(json.dumps({'unit':'not-run-here','browser':'PASS','asset_id':asset_id,'public_assets':1,'private_data_leaked':False,'synthetic_paid_gate':'PASS','delivery_zip':'PASS','buyer_SHA256':'PASS','owner_restore':'PASS','page_errors':errors},ensure_ascii=False,indent=2))
            browser.close()
    finally:
        (ROOT/'catalog.json').write_bytes(original_catalog)
