import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://apifyactors.onrender.com';
    const res = await fetch(`${backendUrl}/health`, {
      method: 'GET',
      headers: {
        'User-Agent': 'Vercel-Cron-KeepAlive',
      },
      cache: 'no-store',
    });

    const data = await res.json().catch(() => ({ status: 'ok' }));
    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      backendStatus: res.status,
      backendData: data,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message, timestamp: new Date().toISOString() },
      { status: 500 }
    );
  }
}
