-- Fixture for e2e tests (NOT a production migration -- never run this
-- against --remote). Seeds a single shared license for the fixed test key
-- "GDS-TEST-0001" used across apps/web/e2e/*.spec.js (onboarding, pilot,
-- exercises) now that AccessGate talks to /api/license/activate instead of
-- the retired ACCESS_KEY_HASHES/verify-key.js fallback.
--
-- Idempotent (ON CONFLICT DO NOTHING) so it is safe to run before every
-- local/CI e2e run against the persisted local D1 state. Tier "school" /
-- max_devices 4 gives headroom against any device-fingerprint variance
-- across parallel Playwright workers or repeated local runs -- these specs
-- test "a valid key lets you in", not the device-limit ceiling itself
-- (that is covered by functions/__tests__/license-api.test.js).
INSERT INTO licenses (key_hash, tier, max_devices, client_name, status)
VALUES ('f422821e3d707a6557c0b112a856927c754b5ca0842cb44503e6e028aa539a16', 'school', 4, 'e2e-test', 'active')
ON CONFLICT (key_hash) DO NOTHING;
