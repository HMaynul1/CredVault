import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { getSessionUserId } from '@/lib/auth';

// Returns a signature so the browser can upload directly to Cloudinary.
// Files MUST already be client-side encrypted (AES-GCM) before upload -
// Cloudinary only ever stores opaque encrypted bytes, never plaintext.
export async function GET() {
  const uid = await getSessionUserId();
  if (!uid) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const apiSecret = process.env.CLOUDINARY_API_SECRET;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  if (!apiSecret || !apiKey || !cloudName) {
    return NextResponse.json({ error: 'Cloudinary not configured' }, { status: 500 });
  }

  const timestamp = Math.floor(Date.now() / 1000);
  const folder = `crdxcube/${uid}`;
  const paramsToSign = `folder=${folder}&timestamp=${timestamp}${apiSecret}`;
  const signature = crypto.createHash('sha1').update(paramsToSign).digest('hex');

  return NextResponse.json({ timestamp, signature, apiKey, cloudName, folder });
}
