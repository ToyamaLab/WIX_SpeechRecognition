import os
from typing import List
from urllib.parse import urljoin

import requests
from bs4 import BeautifulSoup
from tqdm import tqdm

# スクレイピングする最新ページ数
page_to_scrape = 2

# 出力先のファイル名
output_filename = '1223.wix'

# ページ数を埋め込むことで有効なurlになるフォーマット
url_format = 'https://tabelog.com/keywords/%E3%82%AF%E3%83%AA%E3%82%B9%E3%83%9E%E3%82%B9%E3%83%87%E3%82%A3%E3%83%8A%E3%83%BC/tokyo/kwdLst/1/?srchTg=2/{}/'


# レストランのデータを格納し、メニュー情報を取得＋XML形式に変換できるクラス
class Restaurant:
    # 店のurlの末尾に追加することでメニューを表示できる
    menu_url_endpoint = 'dtlmenu'

    def __init__(self, name: str, url: str):
        self.name = name
        self.url = url

        self.menu_url = urljoin(self.url, self.menu_url_endpoint)

        self.menus: List[str] = []

        # クラスのインスタンスを作成するとともにメニュー一覧を取得
        self.get_menu()

    def get_menu(self):
        res = requests.get(self.menu_url)
        soup = BeautifulSoup(res.text, 'html.parser')

        # メニュー名のcss selectorは 'p.rstdtl-menu-lst__menu-title'
        menus = soup.select('p.rstdtl-menu-lst__menu-title')
        self.menus = [menu.string for menu in menus]

    def make_entry(self, key: str, target: str, pattern: str):
        '''
        keyとtargetを受け取り、XML形式にする
        '''
        if pattern == 'a':
            if self.name == key:
                return '\n'.join(('    <entry>',
                                  '      <keyword>{}</keyword>',
                                  '      <target>{}</target>',
                                  '    </entry>\n')).format(key, target)
            return '\n'.join(('    <entry>',
                              '      <keyword>{}</keyword>',
                              '      <title>{}</title>',
                              '      <target>{}</target>',
                              '    </entry>\n')).format(key, self.name, target)
        elif pattern == 'b':
            return '\n'.join(('    <entry>',
                              '      <keyword>{}</keyword>',
                              '      <target>{}</target>',
                              '    </entry>\n')).format(key, target)

    # 店名とurl, メニュー名とメニューurlをXML形式にする
    def to_xml(self, pattern: str):
        if pattern == 'a':
            return [self.make_entry(self.name, self.url, pattern=pattern),
                    *(self.make_entry(menu, self.menu_url, pattern=pattern) for menu in
                      self.menus)]
        elif pattern == 'b':
            return [self.make_entry(self.name, self.url, pattern=pattern),
                    *(self.make_entry(menu, self.menu_url, pattern=pattern) for menu in
                      self.menus)]


# Restaurant をまとめてXML形式にし、ファイルに出力するクラス
class XMLWriter:
    def __init__(self, restaurants: List[Restaurant], pattern: str):
        self.restaurants = restaurants
        self.encoding = 'utf-8'
        self.pattern = pattern

        # XMLの頭と末尾に出力するデータ
        self.head = '\n'.join(("<?xml version='1.0' encoding='{}'?>".format(self.encoding),
                               '<!DOCTYPE WIX SYSTEM "http://wixdemo.db.ics.keio.ac.jp/wixfile.dtd">',
                               '<WIX>',
                               '  <header>',
                               '    <comment>sena</comment>',
                               '    <description>食べログ</description>',
                               '    <language>ja</language>',
                               '  </header>',
                               '  <body>\n'))
        self.tail = '\n'.join(('  </body>',
                               '</WIX>'))

    def write(self, filename: str):
        file_exist = os.path.exists(filename)
        if file_exist:
            with open(filename, 'r', encoding='utf-8') as f:
                data = f.read().split('\n')[:-2]
        with open(filename, 'w', encoding='utf-8') as f:
            if file_exist:
                f.write('\n'.join(data))
                f.write('\n')
            else:
                f.write(self.head)
            for restaurant in self.restaurants:
                for xml in restaurant.to_xml(pattern=self.pattern):
                    # 各XML化されたデータを出力
                    f.write(xml)
            f.write(self.tail)


# レストランの一覧ページを取得＋パースする
def scrape_page(page: int):
    url = url_format.format(page)

    res = requests.get(url)
    soup = BeautifulSoup(res.text, 'html.parser')

    # リンクになっている店名のタグのcss selectorは 'a.list-rst__rst-name-target.cpy-rst-name'
    target_names = soup.select('a.list-rst__rst-name-target.cpy-rst-name')

    # tqdmを用いてプログレスバー表示
    info = [Restaurant(target.string, target.get('href')) for target in tqdm(target_names)]

    return info


def scrape(pattern: str):
    result = []
    for i in range(1, page_to_scrape + 1):
        print('scraping page: {}/{}'.format(i, page_to_scrape))
        result.extend(scrape_page(i))

    writer = XMLWriter(result, pattern=pattern)
    writer.write(output_filename)

if __name__ == '__main__':
    scrape('b')
