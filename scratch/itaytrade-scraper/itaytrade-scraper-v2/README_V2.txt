ITAYTRADE SCRAPER V2
====================
This ZIP contained exported data, not the original scraper source code.
V2 is a new standalone WooCommerce scraper and keeps the discovered product/category URL seeds.

Run (Python 3.10+):
  pip install -r requirements.txt
  python scraper_v2.py

Optional:
  python scraper_v2.py --no-images
  python scraper_v2.py --out my-export --delay 0.5

The scraper reads seed_urls.json and writes itaytrade-export/ with JSON/CSV and
product/category image folders. It filters theme icons and site-wide assets,
uses WooCommerce product/gallery selectors, and extracts available descriptions,
prices, SKU, category terms and attribute rows. Fields absent on the live page
remain empty; brand is not guessed. Review permissions before reusing content.
