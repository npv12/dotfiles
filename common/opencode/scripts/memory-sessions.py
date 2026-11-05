#!/usr/bin/env python3
"""Read-only helpers for the dream memory-consolidation workflow.

    sessions.py sessions --from 2026-10-29 --to 2026-11-05
    sessions.py coverage --from 2026-10-29 --to 2026-11-05
    sessions.py dump <session-id> [--user-chars 260] [--assistant-chars 400]

Dates are inclusive and interpreted in local time.
"""

import argparse
import datetime as dt
import json
import os
import sqlite3
import sys

DB = os.path.expanduser("~/.local/share/opencode/opencode.db")
MEMORY = os.path.expanduser("~/.config/opencode/memory")


def connect():
    uri = f"file:{DB}?mode=ro"
    con = sqlite3.connect(uri, uri=True, timeout=10)
    con.text_factory = lambda b: b.decode("utf-8", "replace")
    return con


def epoch_ms(date_str, end_of_day=False):
    d = dt.datetime.strptime(date_str, "%Y-%m-%d")
    if end_of_day:
        d = d + dt.timedelta(days=1) - dt.timedelta(milliseconds=1)
    return int(d.timestamp() * 1000)


def local_date(ms):
    return dt.datetime.fromtimestamp(ms / 1000).strftime("%Y-%m-%d")


def cmd_sessions(args):
    con = connect()
    lo, hi = epoch_ms(args.start), epoch_ms(args.end, end_of_day=True)
    rows = con.execute(
        """
        SELECT s.id, s.parent_id, s.agent, s.title, s.time_created,
               json_extract(s.model, '$.id') AS model,
               s.tokens_input, s.tokens_output
        FROM session_v2 s
        WHERE EXISTS (
            SELECT 1 FROM session_message m
            WHERE m.session_id = s.id AND m.time_created >= ? AND m.time_created < ?
        )
        ORDER BY s.time_created ASC
        """,
        (lo, hi + 1),
    ).fetchall()
    roots = [r for r in rows if not r[1]]
    children = [r for r in rows if r[1]]
    print(f"{len(roots)} root sessions, {len(children)} child sessions, {args.start}..{args.end}")
    print("date       | agent   | model                | out_tok | title")
    for sid, _parent, agent, title, created, model, _ti, to in roots:
        print(f"{local_date(created)} | {agent or '-':7} | {(model or '-')[:20]:20} | {to or 0:7} | {(title or '')[:60]}")
        print(f"           | sid: {sid}")


def cmd_coverage(args):
    con = connect()
    lo, hi = epoch_ms(args.start), epoch_ms(args.end, end_of_day=True)
    rows = con.execute(
        """
        SELECT s.time_created FROM session_v2 s
        WHERE EXISTS (
            SELECT 1 FROM session_message m
            WHERE m.session_id = s.id AND m.time_created >= ? AND m.time_created < ?
        )
        """,
        (lo, hi + 1),
    ).fetchall()
    counts = {}
    for (created,) in rows:
        counts[local_date(created)] = counts.get(local_date(created), 0) + 1
    day = dt.datetime.strptime(args.start, "%Y-%m-%d")
    end = dt.datetime.strptime(args.end, "%Y-%m-%d")
    print("date       | sessions | daily log")
    while day <= end:
        key = day.strftime("%Y-%m-%d")
        path = os.path.join(MEMORY, "daily", f"{key}.md")
        state = "ok" if os.path.exists(path) else ("missing" if counts.get(key) else "-")
        print(f"{key} | {counts.get(key, 0):8} | {state}")
        day += dt.timedelta(days=1)


def command_template(text):
    return len(text) > 500 and (text.startswith("#") or "##" in text)


def cmd_dump(args):
    con = connect()
    meta = con.execute(
        "SELECT datetime(time_created/1000,'unixepoch','localtime'), title FROM session_v2 WHERE id=?",
        (args.session_id,),
    ).fetchone()
    if not meta:
        sys.exit(f"unknown session: {args.session_id}")
    print(f"=== {args.session_id} | {meta[0]} | {meta[1] or ''}")
    print("--- user turns ---")
    for (text,) in con.execute(
        "SELECT json_extract(data,'$.text') FROM session_message WHERE session_id=? AND type='user' ORDER BY seq",
        (args.session_id,),
    ):
        if not text:
            continue
        text = " ".join(text.split())
        if command_template(text):
            print("[command-template]")
            continue
        print(text[: args.user_chars] + ("..." if len(text) > args.user_chars else ""))

    print("--- assistant text (last 6) ---")
    blocks = []
    for (content,) in con.execute(
        "SELECT json_extract(data,'$.content') FROM session_message WHERE session_id=? AND type='assistant'",
        (args.session_id,),
    ):
        try:
            parts = json.loads(content)
        except (TypeError, ValueError):
            continue
        for part in parts:
            if part.get("type") == "text" and part.get("text"):
                blocks.append(part["text"])
    for text in blocks[-6:]:
        text = " ".join(text.split())
        print("- " + text[: args.assistant_chars] + ("..." if len(text) > args.assistant_chars else ""))


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    sub = parser.add_subparsers(dest="command", required=True)

    p = sub.add_parser("sessions")
    p.add_argument("--from", dest="start", required=True)
    p.add_argument("--to", dest="end", required=True)
    p.set_defaults(func=cmd_sessions)

    p = sub.add_parser("coverage")
    p.add_argument("--from", dest="start", required=True)
    p.add_argument("--to", dest="end", required=True)
    p.set_defaults(func=cmd_coverage)

    p = sub.add_parser("dump")
    p.add_argument("session_id")
    p.add_argument("--user-chars", type=int, default=260)
    p.add_argument("--assistant-chars", type=int, default=400)
    p.set_defaults(func=cmd_dump)

    args = parser.parse_args()
    args.func(args)


if __name__ == "__main__":
    main()
