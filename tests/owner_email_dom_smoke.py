"""Mocked Chromium DOM smoke for owner contact email and catalog export.
Runs without a network origin: the environment disallows all Chromium navigation.
This tests real owner HTML/JS event handlers against an in-memory DB stub,
NOT real IndexedDB persistence or deployed Netlify behavior.
"""
from pathlib import Path
from playwright.sync_api import sync_playwright
import re, json
ROOT=Path(__file__).resolve().parent.parent
html=(ROOT/'owner.html').read_text(encoding='utf-8')
html=re.sub(r'<script type="module" src="\./js/owner\.js"></script>','',html)
common=re.sub(r'\bexport\s+', '',(ROOT/'js/common.js').read_text(encoding='utf-8'))
zipjs=re.sub(r'\bexport\s+', '',(ROOT/'js/zip.js').read_text(encoding='utf-8'))
owner=re.sub(r'^import .*?;\s*\n','',(ROOT/'js/owner.js').read_text(encoding='utf-8'),flags=re.M)
prelude="""
// In-memory DB only, explicitly not a persistence test.
const __testStore=Object.fromEntries(['assets','files','deals','audit'].map(x=>[x,new Map()]));
let __testSettings={publisherName:'GARD 자영자산',email:'',notice:''};
const dbAll=async name=>name==='settings'?[{key:'owner',value:__testSettings}]:[...__testStore[name].values()];
const dbGet=async (name,key)=>name==='settings'?{key:'owner',value:__testSettings}:__testStore[name].get(key);
const dbPut=async (name,item)=>{__testStore[name].set(item.id,item);return item;};
const dbDel=async (name,id)=>{__testStore[name].delete(id);};
const getSettings=async()=>__testSettings;
const saveSettings=async settings=>{__testSettings=settings;return settings;};
const audit=async (event,entityId,detail)=>{let id='LOG-'+__testStore.audit.size;__testStore.audit.set(id,{id,event,entityId,detail,at:new Date().toISOString()});};
const ownerBackup=async()=>({assets:[],deals:[],files:[]});
const importOwnerBackup=async()=>({assets:0,deals:0,files:0});
// Secure-context UUID is unavailable on about:blank in this test browser.
uid=(prefix='ID')=>`${prefix}-MOCK-${Math.random().toString(36).slice(2,8)}`;
// Capture download data without depending on Blob URL in opaque-origin document.
downloadText=(name,text)=>{window.__testDownload={name,text};};
window.confirm=()=>true;
"""
with sync_playwright() as p:
    browser=p.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox'])
    page=browser.new_page(viewport={'width':1360,'height':1000})
    errs=[]
    page.on('pageerror',lambda e:errs.append(str(e)))
    page.set_content(html)
    page.add_script_tag(content=common+'\n'+zipjs+'\n'+prelude+'\n'+owner)
    page.wait_for_function("document.getElementById('quick-publish-status').textContent.includes('미설정')",timeout=20000)
    assert page.locator('#quick-owner-email').is_visible()
    assert page.locator('#quick-export-catalog').is_disabled()
    assert '공개' in page.locator('#owner-email-heading').inner_text() or '이메일' in page.locator('#owner-email-heading').inner_text()
    page.locator('#quick-owner-email').fill('test-public@example.org')
    page.locator('#quick-save-email').click()
    page.wait_for_function("document.getElementById('quick-email-badge').textContent==='이메일 저장됨'",timeout=15000)
    assert page.locator('#quick-export-catalog').is_enabled()
    page.get_by_role('tab',name='설정·감사기록').click()
    assert page.locator('#s-email').input_value()=='test-public@example.org'
    page.locator('#s-name').fill('GARD QA')
    page.locator('#s-email').fill('final-public@example.org')
    page.locator('#settings-form button[type=submit]').click()
    page.wait_for_function("document.getElementById('quick-owner-email').value==='final-public@example.org'")
    page.get_by_role('tab',name='자산 제작·관리').click()
    page.locator('#a-title').fill('합성 테스트 자산')
    page.locator('#a-summary').fill('공개 홍보용 합성 데이터')
    page.locator('#a-description').fill('PRIVATE SECRET NOT FOR PUBLIC')
    page.locator('#a-status').select_option('PROMOTION')
    page.locator('#a-approval').check()
    page.locator('#asset-form button[type=submit]').click()
    page.wait_for_function("document.getElementById('metric-published').textContent==='1'")
    page.locator('#quick-export-catalog').click()
    page.wait_for_function('window.__testDownload && window.__testDownload.name === "catalog.json"')
    output=json.loads(page.evaluate('window.__testDownload.text'))
    assert output['publisher']['email']=='final-public@example.org',output
    assert len(output['assets'])==1
    assert output['assets'][0]['title']=='합성 테스트 자산'
    assert 'PRIVATE SECRET' not in json.dumps(output)
    assert 'buyerEmail' not in json.dumps(output)
    assert not errs, errs
    print(json.dumps({'test':'owner email inline form / full settings sync / promotion JSON','result':'PASS','catalog_assets':len(output['assets']),'publisher_email':output['publisher']['email'],'browser_js_errors':errs,'important_limit':'in-memory DB mock, NOT full IndexedDB or real Netlify'},ensure_ascii=False))
    browser.close()
