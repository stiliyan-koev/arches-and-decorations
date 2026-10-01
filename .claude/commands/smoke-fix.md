---
description: Fix ONE red smoke spec. Proves it red, fixes src/, proves it green. Never commits - ship it with /ship-pr.
argument-hint: "[tests/smoke/<file>]   - default: the most severe red spec"
---
You fix one bug that a smoke spec found. **The spec is the judge**: red before your fix, green
after, and never touched. You run in the owner's main session, so he can watch and steer.

**Never prefix a command with `cd`.** You already run in the project folder.

## Hard limits (never raise them)

- **One spec per run.** One bug, one diff, one PR later.
- **2 tries.** After the 2nd failed try, stop.
- **Only `src/` changes.** Never touch `tests/`, `playwright.config.ts`, `package.json`, `.env*`,
  SQL files or `.claude/`.
- **No git writes.** Never commit, stash, switch branches, push or open a PR.

## 1. Start clean

`git status --short --untracked-files=no`. If anything is listed, STOP:
"You have uncommitted changes. Commit or stash them first, or /ship-pr will bundle them with this fix."
Untracked files are fine. Remember the full `git status --short` for step 5.

## 2. Run the suite (the "before")

`npm run build`, then `npm run smoke`. Build fails -> STOP, show the error, fix nothing.
Read `test-results/smoke.json` (Playwright's own results). Remember which specs are red
(status not `expected`) and which are green.

A spec can be red in two ways, and only one of them is yours:
- It **couldn't run** — a missing dependency or browser, a missing env var, the web server not
  starting, the test process erroring (e.g. "Ensure you are running Node.js 22+"). The fix is in
  the environment, not in `src/`. Not a target.
- It **ran and found the site wrong.** That is what you fix.

Pick the target:
- `$ARGUMENTS` names a spec file -> that one. Already green -> STOP: "Already green, nothing to fix."
  Couldn't run -> STOP and say what to fix in the environment.
- No argument -> the most severe spec that ran and failed, by its tag: `blocker`, then `critical`,
  then `minor`.
- Nothing red -> STOP: "All green."
- Red, but everything red only couldn't run -> STOP. List them and what to fix. Change nothing:
  until they run, nobody knows whether the site is fine.

Print: `[FIX] tests/smoke/<file> (@<tag>) — <title> — <error message>`

## 3. Is it a code bug?

Read the spec, the error, the screenshot (`test-failed-*.png`, if any) and the code the spec exercises.

- The cause is outside `src/` (database down or empty, a missing env var, data she has to fix in
  admin, a migration that hasn't run) -> STOP. Tell the owner what to do. Change nothing.
- The spec itself looks wrong -> STOP and say why. Never "fix" a spec.

## 4. Fix (try K of 2)

The smallest change in `src/` that makes the spec's assertion true for the right reason.
Follow CLAUDE.md: simple and readable, no new abstractions, BG for UI text, English for code.
Don't refactor around the bug and don't fix other things you notice. List those at the end instead.

## 5. Judge

Run `npm run build`, `npm run lint`, `npm run smoke`. Then check all four:

1. `git status --short` shows nothing new outside `src/` compared to step 1. (The judge wasn't touched.)
2. The target spec is green.
3. Every spec that was green in step 2 is still green.
4. Build and lint pass.

- All true -> step 6.
- Any false and K = 1 -> learn from the output, back to step 4 as try 2. Don't undo anything.
- Any false and K = 2 -> STOP. Leave the diff as it is. Tell the owner what both tries did and
  why it is still red. He decides.

## 6. Hand over

```
## Smoke fix — tests/smoke/<file> (@<tag>)
Before: RED — <error message>
After:  GREEN — full suite: N passed
Changed: src/<file> (+N −N), ...
Cause: <one line>
Also noticed (not fixed): <list, or "nothing">
```

Then: "Look at the diff (`git diff`), then run `/ship-pr` to open the PR.
Run `/smoke-test` once more before you merge: review fix rounds can undo this fix." Stop.

## Never

- Never edit a spec, the Playwright config or `package.json` to make a spec pass.
- Never commit, push, open a PR or start other agents.
- Never read or print `.env.local`.
