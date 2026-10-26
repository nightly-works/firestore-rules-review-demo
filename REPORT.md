# Security review: a coaching app's Firestore rules (sample report)

*The app is fictional, built for this demo: clients book sessions with fitness coaches, keep private health notes and pay for premium workouts. Its front end and Firestore rules were written with AI tools, as FlutterFlow users and AI coding assistants often do. Review by an AI agent (Claude), Nightly Works.*

**Scope**: the Firestore security rules (`rules/flawed.rules`, as delivered) for the `users`, `coachProfiles`, `workouts`, `bookings` and `healthNotes` collections. The app's code, Cloud Functions, Storage rules and the Firebase project's settings are out of scope here.
**Method**: rules read against the data model; each suspected flaw written as a request from the client SDK, the way anyone holding the app's public Firebase config can send it, and run on the Firestore emulator against the rules as delivered (it works) and against the fixed rules (it is denied). The same emulator runs everyday use on both. No live Firebase project was touched.
**Result**: 4 findings: 2 critical, 1 high, 1 medium. All fixed, each with a test that fails if the flaw comes back.

## Summary for the owner

Today anyone on the internet, without an account, can read and rewrite every client's health notes. Any signed-in user can read every client's email and phone number, give themselves the premium plan, and mark their bookings as paid. The Firebase config in your app is public by design, so rules are the only lock. Deploy the fixed rules (`firebase deploy --only firestore:rules`) after setting the plan and paid status from the server, as described in findings 3 and 4. Note also that the delivered health-notes rule has an end date: after it, the app's own users could no longer read their notes either.

## Findings

### 1. Health notes open to the world (critical)

**What**: `healthNotes` still has the test-mode rule `allow read, write: if request.time < timestamp.date(2030, 1, 1);`, which allows every request, signed in or not, until that date (test mode writes such a rule with a date 30 days ahead; here someone moved it years ahead to stop the app breaking).
**Impact**: anyone who has the app's public config (it ships in the web page or app bundle) lists all notes, here medical details, and can change or delete them.
**Reproduced**: an anonymous client lists the notes and rewrites one (test 1, flawed).
**Fix**: notes are read, edited and deleted only by their author; a new note must name its author and carry no other fields.
**Verified**: anonymous and other signed-in users are denied (test 1, fixed); the author still writes, edits, deletes and queries their notes (normal use).

### 2. Every profile readable by every user (critical)

**What**: `users/{userId}` allows `read` to anyone signed in, and sign-up is open.
**Impact**: create an account, list the collection, and you have every client's and coach's email and phone number.
**Reproduced**: Ben lists all users and reads Ana's phone (test 2, flawed).
**Fix**: a profile is read by its owner only. What clients need to see of a coach (name, bio, rate) lives in `coachProfiles`, readable by signed-in users and written only by that coach.
**Verified**: listing users and reading Ana's profile are denied for Ben (test 2, fixed); each user reads their own profile and coach cards stay visible (normal use).

### 3. Premium plan and coach role self-granted (high)

**What**: a user may update their own `users` document with any fields, including `plan` and `role`, and premium workouts trust `plan`.
**Impact**: one update gives a client premium content for free, or the coach role.
**Reproduced**: Ben sets `plan: 'premium'` and `role: 'coach'` and opens the premium workout (test 3, flawed).
**Fix**: sign-up must create a free client; afterwards a user may change only `name` and `phone`. Plan and role are written by the server with the Admin SDK (for example in the payment webhook), which rules do not restrict.
**Verified**: the updates and a premium sign-up are denied, and the premium workout stays closed (test 3, fixed); a client whose plan was set server-side opens it (normal use).

### 4. Bookings with any status, any price, any client (medium)

**What**: any signed-in user can create a booking with any fields, and either party can update any field of it.
**Impact**: a client marks their booking `paid` without paying, books a session at 1 cent or already `confirmed`, or books in another client's name.
**Reproduced**: all four in test 4, flawed.
**Fix**: a booking is created by its own client, as `requested`, with a real coach and the price from that coach's card; afterwards only `status` changes: the coach confirms a request, the client cancels. `paid` is set by the server.
**Verified**: each forbidden write is denied (test 4, fixed); booking, confirming and cancelling still work (normal use).

## Checked next in a full review

Storage rules for uploads, Cloud Functions that trust `context.auth` or request data, App Check, how `plan` is written after payment, field types and sizes (rules can check them), and indexes or queries the fixed rules now deny in the app's screens.
