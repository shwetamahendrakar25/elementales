"""One-time import of the existing portfolio; adds inert managed-region comments."""
import json, re
from html.parser import HTMLParser
from pathlib import Path

class Node:
    def __init__(self, tag, attrs, start, parent):
        self.tag, self.attrs, self.start, self.end, self.parent, self.children = tag, dict(attrs), start, start, parent, []
    def has_class(self, value): return value in self.attrs.get('class', '').split()
    def find(self, predicate):
        return [n for child in self.children for n in ([child] if predicate(child) else []) + child.find(predicate)]

class Document(HTMLParser):
    def __init__(self, text):
        super().__init__(convert_charrefs=False)
        self.text, self.lines, self.root = text, [0], Node('', [], 0, None)
        for line in text.splitlines(True): self.lines.append(self.lines[-1] + len(line))
        self.stack = [self.root]
        self.feed(text)
    def position(self):
        line, col = self.getpos()
        return self.lines[line - 1] + col
    def handle_starttag(self, tag, attrs):
        node = Node(tag, attrs, self.position(), self.stack[-1])
        node.end = node.start + len(self.get_starttag_text())
        self.stack[-1].children.append(node)
        if tag not in {'img','input','br','hr','meta','link','source','wbr','area','base','col','embed','param','track'}: self.stack.append(node)
    def handle_endtag(self, tag):
        for i in range(len(self.stack) - 1, 0, -1):
            if self.stack[i].tag == tag:
                self.stack[i].end = self.position() + len(tag) + 3
                self.stack = self.stack[:i]
                break

def photo(node, key=None):
    image = node if node.tag == 'img' else node.find(lambda n: n.tag == 'img')[0]
    a = image.attrs
    variants = []
    for part in a.get('srcset', a['src'] + ' ' + a['width'] + 'w').split(','):
        path, width = part.strip().split()
        variants.append({'src': path, 'width': int(width[:-1])})
    base = re.sub(r'-\d+\.webp$', '', Path(a['src']).name)
    focal = a.get('style', 'object-position:center 50%')
    y = re.search(r'(\d+)%', focal)
    return {'key': key or base, 'alt': a.get('alt', ''), 'width': int(a['width']), 'height': int(a['height']),
            'variants': variants, 'focalX': 50, 'focalY': int(y[1]) if y else 50}

def bootstrap(root):
    target = root / 'gallery-manifest.json'
    if target.exists(): raise RuntimeError('Already bootstrapped; do not overwrite published selections.')
    manifest = {'schema': 1, 'version': 'initial-portfolio', 'settings': {'watermarkOpacity': 0.55, 'watermarkSize': 'standard'}, 'categories': {}, 'homeFeatured': {}}
    for name in ['index','weddings','maternity','family','dreamy-projects','about']:
        path = root / (name + '.html')
        text = path.read_text()
        document = Document(text)
        slots = []
        def mark(name, nodes):
            slots.append((nodes[0].start, nodes[-1].end, name))
        if name in ['weddings','maternity','family','dreamy-projects']:
            cards = document.root.find(lambda n: n.has_class('work-card'))
            manifest['categories'][name] = [photo(n) for n in cards]
            mark('gallery:' + name, cards)
            mark('cover:' + name, document.root.find(lambda n: n.has_class('collection-visual')))
        if name == 'index':
            slides = document.root.find(lambda n: 'data-hero-slide' in n.attrs)
            manifest['categories']['slideshow'] = [dict(photo(n, 'slide-' + str(i + 1)), label=n.attrs['data-label'], focalY=12 if i == 3 else 0) for i,n in enumerate(slides)]
            mark('slideshow', slides)
            cards = document.root.find(lambda n: n.has_class('work-card'))
            mapping = {'stories':'weddings','maternity':'maternity','family':'family','dreamy':'dreamy-projects'}
            for old, category in mapping.items():
                selected = [n for n in cards if n.attrs.get('data-category') == old]
                manifest['homeFeatured'][category] = [photo(n)['key'] for n in selected]
            mark('home-gallery', document.root.find(lambda n: n.has_class('home-preview-gallery')))
        portraits = document.root.find(lambda n: n.has_class('photographer-portrait'))
        if portraits:
            manifest['categories']['about'] = [photo(portraits[0])]
            mark('portrait', portraits)
        for start, end, slot in sorted(slots, reverse=True):
            text = text[:start] + '<!-- photos:start ' + slot + ' -->' + text[start:end] + '<!-- photos:end ' + slot + ' -->' + text[end:]
        path.write_text(text)
    target.write_text(json.dumps(manifest, indent=2) + '\n')

if __name__ == '__main__': bootstrap(Path(__file__).resolve().parent.parent)
