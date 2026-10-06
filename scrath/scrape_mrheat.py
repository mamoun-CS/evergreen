#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Scraper لموقع mrheat.ps  ->  products.json

التثبيت:
    pip install requests beautifulsoup4

أمثلة التشغيل:
    python scrape_mrheat.py --limit 3                 # تجربة سريعة على 3 منتجات
    python scrape_mrheat.py                           # كل صنف النوافير (cat.20)
    python scrape_mrheat.py --app product.cat.49 --out stone.json
    python scrape_mrheat.py --app product.all --out all.json
"""

import argparse
import json
import re
import time
from urllib.parse import urljoin, quote

import requests
from bs4 import BeautifulSoup, NavigableString

BASE = "https://mrheat.ps/"
HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
        "(KHTML, like Gecko) Chrome/124.0 Safari/537.36"
    ),
    "Accept-Language": "ar,en;q=0.8",
}
session = requests.Session()
session.headers.update(HEADERS)

PRICE_RE = re.compile(r"(\d[\d,\.]*)\s*₪")
PRODUCT_LINK = 'a[href*="app=product.show."]'
# كلمات أيقونات (Material Icons) بتطلع كنص عادي في الصفحة
ICON_WORDS = {
    "favorite_border", "add_shopping_cart", "shopping_cart",
    "play_circle_outline", "المنتج في سلتك",
}
RELATED_MARK = "منتجات ذات صلة"
DETAILS_MARK = "تفاصيل المنتج"


# ----------------------------------------------------------------- أدوات عامة
def clean(text):
    return re.sub(r"\s+", " ", text or "").strip()


def lines_of(node):
    """نص العنصر كأسطر نظيفة (كل عنصر/سطر بـ <br> يصير سطر لحاله)."""
    return [l for l in (clean(x) for x in node.get_text("\n").split("\n")) if l]


def get_soup(url, retries=3, delay=2):
    for attempt in range(1, retries + 1):
        try:
            r = session.get(url, timeout=30)
            r.raise_for_status()
            r.encoding = "utf-8"
            soup = BeautifulSoup(r.text, "html.parser")
            for t in soup(["script", "style", "noscript"]):
                t.decompose()
            return soup
        except requests.RequestException as e:
            print(f"  ! خطأ ({attempt}/{retries}) {url}: {e}")
            time.sleep(delay * attempt)
    return None


def abs_url(u):
    """رابط كامل، بدون #fragment، ومع ترميز المسافات."""
    if not u:
        return None
    u = u.strip().split("#")[0]
    return quote(urljoin(BASE, u), safe=":/?&=%+@,;~")


def meta(soup, *names):
    for n in names:
        tag = soup.find("meta", attrs={"property": n}) or soup.find(
            "meta", attrs={"name": n}
        )
        if tag and tag.get("content"):
            return clean(tag["content"])
    return ""


def page_url(app, n):
    """صفحة 1 = product.cat.20 ، صفحة 2 = product.cat.20.2 ..."""
    return f"{BASE}?app={app}" if n == 1 else f"{BASE}?app={app}.{n}"


# ------------------------------------------------- 1) قراءة صفحات القائمة
def find_card(a):
    """أكبر عنصر أب بيحتوي على منتج واحد فقط (كرت المنتج)."""
    card = a
    for _ in range(4):
        parent = card.parent
        if parent is None or parent.name in ("body", "html"):
            break
        hrefs = {x["href"] for x in parent.select(PRODUCT_LINK)}
        if len(hrefs) > 1:
            break
        card = parent
    return card


def parse_listing_page(soup, products):
    new_found = 0
    for a in soup.select(PRODUCT_LINK):
        href = urljoin(BASE, a["href"]).split("#")[0]
        if href in products:
            continue
        card = find_card(a)

        # نصوص روابط هذا المنتج (الاسم + السعر) عشان نستثنيها من "المقاس"
        link_lines = set()
        for x in [a] + card.select(PRODUCT_LINK):
            if urljoin(BASE, x["href"]).split("#")[0] == href:
                link_lines.update(lines_of(x))

        card_lines = [l for l in lines_of(card) if l not in ICON_WORDS]
        m = PRICE_RE.search(" ".join(card_lines))
        size = " | ".join(
            l for l in card_lines if l not in link_lines and "₪" not in l
        )
        img = card.find("img")
        products[href] = {
            "list_price": m.group(1) if m else "",
            "size": size,
            "list_image": abs_url(
                (img.get("data-src") or img.get("src")) if img else None
            ),
        }
        new_found += 1
    return new_found


def collect_listing(app, max_pages=300, delay=1.0):
    products = {}
    for n in range(1, max_pages + 1):
        url = page_url(app, n)
        print(f"[قائمة] صفحة {n}: {url}")
        soup = get_soup(url)
        if soup is None:
            break
        new_found = parse_listing_page(soup, products)
        print(f"   + {new_found} منتج جديد (المجموع {len(products)})")
        if new_found == 0:
            break
        time.sleep(delay)
    return products


# ------------------------------------------------- 2) صفحة المنتج
def collect_media(soup):
    """صور وفيديوهات المنتج فقط (بنوقف عند قسم 'منتجات ذات صلة')."""
    images, videos = [], []
    for node in soup.descendants:
        if isinstance(node, NavigableString):
            if RELATED_MARK in node:
                break
            continue
        if node.name == "img":
            src = node.get("data-src") or node.get("src") or ""
            if "/product/" in src:
                images.append(abs_url(src))
        elif node.name in ("source", "video", "a"):
            for attr in ("src", "href"):
                v = node.get(attr) or ""
                if re.search(r"\.(mp4|webm|mov)", v, re.I):
                    videos.append(abs_url(v))
                elif (node.name == "a" and "/product/" in v
                      and re.search(r"\.(jpe?g|png|webp|gif)", v, re.I)):
                    images.append(abs_url(v))
    return images, videos


def dedupe(seq):
    seen, out = set(), []
    for x in seq:
        if x and x not in seen:
            seen.add(x)
            out.append(x)
    return out


def parse_product(url, info):
    soup = get_soup(url)
    if soup is None:
        return None

    # --- بيانات الـ meta (الأوثق)
    name = meta(soup, "og:title")
    pid = meta(soup, "product:catalog_id") or url.rsplit(".", 1)[-1]
    category = meta(soup, "product:category")
    availability = meta(soup, "product:availability")
    currency = meta(soup, "product:price:currency")
    amount = meta(soup, "product:price:amount")
    og_image = abs_url(meta(soup, "og:image"))
    meta_desc = meta(soup, "og:description", "description")

    if soup.head:
        soup.head.decompose()  # عشان <title> ما يدخل في النصوص
    if not name:
        h1 = soup.find("h1")
        name = clean(h1.get_text(" ")) if h1 else ""

    lines = lines_of(soup)

    # --- السعر
    price = None
    try:
        f = float(amount)
        price = int(f) if f.is_integer() else f
    except (TypeError, ValueError):
        m = re.search(r"السعر\s*([\d,\.]+)\s*₪", " ".join(lines)) or \
            (PRICE_RE.search(info.get("list_price", "") + "₪")
             if info.get("list_price") else None)
        if m:
            try:
                price = float(m.group(1).replace(",", ""))
                price = int(price) if price.is_integer() else price
                currency = currency or "ILS"
            except ValueError:
                pass

    # --- وصف مختصر: السطر اللي بعد اسم المنتج مباشرة
    short_desc = ""
    for i, l in enumerate(lines[:-1]):
        nxt = lines[i + 1]
        if (l == name and nxt not in ICON_WORDS and nxt != name
                and "₪" not in nxt and len(nxt) >= 15):
            short_desc = nxt
            break

    # --- تفاصيل المنتج: بين "تفاصيل المنتج" و "مزيداً من الصور"
    details = []
    if DETAILS_MARK in lines:
        start = lines.index(DETAILS_MARK)
        for l in lines[start + 1:]:
            if (l.startswith("مزيد") and "الصور" in l) or l.startswith(RELATED_MARK):
                break
            if l.startswith("رقم المنتج") or l == pid or re.fullmatch(r"-+", l):
                continue
            details.append(l)

    # --- الصور والفيديو
    images, videos = collect_media(soup)
    images = dedupe([og_image or info.get("list_image")] + images)

    return {
        "id": pid,
        "url": url,
        "name": name,
        "category": category,
        "price": price,
        "currency": currency or "ILS",
        "availability": availability,
        "size": info.get("size", ""),
        "image": images[0] if images else None,
        "images": images,
        "videos": dedupe(videos),
        "short_description": short_desc,
        "details": "\n".join(details) if details else meta_desc,
    }


# ----------------------------------------------------------------- main
def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--app", default="product.cat.20",
                    help="مثال: product.cat.20  أو  product.all")
    ap.add_argument("--out", default="products.json")
    ap.add_argument("--delay", type=float, default=1.0)
    ap.add_argument("--limit", type=int, default=0,
                    help="عدد المنتجات للتجربة (0 = الكل)")
    args = ap.parse_args()

    listing = collect_listing(args.app, delay=args.delay)
    items = list(listing.items())
    if args.limit:
        items = items[: args.limit]
    print(f"\nإجمالي المنتجات: {len(items)}\n")

    results = []
    for i, (url, info) in enumerate(items, 1):
        print(f"[منتج {i}/{len(items)}] {url}")
        data = parse_product(url, info)
        if data:
            results.append(data)
        if i % 10 == 0:  # حفظ تدريجي
            with open(args.out, "w", encoding="utf-8") as f:
                json.dump(results, f, ensure_ascii=False, indent=2)
        time.sleep(args.delay)

    with open(args.out, "w", encoding="utf-8") as f:
        json.dump(results, f, ensure_ascii=False, indent=2)
    print(f"\nتم! انحفظ {len(results)} منتج في {args.out}")


if __name__ == "__main__":
    main()