#!/usr/bin/env python3
"""
Batch-analyze YouTube Shorts URLs through the AFI backend.

Reads videos.txt (repo root), POSTs each URL to /analyze-url, and appends
results to data/feature_corpus.csv. Already-analyzed URLs are skipped so
the script can be re-run safely.

Setup:
  export BATCH_JWT=$(python scripts/get_token.py you@example.com yourpassword)
  python scripts/batch_analyze.py

Optional env vars:
  AFI_BASE_URL   — default http://localhost:8000
  VIDEOS_FILE    — default videos.txt (relative to repo root)
  TIMEOUT        — per-request timeout in seconds, default 180
"""

import csv
import json
import os
import sys
import time
import urllib.error
import urllib.request
from pathlib import Path

BASE_URL   = os.getenv("AFI_BASE_URL", "http://localhost:8000")
TIMEOUT    = int(os.getenv("TIMEOUT", "180"))
REPO_ROOT  = Path(__file__).parent.parent
VIDEOS_FILE = REPO_ROOT / os.getenv("VIDEOS_FILE", "videos.txt")
DATA_DIR   = REPO_ROOT / "data"
CORPUS_CSV = DATA_DIR / "feature_corpus.csv"
FAILED_CSV = DATA_DIR / "failed.csv"

CORPUS_FIELDS = [
    "url", "video_name", "duration_seconds",
    # 8 raw features
    "tempo_bpm", "rms_energy", "amplitude_spike_ratio", "zero_crossing_rate",
    "visual_score", "words_per_second", "avg_text_area_ratio", "text_change_rate",
    # sub-scores
    "audio_score", "text_score",
    # final
    "final_afi", "category",
    "elapsed_seconds",
]

FAILED_FIELDS = ["url", "error"]


def load_done_urls() -> set:
    if not CORPUS_CSV.exists():
        return set()
    with CORPUS_CSV.open(newline="") as f:
        return {row["url"] for row in csv.DictReader(f)}


def read_urls() -> list[str]:
    if not VIDEOS_FILE.exists():
        print(f"ERROR: {VIDEOS_FILE} not found", file=sys.stderr)
        sys.exit(1)
    urls = []
    for line in VIDEOS_FILE.read_text().splitlines():
        line = line.strip()
        if line and not line.startswith("#"):
            urls.append(line)
    return urls


def append_row(path: Path, fields: list[str], row: dict):
    is_new = not path.exists()
    with path.open("a", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=fields)
        if is_new:
            writer.writeheader()
        writer.writerow(row)


def analyze(url: str, jwt: str) -> dict:
    payload = json.dumps({"url": url}).encode()
    req = urllib.request.Request(
        f"{BASE_URL}/analyze-url",
        data=payload,
        headers={
            "Content-Type": "application/json",
            "Authorization": f"Bearer {jwt}",
        },
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=TIMEOUT) as resp:
            return json.loads(resp.read())
    except urllib.error.HTTPError as e:
        body = e.read().decode(errors="replace")
        try:
            detail = json.loads(body).get("detail", body)
        except Exception:
            detail = body
        raise RuntimeError(f"HTTP {e.code}: {detail}") from e


def extract_row(url: str, result: dict, elapsed: float) -> dict:
    audio  = result.get("audio", {})
    visual = result.get("visual", {})
    text   = result.get("text", {})
    final  = result.get("final", {})
    return {
        "url":                    url,
        "video_name":             result.get("video_name", ""),
        "duration_seconds":       round(audio.get("duration_seconds", text.get("duration_seconds", 0)), 2),
        "tempo_bpm":              round(audio.get("tempo_bpm", 0), 3),
        "rms_energy":             round(audio.get("rms_energy", 0), 5),
        "amplitude_spike_ratio":  round(audio.get("amplitude_spike_ratio", 0), 5),
        "zero_crossing_rate":     round(audio.get("zero_crossing_rate", 0), 5),
        "visual_score":           round(visual.get("visual_score", 0), 3),
        "words_per_second":       round(text.get("words_per_second", 0), 3),
        "avg_text_area_ratio":    round(text.get("avg_text_area_ratio", 0), 5),
        "text_change_rate":       round(text.get("text_change_rate", 0), 4),
        "audio_score":            round(audio.get("audio_score", 0), 3),
        "text_score":             round(text.get("text_score", 0), 3),
        "final_afi":              round(final.get("final_afi_score", 0), 3),
        "category":               final.get("final_category", ""),
        "elapsed_seconds":        round(elapsed, 1),
    }


def main():
    jwt = os.getenv("BATCH_JWT", "").strip()
    if not jwt:
        print(
            "ERROR: BATCH_JWT env var is not set.\n\n"
            "Setup:\n"
            "  export BATCH_JWT=$(python scripts/get_token.py you@example.com yourpassword)\n"
            "  python scripts/batch_analyze.py",
            file=sys.stderr,
        )
        sys.exit(1)

    DATA_DIR.mkdir(exist_ok=True)
    urls     = read_urls()
    done     = load_done_urls()
    pending  = [u for u in urls if u not in done]
    total    = len(urls)
    n_done   = total - len(pending)

    print(f"videos.txt: {total} URLs — {n_done} already done, {len(pending)} to process")

    # Rate limit is 5/min on /analyze-url. Enforce a minimum gap so we never
    # trigger it even when videos download and analyze quickly.
    MIN_GAP_S = 13  # 60s / 5 req + 1s margin

    last_req_time = 0.0

    for i, url in enumerate(pending, start=n_done + 1):
        # Respect the rate limit window before sending the next request
        gap = time.perf_counter() - last_req_time
        if gap < MIN_GAP_S and i > n_done + 1:
            time.sleep(MIN_GAP_S - gap)

        print(f"[{i}/{total}] {url[:60]}…", end=" ", flush=True)
        t0 = time.perf_counter()
        last_req_time = t0
        try:
            result  = analyze(url, jwt)
            elapsed = time.perf_counter() - t0
            row     = extract_row(url, result, elapsed)
            append_row(CORPUS_CSV, CORPUS_FIELDS, row)
            print(f"{row['video_name'] or 'ok'} — AFI {row['final_afi']} ({row['category']}) — {elapsed:.0f}s")
        except Exception as exc:
            elapsed = time.perf_counter() - t0
            msg = str(exc)
            print(f"FAILED ({elapsed:.0f}s): {msg}")
            append_row(FAILED_CSV, FAILED_FIELDS, {"url": url, "error": msg})

    print(f"\nDone. Results in {CORPUS_CSV}")
    if FAILED_CSV.exists():
        with FAILED_CSV.open(newline="") as f:
            n_failed = sum(1 for _ in csv.DictReader(f))
        if n_failed:
            print(f"Failures: {n_failed} URL(s) in {FAILED_CSV}")


if __name__ == "__main__":
    main()
