---
description: Put the uncommitted agent-tooling changes on their own branch and open a PR into agentic/release-X.Y.Z. No review, no merge.
argument-hint: "[X.Y.Z]   — optional; defaults to the latest release/* on origin"
---
Ship the agent-tooling changes (`.claude/agents/`, `.claude/commands/`, `.claude/settings.json`,
`.githooks/`) as their own PR. Never mix them into the current feature branch.

If `gh` is not found in PowerShell: `$env:Path += ";C:\Program Files\GitHub CLI"`.
**Never prefix a command with `cd`.** You already run in the project folder.

## 1. Pick the version

Remember the current branch: `git branch --show-current` -> START.
`git fetch origin`, then `git ls-remote --heads origin "release/*"`.

- `$ARGUMENTS` is a version (e.g. `5.0.0`) -> VERSION is it. No `release/<VERSION>` on origin ->
  STOP and ask the owner.
- `$ARGUMENTS` is empty -> VERSION is the highest `release/X.Y.Z` by semver (compare numbers,
  not strings: 1.10.0 > 1.9.0). No `release/*` at all -> STOP and ask the owner.

BASE is `agentic/release-<VERSION>`.

## 2. Make sure BASE exists

`git ls-remote --heads origin "agentic/release-<VERSION>"`.

- Exists -> go on.
- Missing -> create it from the release branch:
  `git branch agentic/release-<VERSION> origin/release/<VERSION>`, then `git push origin agentic/release-<VERSION>`,
  then `git branch -D agentic/release-<VERSION>` (only the remote copy is needed).
  Tell the owner in one line that you created it.

## 3. Branch

`git switch -c chore/agent-tooling origin/agentic/release-<VERSION>`.
Uncommitted changes carry over. If the switch fails because of a conflict, STOP and show the
owner. Never stash or force anything.
If `chore/agent-tooling` already exists, STOP and ask.

## 4. Stage, check, commit

Stage ONLY: `git add .claude/agents/ .claude/commands/ .claude/settings.json .githooks/`.
Never stage `.claude/settings.local.json`, `.claude/worktrees/`, `docs/` or anything `.env*`.
Show `git status --short` in one block.

`npm run build` and `npm run lint` must pass. Failing -> STOP, show the error, don't fix it.

Commit with a short conventional `chore(agents): ...` title describing the changes.

## 5. Push and open the PR

`git push -u origin chore/agent-tooling`, then
`gh pr create --base agentic/release-<VERSION> --title <commit title> --body ...`.
Body: a bullet list of what is new or changed in the tooling, then "Checks: build OK, lint OK".

## 6. Go back

`git switch <START>`. Don't review or merge the PR. Give the owner the link.

## Never

- Never push to `main` or `release/*`. Never force-push. Never tag. Never merge.
- No AI attribution in the commit or PR body.
