import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/db';
import { createSession } from '@/lib/auth';

export async function POST(req: NextRequest) {
  const { email, authHash, salt } = await req.json();
  if (!email || !authHash || !salt) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
  }
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return NextResponse.json({ error: 'Account already exists' }, { status: 409 });

  const passwordHash = await bcrypt.hash(authHash, 12);
  const user = await prisma.user.create({
    data: { email, passwordHash, salt }
  });
  await createSession(user.id);
  return NextResponse.json({ ok: true, salt: user.salt });
}
