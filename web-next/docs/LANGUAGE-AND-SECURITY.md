# Languages, identity URLs and security

## Languages

The interface supports Indonesian and English using an in-app dictionary, not an external translation service. Server rendering negotiates `Accept-Language`; an explicit `rdpfree_locale` cookie wins. ID/EN/Auto switches update immediately and store the preference for one year. Unsupported browser languages fall back to English. The cookie is not an authentication cookie and contains no secrets. Technical provider messages, raw logs, repository content and unrecognized dynamic messages retain their source text. Metadata descriptions are currently Indonesian.

## Dashboard URLs and avatar

Signed-in GitHub users are redirected from `/dashboard` to `/dashboard/@login`; supported child routes retain this prefix. Middleware checks the signed session before rewriting to existing page handlers. Changing the handle to a different account returns 404. Admin routes and browser login remain unchanged. All API endpoints continue to authorize from the session or repo-bound device token and database mapping, never from the display username.

GitHub avatars accept only HTTPS URLs on `avatars.githubusercontent.com`; failed/missing images fall back to initials. Mobile headers and navigation menus both include the identity. Existing login duration remains 30 days; no forced reauthentication was introduced.

## Additional hardening

- HSTS, cross-origin resource/opener policies and CSP HTTPS upgrades supplement existing clickjacking, content-type, referrer and permissions protections.
- Personalized dashboard responses are private/no-store and noindex.
- Settings validation uses own-property checks. JSON prototype-like keys and overly deep objects are rejected.
- Error redaction covers GitHub, RdpFree device and Tailscale tokens.
- Settings writes: 30 per minute per subject. App authorization starts: 10 per 10 minutes. Repository changes: 20 per minute. Existing admin, secret, dispatch, device-token and deletion rate limits remain.
- Identity-only GitHub OAuth, selected-repo App grants, browser-only destructive operations and hidden admin email/password + Turnstile remain in place.

Tests cover locale negotiation, persisted preference, own-account URL routing, cross-account rejection, signed-out redirects, avatar rendering, prototype-like input rejection, token redaction, mobile menu behavior and existing repository authorization/deletion safeguards. Browser sessions for identity checks are synthetic signed fixtures; these tests are not a new real GitHub OAuth/App-install acceptance test or penetration test.

## XyVerse brand

The original white horizontal transparent logo was extracted from the owner-provided ZIP. Its pixels are unchanged. Source and brand usage notes are in `public/brands/SOURCES.txt` and `XYVERSE-README.txt`.
