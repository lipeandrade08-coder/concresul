"""Render shareable language pages from the Portuguese landing page."""

import argparse
import json
import re
from html import escape
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import parse_qsl, quote, urlencode, urlsplit, urlunsplit

ROOT = Path(__file__).resolve().parent.parent
PAGE = (ROOT / 'dist/index.html').read_text(encoding='utf-8')
CANONICAL = re.search(r'<link rel="canonical" href="([^"]+)"', PAGE)[1]
SCRIPT = (ROOT / 'dist/script.js').read_text(encoding='utf-8')
JS_PHRASES = {json.loads(value) for value in re.findall(r'\btr\(("(?:[^"\\]|\\.)*")\)', SCRIPT)}
ATTR = re.compile(r'(?P<name>[\w:-]+)="(?P<value>[^"]*)"')
COPY_ATTRS = {'alt', 'aria-label', 'placeholder', 'data-service'}
META_COPY = {'description', 'og:title', 'og:description', 'og:image:alt'}
UNTRANSLATED = {'Concresul', 'Concre', 'sul', 'm', 'cm', 'PT', 'BR', 'Piraí'}
LANGUAGES = {'en': 'en_US', 'es': 'es_419'}


class LocalePage(HTMLParser):
    def __init__(self, language, catalog):
        super().__init__(convert_charrefs=False)
        self.language = language
        self.catalog = catalog
        self.url = CANONICAL + language + '/'
        self.parts = []
        self.schema = False
        self.feed(PAGE)
        self.close()

    def translate(self, value):
        return self.catalog[value]

    def schema_data(self, value):
        if isinstance(value, list):
            return [self.schema_data(item) for item in value]
        if not isinstance(value, dict):
            return value
        result = {}
        for name, item in value.items():
            if name in {'name', 'description', 'serviceType', 'contactType'} and isinstance(item, str):
                result[name] = self.catalog.get(item, item)
            else:
                result[name] = self.schema_data(item)
        if value.get('@type') == 'WebPage':
            result.update(url=self.url, inLanguage=self.language)
            result['@id'] = self.url + '#pagina'
        if value.get('@type') == 'Offer' and value.get('url', '').startswith(CANONICAL + '#'):
            result['url'] = self.url + '#' + value['url'].split('#', 1)[1]
        return result

    def handle_starttag(self, tag, attrs):
        attributes = dict(attrs)
        raw = self.get_starttag_text()
        self.schema = tag == 'script' and attributes.get('type') == 'application/ld+json'

        def replace_attribute(match):
            name, value = match.group('name', 'value')
            if name in COPY_ATTRS and value in self.catalog:
                value = self.translate(value)
            elif tag == 'html' and name == 'lang':
                value = self.language
            elif name == 'href' and attributes.get('rel') == 'canonical':
                value = self.url
            elif tag == 'meta' and name == 'content':
                kind = attributes.get('property', attributes.get('name'))
                if kind in META_COPY:
                    value = self.translate(value)
                elif kind == 'og:locale':
                    value = LANGUAGES[self.language]
                elif kind == 'og:url':
                    value = self.url
            elif name in {'src', 'href'} and value.startswith('https://wa.me/'):
                target = urlsplit(value)
                query = dict(parse_qsl(target.query))
                if 'text' in query:
                    query['text'] = self.translate(query['text'])
                    value = urlunsplit(target._replace(query=urlencode(query, quote_via=quote)))
            elif (name == 'src' or (name == 'href' and tag == 'link')) and not value.startswith(('https:', '/')):
                value = '../' + value
            if value == match['value']:
                return match[0]
            return f'{name}="{escape(value, quote=True)}"'

        raw = ATTR.sub(replace_attribute, raw)
        if tag == 'a' and attributes.get('hreflang'):
            raw = raw.replace(' aria-current="page"', '')
            if attributes['hreflang'] == self.language:
                raw = raw[:-1] + ' aria-current="page">'
        if tag == 'script' and attributes.get('src') == 'script.js':
            phrases = {key: self.translate(key) for key in sorted(JS_PHRASES)}
            data = json.dumps(phrases, ensure_ascii=False).replace('<', '\\u003c')
            self.parts.append(f'<script type="application/json" id="page-translations">{data}</script>\n  ')
        self.parts.append(raw)

    handle_startendtag = handle_starttag

    def handle_endtag(self, tag):
        self.parts.append(f'</{tag}>')
        if tag == 'script':
            self.schema = False

    def handle_data(self, text):
        if self.schema:
            self.parts.append('\n' + json.dumps(self.schema_data(json.loads(text)), ensure_ascii=False, indent=2) + '\n  ')
            return
        phrase = text.strip()
        if phrase and phrase not in UNTRANSLATED and re.search(r'[A-Za-zÀ-ÿ]', phrase):
            leading = text[:len(text) - len(text.lstrip())]
            trailing = text[len(text.rstrip()):]
            text = leading + escape(self.translate(phrase), quote=False) + trailing
        self.parts.append(text)

    def handle_decl(self, decl):
        self.parts.append(f'<!{decl}>')

    def handle_comment(self, comment):
        self.parts.append(f'<!--{comment}-->')

    def handle_entityref(self, name):
        self.parts.append(f'&{name};')

    def handle_charref(self, name):
        self.parts.append(f'&#{name};')

    def render(self):
        return ''.join(self.parts).replace(
            'class="language-code" aria-hidden="true">PT<',
            f'class="language-code" aria-hidden="true">{self.language.upper()}<',
        )


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--check', action='store_true')
    checking = parser.parse_args().check
    for language in LANGUAGES:
        catalog = json.loads((ROOT / f'i18n/{language}.json').read_text(encoding='utf-8'))
        try:
            html = LocalePage(language, catalog).render()
        except KeyError as error:
            parser.error(f'Missing {language} translation: {error}')
        path = ROOT / f'dist/{language}/index.html'
        if checking:
            if not path.exists() or path.read_text(encoding='utf-8') != html:
                parser.error(f'{path.relative_to(ROOT)} is out of date')
        else:
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_text(html, encoding='utf-8')


if __name__ == '__main__':
    main()
