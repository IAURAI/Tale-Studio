import { GoogleGenAI } from '@google/genai'
import { NextResponse } from 'next/server'
import { getUser } from '@/lib/supabase/auth'

function getApiKey(): string {
  const keys = process.env.GOOGLE_API_KEYS ?? ''
  const first = keys.split(',')[0]?.split(':')[0]?.trim()
  if (!first) throw new Error('GOOGLE_API_KEYS is not configured')
  return first
}

export async function POST(req: Request) {
  try {
    const user = await getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { prompt, aspectRatio = '1:1' } = await req.json()

    if (!prompt || typeof prompt !== 'string') {
      return NextResponse.json(
        { error: 'prompt is required' },
        { status: 400 },
      )
    }

    const ai = new GoogleGenAI({ apiKey: getApiKey() })

    const response = await ai.models.generateImages({
      model: 'imagen-4.0-generate-001',
      prompt,
      config: {
        numberOfImages: 1,
        aspectRatio: aspectRatio as '1:1' | '16:9',
      },
    })

    const img = response.generatedImages?.[0]?.image
    if (!img?.imageBytes) {
      return NextResponse.json(
        { error: 'No image generated' },
        { status: 500 },
      )
    }

    // imageBytes is a base64 string per SDK docs — decode to binary
    const buffer = Buffer.from(img.imageBytes, 'base64')
    const mimeType = img.mimeType ?? 'image/png'

    return new Response(buffer, {
      headers: {
        'Content-Type': mimeType,
        'Content-Length': String(buffer.length),
      },
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('[generate/image]', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
