import json
import re
import hashlib
from pathlib import Path


# ============================================================
# CONFIG
# ============================================================

INPUT_FILE = "metal-scoop.json"
OUTPUT_FILE = "catalog_import.json"


# ============================================================
# HELPERS
# ============================================================

def clean_text(value):
    if value is None:
        return ""

    return re.sub(r"\s+", " ", str(value)).strip()


def is_empty(value):
    return clean_text(value) == ""


def is_placeholder(value):
    value = clean_text(value).lower()

    return value in {
        "",
        "...",
        "..",
        "-",
        "n/a",
        "na",
        "null",
        "none",
    }


def slugify(value):
    """
    Example:
        Fire Protection Pumps
        ->
        fire-protection-pumps
    """

    value = clean_text(value).lower()

    value = value.replace("&", " and ")

    value = re.sub(r"[’']", "", value)

    value = re.sub(
        r"[^\w\s-]",
        " ",
        value,
        flags=re.UNICODE
    )

    value = re.sub(
        r"[\s_-]+",
        "-",
        value
    )

    return value.strip("-") or "item"


def extract_group_id(url):
    """
    Supports:

    /catalogue/group/8973
    /catalogue/group/8973/Fire-Protection-Pumps
    """

    if not url:
        return None

    match = re.search(
        r"/catalogue/group/(\d+)",
        url
    )

    if match:
        return match.group(1)

    return None


def extract_category_name(page_title):
    """
    Example:

    Fire Protection Pumps, Fire Protection Pumps | Scope Metals

    ->

    Fire Protection Pumps
    """

    title = clean_text(page_title)

    if not title:
        return "Uncategorized"

    # Remove website/company part
    title = title.split("|")[0].strip()

    # Usually first part is the category
    title = title.split(",")[0].strip()

    return title or "Uncategorized"


def clean_details(details):
    """
    Remove:
    ...
    empty values
    duplicates
    """

    if not isinstance(details, list):
        return []

    result = []
    seen = set()

    for value in details:

        value = clean_text(value)

        if is_placeholder(value):
            continue

        key = value.lower()

        if key in seen:
            continue

        seen.add(key)

        result.append(value)

    return result


def product_unique_key(product):

    # Best option
    if product.get("id") not in (None, ""):
        return f"id:{product['id']}"

    # Second option
    product_url = clean_text(
        product.get("product_url")
    )

    if product_url:
        return f"url:{product_url}"

    # Last option
    raw = (
        clean_text(product.get("name"))
        + "|"
        + clean_text(product.get("page_url"))
    )

    return (
        "hash:"
        + hashlib.sha1(
            raw.lower().encode("utf-8")
        ).hexdigest()
    )


# ============================================================
# LOAD JSON
# ============================================================

def load_catalog(file_path):

    text = Path(file_path).read_text(
        encoding="utf-8-sig"
    ).strip()

    # --------------------------------------------------------
    # Case 1:
    #
    # {
    #     "products": [...]
    # }
    # --------------------------------------------------------

    try:
        data = json.loads(text)

        if isinstance(data, dict):
            if isinstance(data.get("products"), list):
                return data["products"]

        if isinstance(data, list):
            return data

    except json.JSONDecodeError:
        pass


    # --------------------------------------------------------
    # Case 2:
    #
    # "products": [
    #     ...
    # ]
    #
    # Missing outer {}
    # --------------------------------------------------------

    if text.startswith('"products"'):

        text = "{\n" + text + "\n}"

        # Remove trailing comma before closing
        text = re.sub(
            r",\s*([}\]])",
            r"\1",
            text
        )

        try:
            data = json.loads(text)

            if isinstance(data, dict):
                return data.get(
                    "products",
                    []
                )

        except json.JSONDecodeError:
            pass


    # --------------------------------------------------------
    # Case 3:
    #
    # Scraper stopped with:
    #
    # },
    #
    # Add missing closing ]
    # }
    # --------------------------------------------------------

    if '"products"' in text:

        # Remove final comma
        text = re.sub(
            r",\s*$",
            "",
            text
        )

        # If products array isn't closed
        if text.rstrip().endswith("},"):

            text = text.rstrip()[:-1]

        # Add closing array/object
        candidate = (
            "{\n"
            + text
            + "\n]\n}"
        )

        try:
            data = json.loads(candidate)

            if isinstance(data, dict):
                return data.get(
                    "products",
                    []
                )

        except json.JSONDecodeError:
            pass


    raise ValueError(
        "Could not parse the input file. "
        "Make sure it contains a products array."
    )


# ============================================================
# BUILD CATALOG
# ============================================================

def build_catalog(products_raw):

    categories = {}

    products = []

    seen_products = set()

    skipped_placeholders = 0

    skipped_duplicates = 0


    for raw in products_raw:

        if not isinstance(raw, dict):
            continue


        # ----------------------------------------------------
        # PRODUCT NAME
        # ----------------------------------------------------

        name = clean_text(
            raw.get("name")
        )

        # Remove fake scraper products
        if is_placeholder(name):

            skipped_placeholders += 1

            continue


        # ----------------------------------------------------
        # SOURCE DATA
        # ----------------------------------------------------

        page_url = clean_text(
            raw.get("page_url")
        )

        product_url = clean_text(
            raw.get("product_url")
        )

        page_title = clean_text(
            raw.get("page_title")
        )

        external_id = raw.get("id")


        # ----------------------------------------------------
        # CATEGORY
        # ----------------------------------------------------

        group_id = extract_group_id(
            page_url
        )

        category_name = extract_category_name(
            page_title
        )


        if group_id:

            category_id = f"cat-{group_id}"

        else:

            category_id = (
                "cat-"
                + slugify(category_name)
            )


        category_slug = slugify(
            category_name
        )


        # ----------------------------------------------------
        # CREATE CATEGORY
        # ----------------------------------------------------

        if category_id not in categories:

            categories[category_id] = {

                "id": category_id,

                "external_id": group_id,

                "name": category_name,

                "slug": category_slug,

                "parent_id": None,

                "source": {

                    "group_id": group_id,

                    "url": page_url,

                    "page_title": page_title
                },

                "product_ids": []
            }


        # ----------------------------------------------------
        # DUPLICATE CHECK
        # ----------------------------------------------------

        unique_key = product_unique_key(
            raw
        )

        if unique_key in seen_products:

            skipped_duplicates += 1

            continue


        seen_products.add(
            unique_key
        )


        # ----------------------------------------------------
        # PRODUCT ID
        # ----------------------------------------------------

        if external_id not in (
            None,
            ""
        ):

            product_id = (
                f"product-{external_id}"
            )

        else:

            product_id = (
                "product-"
                + hashlib.sha1(
                    unique_key.encode()
                ).hexdigest()[:12]
            )


        # ----------------------------------------------------
        # IMAGE
        # ----------------------------------------------------

        image_url = clean_text(
            raw.get("image_url")
        )

        image_alt = clean_text(
            raw.get("image_alt")
        )

        image_title = clean_text(
            raw.get("image_title")
        )


        if is_placeholder(image_alt):

            image_alt = name


        images = []


        if (
            image_url
            and not is_placeholder(image_url)
        ):

            images.append({

                "url": image_url,

                "alt": image_alt,

                "title": image_title
            })


        # ----------------------------------------------------
        # DETAILS
        # ----------------------------------------------------

        details = clean_details(
            raw.get("details")
        )


        # ----------------------------------------------------
        # PRODUCT
        # ----------------------------------------------------

        product = {

            "id": product_id,

            "external_id": external_id,

            "name": name,

            "slug": slugify(name),

            "category_id": category_id,

            "category_name": category_name,

            "images": images,

            "details": details,

            "source": {

                "product_url": product_url,

                "page_url": page_url,

                "page_title": page_title
            }
        }


        products.append(
            product
        )


        categories[
            category_id
        ][
            "product_ids"
        ].append(
            product_id
        )


    # --------------------------------------------------------
    # SORT
    # --------------------------------------------------------

    categories = sorted(
        categories.values(),
        key=lambda x: x["name"].lower()
    )


    products = sorted(
        products,
        key=lambda x: (
            x["category_name"].lower(),
            x["name"].lower()
        )
    )


    return (
        categories,
        products,
        skipped_placeholders,
        skipped_duplicates
    )


# ============================================================
# MAIN
# ============================================================

def main():

    print()
    print("=" * 60)
    print("CATALOG IMPORT GENERATOR")
    print("=" * 60)
    print()


    # Load
    products_raw = load_catalog(
        INPUT_FILE
    )


    print(
        f"Raw products found: {len(products_raw)}"
    )


    # Process
    (
        categories,
        products,
        skipped_placeholders,
        skipped_duplicates
    ) = build_catalog(
        products_raw
    )


    # Statistics
    products_with_images = sum(
        1
        for product in products
        if product["images"]
    )


    products_without_images = (
        len(products)
        - products_with_images
    )


    # --------------------------------------------------------
    # FINAL OUTPUT
    # --------------------------------------------------------

    catalog = {

        "schema_version": "1.0",

        "catalog_type": "engineering_equipment",

        "source": {

            "type": "scraped_catalog",

            "input_file": INPUT_FILE
        },


        "statistics": {

            "categories": len(
                categories
            ),

            "products": len(
                products
            ),

            "products_with_images":
                products_with_images,

            "products_without_images":
                products_without_images,

            "skipped_placeholder_products":
                skipped_placeholders,

            "skipped_duplicate_products":
                skipped_duplicates
        },


        "categories": categories,


        "products": products,


        # ----------------------------------------------------
        # AI IMPORT INSTRUCTIONS
        # ----------------------------------------------------

        "ai_import_instructions": {

            "purpose":
                "Import this catalog into an e-commerce platform.",

            "recommended_order": [

                "1. Create categories",

                "2. Create products",

                "3. Connect products to categories",

                "4. Download/import product images",

                "5. Preserve source URLs",

                "6. Verify duplicates"
            ],


            "category_rules": [

                "Use categories[].id as the internal import reference.",

                "Use categories[].name as the category name.",

                "Use categories[].slug as the category slug.",

                "Use categories[].external_id to preserve the original source group ID."
            ],


            "product_rules": [

                "Use products[].id as the import reference.",

                "Use products[].external_id as the original source ID.",

                "Use products[].name as the product name.",

                "Use products[].slug as the product slug.",

                "Use products[].category_id to assign the category.",

                "Use products[].images[].url as the product image source.",

                "Do not create placeholder products.",

                "Do not create duplicate products.",

                "Preserve source URLs for traceability."
            ],


            "image_rules": [

                "Use the original image URL.",

                "Use images[].alt for image alt text.",

                "Use the product name as fallback alt text.",

                "If the image URL is missing, create the product without an image."
            ],


            "medusa_notes": [

                "Map category_id to the Medusa product category.",

                "Map products to their corresponding category before publishing.",

                "Use the original external_id as metadata for source traceability.",

                "Use the image URL as the source for product images.",

                "Do not invent product specifications that are not present in the source data."
            ]
        }
    }


    # --------------------------------------------------------
    # SAVE
    # --------------------------------------------------------

    output_path = Path(
        OUTPUT_FILE
    )


    output_path.write_text(

        json.dumps(
            catalog,
            ensure_ascii=False,
            indent=2
        ),

        encoding="utf-8"
    )


    # --------------------------------------------------------
    # REPORT
    # --------------------------------------------------------

    print()
    print("DONE")
    print("-" * 60)

    print(
        f"Categories:              {len(categories)}"
    )

    print(
        f"Products:                {len(products)}"
    )

    print(
        f"Products with images:    {products_with_images}"
    )

    print(
        f"Without images:          {products_without_images}"
    )

    print(
        f"Placeholders removed:    {skipped_placeholders}"
    )

    print(
        f"Duplicates removed:     {skipped_duplicates}"
    )

    print()
    print(
        f"Output: {output_path.resolve()}"
    )

    print("=" * 60)


if __name__ == "__main__":

    main()