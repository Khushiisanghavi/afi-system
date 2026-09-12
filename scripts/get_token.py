#!/usr/bin/env python3
"""
Print a JWT for the AFI backend.

Usage:
  python scripts/get_token.py <email> <password>
  AFI_EMAIL=you@example.com AFI_PASSWORD=secret python scripts/get_token.py

The token is printed to stdout so you can capture it:
  export BATCH_JWT=$(python scripts/get_token.py me@example.com hunter2)
"""

import sys
import os
import json
import urllib.request
import urllib.error

BASE_URL = os.getenv("AFI_BASE_URL", "http://localhost:8000")


def main():
    if len(sys.argv) == 3:
        email, password = sys.argv[1], sys.argv[2]
    elif len(sys.argv) == 1:
        email    = os.getenv("AFI_EMAIL", "")
        password = os.getenv("AFI_PASSWORD", "")
        if not email or not password:
            print(
                "Usage: python scripts/get_token.py <email> <password>\n"
                "   or: set AFI_EMAIL and AFI_PASSWORD env vars",
                file=sys.stderr,
            )
            sys.exit(1)
    else:
        print("Usage: python scripts/get_token.py <email> <password>", file=sys.stderr)
        sys.exit(1)

    payload = json.dumps({"email": email, "password": password}).encode()
    req = urllib.request.Request(
        f"{BASE_URL}/auth/login",
        data=payload,
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            body = json.loads(resp.read())
        print(body["access_token"])
    except urllib.error.HTTPError as e:
        body = e.read().decode()
        print(f"Login failed ({e.code}): {body}", file=sys.stderr)
        sys.exit(1)
    except Exception as e:
        print(f"Error: {e}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
