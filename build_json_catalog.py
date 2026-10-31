import subprocess
import json
import time
import re
import os

BASE_URL = "https://as-titanum.com/wp-json/wp/v2"

def clean_text(raw):
    if not raw:
        return ""
    text = re.sub(r'<[^>]+>', ' ', raw)
    text = text.replace('&quot;', '"').replace('&#8211;', '-').replace('&#8230;', '...').replace('&amp;', '&')
    return re.sub(r'\s+', ' ', text).strip()

def curl_get(url):
    for attempt in range(3):
        cmd = ["curl.exe", "-s", "-i", url]
        res = subprocess.run(cmd, capture_output=True, text=True, encoding="utf-8", errors="ignore")
        if res.returncode == 0 and res.stdout:
            # فصل الـ headers عن الـ body
            parts = res.stdout.split("\r\n\r\n", 1)
            if len(parts) == 1:
                parts = res.stdout.split("\n\n", 1)
            headers_part = parts[0]
            body_part = parts[1] if len(parts) > 1 else ""

            # استخراج TotalPages
            total_pages = 1
            m = re.search(r'x-wp-totalpages:\s*(\d+)', headers_part, re.IGNORECASE)
            if m:
                total_pages = int(m.group(1))

            try:
                data = json.loads(body_part)
                return data, total_pages
            except Exception:
                pass
        time.sleep(1)
    return None, 0

def fetch_categories():
    print("🔹 [1/2] جاري سحب شجرة التصنيفات...")
    cats = {}
    page = 1
    while True:
        url = f"{BASE_URL}/product_cat?per_page=100&page={page}"
        data, total_pages = curl_get(url)
        if not data or not isinstance(data, list):
            break
        for c in data:
            cats[c["id"]] = {
                "id": c["id"],
                "name": c["name"],
                "slug": c["slug"],
                "parent_id": c["parent"],
                "url": c["link"]
            }
        if page >= total_pages:
            break
        page += 1
    print(f"✅ تم سحب {len(cats)} تصنيف بنجاح.")
    return cats

def fetch_products(cats):
    print("🔹 [2/2] جاري سحب كافة منتجات المتجر الـ 1617 بالكامل...")
    products = []
    page = 1
    per_page = 100

    while True:
        url = f"{BASE_URL}/product?per_page={per_page}&page={page}&_embed=1"
        data, total_pages = curl_get(url)
        if not data or not isinstance(data, list):
            break

        for item in data:
            # استخراج الصورة الرئيسية وكافة مقاساتها
            img_url = ""
            img_sizes = {}
            try:
                media = item.get("_embedded", {}).get("wp:featuredmedia", [])[0]
                img_url = media.get("source_url", "")
                sizes = media.get("media_details", {}).get("sizes", {})
                for s_key, s_val in sizes.items():
                    img_sizes[s_key] = s_val.get("source_url", "")
            except Exception:
                pass

            # استخراج الأقسام وتحديد الرئيسي والفرعي بدقة
            product_cat_ids = item.get("product_cat", [])
            main_cats = []
            sub_cats = []

            for cid in product_cat_ids:
                c = cats.get(cid)
                if not c:
                    continue
                if c["parent_id"] == 0:
                    main_cats.append({"id": c["id"], "name": c["name"], "slug": c["slug"], "url": c["url"]})
                else:
                    parent_c = cats.get(c["parent_id"])
                    if parent_c:
                        main_cats.append({"id": parent_c["id"], "name": parent_c["name"], "slug": parent_c["slug"], "url": parent_c["url"]})
                    sub_cats.append({"id": c["id"], "name": c["name"], "slug": c["slug"], "parent_id": c["parent_id"], "url": c["url"]})

            # تنقية التكرار
            unique_main = [dict(t) for t in {tuple(d.items()) for d in main_cats}]
            unique_sub = [dict(t) for t in {tuple(d.items()) for d in sub_cats}]

            products.append({
                "id": item.get("id"),
                "sku": item.get("slug"),
                "title": clean_text(item.get("title", {}).get("rendered")),
                "main_categories": unique_main,
                "sub_categories": unique_sub,
                "main_category": " / ".join([m["name"] for m in unique_main]) if unique_main else "غير مصنف",
                "sub_category": " / ".join([s["name"] for s in unique_sub]) if unique_sub else "بدون تفرع",
                "image": img_url,
                "image_sizes": img_sizes,
                "url": item.get("link"),
                "description": clean_text(item.get("content", {}).get("rendered")),
                "description_html": item.get("content", {}).get("rendered", ""),
                "excerpt": clean_text(item.get("excerpt", {}).get("rendered")),
                "date_published": item.get("date"),
                "date_modified": item.get("modified")
            })

        print(f"  - تم سحب صفحة {page}/{total_pages}... (المجموع حتى الآن: {len(products)} منتج)")
        if page >= total_pages:
            break
        page += 1
        time.sleep(0.3)

    return products

def main():
    start = time.time()
    cats = fetch_categories()
    products = fetch_products(cats)

    output = {
        "metadata": {
            "source": "https://as-titanum.com",
            "generated_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
            "total_categories": len(cats),
            "total_products": len(products)
        },
        "categories_hierarchy": [
            {
                "id": c["id"],
                "name": c["name"],
                "url": c["url"],
                "subcategories": [
                    {"id": sub["id"], "name": sub["name"], "url": sub["url"]}
                    for sub in cats.values() if sub["parent_id"] == c["id"]
                ]
            }
            for c in cats.values() if c["parent_id"] == 0
        ],
        "products": products
    }

    out_file = "titanum_complete_catalog.json"
    with open(out_file, "w", encoding="utf-8") as f:
        json.dump(output, f, ensure_ascii=False, indent=2)

    elapsed = round(time.time() - start, 1)
    print(f"\n🎉 اكتمل السحب بنجاح وحفظ الملف!")
    print(f"📁 اسم الملف: {out_file}")
    print(f"📦 إجمالي المنتجات المسحوبة: {len(products)}")
    print(f"⏱️ استغرق: {elapsed} ثانية")

if __name__ == "__main__":
    main()
