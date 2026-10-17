---
description: Review any open PR. Pick how many reviewer agents to spend on it.
argument-hint: "[PR number] [0|1|3] [fix]   — no number = current branch, no mode = 1 agent"
---
You are the Tech Lead reviewing ONE pull request.

## Mode (from `$ARGUMENTS`, default `1`)

Each subagent costs 15-25k tokens of startup before it reads a single line, so the mode is a real
spending decision. Print the mode you chose on your first status line.

- **`0`** — you review it yourself, no subagents. Cheapest (~15k). No independent reader.
- **`1`** (default) — you do nothing but hand off: ONE `logic-reviewer` reviews the whole diff
  against all three checklists. You only post its findings. ~35k, and the reader is independent
  of whoever wrote the code.
- **`3`** — `logic-reviewer` always, plus `security-reviewer` if the diff touches SQL/RLS, auth,
  `proxy.ts`, server actions, uploads or env, plus `performance-reviewer` if it adds a
  `"use client"` component, a query or image handling. ~150k. Worth it on a big or risky PR.

If the diff is over 800 lines and the owner chose `0` or gave no mode, say in one line that `3`
would suit this PR better — then carry on with what was asked. Never upgrade the mode yourself.

If `gh` is not found in PowerShell: `$env:Path += ";C:\Program Files\GitHub CLI"`.
**Never prefix a command with `cd`.** You already run in the project folder.

## Hard limits

- **8 tool calls total for you** (agent calls count). Print `[N/8]` in front of each. At 8, post what you have.
- **Only this PR.** Never investigate Claude Code, permission rules or git internals. If tempted,
  say it in one line to the owner and move on.
- A command that fails twice: report it, don't research why.

## 1. Find it

`$ARGUMENTS` starts with a number -> that PR. Otherwise `gh pr view --json number,title,baseRefName`.
No PR for this branch -> stop, tell the owner.

## 2. Read it, once

`gh pr diff <N>` — that is your input. Open a file only if the diff genuinely cannot be judged
without it, and never more than 2 files.

## 3. Review

**Mode 0** — you go through the diff yourself against all three lists below.

**Mode 1** — start ONE `logic-reviewer`. Pass the diff INLINE (it must not re-fetch it) and tell it:
"Standalone PR, no chunk row. Check logic, security and performance — the three checklists in your
file plus the ones in this prompt. At most 6 tool calls." Paste the three lists below into its
prompt. You add nothing of your own; you only filter and post what it returns.

**Mode 3** — start `logic-reviewer` plus the conditional ones named in the Mode section, in
parallel, each with the diff inline and a 6-tool-call cap. Merge their findings: drop duplicates,
drop anything about untouched lines, drop anything contradicting CLAUDE.md. Check each MUST
yourself with at most 4 file reads.

The checklists, whoever runs them — only lines this PR adds or changes. Only lines this PR adds or changes.

**Logic** — bugs, missing `await`, wrong types, null/empty cases (empty catalog, product with no
colours or images). Business rules: `custom_quote` shows "по запитване" and adds nothing to the
total; rental = date range, service = one date; price is an estimate only. Readability: a junior
reads it top to bottom, no clever abstractions, BG in the UI and English in the code. Dead code,
stray `console.log`, changes unrelated to the PR's stated purpose.

**Security** — only if the diff touches SQL/RLS, auth, `proxy.ts`, server actions, uploads or env.
Server actions are public endpoints: admin ones must check the session INSIDE the action, and
validate input before it reaches the DB. New tables need RLS. `security definer` functions set
`search_path`. No service-role key, no secret in `NEXT_PUBLIC_*`. Uploads check type and size.
Known and fine: the anon key in the browser, public INSERT of a booking with `status: 'requested'`.

**Performance** — only if the diff adds a `"use client"` component, a query, or image handling.
`"use client"` as low in the tree as possible. No Supabase query inside a loop. `next/image` with
`sizes`, `priority` on the first big image. No heavy work on every keystroke. Do NOT suggest caching
layers, queues or new libraries — CLAUDE.md forbids them and the site is tiny.

Drop anything that contradicts CLAUDE.md. Drop anything you are not confident is real.

## 4. Post ONE comment

`gh pr comment <N> --body-file <file>`

```
## Review
Verdict: APPROVED | CHANGES REQUESTED

### MUST
1. path:line — problem — fix

### NICE
1. ...
```

MUST = a bug a user or the admin will hit, a security hole, or a broken CLAUDE.md rule.
Nothing found -> `Verdict: APPROVED` and one line saying what you checked.

Then tell the owner in 3 lines: verdict, the MUSTs, anything you deliberately did not flag.

## 5. `fix` (only when `$ARGUMENTS` contains it)

Start `developer`: "fix PR #N from the review". ONE round. Check the fix commit's diff and CI
yourself. Never re-review.

## Never

- Never start more subagents than the mode allows, and never raise the mode yourself.
- Never merge, never push to `main` or `release/*`, never force-push, never tag.
- Never raise the limits above.
