#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
ينزّل صور المنتجات من products.json إلى مجلد product

التثبيت:
    pip install requests

التشغيل:
    python download_images.py                        # كل صور كل المنتجات
    python download_images.py --main-only            # الصورة الرئيسية فقط
    python download_images.py --json all.json --folder product

الناتج:
    product/3621_1.png , product/3621_2.jpg ...
    products_local.json   (نفس البيانات + حقل local_images بمسارات الصور المحلية)
"""

import argparse
import json
import os
import time
from urllib.parse import urlparse, unquote

import requests

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
        "(KHTML, like Gecko) Chrome/124.0 Safari/537.36"
    ),
    "Referer": "https://mrheat.ps/",
}
IMG_EXTS = {".jpg", ".jpeg", ".png", ".webp", ".gif", ".bmp"}
CT_EXT = {
    "image/jpeg": ".jpg", "image/png": ".png", "image/webp": ".webp",
    "image/gif": ".gif", "image/bmp": ".bmp",
}


def url_ext(url):
    ext = os.path.splitext(unquote(urlparse(url).path))[1].lower()
    return ext if ext in IMG_EXTS else ""


def download(session, url, base, retries=3):
    """ينزّل الصورة إلى base+ext. بيتخطى الملف إذا كان موجود من قبل."""
    ext = url_ext(url)
    if ext:
        path = base + ext
        if os.path.exists(path) and os.path.getsize(path) > 0:
            return path, "موجودة"

    for attempt in range(1, retries + 1):
        try:
            r = session.get(url, stream=True, timeout=60)
            r.raise_for_status()
            ctype = r.headers.get("Content-Type", "").split(";")[0].strip().lower()
            if not ctype.startswith("image/"):
                raise ValueError(f"ليست صورة (Content-Type: {ctype or 'غير معروف'})")
            path = base + (ext or CT_EXT.get(ctype, ".jpg"))
            tmp = path + ".part"
            with open(tmp, "wb") as f:
                for chunk in r.iter_content(65536):
                    f.write(chunk)
            os.replace(tmp, path)
            return path, "تم"
        except (requests.RequestException, ValueError, OSError) as e:
            print(f"    ! ({attempt}/{retries}) {e}")
            time.sleep(2 * attempt)
    return None, "فشل"


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--json", default="products.json", help="ملف المنتجات")
    ap.add_argument("--folder", default="product", help="مجلد حفظ الصور")
    ap.add_argument("--out", default="products_local.json",
                    help="ملف JSON الناتج (مع المسارات المحلية)")
    ap.add_argument("--main-only", action="store_true",
                    help="الصورة الرئيسية فقط لكل منتج")
    ap.add_argument("--delay", type=float, default=0.5)
    args = ap.parse_args()

    with open(args.json, encoding="utf-8") as f:
        products = json.load(f)

    os.makedirs(args.folder, exist_ok=True)
    session = requests.Session()
    session.headers.update(HEADERS)

    ok = failed = skipped = 0
    for i, p in enumerate(products, 1):
        pid = str(p.get("id") or i)
        urls = p.get("images") or ([p["image"]] if p.get("image") else [])
        if args.main_only:
            urls = urls[:1]

        print(f"[{i}/{len(products)}] {pid} - {p.get('name', '')[:50]} ({len(urls)} صورة)")
        local = []
        for n, url in enumerate(urls, 1):
            path, status = download(session, url, os.path.join(args.folder, f"{pid}_{n}"))
            if path:
                local.append(path.replace(os.sep, "/"))
                if status == "موجودة":
                    skipped += 1
                else:
                    ok += 1
                    time.sleep(args.delay)
            else:
                failed += 1
                print(f"    ✗ فشل: {url}")
        p["local_images"] = local

        if i % 20 == 0:  # حفظ تدريجي
            with open(args.out, "w", encoding="utf-8") as f:
                json.dump(products, f, ensure_ascii=False, indent=2)

    with open(args.out, "w", encoding="utf-8") as f:
        json.dump(products, f, ensure_ascii=False, indent=2)
    print(f"\nانتهى: نُزّلت {ok} ، موجودة مسبقاً {skipped} ، فشلت {failed}")
    print(f"الصور في المجلد: {args.folder}/   |   البيانات: {args.out}")


if __name__ == "__main__":
    main()