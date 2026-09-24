# Agent PR pipeline: how it works and why

A "team" of AI agents takes the big `project-init` branch (your backup) and ships it into `develop`
as small, reviewed PRs. `main` is touched once, at the end, by you. This file explains each part so you can change it with confidence.

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
                                          if APPROVED + CI green ──► squash merge into develop
```

## The files, and why each exists

| File | What it is | Why |
|---|---|---|
| `.claude/commands/ship-next-pr.md` | The Lead's playbook. Typing `/ship-next-pr` loads it into your main session. | The orchestrator has to be the main session: agents can't start other agents. |
| `.claude/agents/developer.md` | Developer agent: can edit, commit, push, open PRs. | Separate agent = separate memory. The Lead never "saw" the code being written, so it doesn't make excuses for it. |
| `.claude/agents/*-reviewer.md` | 3 specialists: **read-only** tools, no GitHub posting. | Narrow job means a deeper look. Read-only means a reviewer can't "fix" things behind your back. |
| `.claude/settings.json` | Allow list and deny list for commands. | Allow: the loop doesn't stop to ask you 40 times. Deny: force-push, pushing straight to `main`/`develop` and `--admin` merge are blocked **by the tool**, not just by a sentence in a prompt. The `.env.local` rule is best-effort: it only guards the Read tool, a shell command like `Get-Content .env.local` still works. Anything not on either list (like creating `develop`) makes Claude ask you first. That's a built-in human checkpoint. |
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

## Branches

```
project-init   backup of everything, never merged directly, only read from
     │  git checkout project-init -- <files of chunk NN>
     ▼
split/NN-*  ──PR──►  develop   (agents merge here, one chunk at a time)
                        │
                        └──PR──►  main   (Lead opens it at the end, YOU merge it)
```

Why `develop`: agents get a branch where they can merge freely, and `main` stays the
"known good" branch that only a human moves. When you deploy to Vercel later, point
production at `main` and previews at `develop`.

## How to run

In Claude Code, from the project folder:

```
/ship-next-pr          <- one chunk, then stops and reports
/ship-next-pr all      <- keeps going until done or blocked
```

The first run takes chunk **00**: the pipeline ships itself. `develop` doesn't exist yet,
so the Lead asks you once to create it from `main`. Then the developer puts the setup files
(this folder, CI, `.gitattributes`) on `split/00-agents-and-ci`, the reviewers check them,
and the Lead merges. CI first runs on this PR itself.

Start with one chunk at a time for the first 3-4 PRs. Read each Lead review and ask:
*Would I have caught this? Did it drop something it shouldn't have?* When a comment keeps coming
back, add the rule to CLAUDE.md or the reviewer's checklist. **Tuning these files is the skill.**

Optional: on GitHub set `develop` as the default branch (Settings -> General). Then PRs and
clones default to it and nobody opens a PR into `main` by mistake.
