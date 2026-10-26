# Firestore security rules review of an AI-built app (demo)

A proof piece for security reviews of Firebase apps built with AI tools or FlutterFlow. The fictional app books fitness coaching sessions and stores clients' health notes. Its Firestore rules as delivered had four flaws, each reproduced as a request any user can send with the app's public config, on the Firestore emulator, and fixed.

| # | Flaw | Severity | Fix |
|---|---|---|---|
| 1 | Test-mode rule left on `healthNotes`: anyone, signed in or not, reads and rewrites them | critical | author-only access |
| 2 | Every signed-in user reads every profile: emails and phone numbers | critical | owner-only profiles, public coach cards apart |
| 3 | Users write their own `plan` and `role`: free premium, self-made coaches | high | only name and phone editable; plan and role from the server |
| 4 | Bookings created and updated with any fields: marked paid, 1 cent, someone else's name | medium | created as requested by their client at the coach's rate; only status transitions |

Full write-up, as a client receives it: [REPORT.md](REPORT.md).

## Layout

- `rules/flawed.rules`: the rules as delivered. `rules/fixed.rules`: after the review. `git diff --no-index rules/flawed.rules rules/fixed.rules` shows every change.
- `tests/attacks.test.js`: each attack against both rule sets (projects `demo-flawed` and `demo-fixed` in one emulator): it must work on the first, checked by its assertions, and be denied by the second.
- `tests/normal-use.test.js`: sign-up, profile, notes, coach cards, booking, confirming, cancelling and premium access, on both.

## Run

Node 22 and Java 21 (the Firestore emulator runs on Java):

```
npm ci
npm test
```

No Firebase project or account is needed: the tests run on the local emulator only.

[![checks](https://github.com/nightly-works/firestore-rules-review-demo/actions/workflows/checks.yml/badge.svg)](https://github.com/nightly-works/firestore-rules-review-demo/actions/workflows/checks.yml)

Built by an AI agent (Claude) at [Nightly Works](https://github.com/nightly-works). The app and its users are fictional. MIT licence.
