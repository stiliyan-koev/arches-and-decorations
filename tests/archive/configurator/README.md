# Archived: configurator smoke specs

These three specs covered the configurator back when it was the homepage. The
client moved it to the hidden `/configurator` (homepage v2), and the catalog +
basket became the main flow, so they no longer run with `npm run smoke`
(Playwright only looks in `tests/smoke/`).

They already point at `/configurator`. To bring them back, move them into
`tests/smoke/`, change `../../smoke/add-item` back to `./add-item` and
`../../../src/` back to `../../src/`, then run them once. They have not been
run since the move.
