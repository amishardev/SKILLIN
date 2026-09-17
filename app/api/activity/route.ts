import { NextResponse, type NextRequest } from 'next/server';
import { verifyIdToken, adminAvailable } from '@/lib/firebase/admin';
import { readActivity, readProgress, EMPTY_PROGRESS } from '@/lib/firebase/store';
import { heatmapCounts } from '@/lib/progress/engine';

export const runtime = 'nodejs';

/** Read-only activity feed. Writes happen through /api/streak only. */
export async function GET(request: NextRequest) {
  const user = await verifyIdToken(request.headers.get('authorization'));
  if (!user) {
    return NextResponse.json({ error: 'Sign in to see your activity.' }, { status: 401 });
  }

  try {
    const [events, progress] = await Promise.all([
      readActivity(user.uid, 200),
      readProgress(user.uid),
    ]);

    return NextResponse.json({
      events,
      progress: progress ?? EMPTY_PROGRESS,
      heatmap: Object.fromEntries(heatmapCounts(events)),
      serverManaged: adminAvailable(),
    });
  } catch (err) {
    console.error('[api/activity]', err);
    return NextResponse.json(
      { error: "We couldn't load your activity right now." },
      { status: 500 },
    );
  }
}
