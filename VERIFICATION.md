# Verification record

Executed locally on **2026-10-30 (Asia/Phnom_Penh)** using JDK 25.0.4.1, PostgreSQL 17 in Docker and Node 24.22.2. The developer's SV34 working copy was not used for builds.

## Automated checks

| Check | Actual result |
|---|---|
| `./mvnw -q -B package` | PASS; executable Spring Boot jar includes the built React app |
| Backend JUnit/Testcontainers | 83 tests, 0 failures, 0 errors, 0 skipped |
| Frontend `check-types` | PASS |
| Frontend Vitest | 268 passed, 0 failed |
| `python3 scripts/test_local_tools.py` | 6 passed; secret generation/matching, mode 0600, overwrite refusal, rerun preservation, smoke permission and remote-host guards |
| Main-agent UI mutation checks | 22/22 deliberately broken variants caught: queue 4, walk-in 4, records/overview 3, menu 3, settings 4, accounts/reports 4 |
| Real HTTP smoke, final packaged jar | PASS against a second fresh isolated database on localhost:8093 |
| `git diff --check` | PASS |

The mutation counts describe this review run, not a comprehensive mutation-coverage percentage. Variants were restored after each check. Worktree test counts include common tests and are not added together.

## Real HTTP acceptance

`scripts/smoke.py` used a disposable, freshly seeded database. No fake HTTP responses were substituted.

1. Seed: 4 categories, 18 products, 17 publicly active products; staff/admin sign-in succeeded.
2. Walk-in: 2 large iced lattes with oat milk, less ice and no sugar; server total **$9.20**, cash recorded, pickup code issued.
3. Queue: order read back and advanced to preparing, ready, completed. Completed/source/search filters returned the correct order.
4. Customer: signed up through `/api/app`, placed an order, started simulated KHQR, polled it paid and received a pickup code.
5. Staff rejected the paid online order with a reason and read back `refund_pending`; the customer then read back `refunded` in history after the staff refund action.
6. Pausing online ordering was visible through the public store endpoint and blocked customer ordering. Resuming restored it.
7. Sales: one non-cancelled order, revenue **$9.20**. Export was a valid XLSX containing **4 worksheets**.
8. Staff was forbidden sales reports; the customer was forbidden staff management. Deactivation blocked the customer's existing JWT and reactivation restored access.

## Browser acceptance against the real packaged service

Admin route checks: overview, queue, walk-in, records, drinks, categories, options, store settings, staff, customers and reports. All **11** reached the expected heading without a visible API error or full-page horizontal overflow.

Staff checks: admin-only reports/staff/categories URLs redirected to overview; store information was disabled/read-only, with no admin save buttons. These **4** cases are separate from the 11 admin routes.

Actual browser interactions included:

- Customized two lattes, entered $10 cash, saw **$0.80 change**, placed order **A003** at **$9.20**, and advanced it through all queue stages.
- Opened A003 from records; read back Completed, cash payment, people, drink-option snapshots and transition timestamps.
- Saved a drink price, restored it, saved a per-drink Large override, read the customization API back at **$1.25**, and verified the existing order remained **$9.20**. Restored the override afterward.
- Created a category, an option group and a negative-price option.
- Paused/resumed online ordering; saved each store-information, pickup-rule and weekly-hours form. Opening-hour inputs retained the expected local times.
- Deactivated/reactivated both a staff account and a customer using confirmation dialogs; list status updated after each write.
- Selected Today in reports, clicked the export control and downloaded `MOS-sales-2026-10-30-to-2026-10-30.xlsx`. The downloaded file contained 4 worksheets.
- At **390 × 844**, queue, walk-in, drinks, store and reports had no document-level horizontal overflow (**5** routes). Wide tables can scroll within their own containers.

Browser route ledgers, selected screenshots and the downloaded workbook were saved under the local ignored `target/browser-evidence/` directory. The browser checks above were executed interactively through browser automation; they are not a committed Playwright suite. The repeatable real HTTP test is `scripts/smoke.py`.

## Cross-end with the Flutter app (2026-10-30)

Flutter `feature/api-integration` against this backend (`feature/flutter-integration`, a seeded throwaway database):

- `flutter test test/live --tags live` (app repositories against the real server): sign-up, TC-14 order at **$9.20**, simulated KHQR paid, order in the shared queue, staff Confirm + Start preparing through the dashboard API, the app reads **Preparing**, cancel refused after confirmation (TC-26), staff pause makes the app's order fail with `orderingPaused` (TC-20). PASS.
- Flutter **web** build in a browser (origin `127.0.0.1:8094`, API `127.0.0.1:8092`, so CORS was exercised): the menu showed a price changed only in the database ($3.10, not the mock's $2.50); sign-in; Americano customization used the backend's per-drink sizes (−$0.25 / +$0.25) and defaults, cart **$3.35**; checkout showed the backend's opening hours; KHQR paid, pickup code **A005**. In the dashboard queue A005 appeared as an online order for that customer; Confirm and Start preparing were clicked there; the app's Orders tab then showed **#A005 · Preparing · $3.35**.
- Backend: 87 tests (CORS 3: localhost origin allowed, other sites refused, dashboard API without CORS; seed top-up 1). Flutter: 357 tests (24 on recorded backend responses); mutants caught 2/2 backend, 4/4 Flutter.

## Explicitly not verified or not implemented

- The Flutter app on an Android emulator or a real phone (verified only as a web build; Android cleartext and emulator address are configured but not run here).
- Live KHQR/card settlement, actual money refunds, SMS/email/push delivery.
- Production deployment, penetration testing, hardening or public-service readiness.
- Hard enforcement of SA BR-07's 30-minute minimum: current default is 30, settings permit lower values with a warning; this remains a documented decision for Arthur.

Passwords/tokens are runtime-only and omitted from this record. Test writes were restricted to the isolated verification databases, not the existing `mos` development database.
