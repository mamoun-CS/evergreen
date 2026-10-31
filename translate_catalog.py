import json
import time
import urllib.request
import urllib.parse
import sys

INPUT_FILE = "titanum_complete_catalog.json"
CACHE_FILE = "translation_cache.json"

# تحميل الكاش السابق إن وجد لتفادي تكرار ترجمة النصوص المتشابهة
cache = {}
try:
    with open(CACHE_FILE, "r", encoding="utf-8") as f:
        cache = json.load(f)
    print(f"📦 تم تحميل {len(cache)} نص مترجم مسبقاً من الكاش.")
except Exception:
    pass

def save_cache():
    try:
        with open(CACHE_FILE, "w", encoding="utf-8") as f:
            json.dump(cache, f, ensure_ascii=False)
    except Exception:
        pass

def translate_text(text):
    if not text or not text.strip():
        return text
    
    clean = text.strip()
    if clean in cache:
        return cache[clean]
    
    # التحقق مما إذا كان النص يحتوي على حروف عبرية
    has_hebrew = any('\u0590' <= ch <= '\u05ff' for ch in clean)
    if not has_hebrew:
        cache[clean] = clean
        return clean

    # تقسيم النصوص الطويلة لتفادي حدود الـ URL
    max_chunk = 1500
    if len(clean) > max_chunk:
        chunks = [clean[i:i+max_chunk] for i in range(0, len(clean), max_chunk)]
        translated_chunks = [translate_text(c) for c in chunks]
        full_res = " ".join(translated_chunks)
        cache[clean] = full_res
        return full_res

    url = "https://translate.googleapis.com/translate_a/single?client=gtx&sl=iw&tl=en&dt=t&q=" + urllib.parse.quote(clean)
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"})

    for attempt in range(5):
        try:
            with urllib.request.urlopen(req, timeout=15) as resp:
                data = json.loads(resp.read().decode("utf-8"))
                # تجميع جمل الترجمة
                result = "".join([segment[0] for segment in data[0] if segment and segment[0]])
                cache[clean] = result
                return result
        except Exception as e:
            time.sleep(1 + attempt)

    return clean  # في حالة الفشل نرجع النص كما هو

def main():
    print(f"🔹 جاري قراءة {INPUT_FILE}...")
    with open(INPUT_FILE, "r", encoding="utf-8") as f:
        data = json.load(f)

    # 1. ترجمة التصنيفات الهرمية
    print("\n🔹 [1/2] جاري ترجمة شجرة التصنيفات...")
    hierarchy = data.get("categories_hierarchy", [])
    for cat in hierarchy:
        cat["name"] = translate_text(cat.get("name", ""))
        for sub in cat.get("subcategories", []):
            sub["name"] = translate_text(sub.get("name", ""))

    # 2. ترجمة المنتجات
    products = data.get("products", [])
    total_products = len(products)
    print(f"\n🔹 [2/2] جاري ترجمة {total_products} منتج بالكامل (العناوين، التصنيفات، الوصف، المقتطف)...")

    start_time = time.time()
    for idx, prod in enumerate(products, 1):
        # ترجمة العنوان
        prod["title"] = translate_text(prod.get("title", ""))

        # ترجمة الأقسام الرئيسية
        for m in prod.get("main_categories", []):
            m["name"] = translate_text(m.get("name", ""))
        prod["main_category"] = translate_text(prod.get("main_category", ""))

        # ترجمة الأقسام الفرعية
        for s in prod.get("sub_categories", []):
            s["name"] = translate_text(s.get("name", ""))
        prod["sub_category"] = translate_text(prod.get("sub_category", ""))

        # ترجمة الوصف والمقتطف
        prod["excerpt"] = translate_text(prod.get("excerpt", ""))
        prod["description"] = translate_text(prod.get("description", ""))

        if idx % 25 == 0 or idx == total_products:
            save_cache()
            elapsed = time.time() - start_time
            rate = idx / elapsed if elapsed > 0 else 1
            remaining = (total_products - idx) / rate
            print(f"  - تم إنجاز {idx}/{total_products} منتج ({round(idx/total_products*100, 1)}%) - الوقت المتبقي التقديري: {round(remaining/60, 1)} دقيقة")

    # حفظ الملف بعد استبدال كل النصوص بالإنجليزية مباشرة
    print(f"\n🔹 جاري حفظ التعديلات في {INPUT_FILE}...")
    with open(INPUT_FILE, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

    save_cache()
    print("🎉 تم الانتهاء بنجاح من ترجمة كامل الملف إلى اللغة الإنجليزية!")

if __name__ == "__main__":
    main()
