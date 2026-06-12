import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSessionUserId } from '@/lib/auth';

export async function GET() {
  const uid = await getSessionUserId();
  if (!uid) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const user = await prisma.user.findUnique({ where: { id: uid } });
  if (!user) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json({
    salt: user.salt,
    vault: user.vaultData ? { iv: user.vaultIv, data: user.vaultData } : null
  });
}

// Body: { iv, data } - both opaque AES-GCM ciphertext/IV, base64.
// The server never decrypts or inspects this payload.
export async function PUT(req: NextRequest) {
  const uid = await getSessionUserId();
  if (!uid) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { iv, data } = await req.json();
  if (!iv || !data) return NextResponse.json({ error: 'Missing payload' }, { status: 400 });

  await prisma.user.update({
    where: { id: uid },
    data: { vaultIv: iv, vaultData: data }
  });
  return NextResponse.json({ ok: true });
}
