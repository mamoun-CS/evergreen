import json, re, time
from pathlib import Path
from urllib.parse import urljoin, urlparse, urldefrag
from urllib.request import Request, urlopen
from bs4 import BeautifulSoup
from playwright.sync_api import sync_playwright

BASE='https://as-titanum.com/'
DOMAIN='as-titanum.com'
OUT=Path(__file__).resolve().parent/'metal-scoop.json'
TIMEOUT=60000
DELAY=.25

def norm(u,base=BASE):
    if not u:return None
    u,_=urldefrag(urljoin(base,u.strip()))
    p=urlparse(u)
    if p.scheme not in ('http','https') or p.netloc.lower().replace('www.','')!=DOMAIN:return None
    return u

def is_product(u): return bool(u and '/product/' in urlparse(u).path)
def is_category(u): return bool(u and '/category/' in urlparse(u).path)

def sitemap_urls():
    products=set(); categories=set(); todo=[urljoin(BASE,'wp-sitemap.xml'),urljoin(BASE,'sitemap_index.xml')]; seen=set()
    while todo and len(seen)<100:
        u=todo.pop(0)
        if u in seen:continue
        seen.add(u)
        try:
            xml=urlopen(Request(u,headers={'User-Agent':'Mozilla/5.0'}),timeout=20).read().decode('utf-8','ignore')
        except Exception:continue
        for x in re.findall(r'<loc>\s*(.*?)\s*</loc>',xml,re.I):
            x=x.replace('&amp;','&')
            if is_product(x):products.add(x)
            elif is_category(x):categories.add(x)
            elif x.endswith('.xml') and DOMAIN in x and x not in seen:todo.append(x)
    return products,categories

def category_name(soup,url):
    for sel in ['h1','.page-title','.entry-title']:
        e=soup.select_one(sel)
        if e:
            t=' '.join(e.get_text(' ',strip=True).split())
            if t:return t
    return urlparse(url).path.rstrip('/').split('/')[-1]

def best_image(soup,page_url):
    for sel in ['.woocommerce-product-gallery img','figure.woocommerce-product-gallery__wrapper img','.product img','main img']:
        for img in soup.select(sel):
            vals=[img.get('data-large_image'),img.get('data-src'),img.get('src')]
            ss=img.get('srcset')
            if ss: vals.insert(0,ss.split(',')[-1].strip().split(' ')[0])
            for v in vals:
                u=urljoin(page_url,v) if v and not v.startswith('data:') else None
                if u and not any(x in u.lower() for x in ('logo','favicon','placeholder','icon')):return u
    og=soup.select_one('meta[property="og:image"]')
    return urljoin(page_url,og.get('content')) if og and og.get('content') else ''

def text_first(soup,sels):
    for sel in sels:
        e=soup.select_one(sel)
        if e:
            t=' '.join(e.get_text(' ',strip=True).split())
            if t:return t
    return ''

def parse_product(html,url,cats):
    s=BeautifulSoup(html,'html.parser')
    name=text_first(s,['h1.product_title','h1.entry-title','main h1','h1'])
    if not name:return None
    cats=sorted(set(cats))
    return {'name':name,'category':cats[-1] if cats else 'כללי','categories':cats,
            'sku':text_first(s,['.product_meta .sku','.sku']),
            'description':text_first(s,['.woocommerce-product-details__short-description','.woocommerce-Tabs-panel--description']),
            'image':best_image(s,url),'url':url}

def save(items):OUT.write_text(json.dumps(items,ensure_ascii=False,indent=2),encoding='utf-8')

print('='*70); print('AS-TITANUM CATEGORY-MAPPED CRAWLER'); print('='*70)
seed_products,seed_categories=sitemap_urls()
product_cats={u:set() for u in seed_products}
print(f'Sitemap products: {len(seed_products)} | sitemap categories: {len(seed_categories)}')

with sync_playwright() as p:
    browser=p.chromium.launch(headless=True)
    page=browser.new_page(viewport={'width':1440,'height':1000},locale='he-IL')
    page.set_default_timeout(TIMEOUT)

    # Discover category URLs from homepage and category pages, then map products to each category.
    category_queue=list(seed_categories) or [BASE]
    seen_categories=set(); discovered_categories=set(seed_categories)
    print('\n[1/2] Mapping products to category pages ...')
    while category_queue and len(seen_categories)<500:
        u=category_queue.pop(0)
        if u in seen_categories:continue
        seen_categories.add(u)
        try:
            page.goto(u,wait_until='domcontentloaded',timeout=TIMEOUT); page.wait_for_timeout(700)
            # click/load more and scroll several times for AJAX category grids
            for _ in range(20):
                try:
                    btn=page.locator('text=Load More').first
                    if btn.count() and btn.is_visible(): btn.click(timeout=1500); page.wait_for_timeout(700)
                    else: break
                except Exception: break
            for _ in range(5): page.evaluate('window.scrollTo(0, document.body.scrollHeight)'); page.wait_for_timeout(250)
            soup=BeautifulSoup(page.content(),'html.parser'); final=page.url
            # homepage is discovery only; real category names only come from /category/ pages
            cat=category_name(soup,final) if is_category(final) else None
            links={norm(a.get('href'),final) for a in soup.select('a[href]')}
            links.discard(None)
            count=0
            for x in links:
                if is_product(x) and cat:
                    product_cats.setdefault(x,set()).add(cat); count+=1
                elif is_category(x) and x not in discovered_categories:
                    discovered_categories.add(x); category_queue.append(x)
            print(f'  {cat or "DISCOVERY"}: {count} product links | categories {len(discovered_categories)}')
        except Exception as e: print(f'  SKIP {u}: {type(e).__name__}')
        time.sleep(DELAY)
        # If sitemap had no category taxonomy, crawl homepage once to seed category links.
        if not category_queue and not seen_categories.intersection(discovered_categories):
            category_queue.append(BASE)

    # ensure discovered category URLs not initially in queue get processed
    for u in sorted(discovered_categories-seen_categories): category_queue.append(u)
    while category_queue:
        u=category_queue.pop(0)
        if u in seen_categories:continue
        seen_categories.add(u)
        try:
            page.goto(u,wait_until='domcontentloaded',timeout=TIMEOUT); page.wait_for_timeout(600)
            for _ in range(20):
                try:
                    btn=page.locator('text=Load More').first
                    if btn.count() and btn.is_visible():btn.click(timeout=1500);page.wait_for_timeout(600)
                    else:break
                except Exception:break
            soup=BeautifulSoup(page.content(),'html.parser'); cat=category_name(soup,page.url)
            for a in soup.select('a[href]'):
                x=norm(a.get('href'),page.url)
                if is_product(x):product_cats.setdefault(x,set()).add(cat)
        except Exception as e:print(f'  SKIP {u}: {type(e).__name__}')

    links=sorted(product_cats)
    mapped=sum(bool(v) for v in product_cats.values())
    print(f'\nMapped products: {mapped}/{len(links)}')
    print(f'Categories found: {len(set(c for v in product_cats.values() for c in v))}')
    print(f'\n[2/2] Reading {len(links)} product pages ...')
    products=[]
    for i,u in enumerate(links,1):
        try:
            page.goto(u,wait_until='domcontentloaded',timeout=TIMEOUT); page.wait_for_timeout(250)
            item=parse_product(page.content(),page.url,product_cats.get(u,set()))
            if item:
                products.append(item)
                print(f'  [{i}/{len(links)}] [{item["category"]}] {item["name"][:55]}')
                if len(products)%25==0:save(products)
        except Exception as e:print(f'  [{i}/{len(links)}] ERROR {type(e).__name__}: {u}')
        time.sleep(DELAY)
    browser.close()

save(products)
print('\n'+'='*70);print('DONE');print(f'Products: {len(products)}');print(f'Categories: {len(set(x["category"] for x in products))}');print(f'Saved to: {OUT}');print('='*70)
