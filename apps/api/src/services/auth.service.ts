import { createHmac, randomUUID, timingSafeEqual } from 'node:crypto';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { AuthUser } from '@bizora/shared';
import { capabilities, env } from '../config/env.js';
import { errors } from '../core/errors.js';
import { createLogger } from '../core/logger.js';
import type { DataStore } from '../data/store.js';

const log = createLogger('auth');

interface GuestClaims {
  uid: string;
  email: string;
  name: string;
  exp: number;
}

const GUEST_TOKEN_TTL_MS = 1000 * 60 * 60 * 24 * 30;

const b64url = (input: string | Buffer): string => Buffer.from(input).toString('base64url');
const unb64url = (input: string): string => Buffer.from(input, 'base64url').toString('utf8');

function sign(payload: string): string {
  return createHmac('sha256', env.GUEST_TOKEN_SECRET).update(payload).digest('base64url');
}

/**
 * Authentication.
 *
 * Two modes, chosen once at boot from configuration:
 *
 *  • guest — a signed, self-contained identity so the demo never stops at a
 *    login wall. The token is HMAC-signed and stateless; no secret is stored.
 *  • supabase — real email/password sessions, verified against Supabase Auth on
 *    every request.
 *
 * Services only ever receive a resolved `AuthUser`, so nothing downstream needs
 * to know which mode is active.
 */
export class AuthService {
  private supabase: SupabaseClient | null = null;

  constructor(private readonly store: DataStore) {
    if (capabilities.authMode === 'supabase' && env.SUPABASE_URL) {
      this.supabase = createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY ?? '', {
        auth: { persistSession: false, autoRefreshToken: false },
      });
    }
    log.info('auth service ready', { mode: capabilities.authMode });
  }

  get mode(): 'supabase' | 'guest' {
    return capabilities.authMode;
  }

  /* ── guest mode ────────────────────────────────────────────────────────── */

  async bootstrapGuest(displayName?: string): Promise<{ user: AuthUser; accessToken: string }> {
    const uid = `guest_${randomUUID()}`;
    const name = displayName?.trim() || 'Demo Founder';
    const email = `${uid.slice(6, 18)}@guest.bizora.app`;

    const user: AuthUser = { id: uid, email, displayName: name, mode: 'guest' };
    await this.store.upsertUser(user);

    const claims: GuestClaims = {
      uid,
      email,
      name,
      exp: Date.now() + GUEST_TOKEN_TTL_MS,
    };
    const payload = b64url(JSON.stringify(claims));

    log.info('guest session created', { uid });
    return { user, accessToken: `${payload}.${sign(payload)}` };
  }

  private verifyGuestToken(token: string): AuthUser | null {
    const [payload, signature] = token.split('.');
    if (!payload || !signature) return null;

    const expected = sign(payload);
    const a = Buffer.from(signature);
    const b = Buffer.from(expected);
    if (a.length !== b.length || !timingSafeEqual(a, b)) return null;

    try {
      const claims = JSON.parse(unb64url(payload)) as GuestClaims;
      if (typeof claims.exp !== 'number' || claims.exp < Date.now()) return null;
      return { id: claims.uid, email: claims.email, displayName: claims.name, mode: 'guest' };
    } catch {
      return null;
    }
  }

  /* ── supabase mode ─────────────────────────────────────────────────────── */

  async signUp(email: string, password: string, displayName: string): Promise<{ user: AuthUser; accessToken: string }> {
    const client = this.requireSupabase();
    const { data, error } = await client.auth.signUp({
      email,
      password,
      options: { data: { display_name: displayName } },
    });

    if (error) {
      if (/already|registered|exists/i.test(error.message)) throw errors.emailInUse();
      log.warn('supabase sign-up failed', { reason: error.message });
      throw errors.invalidCredentials();
    }
    if (!data.user || !data.session) throw errors.invalidCredentials();

    const user = await this.persistSupabaseUser(data.user.id, data.user.email ?? email, displayName);
    return { user, accessToken: data.session.access_token };
  }

  async signIn(email: string, password: string): Promise<{ user: AuthUser; accessToken: string }> {
    const client = this.requireSupabase();
    const { data, error } = await client.auth.signInWithPassword({ email, password });

    if (error || !data.user || !data.session) {
      log.warn('supabase sign-in failed', { reason: error?.message ?? 'no session' });
      throw errors.invalidCredentials();
    }

    const displayName = (data.user.user_metadata?.display_name as string | undefined) ?? email.split('@')[0] ?? 'Founder';
    const user = await this.persistSupabaseUser(data.user.id, data.user.email ?? email, displayName);
    return { user, accessToken: data.session.access_token };
  }

  /** Verifies a real Supabase JWT and returns the matching application user. */
  async verifySupabaseToken(token: string): Promise<AuthUser | null> {
    const client = this.requireSupabase();
    const { data, error } = await client.auth.getUser(token);
    if (error || !data.user) return null;

    const displayName =
      (data.user.user_metadata?.display_name as string | undefined) ??
      (data.user.email ?? 'founder').split('@')[0] ??
      'Founder';

    return this.persistSupabaseUser(data.user.id, data.user.email ?? `${data.user.id}@supabase.local`, displayName);
  }

  private async persistSupabaseUser(id: string, email: string, displayName: string): Promise<AuthUser> {
    const user: AuthUser = { id, email, displayName, mode: 'supabase' };
    await this.store.upsertUser(user);
    return user;
  }

  private requireSupabase(): SupabaseClient {
    if (!this.supabase) throw errors.unauthorized();
    return this.supabase;
  }

  /* ── shared entry point ────────────────────────────────────────────────── */

  /** Resolves a bearer token into a user, or null when it is not usable. */
  async resolveToken(token: string): Promise<AuthUser | null> {
    if (this.mode === 'supabase') {
      try {
        return await this.verifySupabaseToken(token);
      } catch (error) {
        log.warn('supabase token verification threw', { reason: (error as Error).message });
        return null;
      }
    }
    return this.verifyGuestToken(token);
  }

  async getUser(userId: string): Promise<AuthUser | null> {
    const row = await this.store.findUserById(userId);
    if (!row) return null;
    return { id: row.id, email: row.email, displayName: row.displayName, mode: this.mode };
  }
}