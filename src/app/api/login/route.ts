import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/db';
import { createSession } from '@/lib/auth';

// Step 1: client asks for the salt for an email (needed to derive authHash)
export async function GET(req: NextRequest) {
  const email = req.nextUrl.searchParams.get('email');
  if (!email) return NextResponse.json({ error: 'Missing email' }, { status: 400 });
  const user = await prisma.user.findUnique({ where: { email }, select: { salt: true } });
  if (!user) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json({ salt: user.salt });
}

// Step 2: client posts the derived authHash for verification
export async function POST(req: NextRequest) {
  const { email, authHash } = await req.json();
  if (!email || !authHash) return NextResponse.json({ error: 'Missing fields' }, { status: 400 });

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });

  const valid = await bcrypt.compare(authHash, user.passwordHash);
  if (!valid) return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });

  await createSession(user.id);
  return NextResponse.json({
    ok: true,
    salt: user.salt,
    vault: user.vaultData ? { iv: user.vaultIv, data: user.vaultData } : null
  });
}
