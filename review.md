# Code Review

## Critical / Functionality Bugs

### 1. Incomplete stream buffer handling — `app/import/page.tsx`
The last line of the stream is silently dropped if the server doesn't send a trailing newline:
```typescript
buffer = lines.pop() ?? "";
// buffer is never processed after the loop ends
```
After `streamDone`, any remaining content in `buffer` should be parsed.

### 2. Fragile date parsing — `lib/telegram-parser.ts`
```typescript
const [datePart, timePart] = iso.split("T");
const [y, m, d] = datePart.split("-");
const hhmm = timePart.slice(0, 5);
```
If `iso` doesn't match `YYYY-MM-DDTHH:MM:SS`, destructuring produces `undefined` and the function returns garbage or throws. Replace with `new Date(iso).toLocaleString(...)`.

### 3. Thread reply chain breaks on send failure — `app/api/import/route.ts`
If a message fails to send, its ID is never stored in `idMap`. All subsequent replies to that message are sent flat (without `thread_id`), silently degrading thread structure with no warning in the log.

### 4. First `RateLimiter.wait()` call always delays — `lib/rate-limiter.ts`
`lastCall` is initialized to `0`, so the first call always waits the full `intervalMs`. Should be initialized to `Date.now()` or special-cased.

### 5. Progress bar division by zero — `app/import/page.tsx`
```typescript
const pct = progress ? Math.round((progress.current / progress.total) * 100) : 0;
```
If `progress.total === 0`, this produces `NaN`. Guard: `progress.total > 0 ? ... : 0`.

---

## Security

### 6. No file size limit on ZIP upload — `app/api/import/route.ts`
```typescript
const zipBuffer = await file.arrayBuffer();
```
The entire file is loaded into memory without any size check. A large upload will exhaust server memory. Add a size guard before reading the buffer (e.g. 200 MB).

### 7. Chat ID not validated — `app/api/import/route.ts`
After URL-decoding, `chatId` is passed directly to all API calls without format validation. An invalid value will cause every single request to fail with repeated errors. Validate against the expected `0/0/<uuid>` pattern before starting the loop.

### 8. No request timeout on Messenger API calls — `lib/messenger-client.ts`
`fetch` calls have no timeout. A hung upstream response holds the streaming connection open indefinitely. Use `AbortController` with a timeout (e.g. 30 s).

---

## Code Quality

### 9. Silent error swallow in stream parsing — `app/import/page.tsx`
```typescript
} catch {
  // skip malformed lines
}
```
Malformed server lines are silently discarded. At minimum add `console.warn` to aid debugging without breaking the UI.


## Low Priority / Nice-to-Have

- **Accessibility:** Help modal has no Escape key handler, no `role="dialog"`, and no focus trap (WCAG violation).
- **Magic numbers:** `50` (initial RPS), `20` (fallback RPS), `300` (max route duration) are inline. Move to named constants or environment variables.
