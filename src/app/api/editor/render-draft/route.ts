import { NextResponse } from 'next/server'
import { getUser } from '@/lib/supabase/auth'

export async function POST(req: Request) {
  try {
    const user = await getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { clipOrder, sceneId } = await req.json()

    if (!clipOrder) {
      return NextResponse.json(
        { error: 'clipOrder is required' },
        { status: 400 },
      )
    }

    // MVP: Return playlist metadata for client-side sequential playback
    // Real video concatenation (FFmpeg) is post-MVP
    return NextResponse.json({
      type: 'playlist',
      sceneId,
      clipOrder,
      message:
        'Draft render created as playlist. Real video merge coming in post-MVP.',
      renderedAt: new Date().toISOString(),
    })
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : 'Unknown error'
    console.error('[editor/render-draft]', errMsg)
    return NextResponse.json({ error: errMsg }, { status: 500 })
  }
}
