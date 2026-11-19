import { NextResponse } from 'next/server';
import { connection } from 'next/server';
import { getPublicConfigStatus } from '@/lib/rerouter/config';

export async function GET() {
  await connection();
  const status = getPublicConfigStatus();
  return NextResponse.json(status, {
    headers: {
      'Cache-Control': 'no-store, max-age=0',
    },
  });
}
