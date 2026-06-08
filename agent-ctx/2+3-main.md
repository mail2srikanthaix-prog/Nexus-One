# Task 2+3: TOTP MFA Verification & API Key Authentication

**Agent:** main
**Date:** 2026-03-05
**Status:** ✅ Complete

## Summary

Implemented two complete authentication features for NEXUS ONE:

1. **TOTP MFA Verification** — Full TOTP-based multi-factor authentication using the `otpauth` library
2. **API Key Authentication** — Bearer token-based API key system with creation, listing, revocation, and middleware integration

## Files Created/Modified

### Modified
- `src/app/api/auth/[...nextauth]/route.ts` — Replaced MFA stub with real TOTP verification
- `src/middleware.ts` — Added API key auth path alongside JWT session auth
- `worklog.md` — Appended work record

### Created
- `src/lib/api-key-auth.ts` — API key auth helper (generateApiKey, hashApiKey, authenticateApiKey)
- `src/app/api/auth/mfa/setup/route.ts` — MFA setup (generate TOTP secret)
- `src/app/api/auth/mfa/enable/route.ts` — MFA enable (verify code, enable MFA)
- `src/app/api/auth/mfa/disable/route.ts` — MFA disable (verify code, disable MFA, clear secret)
- `src/app/api/auth/api-key/route.ts` — API key creation
- `src/app/api/auth/api-key/list/route.ts` — API key listing
- `src/app/api/auth/api-key/revoke/route.ts` — API key revocation
- `src/app/api/auth/api-key/verify/route.ts` — API key verification (for middleware use)

## Key Decisions

1. **TOTP library**: Used `otpauth` (RFC 6238 compliant) with `window: 1` for clock skew tolerance
2. **Middleware API key auth**: Since Edge Runtime can't use Prisma, middleware calls `/api/auth/api-key/verify` (public route under `/api/auth/`) to validate keys
3. **API key role**: API key auth defaults to `viewer` role (least-privilege); individual routes can escalate based on key permissions
4. **Key format**: `nx_live_{64hex}` — prefix enables middleware detection without hashing
5. **Audit**: All MFA and API key operations are audit-logged with appropriate severity levels

## Verification
- ✅ `bun run lint` — No errors
- ✅ Dev server stable
