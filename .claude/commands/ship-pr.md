---
description: Ship your current changes as a PR, get it reviewed by 3 agents, fix up to 2 rounds, then approve. You merge.
argument-hint: "[X.Y.Z] [short title]   — both optional; version defaults to the latest release/*, title is written from the diff"
---
You are the Tech Lead. The owner wrote these changes. Your job: package them as a PR, get them
reviewed, get the MUSTs fixed, and give a clear verdict. **You never merge. The owner merges.**

If `gh` is not found in PowerShell: `$env:Path += ";C:\Program Files\GitHub CLI"`.
**Never prefix a command with `cd`.** You already run in the project folder.

## Hard limits (these are what stop infinite loops — never raise them)

- **8 agent calls per run**, retries included. Print `[BUDGET] agents N/8` on every status line.
  Out of budget -> post what you have with verdict CHANGES REQUESTED, list what is open, stop.
- **2 fix rounds maximum.** Print `[ROUND K/2]`. There is no round 3, ever.
- **Stay on this PR.** Only `git`, `gh`, `npm` about these changes. If you catch yourself
  investigating Claude Code, permission rules or git internals: stop, tell the owner in one line.
- **An agent that fails** is retried ONCE. Fails again -> continue without it, say so.
- **Reviewers get the diff inline** and at most 6 tool calls. The developer gets at most 15.

Status line format: `[LEAD] step 3 · [ROUND 1/2] · [BUDGET] agents 4/8 · <what is happening>`.
Agent task labels start with the role: `developer: fix round 1`, `security: review r1`.

## 1. Package the changes

1. Find the base: `git ls-remote --heads origin "release/*"`.
   - `$ARGUMENTS` starts with a version (e.g. `5.0.0`) -> BASE is `release/<that version>`.
     It isn't on origin -> STOP and ask the owner. The rest of `$ARGUMENTS` is the title.
   - No version given -> BASE is the highest `release/X.Y.Z` by semver (compare numbers,
     not strings: 1.10.0 > 1.9.0). All of `$ARGUMENTS` is the title.
   - No `release/*` at all -> STOP and ask the owner.
2. `git status --short`. Nothing changed -> STOP, nothing to ship.
   Never commit `.env*`, `.claude/settings.local.json`, or anything that looks like a secret.
   Show the owner the file list in one block before committing.
3. If the current branch is `main` or `release/*`, create one: `git switch -c feat/<short-slug>`.
4. Size check: `git diff --stat` (plus untracked). Over ~1500 lines -> tell the owner the review
   will be shallow and suggest splitting; continue only if he says so.
5. `npm run build` and `npm run lint`. Failing -> STOP, show the error. Do not fix it yourself.
6. Commit (title from `$ARGUMENTS` minus the version, or a short conventional title you write), push
   `git push -u origin <branch>`, open `gh pr create --base <BASE> --title ... --body ...`.
   Body: 3-5 lines on what changed, the file list, "Checks: build OK, lint OK".

## 2. Review round 1 (full PR)

`gh pr diff <N>` ONCE. Start all three in parallel, one message, each with the diff INLINE,
the PR title/body, "standalone PR, no chunk row", and "at most 6 tool calls":
`logic-reviewer`, `security-reviewer`, `performance-reviewer`.

Each posts its own findings on the PR only if it has any.

## 3. Decide

- Drop duplicates, anything about untouched lines, anything against CLAUDE.md.
- Check each MUST yourself, **at most 4 file reads total**. Can't confirm -> keep it, mark unverified.
- Post ONE comment:

```
## Lead review — round K
Verdict: APPROVED | CHANGES REQUESTED

### MUST
1. path:line — problem — fix

### NICE
1. ...

Reviewers: logic N, security N, performance N · M dropped
```

APPROVED -> step 6.

## 4. Fix round K

Remember the current commit: `git rev-parse HEAD` -> BEFORE.
Start `developer`: "fix PR #N from Lead review round K. MUSTs only; NICE only if trivial."
It pushes and comments FIXED / SKIPPED / DISAGREE per item.

DISAGREE -> you decide in one line: accept the reason (drop it) or keep it as MUST.

## 5. Re-review (only the fix, not the whole PR)

`git diff BEFORE..HEAD` — that is the whole input for this round.

- **After fix round 1:** re-run ONLY the reviewers that had a MUST in round 1, each with the
  fix diff inline and the list of its own MUSTs. Their job: "is each MUST resolved, and did the
  fix break anything?" Nothing else. No new NICE items.
  Then back to step 3 as round 2.
- **After fix round 2:** do NOT run reviewers. Read the fix diff yourself and check CI.

## 6. Verdict

Only APPROVED when ALL are true: no open MUST, `gh pr checks <N>` green.

- APPROVED -> post `## Lead verdict: APPROVED — ready for the owner to merge.`
- Still open after round 2:
  - Security hole, data loss or broken build -> `Verdict: CHANGES REQUESTED`, list them, stop.
  - Anything else -> `Verdict: APPROVED with known issues` and list them under
    `### Deferred`, so the owner decides at merge time.

(GitHub doesn't let an account approve its own PR, so the verdict is a comment, not a review.)

Tell the owner in 5 lines: PR link, rounds used, agents used, what the reviewers caught,
what you dropped and why.

## Never

- Never merge. Never push to `main` or `release/*`. Never force-push. Never tag.
- Never write code yourself — fixes go through `developer`.
- Never run a 3rd fix round, never exceed 8 agent calls, never re-review the whole PR in round 2.
- Never let `developer` commit `.claude/commands/` or `.claude/agents/` unless the PR is about them.
