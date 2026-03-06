import { NextResponse } from 'next/server'
import { getUser } from '@/lib/supabase/auth'

export async function PATCH(req: Request) {
  try {
    const user = await getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { sceneId, clipOrder } = await req.json()

    if (!sceneId || !Array.isArray(clipOrder)) {
      return NextResponse.json(
        { error: 'sceneId and clipOrder[] are required' },
        { status: 400 },
      )
    }

    // TODO: Persist to Supabase shots table (update sort_order)
    // For MVP, reorder is client-only (Zustand state)

    return NextResponse.json({
      sceneId,
      clipOrder,
      message: 'Reorder saved (client-only for MVP)',
    })
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : 'Unknown error'
    console.error('[editor/reorder]', errMsg)
    return NextResponse.json({ error: errMsg }, { status: 500 })
  }
}
