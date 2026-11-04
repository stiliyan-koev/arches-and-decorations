---
name: "source-command-smoke-test"
description: "Build the site and run the smoke specs. Reports what is red, by severity. Changes nothing."
---

# source-command-smoke-test

Use this skill when the user asks to run the migrated source command `smoke-test`.

## Command Template

Run the smoke tests on the current branch and report. Nothing else.

**Never prefix a command with `cd`.** You already run in the project folder.

1. Start the `qa` agent. Task label: `qa: smoke run`.
   Prompt: "Run the smoke tests on the current branch and report."
2. Print its report to the owner exactly as it is. Don't shorten it, don't re-rank it,
   don't change a severity.
3. If the result is RED, end with one line:
   `Fix one: /smoke-fix (takes the most severe) or /smoke-fix tests/smoke/<file>`

## Never

- Never fix anything, never edit a file. That is `/smoke-fix`.
- Never start any agent other than `qa`. Never open issues or PRs.
