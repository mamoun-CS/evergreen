import json, re, hashlib
from pathlib import Path

HERE=Path(__file__).resolve().parent
INPUT=HERE/'metal-scoop.json'
OUTPUT=HERE/'catalog_import.json'

def clean(v): return re.sub(r'\s+',' ',str(v or '')).strip()
def slugify(v):
    v=clean(v).lower().replace('&',' and ')
    v=re.sub(r"[’']",'',v)
    v=re.sub(r'[^\w\s-]',' ',v,flags=re.UNICODE)
    return re.sub(r'[\s_-]+','-',v).strip('-') or 'item'

def main():
    raw=json.loads(INPUT.read_text(encoding='utf-8-sig'))
    if isinstance(raw,dict): raw=raw.get('products',[])
    categories={}; products=[]; seen=set(); dup=0
    for r in raw:
        if not isinstance(r,dict): continue
        name=clean(r.get('name')); url=clean(r.get('url') or r.get('product_url') or r.get('page_url'))
        if not name: continue
        key=url or clean(r.get('sku')) or name
        if key.lower() in seen: dup+=1; continue
        seen.add(key.lower())
        cat=clean(r.get('category')) or 'כללי'
        cid='cat-'+hashlib.sha1(cat.encode('utf-8')).hexdigest()[:10]
        pid='product-'+hashlib.sha1(key.encode('utf-8')).hexdigest()[:12]
        img=clean(r.get('image') or r.get('image_url'))
        images=[{'url':img,'alt':name,'title':name}] if img else []
        sku=clean(r.get('sku'))
        desc=clean(r.get('description'))
        details=[]
        if sku: details.append(sku)
        if desc: details.append(desc)
        if cid not in categories:
            categories[cid]={'id':cid,'external_id':None,'name':cat,'slug':slugify(cat),'parent_id':None,'source':{},'product_ids':[]}
        categories[cid]['product_ids'].append(pid)
        products.append({'id':pid,'external_id':sku or None,'name':name,'slug':slugify(name),'category_id':cid,'category_name':cat,'images':images,'details':details,'source':{'product_url':url,'page_url':url,'page_title':name}})
    out={'stats':{'categories':len(categories),'products':len(products),'products_with_images':sum(bool(x['images']) for x in products),'products_without_images':sum(not x['images'] for x in products),'duplicates_removed':dup},'categories':sorted(categories.values(),key=lambda x:x['name']),'products':products}
    OUTPUT.write_text(json.dumps(out,ensure_ascii=False,indent=2),encoding='utf-8')
    print('\n'+'='*60+'\nCATALOG IMPORT GENERATOR - AS TITANUM\n'+'='*60)
    print(f'Raw products found:      {len(raw)}')
    print(f'Categories:              {len(categories)}')
    print(f'Products:                {len(products)}')
    print(f'Products with images:    {out["stats"]["products_with_images"]}')
    print(f'Without images:          {out["stats"]["products_without_images"]}')
    print(f'Duplicates removed:      {dup}')
    print(f'Output: {OUTPUT}\n'+'='*60)
if __name__=='__main__': main()
