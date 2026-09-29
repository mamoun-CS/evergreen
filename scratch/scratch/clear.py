import json

file_path = "metal-scoop.json"

with open(file_path, "r", encoding="utf-8") as f:
    data = json.load(f)

# إذا كان JSON عبارة عن object وفيه key مثل products/items
# عدّل "products" حسب اسم الـ key عندك

if isinstance(data, list):
    original_count = len(data)
    data = [row for row in data if row.get("name") != "No Image"]
else:
    # حذف من جميع القوائم الموجودة داخل الـ JSON
    original_count = 0

    for key, value in data.items():
        if isinstance(value, list):
            original_count += len(value)
            data[key] = [
                row for row in value
                if not (isinstance(row, dict) and row.get("name") == "No Image")
            ]

with open(file_path, "w", encoding="utf-8") as f:
    json.dump(data, f, ensure_ascii=False, indent=4)

# حساب المحذوف
if isinstance(data, list):
    deleted = original_count - len(data)
else:
    new_count = sum(
        len(v) for v in data.values()
        if isinstance(v, list)
    )
    deleted = original_count - new_count

print(f"Deleted: {deleted} rows")