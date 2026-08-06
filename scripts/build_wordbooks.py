#!/usr/bin/env python3
"""Build compact offline wordbooks from explicitly licensed source files."""

from __future__ import annotations

import argparse
import csv
import json
import re
from pathlib import Path


WORD_PATTERN = re.compile(r"^[A-Za-z][A-Za-z'-]*$")
BOOK_TAGS = {
    "cet4": "cet4",
    "cet6": "cet6",
    "ielts": "ielts",
    "toefl": "toefl",
}


def clean(value: str | None, limit: int = 260) -> str:
    if not value:
        return ""
    normalized = "；".join(part.strip() for part in value.replace("\\n", "\n").splitlines() if part.strip())
    return normalized[:limit]


def stable_id(word: str) -> str:
    return f"word:{word.lower()}"


def learning_word(word: str, phonetic: str = "", meaning: str = "", example: str = "") -> dict[str, str]:
    return {
        "id": stable_id(word),
        "word": word,
        "phonetic": clean(phonetic, 100),
        "meaning": clean(meaning) or "暂无释义",
        "mnemonic": "",
        "phrases": "",
        "example": clean(example),
    }


def read_awl(path: Path) -> list[dict[str, str]]:
    payload = json.loads(path.read_text(encoding="utf-8"))
    words: list[dict[str, str]] = []
    for sublist in payload:
        for item in sublist.get("words", []):
            word = str(item.get("english", "")).strip()
            if WORD_PATTERN.fullmatch(word):
                example = str(item.get("example", ""))
                if example.startswith("No example"):
                    example = ""
                words.append(
                    learning_word(
                        word,
                        str(item.get("phonetic", "")),
                        str(item.get("chinese", "")),
                        example,
                    )
                )
    return words


def read_toeic(path: Path) -> tuple[list[str], dict[str, str]]:
    words: list[str] = []
    meanings: dict[str, str] = {}
    with path.open(encoding="utf-8-sig", newline="") as source:
        lines = (line for line in source if not line.startswith("#"))
        for row in csv.DictReader(lines):
            word = (row.get("expression") or "").strip()
            if not WORD_PATTERN.fullmatch(word):
                continue
            key = word.lower()
            if key not in meanings:
                words.append(word)
                meanings[key] = row.get("meaning") or ""
    return words, meanings


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--ecdict", required=True, type=Path)
    parser.add_argument("--awl", required=True, type=Path)
    parser.add_argument("--toeic", required=True, type=Path)
    parser.add_argument("--output", required=True, type=Path)
    args = parser.parse_args()

    awl_words = read_awl(args.awl)
    toeic_order, toeic_fallback = read_toeic(args.toeic)
    enrichment_targets = {item["word"].lower() for item in awl_words} | {
        word.lower() for word in toeic_order
    }
    enrichment: dict[str, dict[str, str]] = {}
    books: dict[str, list[dict[str, str]]] = {book: [] for book in BOOK_TAGS}
    seen: dict[str, set[str]] = {book: set() for book in BOOK_TAGS}

    with args.ecdict.open(encoding="utf-8-sig", newline="", errors="replace") as source:
        for row in csv.DictReader(source):
            word = (row.get("word") or "").strip()
            if not WORD_PATTERN.fullmatch(word):
                continue
            key = word.lower()
            item = learning_word(
                word,
                row.get("phonetic") or "",
                row.get("translation") or row.get("definition") or "",
            )
            tags = set((row.get("tag") or "").lower().split())
            for book, tag in BOOK_TAGS.items():
                if tag in tags and key not in seen[book]:
                    books[book].append(item)
                    seen[book].add(key)
            if key in enrichment_targets:
                enrichment[key] = item

    pte: list[dict[str, str]] = []
    pte_seen: set[str] = set()
    for item in awl_words:
        key = item["word"].lower()
        if key in pte_seen:
            continue
        enriched = enrichment.get(key, {})
        pte.append(
            learning_word(
                item["word"],
                item["phonetic"] or enriched.get("phonetic", ""),
                item["meaning"] or enriched.get("meaning", ""),
                item["example"],
            )
        )
        pte_seen.add(key)

    toeic: list[dict[str, str]] = []
    toeic_seen: set[str] = set()
    for word in toeic_order:
        key = word.lower()
        if key in toeic_seen:
            continue
        enriched = enrichment.get(key)
        toeic.append(
            enriched
            or learning_word(word, meaning=toeic_fallback.get(key, ""))
        )
        toeic_seen.add(key)

    books["pte"] = pte
    books["toeic"] = toeic
    args.output.mkdir(parents=True, exist_ok=True)
    counts: dict[str, int] = {}
    for book, items in books.items():
        items.sort(key=lambda item: item["word"].lower())
        counts[book] = len(items)
        (args.output / f"{book}.json").write_text(
            json.dumps(items, ensure_ascii=False, separators=(",", ":")),
            encoding="utf-8",
        )

    (args.output / "manifest.json").write_text(
        json.dumps({"version": 1, "counts": counts}, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    print(json.dumps(counts, ensure_ascii=False))


if __name__ == "__main__":
    main()
