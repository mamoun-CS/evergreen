import json
import os
import re
import time
from urllib.parse import urlparse
from playwright.sync_api import sync_playwright


# ============================================================
# CONFIG
# ============================================================

INPUT_FILE = "catalog_import.json"
OUTPUT_DIR = "product_images"
FAILED_REPORT = "failed_images.json"

CHROME_DEBUG_URL = "http://127.0.0.1:9222"

MAX_RETRIES = 3
RETRY_DELAY = 2

IMAGE_EXTENSIONS = [
    ".jpg",
    ".jpeg",
    ".png",
    ".webp",
    ".gif",
    ".bmp",
    ".svg",
    ".avif"
]


# ============================================================
# HELPERS
# ============================================================

def safe_filename(name):

    name = str(name).strip()

    name = re.sub(
        r'[<>:"/\\|?*]',
        "_",
        name
    )

    name = re.sub(
        r"\s+",
        "_",
        name
    )

    name = re.sub(
        r"_+",
        "_",
        name
    )

    name = name.strip("._ ")

    if not name:
        name = "unknown"

    return name[:150]


def get_extension(url, content_type=""):

    path = urlparse(url).path.lower()

    for ext in IMAGE_EXTENSIONS:

        if path.endswith(ext):
            return ext

    content_type = (
        content_type or ""
    ).lower()

    if "jpeg" in content_type:
        return ".jpg"

    if "png" in content_type:
        return ".png"

    if "webp" in content_type:
        return ".webp"

    if "gif" in content_type:
        return ".gif"

    if "svg" in content_type:
        return ".svg"

    if "bmp" in content_type:
        return ".bmp"

    if "avif" in content_type:
        return ".avif"

    return ".jpg"


def existing_image(base_path):

    for ext in IMAGE_EXTENSIONS:

        path = base_path + ext

        if (
            os.path.exists(path)
            and os.path.getsize(path) > 0
        ):
            return path

    return None


# ============================================================
# DOWNLOAD IMAGE BY DIRECT BROWSER NAVIGATION
# ============================================================

def download_image(
    image_page,
    url,
    output_path
):

    last_error = None

    for attempt in range(
        1,
        MAX_RETRIES + 1
    ):

        try:

            print(
                f"     Browser attempt "
                f"{attempt}/{MAX_RETRIES}"
            )

            # -----------------------------------------------
            # Open image URL DIRECTLY in Chrome
            # No fetch()
            # No CORS problem
            # -----------------------------------------------

            response = image_page.goto(
                url,
                wait_until="commit",
                timeout=30000
            )

            if response is None:

                raise Exception(
                    "Chrome returned no response"
                )

            status = response.status

            print(
                f"     HTTP: {status}"
            )

            if status < 200 or status >= 300:

                raise Exception(
                    f"HTTP {status}"
                )


            # -----------------------------------------------
            # Response headers
            # -----------------------------------------------

            headers = response.headers

            content_type = headers.get(
                "content-type",
                ""
            )

            print(
                f"     Content-Type: "
                f"{content_type}"
            )


            # -----------------------------------------------
            # Get RAW response bytes
            # -----------------------------------------------

            body = response.body()

            if not body:

                raise Exception(
                    "Image response is empty"
                )


            # -----------------------------------------------
            # Prevent HTML / Cloudflare pages from being
            # saved as .jpg
            # -----------------------------------------------

            lower_type = (
                content_type or ""
            ).lower()

            if (
                "text/html" in lower_type
                or "application/json" in lower_type
            ):

                preview = body[:300]

                try:
                    preview = preview.decode(
                        "utf-8",
                        errors="ignore"
                    )
                except Exception:
                    preview = str(preview)

                raise Exception(
                    "Expected image but received "
                    f"{content_type}. "
                    f"Preview: {preview[:150]}"
                )


            # -----------------------------------------------
            # Extension
            # -----------------------------------------------

            extension = get_extension(
                url,
                content_type
            )

            final_path = (
                output_path +
                extension
            )

            temp_path = (
                final_path +
                ".part"
            )


            # -----------------------------------------------
            # Save
            # -----------------------------------------------

            with open(
                temp_path,
                "wb"
            ) as f:

                f.write(body)


            # Basic validation

            size = os.path.getsize(
                temp_path
            )

            if size <= 0:

                os.remove(
                    temp_path
                )

                raise Exception(
                    "Downloaded file is empty"
                )


            os.replace(
                temp_path,
                final_path
            )


            return (
                final_path,
                None
            )


        except Exception as e:

            last_error = str(e)

            print(
                f"     FAILED: {last_error}"
            )

            if attempt < MAX_RETRIES:

                time.sleep(
                    RETRY_DELAY
                )


    return (
        None,
        last_error
    )


# ============================================================
# MAIN
# ============================================================

def main():

    # --------------------------------------------------------
    # Check input
    # --------------------------------------------------------

    if not os.path.exists(
        INPUT_FILE
    ):

        print()
        print("=" * 70)
        print("ERROR: INPUT FILE NOT FOUND")
        print("=" * 70)

        print(
            os.path.abspath(
                INPUT_FILE
            )
        )

        return


    # --------------------------------------------------------
    # Read JSON
    # --------------------------------------------------------

    try:

        with open(
            INPUT_FILE,
            "r",
            encoding="utf-8"
        ) as f:

            data = json.load(f)

    except Exception as e:

        print(
            f"ERROR reading JSON: {e}"
        )

        return


    products = data.get(
        "products",
        []
    )


    if not isinstance(
        products,
        list
    ):

        print(
            "ERROR: products must be a list"
        )

        return


    # --------------------------------------------------------
    # Output
    # --------------------------------------------------------

    os.makedirs(
        OUTPUT_DIR,
        exist_ok=True
    )


    total_images = 0
    downloaded = 0
    failed = 0
    skipped_existing = 0
    skipped_invalid = 0

    failed_images = []


    print()
    print("=" * 70)
    print("SCOPE METAL IMAGE DOWNLOADER")
    print("CHROME REMOTE DEBUGGING MODE")
    print("=" * 70)

    print(
        f"Chrome:   {CHROME_DEBUG_URL}"
    )

    print(
        f"Products: {len(products)}"
    )

    print(
        f"Output:   "
        f"{os.path.abspath(OUTPUT_DIR)}"
    )

    print("=" * 70)


    # ========================================================
    # CONNECT TO EXISTING CHROME
    # ========================================================

    with sync_playwright() as p:

        print()
        print(
            "Connecting to Chrome "
            "on port 9222..."
        )


        try:

            browser = (
                p.chromium
                .connect_over_cdp(
                    CHROME_DEBUG_URL
                )
            )

        except Exception as e:

            print()
            print("=" * 70)
            print("CANNOT CONNECT TO CHROME")
            print("=" * 70)

            print(e)

            print()
            print(
                "Start Chrome using:"
            )

            print()

            print(
                '"/c/Program Files/Google/Chrome/'
                'Application/chrome.exe" '
                '--remote-debugging-port=9222 '
                '--user-data-dir="C:/Users/mamou/'
                'chrome-scope-profile"'
            )

            return


        print(
            "Connected successfully."
        )


        if not browser.contexts:

            print(
                "ERROR: No Chrome context found."
            )

            return


        context = browser.contexts[0]


        # ====================================================
        # FIND SCOPE TAB
        # ====================================================

        scope_page = None

        for pg in context.pages:

            try:

                if (
                    "catalogue.scope-metal.com"
                    in pg.url
                ):

                    scope_page = pg
                    break

            except Exception:
                pass


        if scope_page:

            print(
                "Scope page:"
            )

            print(
                f"  {scope_page.url}"
            )

        else:

            print(
                "WARNING: Scope Metal page "
                "not currently open."
            )


        # ====================================================
        # CREATE SEPARATE IMAGE TAB
        # ====================================================

        print()
        print(
            "Opening dedicated image tab..."
        )

        image_page = context.new_page()


        # ====================================================
        # PRODUCTS
        # ====================================================

        for product_number, product in enumerate(
            products,
            start=1
        ):

            product_id = product.get(
                "id",
                "unknown"
            )

            external_id = product.get(
                "external_id",
                ""
            )

            product_name = product.get(
                "name",
                "product"
            )

            category_name = product.get(
                "category_name",
                "Uncategorized"
            )


            # ------------------------------------------------
            # Category folder
            # ------------------------------------------------

            category_folder = safe_filename(
                category_name
            )

            category_path = os.path.join(
                OUTPUT_DIR,
                category_folder
            )

            os.makedirs(
                category_path,
                exist_ok=True
            )


            # ------------------------------------------------
            # Product images
            # ------------------------------------------------

            images = product.get(
                "images",
                []
            )


            if not isinstance(
                images,
                list
            ):

                images = []


            if not images:

                skipped_invalid += 1

                continue


            # =================================================
            # EACH IMAGE
            # =================================================

            for image_index, image in enumerate(
                images,
                start=1
            ):

                total_images += 1


                # --------------------------------------------
                # URL
                # --------------------------------------------

                if isinstance(
                    image,
                    dict
                ):

                    url = image.get(
                        "url"
                    )

                elif isinstance(
                    image,
                    str
                ):

                    url = image

                else:

                    url = None


                if not url:

                    skipped_invalid += 1

                    continue


                # --------------------------------------------
                # Output filename
                # --------------------------------------------

                safe_product = safe_filename(
                    product_name
                )

                safe_id = safe_filename(
                    product_id
                )


                filename = (
                    f"{safe_id}_"
                    f"{safe_product}_"
                    f"{image_index}"
                )


                output_path = os.path.join(
                    category_path,
                    filename
                )


                # --------------------------------------------
                # Display
                # --------------------------------------------

                print()
                print("-" * 70)

                print(
                    f"[{total_images}] "
                    f"{product_name}"
                )

                print(
                    f"     Product:  "
                    f"{product_number}/"
                    f"{len(products)}"
                )

                print(
                    f"     ID:       "
                    f"{product_id}"
                )

                print(
                    f"     Category: "
                    f"{category_name}"
                )

                print(
                    f"     URL:      "
                    f"{url}"
                )


                # --------------------------------------------
                # Existing
                # --------------------------------------------

                existing = existing_image(
                    output_path
                )


                if existing:

                    skipped_existing += 1

                    print(
                        f"     EXISTS -> "
                        f"{existing}"
                    )

                    continue


                # --------------------------------------------
                # Download
                # --------------------------------------------

                result, error = (
                    download_image(
                        image_page,
                        url,
                        output_path
                    )
                )


                if result:

                    downloaded += 1

                    size_kb = (
                        os.path.getsize(
                            result
                        )
                        / 1024
                    )

                    print(
                        f"     OK -> "
                        f"{result}"
                    )

                    print(
                        f"     Size: "
                        f"{size_kb:.1f} KB"
                    )


                else:

                    failed += 1

                    print(
                        f"     FAILED -> "
                        f"{error}"
                    )


                    failed_images.append(
                        {
                            "product_id":
                                product_id,

                            "external_id":
                                external_id,

                            "product_name":
                                product_name,

                            "category_name":
                                category_name,

                            "image_index":
                                image_index,

                            "url":
                                url,

                            "error":
                                error
                        }
                    )


        # ====================================================
        # CLOSE ONLY TEMP IMAGE TAB
        # ====================================================

        try:

            image_page.close()

        except Exception:
            pass


        # DO NOT browser.close()
        # We are attached to user's Chrome.


    # ========================================================
    # FAILED REPORT
    # ========================================================

    with open(
        FAILED_REPORT,
        "w",
        encoding="utf-8"
    ) as f:

        json.dump(
            failed_images,
            f,
            ensure_ascii=False,
            indent=2
        )


    # ========================================================
    # SUMMARY
    # ========================================================

    print()
    print("=" * 70)
    print("DOWNLOAD COMPLETE")
    print("=" * 70)

    print(
        f"Products:        "
        f"{len(products)}"
    )

    print(
        f"Images found:    "
        f"{total_images}"
    )

    print(
        f"Downloaded:      "
        f"{downloaded}"
    )

    print(
        f"Already exists:  "
        f"{skipped_existing}"
    )

    print(
        f"Failed:          "
        f"{failed}"
    )

    print(
        f"Invalid:         "
        f"{skipped_invalid}"
    )

    print()

    print(
        "Images folder:"
    )

    print(
        os.path.abspath(
            OUTPUT_DIR
        )
    )

    print()

    print(
        "Failed report:"
    )

    print(
        os.path.abspath(
            FAILED_REPORT
        )
    )

    print("=" * 70)


if __name__ == "__main__":
    main()