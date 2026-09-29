import json, re, time
from pathlib import Path
from urllib.parse import urljoin, urlparse, urldefrag
from urllib.request import Request, urlopen
from bs4 import BeautifulSoup
from playwright.sync_api import sync_playwright

BASE = 'https://as-titanum.com/'
DOMAIN = 'as-titanum.com'
OUT = Path(__file__).resolve().parent / 'metal-scoop.json'
TIMEOUT = 60000
DELAY = 0.35


def norm(u, base=BASE):
    if not u: return None
    u = urljoin(base, u.strip())
    u, _ = urldefrag(u)
    p = urlparse(u)
    if p.scheme not in ('http','https') or p.netloc.lower().replace('www.','') != DOMAIN: return None
    return u

def product_url(u):
    return bool(u and '/product/' in urlparse(u).path)

def crawl_url(u):
    if not u: return False
    p = urlparse(u).path.rstrip('/') + '/'
    return p == '/' or p.startswith('/shop/') or p.startswith('/category/') or p.startswith('/product-category/')

def get_sitemap_products():
    found=set(); todo=[urljoin(BASE,'wp-sitemap.xml'),urljoin(BASE,'sitemap_index.xml')]; seen=set()
    while todo and len(seen)<50:
        u=todo.pop(0)
        if u in seen: continue
        seen.add(u)
        try:
            req=Request(u,headers={'User-Agent':'Mozilla/5.0'})
            xml=urlopen(req,timeout=15).read().decode('utf-8','ignore')
        except Exception:
            continue
        locs=re.findall(r'<loc>\s*(.*?)\s*</loc>',xml,re.I)
        for x in locs:
            x=x.replace('&amp;','&')
            if product_url(x): found.add(x)
            elif x.endswith('.xml') and DOMAIN in x and x not in seen: todo.append(x)
    return found

def all_links(soup, base):
    out=set()
    for a in soup.select('a[href]'):
        u=norm(a.get('href'),base)
        if u: out.add(u)
    return out

def best_image(soup, page_url):
    sels=['.woocommerce-product-gallery img','figure.woocommerce-product-gallery__wrapper img','.product img','main img']
    for sel in sels:
        for img in soup.select(sel):
            vals=[img.get('data-large_image'),img.get('data-src'),img.get('src')]
            ss=img.get('srcset')
            if ss:
                vals.insert(0,ss.split(',')[-1].strip().split(' ')[0])
            for v in vals:
                u=urljoin(page_url,v) if v and not v.startswith('data:') else None
                if u and not any(x in u.lower() for x in ('logo','favicon','placeholder','icon')):
                    return u
    og=soup.select_one('meta[property="og:image"]')
    return urljoin(page_url,og.get('content')) if og and og.get('content') else ''

def text_first(soup, selectors):
    for s in selectors:
        el=soup.select_one(s)
        if el:
            t=' '.join(el.get_text(' ',strip=True).split())
            if t:return t
    return ''

def parse_product(html,url):
    s=BeautifulSoup(html,'html.parser')
    name=text_first(s,['h1.product_title','h1.entry-title','main h1','h1'])
    if not name:return None
    cats=[]
    for a in s.select('.posted_in a, .product_meta a[rel="tag"], a[href*="/category/"], a[href*="/product-category/"]'):
        t=' '.join(a.get_text(' ',strip=True).split())
        if t and t not in cats:cats.append(t)
    sku=text_first(s,['.sku'])
    desc=text_first(s,['.woocommerce-product-details__short-description','.woocommerce-Tabs-panel--description','.entry-summary'])
    return {'name':name,'category':cats[0] if cats else 'כללי','categories':cats,'sku':sku,'description':desc,'image':best_image(s,url),'url':url}

def save(items):
    OUT.write_text(json.dumps(items,ensure_ascii=False,indent=2),encoding='utf-8')

print('='*70)
print('AS-TITANUM FULL PRODUCT CRAWLER - FIXED')
print('Collecting: name + category + image + SKU + URL')
print('='*70)

products=[]; product_links=set(); discovered=set([BASE]); queue=[BASE]
sitemap=get_sitemap_products(); product_links |= sitemap
print(f'Sitemap product links: {len(sitemap)}')

with sync_playwright() as p:
    browser=p.chromium.launch(headless=True)
    page=browser.new_page(viewport={'width':1440,'height':1000},locale='he-IL')
    page.set_default_timeout(TIMEOUT)

    print('\n[1/2] Discovering products from homepage/categories/shop ...')
    n=0
    while queue and n<500:
        u=queue.pop(0); n+=1
        try:
            page.goto(u,wait_until='domcontentloaded',timeout=TIMEOUT)
            page.wait_for_timeout(800)
            # trigger lazy/AJAX content
            for _ in range(4):
                page.evaluate('window.scrollTo(0, document.body.scrollHeight)'); page.wait_for_timeout(350)
            html=page.content(); final=page.url
            soup=BeautifulSoup(html,'html.parser')
            links=all_links(soup,final)
            before=len(product_links)
            for x in links:
                if product_url(x): product_links.add(x)
                elif crawl_url(x) and x not in discovered:
                    discovered.add(x); queue.append(x)
            print(f'  Crawl {n}: {final} | +{len(product_links)-before} products | total {len(product_links)}')
        except Exception as e:
            print(f'  SKIP {u}: {type(e).__name__}')
        time.sleep(DELAY)

    print(f'\n[2/2] Reading {len(product_links)} product pages ...')
    for i,u in enumerate(sorted(product_links),1):
        try:
            page.goto(u,wait_until='domcontentloaded',timeout=TIMEOUT); page.wait_for_timeout(300)
            item=parse_product(page.content(),page.url)
            if item:
                products.append(item)
                print(f'  [{i}/{len(product_links)}] {item["name"][:70]}')
                if len(products)%20==0: save(products)
        except Exception as e:
            print(f'  [{i}/{len(product_links)}] ERROR {u}: {type(e).__name__}')
        time.sleep(DELAY)
    browser.close()

save(products)
print('\n'+'='*70)
print('DONE')
print(f'Products: {len(products)}')
print(f'Saved to: {OUT}')
print('='*70)
