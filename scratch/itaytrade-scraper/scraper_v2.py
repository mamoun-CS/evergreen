#!/usr/bin/env python3
"""ItayTrade WooCommerce scraper V2. Python 3.10+"""
import argparse, csv, json, re, time, hashlib
from pathlib import Path
from urllib.parse import urljoin, urlparse, unquote
import requests
from bs4 import BeautifulSoup

BASE="https://itaytrade.com"
HEADERS={"User-Agent":"Mozilla/5.0 (compatible; ItayTradeCatalogExporter/2.0)"}
BAD=re.compile(r"(logo|account|shopping|cart|bag|submit-spin|thanks|icon|sprite|placeholder)",re.I)
def clean(s):
    return re.sub(r"\s+"," ",s or "").strip()
def soup_for(session,url):
    r=session.get(url,timeout=35); r.raise_for_status()
    return BeautifulSoup(r.text,"html.parser")
def absurl(u,base):
    return urljoin(base,u.split("?")[0].strip()) if u else ""
def image_urls(node,base):
    out=[]
    if not node: return out
    for img in node.select("img"):
        candidates=[img.get("data-large_image"),img.get("data-src"),img.get("data-lazy-src"),img.get("src")]
        srcset=img.get("data-srcset") or img.get("srcset")
        if srcset:
            candidates += [x.strip().split()[0] for x in srcset.split(",") if x.strip()]
        for raw in candidates:
            u=absurl(raw,base)
            if not u or BAD.search(unquote(urlparse(u).path)): continue
            if "/wp-content/uploads/" not in u: continue
            # Skip tiny thumbnail variants when a larger variant is available later.
            if u not in out: out.append(u)
    return out
def product_page(session,url):
    s=soup_for(session,url)
    title=clean((s.select_one("h1.product_title") or s.select_one("h1") or {}).get_text(" ",strip=True) if s.select_one("h1.product_title") or s.select_one("h1") else "")
    desc=s.select_one("#tab-description") or s.select_one(".woocommerce-Tabs-panel--description")
    short=s.select_one(".woocommerce-product-details__short-description")
    price=s.select_one(".summary .price") or s.select_one("p.price")
    sku=s.select_one(".sku")
    cats=[]
    for a in s.select(".posted_in a, .product_meta .posted_in a"):
        href=absurl(a.get("href"),url)
        if href and "/product-category/" in href:
            cats.append({"name":clean(a.get_text()),"url":href})
    attrs={}
    for tr in s.select(".woocommerce-product-attributes tr, table.shop_attributes tr"):
        k=clean((tr.select_one("th") or {}).get_text(" ",strip=True))
        v=clean((tr.select_one("td") or {}).get_text(" ",strip=True))
        if k and v: attrs[k]=v
    # Only gallery/product image regions, never the whole page.
    gallery=s.select_one(".woocommerce-product-gallery")
    imgs=image_urls(gallery,url)
    if not imgs:
        for el in s.select(".woocommerce-product-gallery__image, .woocommerce-product-gallery__wrapper"):
            imgs += [x for x in image_urls(el,url) if x not in imgs]
    brand=""
    b=s.select_one(".posted_in") # brand is often a taxonomy plugin; don't guess.
    brand_node=s.select_one(".product_meta .brand, .product_meta .product_brand")
    if brand_node: brand=clean(brand_node.get_text(" ",strip=True))
    return {"source_url":url,"name":title,"title":clean(s.title.get_text() if s.title else title),
      "description":clean(desc.get_text(" ",strip=True) if desc else ""),
      "short_description":clean(short.get_text(" ",strip=True) if short else ""),
      "price":clean(price.get_text(" ",strip=True) if price else ""),
      "currency":"","sku":clean(sku.get_text() if sku else ""),
      "brand":brand,"categories":cats,"attributes":attrs,"specifications":attrs,
      "images":imgs,"main_image":imgs[0] if imgs else ""}
def category_page(session,url):
    s=soup_for(session,url)
    h=s.select_one(".woocommerce-products-header__title, h1")
    name=clean(h.get_text(" ",strip=True) if h else "")
    parent=[]
    for a in s.select(".term-breadcrumbs a, .woocommerce-breadcrumb a"):
        u=absurl(a.get("href"),url)
        if "/product-category/" in u and u!=url: parent.append({"name":clean(a.get_text()),"url":u})
    imgs=image_urls(s.select_one(".term-description") or s.select_one(".woocommerce-products-header") or s,url)
    return {"url":url,"name":name or unquote(url.rstrip("/").split("/")[-1]),"parent_categories":parent,
            "image":imgs[0] if imgs else ""}
def download(session,url,path):
    try:
        r=session.get(url,timeout=40); r.raise_for_status()
        if not r.headers.get("Content-Type","").lower().startswith("image/"): return False
        path.parent.mkdir(parents=True,exist_ok=True); path.write_bytes(r.content); return True
    except requests.RequestException: return False
def main():
    ap=argparse.ArgumentParser()
    ap.add_argument("--seed",default="seed_urls.json")
    ap.add_argument("--out",default="itaytrade-export")
    ap.add_argument("--delay",type=float,default=.25)
    ap.add_argument("--no-images",action="store_true")
    args=ap.parse_args()
    seed=json.load(open(args.seed,encoding="utf-8"))
    session=requests.Session(); session.headers.update(HEADERS)
    out=Path(args.out); (out/"images/products").mkdir(parents=True,exist_ok=True)
    products=[]; categories=[]; image_rows=[]
    # Retain all 179 discovered product URLs as the starting point; also collect category-page product links.
    purls=list(dict.fromkeys(seed.get("product_urls",[])))
    curl=list(dict.fromkeys(seed.get("category_urls",[])))
    for cu in curl:
        try:
            s=soup_for(session,cu)
            for a in s.select("a.woocommerce-LoopProduct-link, li.product a[href*='/product/']"):
                u=absurl(a.get("href"),cu)
                if "/ar/product/" in u and "/product-category/" not in u and u not in purls: purls.append(u)
        except Exception as e: print("Category discovery warning:",cu,e)
        time.sleep(args.delay)
    for i,u in enumerate(purls,1):
        try:
            p=product_page(session,u); p["id"]=hashlib.sha1(u.encode()).hexdigest()[:12]
            local=[]
            if not args.no_images:
                for j,img in enumerate(p["images"],1):
                    ext=Path(urlparse(img).path).suffix.lower() or ".jpg"
                    name=f"{j:03d}_{hashlib.sha1(img.encode()).hexdigest()[:12]}{ext}"
                    rel=f"images/products/product-{i:05d}/{name}"
                    if download(session,img,out/rel):
                        local.append(rel); image_rows.append({"product_url":u,"image_url":img,"local_path":rel,"role":"main" if j==1 else "gallery"})
                    time.sleep(args.delay)
            p["local_images"]=local
            products.append(p); print(f"[{i}/{len(purls)}] {p['name'] or u} | {len(p['images'])} images")
        except Exception as e: print("Product warning:",u,e)
        time.sleep(args.delay)
    for i,u in enumerate(curl,1):
        try:
            c=category_page(session,u); c["id"]=hashlib.sha1(u.encode()).hexdigest()[:12]
            categories.append(c)
            if c["image"] and not args.no_images:
                ext=Path(urlparse(c["image"]).path).suffix.lower() or ".jpg"
                rel=f"images/categories/category-{i:05d}/001{ext}"
                if download(session,c["image"],out/rel): c["local_image"]=rel
        except Exception as e: print("Category warning:",u,e)
        time.sleep(args.delay)
    def write_json(name,data): (out/name).write_text(json.dumps(data,ensure_ascii=False,indent=2),encoding="utf-8")
    write_json("products.json",products); write_json("categories.json",categories)
    write_json("attributes.json",sorted({k for p in products for k in p.get("attributes",{})}))
    for name,data in [("products.csv",products),("categories.csv",categories),("images.csv",image_rows)]:
        if data:
            keys=list(dict.fromkeys(k for x in data for k in x))
            with (out/name).open("w",encoding="utf-8-sig",newline="") as f:
                w=csv.DictWriter(f,fieldnames=keys); w.writeheader()
                for x in data: w.writerow({k:json.dumps(v,ensure_ascii=False) if isinstance(v,(list,dict)) else v for k,v in x.items()})
    report={"source":BASE+"/ar","products_found":len(products),"categories_found":len(categories),
            "product_urls_seeded":len(seed.get("product_urls",[])),"product_urls_attempted":len(purls)}
    write_json("crawl_report.json",report)
    print("Done:",report)
if __name__=="__main__": main()
