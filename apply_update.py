#!/usr/bin/env python3
"""GARD 3-Product additive nav patch: never touches catalog.json, data stores or existing scripts.
Usage: python apply_update.py /path/to/GARD-P2P-Asset-Market-2 [--dry-run]
Before running, use git to commit/back up existing work. Apply to a test branch first.
"""
import argparse
import re
from pathlib import Path

NAV='<a href="./products.html">3대 상품</a><a href="./product-studio.html">상품 제작 원장</a><a href="./product-review.html">상품 독립검수</a>'
TARGETS=('index.html','owner.html','buyer.html')

def patch(original):
    if 'href="./products.html"' in original:
        return original, 'already_updated'
    # Only insert into the first navlinks navigation block. Preserve everything else byte-for-byte.
    pattern=r'(<nav\b[^>]*\bclass="navlinks"[^>]*>)(.*?)(</nav>)'
    m=re.search(pattern,original,flags=re.S)
    if m is None:
        raise ValueError('navlinks 메뉴를 찾을 수 없음: 기존 버전과 일치하는지 확인하세요')
    updated=original[:m.start()]+m.group(1)+m.group(2)+NAV+m.group(3)+original[m.end():]
    return updated, 'updated'

def main():
    parser=argparse.ArgumentParser();parser.add_argument('repo',help='기존 GitHub 저장소를 압축 해제하거나 clone한 루트 경로');parser.add_argument('--dry-run',action='store_true');args=parser.parse_args();root=Path(args.repo).resolve()
    if not root.is_dir():parser.error('존재하지 않는 폴더')
    for name in TARGETS:
        file=root/name
        if not file.is_file():parser.error(f'기존 파일 없음: {file} (신규 상품 파일만 설치하는 경우 URL 직접 접속)')
        original=file.read_text('utf-8')
        updated,status=patch(original)
        if status=='updated' and not args.dry_run:file.write_text(updated,'utf-8')
        print(f'{name}: {status}'+(' [DRY RUN]' if args.dry_run else ''))
    print('기존 catalog.json / js/db.js / js/owner.js / README.md 는 수정하지 않았습니다.')
if __name__=='__main__':main()
