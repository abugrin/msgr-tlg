# Security & Code Audit

_Date: 2026-03-18_

---

## Critical

### 1. Path traversal in ZIP processing
- **File:** `lib/telegram-parser.ts:84`
- `basePath + rawPath` is concatenated without validating for `..` sequences. An attacker could craft paths like `../../etc/passwd`.
- **Fix:** Reject paths containing `..` or absolute paths before concatenation.

### 2. Missing input validation for `token` and `chatId`
- **File:** `app/api/import/route.ts:25-39`
- Both are cast directly from FormData with no format/length validation before use in API calls.
- **Fix:** Validate token format and chatId pattern; enforce length limits.

---

## High

### 3. Division by zero in RateLimiter
- **File:** `lib/rate-limiter.ts:9-10`
- `1000 / maxRps` — no guard against `maxRps <= 0`.

### 4. No file size limit on ZIP upload
- **File:** `app/api/import/route.ts:54`
- `file.arrayBuffer()` loads the entire file into memory. A large upload causes OOM / DoS.
- **Fix:** Check `file.size` first, return 413 if over limit.

### 5. ZIP bomb — no decompressed size cap
- **File:** `lib/telegram-parser.ts:134`
- JSZip decompresses without size checks. A crafted archive can exhaust memory.

### 6. Silently swallowed stream parse errors
- **File:** `app/import/page.tsx:85-98`
- `catch { // skip malformed lines }` hides real errors, making bugs invisible.

---

## Medium

### 7. Next.js version has known CVEs
- **File:** `package.json`
- Check current version with `npm audit` — update if vulnerabilities are reported.

### 8. MIME type detection is extension-only
- **File:** `lib/telegram-parser.ts:100-101`
- Uses file extension to determine image MIME type; easily spoofed.

### 9. No server-side ZIP file type validation
- **File:** `app/api/import/route.ts`
- Frontend `accept=".zip"` is trivially bypassed; backend should verify magic bytes (`PK\x03\x04`).

### 10. Raw API error text exposed to client
- **File:** `lib/messenger-client.ts:30`
- `HTTP ${res.status}: ${text.slice(0, 200)}` leaks internal API responses.

### 11. No schema validation on Telegram export JSON
- **File:** `lib/telegram-parser.ts:149`
- `JSON.parse()` result is cast directly to `TelegramExport` with no structural checks.

### 12. Extraneous npm packages
- 5 unlisted packages installed (`@emnapi/*`, `@napi-rs/*`, `@tybys/*`). Run `npm prune`.

---

## Low

- No CSP headers configured
- No per-IP rate limiting on the API route
- No `AbortSignal.timeout()` on individual fetch calls to Messenger API
- No CORS headers explicitly set

---

## Recommended Priority Order

1. Path traversal fix (critical, easy)
2. Input validation for token/chatId (critical, easy)
3. File size + ZIP bomb protection (high, straightforward)
4. `npm audit` and update deps
5. RateLimiter guard
