'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

import { APP_ROUTES } from '@bizora/shared';

import { ApiClientError } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useCapabilities, useDocumentTitle } from '@/lib/hooks';
import { Logo } from '@/components/layout/logo';
import { Button } from '@/components/ui/button';
import { Card, CardBody } from '@/components/ui/card';
import { Alert } from '@/components/ui/feedback';
import { Field, TextInput } from '@/components/ui/field';

type Mode = 'signIn' | 'signUp';

export default function LoginPage() {
  useDocumentTitle('Sign in');

  const router = useRouter();
  const { signIn, signUp, user } = useAuth();
  const health = useCapabilities();

  const [mode, setMode] = useState<Mode>('signIn');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const supabaseConfigured = health?.auth.mode === 'supabase';

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setBusy(true);

    try {
      if (mode === 'signIn') {
        await signIn(email, password);
      } else {
        await signUp(email, password, displayName);
      }
      router.push(APP_ROUTES.workspace);
    } catch (cause) {
      setBusy(false);
      setError(cause instanceof ApiClientError ? cause.message : 'Something went wrong. Please try again.');
    }
  }

  return (
    <div className="container-page max-w-md py-16">
      <div className="flex justify-center">
        <Logo />
      </div>

      <div className="mt-8 text-center">
        <h1 className="text-2xl font-bold tracking-tight text-white">
          {mode === 'signIn' ? 'Sign in to Bizora' : 'Create your account'}
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-slate-300">
          {mode === 'signIn'
            ? 'Your analyses, interviews and reports are waiting.'
            : 'Keep every analysis and report attached to your account.'}
        </p>
      </div>

      <Card className="mt-8">
        <CardBody>
          {!supabaseConfigured ? (
            <Alert tone="info" className="mb-6">
              This deployment has no Supabase credentials, so accounts are disabled. Everything works on a guest session
              instead — no sign-in needed.
            </Alert>
          ) : null}

          <form onSubmit={submit} noValidate className="space-y-5">
            {mode === 'signUp' ? (
              <Field label="Your name" required>
                {({ id, describedBy }) => (
                  <TextInput
                    id={id}
                    aria-describedby={describedBy}
                    autoComplete="name"
                    required
                    value={displayName}
                    onChange={(event) => setDisplayName(event.target.value)}
                    placeholder="Ada Lovelace"
                    disabled={!supabaseConfigured}
                  />
                )}
              </Field>
            ) : null}

            <Field label="Email" required>
              {({ id, describedBy }) => (
                <TextInput
                  id={id}
                  aria-describedby={describedBy}
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="you@company.com"
                  disabled={!supabaseConfigured}
                />
              )}
            </Field>

            <Field label="Password" required hint={mode === 'signUp' ? 'At least 8 characters.' : undefined}>
              {({ id, describedBy }) => (
                <TextInput
                  id={id}
                  aria-describedby={describedBy}
                  type="password"
                  required
                  minLength={mode === 'signUp' ? 8 : undefined}
                  autoComplete={mode === 'signIn' ? 'current-password' : 'new-password'}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="••••••••"
                  disabled={!supabaseConfigured}
                />
              )}
            </Field>

            {error ? <Alert tone="error">{error}</Alert> : null}

            <Button type="submit" size="lg" loading={busy} disabled={!supabaseConfigured} className="w-full">
              {mode === 'signIn' ? 'Sign in' : 'Create account'}
            </Button>
          </form>

          {supabaseConfigured ? (
            <p className="mt-5 text-center text-sm text-slate-500">
              {mode === 'signIn' ? 'No account yet?' : 'Already have an account?'}{' '}
              <button
                type="button"
                onClick={() => {
                  setMode(mode === 'signIn' ? 'signUp' : 'signIn');
                  setError(null);
                }}
                className="font-semibold text-brand-600 underline-offset-2 hover:underline"
              >
                {mode === 'signIn' ? 'Create one' : 'Sign in'}
              </button>
            </p>
          ) : null}
        </CardBody>
      </Card>

      <p className="mt-6 text-center text-sm text-slate-400">
        {user ? 'Already signed in — ' : 'Just want to look around? '}
        <Link href={APP_ROUTES.validate} className="font-semibold text-brand-300 underline-offset-2 hover:underline">
          Start with an idea
        </Link>
      </p>
    </div>
  );
}