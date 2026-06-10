# Task 1: Add MFA/TOTP Input to Login Page

## Summary
Implemented a two-step MFA/TOTP login flow with conditional detection of when MFA is required.

## Files Changed

### 1. `src/app/api/auth/mfa/check/route.ts` (NEW)
- New API endpoint: `POST /api/auth/mfa/check`
- Accepts `{ email, password }` and validates credentials
- Returns `{ mfaRequired: boolean, email: string }` without creating a session
- Rate-limited to 5 requests/minute/IP to prevent brute force
- Reuses existing security utilities (checkAccountLockout, recordFailedAttempt, logAuthEvent)
- Returns generic "Invalid email or password" for both wrong credentials and locked accounts (no info leakage)

### 2. `src/components/nexus/login-page.tsx` (MODIFIED)
- Added `step` state: `'credentials' | 'mfa'` for two-step flow
- Added `totpCode` state for 6-digit TOTP input
- Added `mfaChecking` state for loading indicator during MFA check
- **Step 1 (Credentials)**: Email + Password form, calls `/api/auth/mfa/check` first
  - If MFA required → transitions to Step 2
  - If MFA not required → proceeds with normal `signIn()`
- **Step 2 (MFA/TOTP)**: 6-digit code input with visual digit boxes
  - Individual digit box display with active cursor animation
  - Hidden input with `inputMode="numeric"` and `autoComplete="one-time-code"` for mobile
  - Paste support (strips non-digits)
  - Auto-submit when 6 digits are entered
  - Back button to return to credentials step
  - "Re-enter code" button to clear and refocus
  - "Signing in as {email}" hint
  - Backup code info box
  - Amber/orange gradient icon (Key) to visually distinguish from login step
- Framer Motion AnimatePresence for smooth step transitions (slide left/right)
- Uses `Key`, `RotateCcw` icons from lucide-react
- Maintains dark theme styling (`bg-[#050508]`, `bg-[#0a0a0f]`, emerald/amber accents)

### 3. `src/app/api/auth/[...nextauth]/route.ts` (MODIFIED)
- Reorganized MFA verification section:
  - When MFA enabled but no TOTP code: now logs `mfa.challenge` (not `mfa.failed`) since this is expected in the two-step flow
  - Added comment explaining client should use MFA check endpoint first
  - TOTP challenge log moved after the missing-code check (only logged when code is provided)
- Fixed `mfaVerified` JWT claim: now correctly set to `true` on sign-in (previously was `false` for MFA-enabled users even after successful TOTP verification — a bug)
- Removed unused `AuditSeverity` import

## Flow Diagram

```
User clicks "Sign In"
       │
       ▼
POST /api/auth/mfa/check { email, password }
       │
       ├── Invalid credentials → Show error
       │
       ├── Valid + MFA required → Show TOTP input (Step 2)
       │                            │
       │                            ▼
       │                     User enters 6-digit code
       │                            │
       │                            ▼
       │                     signIn('credentials', { email, password, totpCode })
       │                            │
       │                            ├── Success → checkAuth() → Enter app
       │                            └── Failed → Show "Invalid verification code"
       │
       └── Valid + No MFA → signIn('credentials', { email, password })
                               │
                               ├── Success → checkAuth() → Enter app
                               └── Failed → Show error
```

## Design Decisions

1. **Separate MFA check endpoint** vs. modifying NextAuth error handling:
   - NextAuth v4's `authorize()` can only return `null` (failure) or a user object (success)
   - No clean way to pass "MFA required" through standard NextAuth flow
   - Separate endpoint provides clean separation of concerns

2. **Password sent twice** (once to check, once to signIn):
   - Trade-off for clean two-step flow
   - Rate-limited on the check endpoint to prevent abuse
   - Alternative (temporary token) would add complexity

3. **6 individual digit boxes** for visual TOTP input:
   - Uses a hidden `sr-only` input for accessibility and actual value entry
   - Visual boxes are purely decorative with cursor animation
   - Supports paste (from authenticator apps)
   - Auto-submits when all 6 digits entered

4. **mfaVerified bug fix**: The JWT callback previously set `mfaVerified = false` for MFA-enabled users even after successful TOTP verification. Since the `authorize()` function only returns a user when ALL checks pass (including TOTP), reaching the JWT callback means MFA was verified. Fixed to always set `true`.
