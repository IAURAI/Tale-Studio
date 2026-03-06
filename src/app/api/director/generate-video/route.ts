import { NextResponse } from 'next/server'
import { getUser } from '@/lib/supabase/auth'

export async function POST(req: Request) {
  try {
    const user = await getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { shotId, cameraConfig, prompt, generationMethod } = await req.json()

    if (!shotId) {
      return NextResponse.json(
        { error: 'shotId is required' },
        { status: 400 },
      )
    }

    // TODO: Wire to Kling (I2V with 6-axis camera) or Veo (T2V) when API keys are available
    // For now, return a stub response acknowledging the request
    const hasKlingKey = !!process.env.KLING_API_KEY
    const hasVeoKey = !!process.env.VEO_API_KEY

    if (!hasKlingKey && !hasVeoKey) {
      return NextResponse.json({
        shotId,
        status: 'pending',
        message: 'Video generation API keys not configured. Set KLING_API_KEY or VEO_API_KEY.',
        stub: true,
        request: {
          generationMethod: generationMethod ?? 'T2V',
          cameraConfig,
          promptLength: prompt?.length ?? 0,
        },
      })
    }

    // Future: actual API call
    // if (generationMethod === 'I2V' && hasKlingKey) { ... }
    // if (generationMethod === 'T2V' && hasVeoKey) { ... }

    return NextResponse.json({
      shotId,
      status: 'pending',
      message: 'Video generation queued',
    })
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : 'Unknown error'
    console.error('[director/generate-video]', errMsg)
    return NextResponse.json({ error: errMsg }, { status: 500 })
  }
}
