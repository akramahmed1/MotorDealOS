// Shared by the Next.js server and the edge functions. No secrets live here.
// Callers compare a header to an env var and fail closed when that env var is unset.

const MAX_SECRET_LENGTH = 512;

export function secretsEqual(expected: string, provided: string): boolean {
  const a = new TextEncoder().encode(expected);
  const b = new TextEncoder().encode(provided);
  const len = Math.max(a.length, b.length, 1);
  let mismatch = a.length === b.length ? 0 : 1;
  for (let i = 0; i < len; i++) {
    mismatch |= (a[i] ?? 0) ^ (b[i] ?? 0);
  }
  return mismatch === 0;
}

export function headerSecretOk(provided: string | null, expected: string | undefined): boolean {
  if (!expected || !provided) return false;
  if (expected.length > MAX_SECRET_LENGTH || provided.length > MAX_SECRET_LENGTH) return false;
  return secretsEqual(expected, provided);
}

export function bearerSecretOk(authorization: string | null, secret: string | undefined): boolean {
  if (!secret || secret.length > MAX_SECRET_LENGTH) return false;
  const provided = authorization ?? '';
  if (provided.length > MAX_SECRET_LENGTH + 'Bearer '.length) return false;
  return secretsEqual(`Bearer ${secret}`, provided);
}

export function rejectIfUnauthed(req: Request, secret: string | undefined): Response | null {
  if (!headerSecretOk(req.headers.get('x-owner-alert-secret'), secret)) {
    return new Response('Unauthorized', { status: 401 });
  }
  return null;
}
