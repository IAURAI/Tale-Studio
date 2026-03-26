import { NextResponse } from 'next/server'
import { getUser } from '@/lib/supabase/auth'
import { fal } from '@fal-ai/client'
import { cameraToText } from '@/lib/kling'
import type { CameraConfig } from '@/types'

fal.config({ credentials: () => process.env.FAL_KEY ?? '' })

const FAL_MODEL = 'fal-ai/kling-video/v2.1/master/text-to-video'

export const maxDuration = 120

export async function POST(req: Request) {
  try {
    const user = await getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { shotId, prompt, camera, durationSeconds, aspectRatio } =
      (await req.json()) as {
        shotId: string
        prompt: string
        camera?: CameraConfig
        durationSeconds?: number
        aspectRatio?: string
      }

    if (!shotId || !prompt) {
      return NextResponse.json(
        { error: 'shotId and prompt are required' },
        { status: 400 },
      )
    }

    // Convert 6-axis camera values to natural language in prompt
    const cameraText = camera ? cameraToText(camera) : ''
    const fullPrompt = cameraText
      ? `${prompt}. ${cameraText}.`.slice(0, 500)
      : prompt.slice(0, 500)

    const { request_id } = await fal.queue.submit(FAL_MODEL, {
      input: {
        prompt: fullPrompt,
        negative_prompt: 'blurry, low quality, distorted, deformed',
        duration: (durationSeconds ?? 5) >= 10 ? '10' as const : '5' as const,
        aspect_ratio: (aspectRatio ?? '16:9') as '16:9',
      },
    })

    return NextResponse.json({
      shotId,
      taskId: request_id,
      status: 'generating',
    })
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : 'Unknown error'
    console.error('[director/generate-video]', errMsg)
    return NextResponse.json({ error: errMsg }, { status: 500 })
  }
}
