# MOS API integration reference

The Spring Boot service hosts the dashboard and both API prefixes on the same origin. All requests/responses are JSON unless stated otherwise. DTO records in `src/main/java/mos/management/dashboard/dto/` are the authoritative field definitions; matching dashboard types are in `frontend/src/lib/types.ts`.

## Conventions and authentication

- Sign-in body: `{ "identifier": "email-or-phone", "password": "supplied-at-runtime" }`. The response is `{ "token": "...", "user": { ... } }`. Never log or commit a returned token.
- Send `Authorization: Bearer <token>` for authenticated requests. Customer tokens belong to `/api/app`; staff/admin tokens belong to `/api/admin`.
- Role/status enums use lowercase JSON: `customer`, `staff`, `admin`; `active`, `inactive`. Order sources are `online`, `walk_in`; pickup types are `asap`, `scheduled`.
- Instants are ISO-8601 UTC, such as `2026-10-30T03:00:00Z`. Date filters use store-local `YYYY-MM-DD`; opening times are local `HH:mm`.
- Money is USD decimal. The server recalculates order prices from current products and allowed options; clients must not submit authoritative totals.
- Creation returns 201; ordinary reads/updates return 200; password/reset completion returns 204. Validation errors generally return 400, missing objects 404, state/business conflicts 409, unauthenticated requests 401 and forbidden roles 403.
- Errors have `code`, `message` and optional `fields` (see `exception/ApiExceptionHandler`). Display the server message and retain the form/order; do not silently treat a failed query as an empty list.
- Paginated dashboard results use `{ "items": [...], "page": 0, "size": 20, "total": 42 }`. Menu lists and customer order history are unpaginated.

## Customer endpoints (`/api/app`)

Public access:

| Method | Path | Request / behaviour |
|---|---|---|
| POST | `/auth/sign-in` | Customer sign-in |
| POST | `/auth/sign-up` | `firstName`, `lastName`, `email`, `phone`, `password`, optional `dateOfBirth`; returns a session |
| POST | `/auth/reset/verify` | `{phone}`; demo-only reset ticket, **no OTP verification** |
| POST | `/auth/reset` | `{ticket, newPassword}`; 204 |
| GET | `/menu` | `{categories, products}`; inactive entries are omitted, sold-out products remain distinguishable |
| GET | `/menu/popular` | Popular drinks; optional `limit` |
| GET | `/menu/products/{id}/customization` | Product, available option groups/defaults/effective prices and `lowestPrice` |
| POST | `/menu/unavailable` | `{productIds: [...]}`; returns `{productIds: [...]}` for IDs no longer available |
| GET | `/store` | Store settings, weekly opening hours, open/closed ordering status and store timezone |

Authenticated customer access:

| Method | Path | Request / behaviour |
|---|---|---|
| GET / PUT | `/me` | Read/update profile: `firstName`, `lastName`, `email`, `phone`, `dateOfBirth` |
| POST | `/me/password` | `{currentPassword, newPassword}`; 204 |
| POST | `/orders` | `OrderRequest` below; creates `pending_payment` |
| GET | `/orders` | Own order history |
| GET | `/orders/{id}` | Own order detail/tracking; poll while active |
| POST | `/orders/{id}/cancel` | Cancel if permitted by state; paid cancellations become `refund_pending` |
| POST | `/orders/{id}/payments/khqr` | Start simulated KHQR; returns `paymentId`, `orderId`, `qrData`, `amount`, `merchantName`, `expiresAt` |
| POST | `/orders/{id}/payments/card` | `{cardId}`; simulated payment |
| GET | `/payments/{id}` | Check payment; polling also refreshes simulated KHQR status |
| POST | `/payments/{id}/cancel` | Cancel a pending payment |
| GET | `/cards` | Own masked saved cards |
| POST | `/cards` | Demo tokenization: `number`, `holderName`, `expiryMonth`, `expiryYear`, `cvv`; **test data only** |

Order request shape (IDs shown are illustrative; use IDs returned by the live catalogue):

```json
{
  "lines": [
    { "productId": 101, "optionIds": [201, 202, 203], "quantity": 2 }
  ],
  "pickupType": "scheduled",
  "pickupTime": "2026-10-30T05:00:00Z",
  "note": "Please label the cups."
}
```

Use `pickupType: "asap"` and omit `pickupTime` for ASAP. Each quantity is 1–20. Required groups, SINGLE/MULTIPLE limits, inactive/sold-out products, conditional ice choices, minimum preparation time, opening hours and paused online ordering are revalidated by the service. Supply the selected option IDs, including required defaults; the server does not trust a previously cached client total.

An `OrderView` includes IDs, pickup code, source/status, pickup time, all transition timestamps, total, note/reject reason, people, immutable item-name/price/option-label snapshots and payments. Statuses are:

```text
pending_payment -> placed -> confirmed -> preparing -> ready -> completed
       |             |         |
   abandoned      rejected / cancelled (as allowed by the current state)
```

Payment statuses are `pending`, `paid`, `failed`, `refund_pending`, `refunded`. Cancelled/expired payment attempts are represented as failed, with a failure reason. The gateway is simulated: do not treat these statuses as bank settlement evidence.

## Dashboard endpoints (`/api/admin`)

`POST /auth/sign-in` is public and accepts staff/admin only. `GET /me` and `POST /me/password` are authenticated; password-change body matches the customer endpoint.

### Orders and daily operations (Staff + Admin)

| Method | Path | Request / behaviour |
|---|---|---|
| GET | `/overview` | Daily cards; revenue is omitted for Staff |
| GET | `/orders/queue` | `{orders, onlineOrderingOpen, ...}`; each entry contains an `order` and queue metadata, already ordered by due time |
| GET | `/orders` | Filters: `from`, `to`, `status`, `source`, `q`, zero-based `page`, `size` |
| GET | `/orders/{id}` | Full order detail |
| POST | `/orders/{id}/advance` | Advance exactly one valid state; no client-supplied target status |
| POST | `/orders/{id}/reject` | `{reason}` required; paid orders become refund-pending |
| POST | `/payments/{id}/refunded` | Staff confirms a refund performed outside the system; returns updated order |
| POST | `/orders/walk-in` | `{lines, note, cashReceived}`; cash may be omitted, otherwise must cover the recalculated total; creates `confirmed` |
| GET | `/categories` | Category list |
| GET | `/products` | Includes inactive products |
| GET | `/products/{id}` | Product detail |
| GET | `/products/{id}/customization` | Effective choices for walk-in ordering |
| PATCH | `/products/{id}/availability` | `{isAvailable: false}` to mark sold out; true to restore |
| GET | `/store` | Settings/opening hours |
| PUT | `/store/online-ordering` | `{open: false}` to pause; true to resume |

Keep the server's queue order. Dashboard polling interval is 3 seconds; use stable order IDs to detect newly placed orders. A failed poll must be shown as a failure, not "No orders". Pausing only blocks new **online** orders, not walk-in orders.

### Menu editing (Admin only)

| Method | Path | Body / behaviour |
|---|---|---|
| POST | `/categories` | `{name, sortOrder, active}` |
| PUT | `/categories/{id}` | Same category fields |
| POST | `/products` | `{categoryId, name, description, imageUrl, basePrice, isActive}` |
| PUT | `/products/{id}` | Same product fields |
| PATCH | `/products/{id}/active` | `{isActive}`; separate from sold-out state |
| POST | `/products/{id}/image` | `multipart/form-data`, field `file`; JPEG/PNG/WebP, max 5 MB; returns updated product |
| GET | `/products/{id}/options` | All group/option settings, including offered flags and price overrides |
| PUT | `/products/{id}/options` | Full replacement of product-offered groups/options (example below) |
| GET / POST | `/option-groups` | Read groups; create with fields below |
| PUT | `/option-groups/{id}` | Update group |
| POST | `/option-groups/{id}/options` | Create option |
| PUT | `/options/{id}` | Update option |

Group fields: `name`, `selectionType` (`single` / `multiple`), `isRequired`, `maxSelect` (1–20), `sortOrder`, `needsIcedDrink`, `summaryNoun`. Option fields: `name`, `extraPrice` (negative permitted), `sortOrder`, `isIced`, `isActive`.

Product-option replacement example (IDs illustrative):

```json
{
  "groups": [
    {
      "groupId": 301,
      "isActive": true,
      "defaultOptionId": 201,
      "options": [
        { "optionId": 201, "priceOverride": null },
        { "optionId": 202, "priceOverride": 0.75 }
      ]
    }
  ]
}
```

A null override inherits the option's global price; zero is a real free override. Groups/options left out are no longer offered by that drink. A selected default must be one of its offered options. Use `summaryNoun` to distinguish `Regular ice` from `Regular sugar`; keep the short option labels unchanged. Customization/pricing is shared by customer and walk-in orders, and changes do not rewrite past order snapshots.

### Store administration (Admin only)

- `PUT /store/settings`: complete `SettingsRequest`: `storeName`, `address`, `phone`, `slotIntervalMin`, `minPrepMin`, `pickupTimeoutMin`, `asapPrepMin`. The UI merges each card's changes with the other current settings; online ordering uses its separate endpoint.
- `PUT /store/hours`: `{days: [...]}` containing all seven weekday entries: `dayOfWeek` (0 = Sunday), `openTime`, `closeTime`, `isClosed`. All times are store-local; the response calls this array `hours`.
- Staff may read settings and use the separate ordering switch, but cannot write either endpoint above.

### Accounts (Admin only)

| Method | Path | Request / behaviour |
|---|---|---|
| GET | `/staff` | Search/page staff/admin accounts |
| POST | `/staff` | `firstName`, `lastName`, `email`, `phone`, `role`, initial `password` |
| PUT | `/staff/{id}` | Update staff details/role; password may be omitted |
| PATCH | `/staff/{id}/status` | `{status: "active"}` or `inactive` |
| POST | `/staff/{id}/password` | `{newPassword}` |
| GET | `/customers` | Search/page customers |
| PATCH | `/customers/{id}/status` | `{status}` |

Search parameters are `q`, `page`, `size`. Admins cannot deactivate themselves or demote their own admin role. Deactivation blocks existing sessions on their next request.

### Reports (Admin only)

| Method | Path | Query / response |
|---|---|---|
| GET | `/reports/sales` | `from`, `to`; totals, daily figures and source split |
| GET | `/reports/best-sellers` | `from`, `to`, `limit` |
| GET | `/reports/export` | `from`, `to`; binary XLSX with 4 worksheets and a date-range filename |

Dates are inclusive store-local dates. Revenue includes orders placed in the period and excludes cancelled/rejected/pending-payment/abandoned orders; it is not a completed-only or settled-payment accounting ledger. The export endpoint returns an attachment, not JSON.

## Flutter integration still required

Implement the existing repository interfaces against these routes, convert DTO IDs/enums/money/times, store the JWT securely, handle 401/403 and poll active orders/payments. Replace mock IDs with catalogue IDs and use per-product effective options/defaults from the API. A native device/emulator must reach the host's actual network address rather than its own `localhost`. Cross-origin Flutter Web hosting needs an explicit CORS policy; none has been enabled here.

API tests and the real HTTP smoke prove the server-side contract, not a completed Flutter integration. See README for payment/recovery security limitations and unresolved SA decisions.
