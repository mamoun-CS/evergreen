import os
import json
import time
import subprocess
from urllib.parse import urlsplit, unquote

CATALOG_FILE = "titanum_complete_catalog.json"
OUTPUT_DIR = os.path.join("public", "products")
MAP_FILE = os.path.join("data", "titanum_images_map.json")

os.makedirs(OUTPUT_DIR, exist_ok=True)
os.makedirs(os.path.dirname(MAP_FILE), exist_ok=True)

image_map = {}
if os.path.exists(MAP_FILE):
    try:
        with open(MAP_FILE, "r", encoding="utf-8") as f:
            image_map = json.load(f)
    except Exception:
        image_map = {}

def get_target_info(raw_url, prod_id):
    parts = urlsplit(raw_url)
    clean_base = unquote(os.path.basename(parts.path))
    name_no_ext, ext = os.path.splitext(clean_base)
    if not ext:
        ext = ".webp"
    safe_name = "".join(c if (c.isalnum() or c in ("-", "_", ".")) else "_" for c in name_no_ext)
    fname = f"titanum-{prod_id}-{safe_name}{ext}"
    local_path = os.path.join(OUTPUT_DIR, fname)
    public_path = f"/products/{fname}"
    return fname, local_path, public_path

def main():
    print(f"🔹 بدء تنزيل صور الكتالوج بأعلى جودة باستخدام curl الموثوق...", flush=True)
    with open(CATALOG_FILE, "r", encoding="utf-8") as f:
        catalog = json.load(f)

    products = catalog.get("products", [])
    total = len(products)
    print(f"🔹 إجمالي المنتجات: {total}", flush=True)

    downloaded = 0
    cached = 0
    failed = 0
    start_time = time.time()

    for idx, p in enumerate(products, 1):
        pid = str(p.get("id"))
        sizes = p.get("image_sizes", {})
        raw_url = sizes.get("full") or p.get("image") or sizes.get("large") or sizes.get("woocommerce_single")

        if not raw_url:
            failed += 1
            continue

        fname, local_path, public_path = get_target_info(raw_url, pid)

        # التحقق إذا كانت الصورة محملة مسبقاً وبحجم سليم
        if os.path.exists(local_path) and os.path.getsize(local_path) > 1000:
            cached += 1
            image_map[pid] = public_path
        else:
            success = False
            for attempt in range(2):
                cmd = ["curl.exe", "-s", "-k", "--connect-timeout", "10", "-m", "30", "-o", local_path, raw_url]
                res = subprocess.run(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
                if res.returncode == 0 and os.path.exists(local_path) and os.path.getsize(local_path) > 500:
                    image_map[pid] = public_path
                    downloaded += 1
                    success = True
                    break
                time.sleep(1)

            if not success:
                failed += 1

        if idx % 25 == 0 or idx == total:
            with open(MAP_FILE, "w", encoding="utf-8") as f:
                json.dump(image_map, f, ensure_ascii=False, indent=2)

            elapsed = time.time() - start_time
            rate = idx / elapsed if elapsed > 0 else 1
            rem = (total - idx) / rate
            pct = round(idx / total * 100, 1)
            print(f"  - [{pct}%] {idx}/{total} | تم التحميل: {downloaded} | مخزن: {cached} | فشل: {failed} | الوقت المتبقي: {round(rem/60, 1)} دقيقة", flush=True)

    with open(MAP_FILE, "w", encoding="utf-8") as f:
        json.dump(image_map, f, ensure_ascii=False, indent=2)

    print(f"\n🎉 اكتمل تنزيل جميع الصور بأعلى جودة! تم التحميل: {downloaded} | مخزن: {cached} | فشل: {failed}", flush=True)

if __name__ == "__main__":
    main()
