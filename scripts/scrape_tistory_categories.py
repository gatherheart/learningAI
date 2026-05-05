from __future__ import annotations

import json
import re
from dataclasses import asdict, dataclass
from pathlib import Path
from typing import Iterable
from urllib.parse import urljoin

import requests
from bs4 import BeautifulSoup


CATEGORIES = [
    {
        "source": "tobelinuxer",
        "blog_title": "To be ...",
        "category": "ChatGPT/인공지능",
        "url": "https://tobelinuxer.tistory.com/category/ChatGPT/%EC%9D%B8%EA%B3%B5%EC%A7%80%EB%8A%A5",
    },
    {
        "source": "miiinnn23",
        "blog_title": "Slow but steady",
        "category": "machine learning",
        "url": "https://miiinnn23.tistory.com/category/machine%20learning",
    },
    {
        "source": "techblog-history-younghunjo1",
        "blog_title": "앎의 공간",
        "category": "Data Science",
        "url": "https://techblog-history-younghunjo1.tistory.com/category/Data%20Science",
    },
]

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
        "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0 Safari/537.36"
    )
}
TIMEOUT = 20


@dataclass
class Article:
    source: str
    blog_title: str
    category: str
    title: str
    url: str
    published_at: str
    content_text: str


def fetch(session: requests.Session, url: str) -> str:
    response = session.get(url, headers=HEADERS, timeout=TIMEOUT)
    response.raise_for_status()
    return response.text


def normalize_whitespace(text: str) -> str:
    lines = [re.sub(r"\s+", " ", line).strip() for line in text.splitlines()]
    lines = [line for line in lines if line]
    return "\n".join(lines)


def extract_post_links(base_url: str, html: str) -> list[str]:
    soup = BeautifulSoup(html, "html.parser")
    links: list[str] = []
    seen: set[str] = set()
    for anchor in soup.find_all("a", href=True):
        href = anchor["href"].strip()
        if re.fullmatch(r"/\d+", href):
            full_url = urljoin(base_url, href)
            if full_url not in seen:
                seen.add(full_url)
                links.append(full_url)
    return links


def find_total_pages(html: str) -> int:
    pages = [int(page) for page in re.findall(r"\?page=(\d+)", html)]
    return max(pages, default=1)


def extract_meta_content(soup: BeautifulSoup, *, property_name: str | None = None, name: str | None = None) -> str:
    selector = None
    if property_name:
        selector = soup.find("meta", attrs={"property": property_name})
    elif name:
        selector = soup.find("meta", attrs={"name": name})
    if selector and selector.get("content"):
        return selector["content"].strip()
    return ""


def extract_article_body(soup: BeautifulSoup) -> str:
    content = soup.select_one(".entry-content") or soup.select_one(".tt_article_useless_p_margin")
    if not content:
        return ""
    text = content.get_text("\n", strip=True)
    text = normalize_whitespace(text)
    text = re.sub(r"^반응형\s*", "", text)
    return text


def clean_title(raw_title: str, fallback: str) -> str:
    title = raw_title.strip() or fallback.strip()
    title = re.sub(r"\s+", " ", title)
    return title


def scrape_category(session: requests.Session, config: dict[str, str]) -> list[Article]:
    first_page = fetch(session, config["url"])
    total_pages = find_total_pages(first_page)
    article_links: list[str] = []
    seen_links: set[str] = set()

    for page_number in range(1, total_pages + 1):
        url = config["url"] if page_number == 1 else f'{config["url"]}?page={page_number}'
        html = first_page if page_number == 1 else fetch(session, url)
        for link in extract_post_links(config["url"], html):
            if link not in seen_links:
                seen_links.add(link)
                article_links.append(link)

    articles: list[Article] = []
    for link in article_links:
        html = fetch(session, link)
        soup = BeautifulSoup(html, "html.parser")
        og_title = extract_meta_content(soup, property_name="og:title")
        title_node = soup.find(["h1", "h2"])
        fallback_title = title_node.get_text(" ", strip=True) if title_node else link.rsplit("/", 1)[-1]
        title = clean_title(og_title, fallback_title)
        published_at = (
            extract_meta_content(soup, property_name="article:published_time")
            or extract_meta_content(soup, property_name="og:regDate")
            or extract_meta_content(soup, name="pubdate")
        )
        content_text = extract_article_body(soup)
        articles.append(
            Article(
                source=config["source"],
                blog_title=config["blog_title"],
                category=config["category"],
                title=title,
                url=link,
                published_at=published_at,
                content_text=content_text,
            )
        )
    return articles


def write_json(path: Path, articles: Iterable[Article]) -> None:
    data = [asdict(article) for article in articles]
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")


def write_markdown(path: Path, articles: list[Article]) -> None:
    lines: list[str] = ["# Combined Tistory Articles", ""]
    for index, article in enumerate(articles, start=1):
        lines.append(f"## {index}. {article.title}")
        lines.append(f"- Source: {article.source}")
        lines.append(f"- Blog: {article.blog_title}")
        lines.append(f"- Category: {article.category}")
        lines.append(f"- Published: {article.published_at or 'N/A'}")
        lines.append(f"- URL: {article.url}")
        lines.append("")
        lines.append(article.content_text or "[No content extracted]")
        lines.append("")
    path.write_text("\n".join(lines), encoding="utf-8")


def main() -> None:
    session = requests.Session()
    all_articles: list[Article] = []
    for config in CATEGORIES:
        all_articles.extend(scrape_category(session, config))

    output_dir = Path("data/tistory_exports")
    output_dir.mkdir(parents=True, exist_ok=True)

    json_path = output_dir / "combined_articles.json"
    md_path = output_dir / "combined_articles.md"
    write_json(json_path, all_articles)
    write_markdown(md_path, all_articles)

    print(f"Wrote {len(all_articles)} articles")
    print(json_path)
    print(md_path)


if __name__ == "__main__":
    main()
