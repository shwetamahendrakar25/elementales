"""Dependency-free checks for this static portfolio."""
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urlsplit, unquote

ROOT = Path(__file__).resolve().parents[1]
class Page(HTMLParser):
    def __init__(self, path):
        super().__init__(); self.path=path; self.ids=set(); self.links=[]; self.errors=[]; self.h1=0; self.title=0
    def handle_starttag(self, tag, attrs):
        a=dict(attrs)
        if 'id' in a:
            if a['id'] in self.ids: self.errors.append('duplicate id '+a['id'])
            self.ids.add(a['id'])
        if tag=='a' and a.get('href'): self.links.append(a['href'])
        if tag=='h1': self.h1+=1
        if tag=='title': self.title+=1
        if tag=='img':
            if 'alt' not in a: self.errors.append('image missing alt')
            for src in [a.get('src',''), *[s.strip().split()[0] for s in a.get('srcset','').split(',') if s.strip()]]:
                u=urlsplit(src)
                if src and not u.scheme and not u.netloc and not (ROOT/unquote(u.path)).is_file():
                    self.errors.append('missing image '+src)
        if tag=='script' and a.get('src') and not (ROOT/urlsplit(a['src']).path).exists(): self.errors.append('missing script')
        if tag=='link' and a.get('rel')=='stylesheet' and not (ROOT/urlsplit(a['href']).path).exists(): self.errors.append('missing stylesheet')

pages={}
for path in ROOT.glob('*.html'):
    page=Page(path); page.feed(path.read_text()); pages[path.name]=page
errors=[]
for name,page in pages.items():
    errors += [f'{name}: {e}' for e in page.errors]
    if page.h1 != 1 or page.title != 1: errors.append(f'{name}: expected one title and h1')
    for href in page.links:
        u=urlsplit(href)
        if u.scheme or u.netloc: continue
        target=unquote(u.path) or name
        if target not in pages:
            if not (ROOT/target).is_file(): errors.append(f'{name}: missing destination {href}')
        elif u.fragment and u.fragment not in pages[target].ids: errors.append(f'{name}: missing fragment {href}')
    text=page.path.read_text()
    if 'Design preview' not in text: errors.append(f'{name}: missing draft disclosure')
    for claim in ['Amara','Theo','VOGUE','hello@elementales.studio','555 0184','Isabel & Noah']:
        if claim in text: errors.append(f'{name}: unverified claim {claim}')
assert not errors, '\n'.join(errors)
print(f'PASS: {len(pages)} pages; local links, fragments, IDs, headings, image alt attributes, assets, and draft disclosures.')
