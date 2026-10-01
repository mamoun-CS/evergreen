import os
import re
import csv
import json
import time
import hashlib
import zipfile
import mimetypes
import argparse
import urllib.robotparser

from pathlib import Path
from urllib.parse import urljoin, urlparse, urldefrag, unquote

import requests
from bs4 import BeautifulSoup
from tqdm import tqdm


# ============================================================
# CONFIG
# ============================================================

DEFAULT_URL = "https://itaytrade.com/ar/"

OUTPUT_DIR = Path("scraped_itaytrade")

REQUEST_DELAY = 1.0
TIMEOUT = 30
MAX_RETRIES = 3

USER_AGENT = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
    "AppleWebKit/537.36 (KHTML, like Gecko) "
    "Chrome/153.0 Safari/537.36"
)

IMAGE_EXTENSIONS = {
    ".jpg",
    ".jpeg",
    ".png",
    ".webp",
    ".gif",
    ".bmp",
    ".avif",
}


# ============================================================
# SESSION
# ============================================================

session = requests.Session()

session.headers.update({
    "User-Agent": USER_AGENT,
    "Accept": (
        "text/html,application/xhtml+xml,application/xml;"
        "q=0.9,image/avif,image/webp,*/*;q=0.8"
    ),
    "Accept-Language": "ar,en-US;q=0.9,en;q=0.8,he;q=0.7",
})


# ============================================================
# HELPERS
# ============================================================

def clean_text(value):
    if not value:
        return ""

    value = re.sub(r"\s+", " ", value)
    return value.strip()


def safe_filename(value, max_length=120):
    value = unquote(value or "")
    value = re.sub(r'[<>:"/\\|?*\x00-\x1F]', "_", value)
    value = re.sub(r"\s+", "_", value)
    value = value.strip("._ ")

    if not value:
        value = "file"

    return value[:max_length]


def absolute_url(base, value):
    if not value:
        return None

    value = value.strip()

    if value.startswith("//"):
        return "https:" + value

    return urljoin(base, value)


def same_domain(url, base_url):
    return urlparse(url).netloc.lower() == urlparse(base_url).netloc.lower()


def normalize_url(url):
    if not url:
        return None

    url, _ = urldefrag(url)

    parsed = urlparse(url)

    # Remove tracking parameters
    query = parsed.query

    if query:
        allowed = []

        for item in query.split("&"):
            key = item.split("=")[0].lower()

            if key not in {
                "utm_source",
                "utm_medium",
                "utm_campaign",
                "utm_term",
                "utm_content",
                "fbclid",
                "gclid",
            }:
                allowed.append(item)

        query = "&".join(allowed)

    parsed = parsed._replace(query=query)

    result = parsed.geturl()

    if result.endswith("/"):
        result = result[:-1]

    return result


def hash_url(url):
    return hashlib.sha1(url.encode("utf-8")).hexdigest()[:12]


# ============================================================
# HTTP
# ============================================================

def fetch(url, binary=False):
    for attempt in range(1, MAX_RETRIES + 1):

        try:
            time.sleep(REQUEST_DELAY)

            response = session.get(
                url,
                timeout=TIMEOUT,
                allow_redirects=True,
            )

            if response.status_code == 200:
                return response.content if binary else response.text

            if response.status_code in {403, 429}:
                print(
                    f"[WARN] {response.status_code} for {url}. "
                    f"Waiting before retry..."
                )
                time.sleep(5 * attempt)

            else:
                print(
                    f"[WARN] HTTP {response.status_code}: {url}"
                )

        except requests.RequestException as exc:
            print(
                f"[WARN] Request error ({attempt}/{MAX_RETRIES}): "
                f"{url} -> {exc}"
            )

            time.sleep(3 * attempt)

    return None


# ============================================================
# ROBOTS
# ============================================================

def check_robots(base_url):
    parsed = urlparse(base_url)

    robots_url = (
        f"{parsed.scheme}://{parsed.netloc}/robots.txt"
    )

    rp = urllib.robotparser.RobotFileParser()

    try:
        rp.set_url(robots_url)
        rp.read()

        allowed = rp.can_fetch(USER_AGENT, base_url)

        if not allowed:
            print(
                "[ERROR] robots.txt does not allow this crawler "
                "to access the requested URL."
            )
            return False

        print("[OK] robots.txt allows crawling.")

    except Exception:
        print(
            "[WARN] Could not read robots.txt. "
            "Proceeding cautiously."
        )

    return True


# ============================================================
# SITEMAP
# ============================================================

def find_sitemaps(base_url):
    parsed = urlparse(base_url)
    root = f"{parsed.scheme}://{parsed.netloc}"

    candidates = [
        f"{root}/sitemap.xml",
        f"{root}/sitemap_index.xml",
        f"{root}/sitemap-index.xml",
        f"{root}/sitemap_products.xml",
    ]

    result = []

    for url in candidates:

        text = fetch(url)

        if not text:
            continue

        if "<urlset" in text or "<sitemapindex" in text:
            result.append(url)

    return result


def parse_sitemap(url):
    text = fetch(url)

    if not text:
        return []

    soup = BeautifulSoup(text, "xml")

    urls = []

    for loc in soup.find_all("loc"):
        value = clean_text(loc.get_text())

        if value:
            urls.append(value)

    return urls


# ============================================================
# LINK DISCOVERY
# ============================================================

def discover_links(url, html, base_url):
    soup = BeautifulSoup(html, "lxml")

    links = set()

    for a in soup.find_all("a", href=True):

        href = absolute_url(url, a.get("href"))

        if not href:
            continue

        href = normalize_url(href)

        if not href:
            continue

        if not same_domain(href, base_url):
            continue

        parsed = urlparse(href)

        # Skip files
        path_lower = parsed.path.lower()

        if any(
            path_lower.endswith(ext)
            for ext in [
                ".pdf",
                ".zip",
                ".rar",
                ".doc",
                ".docx",
                ".xls",
                ".xlsx",
                ".mp4",
                ".mp3",
            ]
        ):
            continue

        links.add(href)

    return links


# ============================================================
# PRODUCT DETECTION
# ============================================================

PRODUCT_PATTERNS = [
    r"/product/",
    r"/products/",
    r"/item/",
    r"/shop/",
    r"/p/",
    r"/prod/",
]


def looks_like_product_url(url):
    path = urlparse(url).path.lower()

    if any(pattern.strip("/") in path for pattern in PRODUCT_PATTERNS):
        return True

    return False


def has_product_schema(html):
    soup = BeautifulSoup(html, "lxml")

    for script in soup.find_all("script", type="application/ld+json"):

        text = script.get_text(strip=True)

        if not text:
            continue

        if '"Product"' in text or '"product"' in text:
            return True

    return False


def detect_product(url, html):
    if looks_like_product_url(url):
        return True

    if has_product_schema(html):
        return True

    soup = BeautifulSoup(html, "lxml")

    # Common product-page indicators
    indicators = [
        "[itemtype*='Product']",
        ".product",
        ".product-details",
        ".product-detail",
        ".product-page",
        "#product",
    ]

    score = 0

    for selector in indicators:
        if soup.select_one(selector):
            score += 1

    return score >= 2


# ============================================================
# JSON-LD
# ============================================================

def parse_json_ld(soup):
    objects = []

    for script in soup.find_all(
        "script",
        type="application/ld+json"
    ):

        text = script.get_text(strip=True)

        if not text:
            continue

        try:
            data = json.loads(text)

            if isinstance(data, list):
                objects.extend(data)

            else:
                objects.append(data)

        except Exception:
            continue

    return objects


def find_product_jsonld(objects):

    for obj in objects:

        if not isinstance(obj, dict):
            continue

        obj_type = obj.get("@type")

        if isinstance(obj_type, list):
            types = obj_type
        else:
            types = [obj_type]

        if any(
            str(x).lower() == "product"
            for x in types
        ):
            return obj

        # @graph
        graph = obj.get("@graph")

        if isinstance(graph, list):

            for item in graph:

                if not isinstance(item, dict):
                    continue

                item_type = item.get("@type")

                if str(item_type).lower() == "product":
                    return item

    return None


# ============================================================
# EXTRACT TEXT
# ============================================================

def first_text(soup, selectors):

    for selector in selectors:

        node = soup.select_one(selector)

        if node:
            value = clean_text(node.get_text(" ", strip=True))

            if value:
                return value

    return ""


# ============================================================
# IMAGES
# ============================================================

def extract_images(page_url, soup, product_data=None):

    images = []

    # JSON-LD images
    if product_data:

        json_images = product_data.get("image")

        if isinstance(json_images, str):
            json_images = [json_images]

        if isinstance(json_images, list):

            for img in json_images:
                if isinstance(img, str):
                    images.append(
                        absolute_url(page_url, img)
                    )

    # HTML images
    for img in soup.find_all("img"):

        candidates = [
            img.get("src"),
            img.get("data-src"),
            img.get("data-original"),
            img.get("data-lazy-src"),
        ]

        srcset = img.get("srcset")

        if srcset:

            for item in srcset.split(","):

                item = item.strip()

                if not item:
                    continue

                candidates.append(
                    item.split(" ")[0]
                )

        for value in candidates:

            url = absolute_url(
                page_url,
                value
            )

            if not url:
                continue

            parsed = urlparse(url)

            ext = Path(parsed.path).suffix.lower()

            if ext in IMAGE_EXTENSIONS or "image" in url.lower():

                images.append(url)

    # OpenGraph image
    og = soup.find(
        "meta",
        property="og:image"
    )

    if og and og.get("content"):
        images.append(
            absolute_url(
                page_url,
                og["content"]
            )
        )

    # Remove duplicates
    result = []

    seen = set()

    for image in images:

        if not image:
            continue

        normalized = normalize_url(image)

        if normalized in seen:
            continue

        seen.add(normalized)
        result.append(normalized)

    return result


# ============================================================
# CATEGORY EXTRACTION
# ============================================================

def extract_categories(soup, product_data=None):

    categories = []

    if product_data:

        category = product_data.get("category")

        if isinstance(category, str):
            categories.append(category)

        elif isinstance(category, list):

            for item in category:

                if isinstance(item, str):
                    categories.append(item)

                elif isinstance(item, dict):

                    name = item.get("name")

                    if name:
                        categories.append(name)

    selectors = [
        ".breadcrumb a",
        ".breadcrumbs a",
        ".breadcrumb li",
        ".breadcrumbs li",
        "[class*='category'] a",
        "[class*='categories'] a",
        ".product-category",
        ".product-categories a",
    ]

    for selector in selectors:

        for node in soup.select(selector):

            text = clean_text(
                node.get_text(" ", strip=True)
            )

            if text:
                categories.append(text)

    # Unique
    result = []

    seen = set()

    for category in categories:

        key = category.lower()

        if key in seen:
            continue

        seen.add(key)
        result.append(category)

    return result


# ============================================================
# SPECIFICATIONS
# ============================================================

def extract_specs(soup):

    specs = {}

    # Tables
    for table in soup.find_all("table"):

        for row in table.find_all("tr"):

            cells = row.find_all(
                ["th", "td"]
            )

            if len(cells) >= 2:

                key = clean_text(
                    cells[0].get_text(
                        " ",
                        strip=True
                    )
                )

                value = clean_text(
                    cells[1].get_text(
                        " ",
                        strip=True
                    )
                )

                if key and value:
                    specs[key] = value

    # Definition lists
    for dl in soup.find_all("dl"):

        terms = dl.find_all("dt")
        descriptions = dl.find_all("dd")

        for term, desc in zip(
            terms,
            descriptions
        ):

            key = clean_text(
                term.get_text(
                    " ",
                    strip=True
                )
            )

            value = clean_text(
                desc.get_text(
                    " ",
                    strip=True
                )
            )

            if key and value:
                specs[key] = value

    return specs


# ============================================================
# PRODUCT EXTRACTION
# ============================================================

def extract_product(url, html):

    soup = BeautifulSoup(
        html,
        "lxml"
    )

    json_objects = parse_json_ld(soup)

    product_json = find_product_jsonld(
        json_objects
    )

    # --------------------------------------------------------
    # NAME
    # --------------------------------------------------------

    name = ""

    if product_json:
        name = clean_text(
            product_json.get("name", "")
        )

    if not name:

        name = first_text(
            soup,
            [
                "h1.product-title",
                ".product-title",
                "h1.entry-title",
                "h1.product_name",
                "h1",
            ],
        )

    # --------------------------------------------------------
    # DESCRIPTION
    # --------------------------------------------------------

    description = ""

    if product_json:
        description = clean_text(
            BeautifulSoup(
                str(
                    product_json.get(
                        "description",
                        ""
                    )
                ),
                "lxml",
            ).get_text(" ", strip=True)
        )

    if not description:

        description = first_text(
            soup,
            [
                ".product-description",
                ".product-details",
                ".description",
                ".entry-content",
                "[itemprop='description']",
            ],
        )

    # --------------------------------------------------------
    # PRICE
    # --------------------------------------------------------

    price = ""

    currency = ""

    if product_json:

        offers = product_json.get(
            "offers"
        )

        if isinstance(
            offers,
            list
        ):
            offers = offers[0] if offers else None

        if isinstance(
            offers,
            dict
        ):

            price = str(
                offers.get(
                    "price",
                    ""
                )
            )

            currency = str(
                offers.get(
                    "priceCurrency",
                    ""
                )
            )

    if not price:

        price = first_text(
            soup,
            [
                ".price",
                ".product-price",
                "[itemprop='price']",
                ".woocommerce-Price-amount",
            ],
        )

    # --------------------------------------------------------
    # SKU
    # --------------------------------------------------------

    sku = ""

    if product_json:
        sku = clean_text(
            str(
                product_json.get(
                    "sku",
                    ""
                )
            )
        )

    if not sku:

        sku = first_text(
            soup,
            [
                "[itemprop='sku']",
                ".sku",
                ".product-sku",
                ".product-code",
            ],
        )

    # --------------------------------------------------------
    # BRAND
    # --------------------------------------------------------

    brand = ""

    if product_json:

        brand_value = product_json.get(
            "brand"
        )

        if isinstance(
            brand_value,
            dict
        ):
            brand = clean_text(
                str(
                    brand_value.get(
                        "name",
                        ""
                    )
                )
            )

        elif isinstance(
            brand_value,
            str
        ):
            brand = clean_text(
                brand_value
            )

    # --------------------------------------------------------
    # CATEGORIES
    # --------------------------------------------------------

    categories = extract_categories(
        soup,
        product_json
    )

    # --------------------------------------------------------
    # SPECS
    # --------------------------------------------------------

    specs = extract_specs(
        soup
    )

    # --------------------------------------------------------
    # IMAGES
    # --------------------------------------------------------

    images = extract_images(
        url,
        soup,
        product_json
    )

    # --------------------------------------------------------
    # META
    # --------------------------------------------------------

    title = first_text(
        soup,
        ["title"]
    )

    meta_description = ""

    meta = soup.find(
        "meta",
        attrs={"name": "description"}
    )

    if meta:
        meta_description = clean_text(
            meta.get("content", "")
        )

    # --------------------------------------------------------
    # RESULT
    # --------------------------------------------------------

    return {
        "source_url": url,
        "name": name,
        "title": title,
        "description": description,
        "meta_description": meta_description,
        "price": price,
        "currency": currency,
        "sku": sku,
        "brand": brand,
        "categories": categories,
        "specifications": specs,
        "images": images,
    }


# ============================================================
# IMAGE DOWNLOADER
# ============================================================

def download_image(
    image_url,
    product_index,
    image_index
):

    folder = (
        OUTPUT_DIR
        / "images"
        / f"product-{product_index:05d}"
    )

    folder.mkdir(
        parents=True,
        exist_ok=True
    )

    parsed = urlparse(
        image_url
    )

    original_name = Path(
        parsed.path
    ).name

    extension = Path(
        original_name
    ).suffix.lower()

    if extension not in IMAGE_EXTENSIONS:

        guessed = mimetypes.guess_extension(
            "image/jpeg"
        )

        extension = guessed or ".jpg"

    filename = (
        f"{image_index:03d}_"
        f"{safe_filename(original_name)}"
    )

    if not Path(filename).suffix:
        filename += extension

    filepath = folder / filename

    if filepath.exists():
        return str(filepath)

    data = fetch(
        image_url,
        binary=True
    )

    if not data:
        return None

    try:

        filepath.write_bytes(
            data
        )

        return str(filepath)

    except Exception as exc:

        print(
            f"[WARN] Could not save image "
            f"{image_url}: {exc}"
        )

        return None


# ============================================================
# CATEGORY COLLECTION
# ============================================================

def build_categories(products):

    categories = {}

    for product in products:

        for category in product.get(
            "categories",
            []
        ):

            key = category.strip()

            if not key:
                continue

            if key not in categories:

                categories[key] = {
                    "name": key,
                    "products_count": 0,
                    "products": [],
                }

            categories[key][
                "products_count"
            ] += 1

            categories[key][
                "products"
            ].append(
                product.get(
                    "source_url"
                )
            )

    return list(
        categories.values()
    )


# ============================================================
# EXPORT
# ============================================================

def save_json(path, data):

    path.parent.mkdir(
        parents=True,
        exist_ok=True
    )

    path.write_text(
        json.dumps(
            data,
            ensure_ascii=False,
            indent=2
        ),
        encoding="utf-8"
    )


def export_csv(products):

    path = (
        OUTPUT_DIR
        / "products.csv"
    )

    fields = [
        "id",
        "name",
        "sku",
        "brand",
        "price",
        "currency",
        "description",
        "categories",
        "images",
        "source_url",
    ]

    with path.open(
        "w",
        newline="",
        encoding="utf-8-sig"
    ) as file:

        writer = csv.DictWriter(
            file,
            fieldnames=fields
        )

        writer.writeheader()

        for product in products:

            writer.writerow({
                "id": product["id"],
                "name": product["name"],
                "sku": product["sku"],
                "brand": product["brand"],
                "price": product["price"],
                "currency": product["currency"],
                "description": product["description"],
                "categories": " | ".join(
                    product["categories"]
                ),
                "images": " | ".join(
                    product["local_images"]
                ),
                "source_url": product["source_url"],
            })


def export_images_csv(products):

    path = (
        OUTPUT_DIR
        / "images.csv"
    )

    fields = [
        "product_id",
        "product_name",
        "source_image",
        "local_image",
    ]

    with path.open(
        "w",
        newline="",
        encoding="utf-8-sig"
    ) as file:

        writer = csv.DictWriter(
            file,
            fieldnames=fields
        )

        writer.writeheader()

        for product in products:

            for source, local in zip(
                product.get(
                    "images",
                    []
                ),
                product.get(
                    "local_images",
                    []
                ),
            ):

                writer.writerow({
                    "product_id": product["id"],
                    "product_name": product["name"],
                    "source_image": source,
                    "local_image": local,
                })


# ============================================================
# ZIP
# ============================================================

def create_zip():

    zip_path = Path(
        "itaytrade-scraped.zip"
    )

    if zip_path.exists():
        zip_path.unlink()

    with zipfile.ZipFile(
        zip_path,
        "w",
        compression=zipfile.ZIP_DEFLATED
    ) as archive:

        for file in OUTPUT_DIR.rglob("*"):

            if file.is_file():

                archive.write(
                    file,
                    file.relative_to(
                        OUTPUT_DIR.parent
                    ),
                )

    return zip_path


# ============================================================
# MAIN
# ============================================================

def main():
    
    global REQUEST_DELAY

    parser = argparse.ArgumentParser(
        description=(
            "ItayTrade website scraper"
        )
    )

    parser.add_argument(
        "--url",
        default=DEFAULT_URL,
        help="Starting URL",
    )

    parser.add_argument(
        "--delay",
        type=float,
        default=REQUEST_DELAY,
        help="Delay between requests",
    )

    parser.add_argument(
        "--max-pages",
        type=int,
        default=10000,
        help="Maximum pages to crawl",
    )

    parser.add_argument(
        "--no-images",
        action="store_true",
        help="Do not download images",
    )

    args = parser.parse_args()

    
    REQUEST_DELAY = args.delay

    base_url = normalize_url(
        args.url
    )

    OUTPUT_DIR.mkdir(
        parents=True,
        exist_ok=True
    )

    print("=" * 70)
    print("ITAYTRADE SCRAPER")
    print("=" * 70)
    print(
        f"Start URL: {base_url}"
    )
    print(
        f"Output: {OUTPUT_DIR}"
    )
    print("=" * 70)

    # --------------------------------------------------------
    # ROBOTS
    # --------------------------------------------------------

    if not check_robots(
        base_url
    ):
        return

    # --------------------------------------------------------
    # SITEMAPS
    # --------------------------------------------------------

    print("\n[1/6] Searching for sitemaps...")

    sitemap_urls = find_sitemaps(
        base_url
    )

    sitemap_links = set()

    for sitemap in sitemap_urls:

        print(
            f"[SITEMAP] {sitemap}"
        )

        for link in parse_sitemap(
            sitemap
        ):

            link = normalize_url(
                link
            )

            if link and same_domain(
                link,
                base_url
            ):
                sitemap_links.add(
                    link
                )

    print(
        f"[OK] Sitemap URLs found: "
        f"{len(sitemap_links)}"
    )

    # --------------------------------------------------------
    # CRAWL
    # --------------------------------------------------------

    print("\n[2/6] Crawling website...")

    queue = []

    queue.append(
        base_url
    )

    for link in sitemap_links:
        if link not in queue:
            queue.append(link)

    visited = set()
    product_urls = set()
    category_urls = set()

    while queue and len(visited) < args.max_pages:

        url = queue.pop(0)

        url = normalize_url(
            url
        )

        if not url:
            continue

        if url in visited:
            continue

        if not same_domain(
            url,
            base_url
        ):
            continue

        visited.add(url)

        print(
            f"[{len(visited)}] {url}"
        )

        html = fetch(url)

        if not html:
            continue

        if detect_product(
            url,
            html
        ):
            product_urls.add(
                url
            )

        links = discover_links(
            url,
            html,
            base_url
        )

        for link in links:

            if link in visited:
                continue

            if looks_like_product_url(
                link
            ):
                product_urls.add(
                    link
                )

            else:
                category_urls.add(
                    link
                )

            queue.append(
                link
            )

    print(
        f"\n[OK] Pages crawled: "
        f"{len(visited)}"
    )

    print(
        f"[OK] Product URLs: "
        f"{len(product_urls)}"
    )

    print(
        f"[OK] Other/category URLs: "
        f"{len(category_urls)}"
    )

    # --------------------------------------------------------
    # PRODUCTS
    # --------------------------------------------------------

    print("\n[3/6] Extracting products...")

    products = []

    for index, url in enumerate(
        sorted(product_urls),
        start=1
    ):

        print(
            f"\nPRODUCT {index}/{len(product_urls)}"
        )

        html = fetch(url)

        if not html:
            continue

        try:

            product = extract_product(
                url,
                html
            )

            if not product["name"]:

                print(
                    "[SKIP] Could not detect "
                    "product name."
                )

                continue

            product["id"] = (
                product["sku"]
                or hash_url(url)
            )

            products.append(
                product
            )

            print(
                f"[OK] {product['name']}"
            )

        except Exception as exc:

            print(
                f"[ERROR] {url}: {exc}"
            )

    # --------------------------------------------------------
    # DOWNLOAD IMAGES
    # --------------------------------------------------------

    print("\n[4/6] Downloading images...")

    if not args.no_images:

        for product_index, product in enumerate(
            tqdm(
                products,
                desc="Products"
            ),
            start=1
        ):

            local_images = []

            for image_index, image_url in enumerate(
                product.get(
                    "images",
                    []
                ),
                start=1
            ):

                local = download_image(
                    image_url,
                    product_index,
                    image_index
                )

                if local:
                    local_images.append(
                        local
                    )

            product[
                "local_images"
            ] = local_images

    else:

        for product in products:
            product[
                "local_images"
            ] = []

    # --------------------------------------------------------
    # CATEGORIES
    # --------------------------------------------------------

    print("\n[5/6] Building categories...")

    categories = build_categories(
        products
    )

    # --------------------------------------------------------
    # EXPORT
    # --------------------------------------------------------

    print("\n[6/6] Creating export files...")

    save_json(
        OUTPUT_DIR / "products.json",
        products
    )

    save_json(
        OUTPUT_DIR / "categories.json",
        categories
    )

    save_json(
        OUTPUT_DIR / "crawl_report.json",
        {
            "source": base_url,
            "pages_crawled": len(
                visited
            ),
            "products_found": len(
                products
            ),
            "categories_found": len(
                categories
            ),
            "product_urls": sorted(
                product_urls
            ),
        }
    )

    export_csv(
        products
    )

    export_images_csv(
        products
    )

    # --------------------------------------------------------
    # README
    # --------------------------------------------------------

    readme = f"""
ITAYTRADE SCRAPER EXPORT
========================

Source:
{base_url}

Products:
{len(products)}

Categories:
{len(categories)}

Pages crawled:
{len(visited)}

Files:
- products.json
- products.csv
- categories.json
- images.csv
- crawl_report.json
- images/

The images folder contains downloaded
product images grouped by product.

IMPORTANT:
Review the exported content and make sure
you have permission to reuse the website's
text, product information and images.
"""

    (
        OUTPUT_DIR / "README.txt"
    ).write_text(
        readme.strip(),
        encoding="utf-8"
    )

    # --------------------------------------------------------
    # ZIP
    # --------------------------------------------------------

    zip_path = create_zip()

    print("\n" + "=" * 70)
    print("DONE")
    print("=" * 70)

    print(
        f"Products: {len(products)}"
    )

    print(
        f"Categories: {len(categories)}"
    )

    print(
        f"ZIP: {zip_path.absolute()}"
    )

    print("=" * 70)


if __name__ == "__main__":
    main()