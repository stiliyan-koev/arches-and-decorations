# Agent PR pipeline: how it works and why

A "team" of AI agents ships the work in `pr-plan.md` into the open release branch (`release/X.Y.Z`)
as small, reviewed PRs. `main` is the live site and only you move it: once per release. This file explains each part so you can change it with confidence.

## The team

```
You (owner)  ── run /ship-next-pr ──►  LEAD  (your main Claude Code session)
                                         │
             ┌───────────────────────────┼──────────────────────────────┐
             ▼                           ▼  (3 at the same time)        ▼
        developer            security-reviewer  performance-reviewer  logic-reviewer
     builds / fixes PR          reads diff,        reads diff,          reads diff,
     (can write code)          reports only       reports only         reports only
             │                           └──────────────┬───────────────┘
             │                                          ▼
             │                              LEAD filters, checks each MUST,
             │                              posts ONE review on GitHub
             └────────── fix PR #N ◄──── if CHANGES REQUESTED (max 2 fix rounds)
                                          if APPROVED + CI green ──► squash merge into release/X.Y.Z
```

## The files, and why each exists

| File | What it is | Why |
|---|---|---|
| `.claude/commands/ship-next-pr.md` | The Lead's playbook. Typing `/ship-next-pr` loads it into your main session. | The orchestrator has to be the main session: agents can't start other agents. |
| `.claude/agents/developer.md` | Developer agent: can edit, commit, push, open PRs. | Separate agent = separate memory. The Lead never "saw" the code being written, so it doesn't make excuses for it. |
| `.claude/agents/*-reviewer.md` | 3 specialists: **read-only** tools, no GitHub posting. | Narrow job means a deeper look. Read-only means a reviewer can't "fix" things behind your back. |
| `.claude/settings.json` | Allow list and deny list for commands. | Allow: the loop doesn't stop to ask you 40 times. Deny: force-push, pushing to `main`/`release/*` (by name, `HEAD`/`@`, refspecs, `--all`/`--mirror`), deleting remote refs, pushing tags and `--admin` merge are caught **by the tool**, not just by a sentence in a prompt. The deny list is **best-effort**: it matches the command text, so grouped short flags (`-uf`) and shell quoting can slip past. The real wall would be a GitHub ruleset on `main`, `release/**` and `v*` tags (your call; needs GitHub Pro on a private repo). The `.env.local` rule is best-effort too: it only guards the Read tool, a shell command like `Get-Content .env.local` still works. Anything not on either list makes Claude ask you first. That's a built-in human checkpoint. |
| `.github/workflows/ci.yml` | GitHub runs `lint` + `build` on every PR. | Free and never wrong. Anything a tool can check shouldn't use up an AI reviewer's attention. |
| `.gitattributes` | Forces LF line endings in git. | Windows (CRLF) and Linux/GitHub (LF) otherwise see "changed" files that aren't. Agents on different machines would all trip on it. |
| `pr-plan.md` | The split into 20 chunks + progress + log. | The shared "memory" of the team. Agents forget everything between runs; this file doesn't. |

## Key ideas (the AI-engineering part)

1. **An agent = model + tools + a loop + a goal.** The markdown files ARE the agents. The
   frontmatter picks the tools; the body is the job description.
2. **Context is the most valuable thing an agent has.** Each agent gets a clean context with only
   what it needs. That's why the reviewers are separate: a fresh set of eyes, just like with people.
3. **Specialists over-report.** Ask a performance reviewer to find problems and it always will.
   So each reviewer gets "know this project" facts (anon key is fine, no caching layers) and
   the Lead **checks every MUST itself** before posting. This filtering step is the most important part.
4. **Hard rules go in settings, soft rules in prompts.** "Never force-push" in a prompt is a
   request. In `deny` it's a wall. Anything dangerous goes in `deny`.
5. **Stop conditions.** Max 2 fix rounds, then a human decides. Without this, two agents can
   argue about a variable name forever.
6. **Structured output.** Reviewers must answer in `MUST|NICE — file:line — problem — fix`.
   That makes their output easy for the Lead to merge and filter, like a small API between agents.
7. **Deterministic first, AI second.** CI (build + lint) runs before anyone argues about code.
8. **The hand-off is part of the output.** Code that compiles is half a task: the SQL still has to
   run on the live DB, the env var still has to go into Netlify. So `/ship-pr`, `/ship-next-pr`,
   `/ship-tooling`, `/smoke-fix` and `/release-check` each end with one `### Follow-up actions`
   table (the rule lives in CLAUDE.md, "Follow-up actions"), every file in it a markdown link the
   owner can click, and `No manual steps.` when there is genuinely nothing. `/smoke-test` is the
   exception: it prints `qa`'s report as it is and adds nothing. `developer` reports its steps up as
   a `Follow-up actions:` list; the Lead merges them into the single table the owner reads.

## Known limits (be honest with yourself)

- **Same model reviewing the same model.** It catches sloppiness, not shared blind spots. You still
  skim each merged PR, especially the ⚠️ ones.
- **GitHub won't let you approve your own PR.** Developer and Lead both use your `gh` login, so
  the Lead posts a comment with `Verdict: APPROVED` instead of a real approval.
  (To get real approvals you'd make a second GitHub account / bot for the Lead.)
- **Branch protection on a private repo needs GitHub Pro.** On the free plan, "don't merge with
  red CI" is enforced by the Lead's instructions, not by GitHub. On Pro: Settings → Branches →
  protect `main` → require the `build` check to pass.
- **Cost.** One chunk ≈ 1 developer run + 3 reviewers × up to 3 rounds. The reviewers can run on a
  cheaper model: add `model: sonnet` to their frontmatter and compare the quality.

## Branches and versions

```
main ──●──────────────●(v1.0.0)──────●(v1.0.1)───────●(v1.1.0)
        \            /               /  hotfix       /
         release/1.0.0               /               release/1.1.0
          ▲    ▲    ▲                                  ▲    ▲
     feature  fix  feature                        feature  fix
```

- **`main`** = what's live. Only you merge into it. Every merge gets a tag.
- **`release/X.Y.Z`** = the next version. You cut it from `main`, the agents squash-merge feature
  and fix PRs into it. There is only one open at a time.
- **Ship a release:** test the release branch's Netlify preview, merge the Lead's
  `release/X.Y.Z` → `main` PR with a **normal merge** (not squash), then tag and delete the branch:
  ```
  git switch main; git pull; git tag v1.1.0; git push origin v1.1.0
  git push origin --delete release/1.1.0
  ```
- **Start the next one:** `git fetch origin; git push origin origin/main:refs/heads/release/1.2.0`.
- **Hotfix:** branch off `main`, PR straight into `main`, tag a patch (`v1.1.1`). If a release branch
  is open, merge `main` into it so the fix isn't lost.
- **Version numbers:** new features → middle number (1.**2**.0). Only fixes → last (1.1.**1**).
  Big redesign → first (**2**.0.0). Keep `package.json` `version` the same as the tag.

**Rollback.** The tags are your stable versions.
1. Fastest: Netlify → Deploys → open an older production deploy → "Publish deploy". Takes seconds,
   no git. Then fix forward.
2. Git: `git revert -m 1 <release merge commit>` on a branch, PR into `main`, tag a patch. Never
   reset or force-push `main`.

**Netlify:** production branch = `main`. Branch deploys: All branches, or add each `release/X.Y.Z`
by name when you cut it (Netlify takes exact branch names, not a `release/*` pattern). The
release → `main` PR gets a Deploy Preview either way, so there is always a preview to test before you merge.

Why this and not `develop`: a release branch does the same job (agents merge freely, `main` stays
known-good), but it also gives each release a name, a version number, and a clean rollback point.
With both you'd just be merging the same code twice.

## How to run

In Claude Code, from the project folder:

```
/ship-next-pr          <- one chunk, then stops and reports
/ship-next-pr all      <- keeps going until done or blocked
```

If no `release/*` branch is open, the Lead stops and asks you to cut one from `main`. It can't do
that itself (pushing to `release/*` is denied), so starting a release stays your decision.

Start with one chunk at a time for the first 3-4 PRs. Read each Lead review and ask:
*Would I have caught this? Did it drop something it shouldn't have?* When a comment keeps coming
back, add the rule to CLAUDE.md or the reviewer's checklist. **Tuning these files is the skill.**

Keep `main` as GitHub's default branch. The Lead always passes `--base release/X.Y.Z`, so nothing
lands in `main` by accident.

## Smoke tests (separate from the PR pipeline)

```
/smoke-test          qa agent: build + the specs in tests/smoke/, report by severity. Changes nothing.
/smoke-fix [spec]    your main session: fixes ONE red spec in src/. Never commits.
/ship-pr             the normal path: PR, 3 reviewers, fix rounds, you merge.
```

Three jobs, three permission levels: the tester can't edit, the fixer can't commit, and only
`/ship-pr` opens PRs. That's why they are separate commands and not one "QA" command.

| File | What it is | Why |
|---|---|---|
| `.claude/agents/qa.md` | Runs build + smoke, reads Playwright's results file, reports by severity. **No Edit/Write tools.** | A tester that can edit will "help" by fixing what it finds. Taking the tools away is the wall, same as the reviewers. |
| `.claude/commands/smoke-test.md` | Starts `qa`, prints its report. | Keeps Playwright's long output out of your main session. |
| `.claude/commands/smoke-fix.md` | One red spec -> smallest fix in `src/` -> green. Max 2 tries. | **The spec is the judge**: red before, green after, untouched (`git status` must show nothing new outside `src/`). An agent saying "fixed" proves nothing. |
| `playwright.config.ts`, `tests/smoke/` | 6 read-only specs against the production build on port 3100. Severity is the spec's tag: `@blocker`, `@critical`, `@minor`. | Read-only because the database is the live one: no spec presses „Изпрати запитване“. |

- Smoke is **not** a merge gate and not in CI (it needs the real `.env.local`). Run `/smoke-test`
  before you merge a release, and again after a `/smoke-fix` PR's review rounds: those can undo the fix.
- A new spec only for something a code review can't catch. Give it a tag, keep it read-only.

## Release check (before you merge a release into `main`)

```
/release-check [branch]    build + lint + smoke + reviewers on the WHOLE diff vs main. One GO / NO-GO report. Changes nothing.
```

The per-PR reviews each saw one small diff. This is the only step that reads the release as a
whole, so it can catch two PRs that are each fine but break each other. It reuses `qa` and the
three reviewers; it adds no new agent. It also prints the `### Follow-up actions` table (SQL to run
on the live DB, env vars for Netlify, the merge and the tag) and what no agent tested (admin, form
submit), so you know what to click through on the Netlify preview yourself.
