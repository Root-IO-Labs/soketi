/**
 * Vendored, minimal replacement for the parts of the "pusher" npm package
 * (Token class, toOrderedArray, getMD5) that soketi actually uses for its
 * REST API / channel-auth signing.
 *
 * WHY THIS EXISTS: the full "pusher" package's entry point (lib/pusher.js)
 * requires ./events at module load, and events.js requires "tweetnacl" —
 * a pure-JS crypto library with its own from-scratch curve25519/ed25519
 * implementation, used by pusher's (unused-by-soketi) encrypted-channel
 * trigger() helpers. Because soketi did `const Pusher = require('pusher')`
 * unconditionally in src/app.ts, src/ws-handler.ts, and
 * src/channels/private-channel-manager.ts just to reach `Pusher.Token`,
 * tweetnacl loaded and executed inside the soketi-fips process at every
 * startup, unconditionally — running entirely outside the wolfSSL
 * FIPS-validated module. Same failure mode as the NATS/nkeys.js/tweetnacl
 * case (see the removed nats-adapter.ts).
 *
 * Everything soketi actually needs — HMAC-SHA256 signing (Token),
 * parameter ordering, and an MD5 checksum for the Pusher REST wire
 * protocol's body_md5 field — only ever touches Node's native `crypto`
 * module (already routed through this image's FIPS provider) or the
 * pure-JS MD5 fallback in pure-js-md5.ts (used only when native MD5 is
 * blocked by the FIPS provider; MD5 here is a wire-protocol checksum,
 * not a security control — see pure-js-md5.ts for the full reasoning).
 * None of it needs tweetnacl or the rest of the "pusher" package.
 */
import { createHash, createHmac } from 'crypto';
import { pureJsMD5 } from './pure-js-md5';

/**
 * Signs and verifies strings against a Pusher app key/secret, matching
 * the "pusher" npm package's Token class exactly (same HMAC-SHA256
 * construction, same constant-time comparison for verify()).
 */
export class PusherToken {
    constructor(public key: string, public secret: string) {
        //
    }

    sign(input: string): string {
        return createHmac('sha256', this.secret)
            .update(Buffer.from(input))
            .digest('hex');
    }

    verify(input: string, signature: string): boolean {
        return secureCompare(this.sign(input), signature);
    }
}

/**
 * Constant-time string comparison, matching "pusher"'s lib/util.js
 * secureCompare exactly.
 */
export function secureCompare(a: string, b: string): boolean {
    if (a.length !== b.length) {
        return false;
    }

    let result = 0;

    for (let i = 0; i < a.length; i++) {
        result |= a.charCodeAt(i) ^ b.charCodeAt(i);
    }

    return result === 0;
}

/**
 * Orders an object's keys alphabetically and returns "key=value" pairs,
 * matching "pusher"'s lib/util.js toOrderedArray exactly. Used to build
 * the canonical parameter string that gets HMAC-signed for REST API auth.
 */
export function toOrderedArray(params: Record<string, unknown>): string[] {
    return Object.keys(params)
        .map((key): [string, unknown] => [key, params[key]])
        .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
        .map(([key, value]) => `${key}=${value}`);
}

/**
 * MD5 checksum for the Pusher REST API's body_md5 wire-protocol field,
 * matching "pusher"'s lib/util.js getMD5 exactly (native path). Falls
 * back to the pure-JS implementation only when the FIPS provider blocks
 * native MD5 — see pure-js-md5.ts for why that fallback is safe here.
 */
export function getMD5(body: string): string {
    try {
        return createHash('md5').update(body, 'utf8').digest('hex');
    } catch (e) {
        return pureJsMD5(body);
    }
}
