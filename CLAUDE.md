# Notes for Claude Code sessions on this repo

## Watch out: recurring automations can silently burn usage

On 2026-08-19 we found a Claude Code Remote session had been left "watching"
PR #1 on this repo since 2026-08-16. Per the PR-babysitting workflow, it
rescheduled itself an hourly check-in (`send_later`) indefinitely, and each
check-in re-read the full session context. Over a few days that one loop
alone accounted for 26M+ cache-read tokens, 1M+ cache-write tokens, and
100K+ output tokens — the dominant driver of climbing usage, even though no
cron job, hook, or MCP server was misbehaving.

Takeaways to avoid repeating this:

- **PR watching has no automatic expiry.** If you ask Claude to "watch",
  "monitor", or "babysit" a PR, it will keep checking in roughly hourly
  until the PR is merged/closed or you explicitly tell it to stop. Don't
  leave a PR open indefinitely if you no longer care about it — merge,
  close, or explicitly ask the session to `unsubscribe_pr_activity`.
- **Periodically audit for background automations.** From any session,
  check:
  - `list_triggers` — Routines/scheduled triggers (cron or one-shot
    `send_later` check-ins) still armed.
  - `list_sessions` (with `mine: true`) — other active/idle sessions and
    their token usage (`external_metadata.usage`), which surfaces runaway
    loops before they get expensive.
- **Weekly/cron Routines are fine but have no end date either.** A Routine
  created for a one-off need (e.g. a weekly price-monitoring job) keeps
  firing forever unless disabled/deleted. Delete Routines once their
  purpose is done, not just once you stop looking at the results.
- **Local hooks (SessionStart/Stop) are not the culprit for this kind of
  thing** — they run once per session lifecycle, not on a timer. If usage
  climbs unexpectedly, look at triggers/sessions first, not hooks.
