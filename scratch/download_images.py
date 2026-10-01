import json, re, time
from pathlib import Path
from urllib.request import Request, urlopen
from urllib.parse import quote, unquote, urlparse, urlsplit, urlunsplit
import sys

HERE=Path(__file__).resolve().parent
INPUT=HERE/'catalog_import.json'; OUT=HERE/'product_images'; FAIL=HERE/'failed_images.json'
OUT.mkdir(exist_ok=True)
EXTS={'.jpg','.jpeg','.png','.webp','.gif','.avif','.svg'}

def safe(s):
    s=re.sub(r'[<>:"/\\|?*]+','_',str(s)).strip().strip('.')
    return re.sub(r'\s+','_',s)[:100] or 'product'
def ext(url,ctype=''):
    e=Path(urlparse(url).path).suffix.lower()
    if e in EXTS:return e
    c=ctype.lower()
    if 'png' in c:return '.png'
    if 'webp' in c:return '.webp'
    if 'gif' in c:return '.gif'
    if 'avif' in c:return '.avif'
    return '.jpg'

def encoded_url(url):
    """Encode non-ASCII paths without double-encoding existing URL escapes."""
    parts = urlsplit(url)
    return urlunsplit((parts.scheme, parts.netloc, quote(unquote(parts.path), safe='/%:@'), quote(unquote(parts.query), safe='=&?/%:@,+'), ''))

def main():
    data=json.loads(INPUT.read_text(encoding='utf-8-sig')); products=data.get('products',data if isinstance(data,list) else [])
    missing_only='--missing-only' in sys.argv
    failures=[]; ok=0; skipped=0; total=sum(len(p.get('images') or []) for p in products)
    print('='*70+'\nAS-TITANUM DIRECT IMAGE DOWNLOADER\n'+'='*70)
    print(f'Products: {len(products)} | Images: {total} | Output: {OUT}')
    n=0
    for pi,p in enumerate(products,1):
        for ii,im in enumerate(p.get('images') or [],1):
            n+=1; url=im.get('url') if isinstance(im,dict) else str(im)
            try:
                filename=f'{safe(p.get("id") or p.get("name"))}_{ii}{ext(url)}'
                target=OUT/filename
                if missing_only and target.exists() and target.stat().st_size > 0:
                    skipped+=1
                    continue
                req=Request(encoded_url(url),headers={'User-Agent':'Mozilla/5.0','Referer':'https://as-titanum.com/'})
                with urlopen(req,timeout=30) as r:
                    body=r.read(); ctype=r.headers.get('Content-Type','')
                if not body or ('text/html' in ctype.lower()): raise ValueError(f'Invalid response: {ctype}')
                filename=f'{safe(p.get("id") or p.get("name"))}_{ii}{ext(url,ctype)}'
                (OUT/filename).write_bytes(body); ok+=1
                print(f'[{n}/{total}] OK {p.get("name","")[:55]} -> {filename}')
            except Exception as e:
                failures.append({'product':p.get('name'),'url':url,'error':str(e)})
                print(f'[{n}/{total}] FAIL {url} :: {e}')
            time.sleep(.08)
    FAIL.write_text(json.dumps(failures,ensure_ascii=False,indent=2),encoding='utf-8')
    print('\n'+'='*70+f'\nDONE | Downloaded: {ok} | Skipped existing: {skipped} | Failed: {len(failures)}\nFailed report: {FAIL}\n'+'='*70)
if __name__=='__main__': main()
