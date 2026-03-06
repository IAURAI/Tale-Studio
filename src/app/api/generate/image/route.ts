import jwt from 'jsonwebtoken'
import { NextResponse } from 'next/server'

const KLING_API = 'https://api.klingai.com/v1/images/generations'
const POLL_INTERVAL_MS = 3000
const MAX_POLLS = 40 // ~2 minutes max

function generateKlingToken(): string {
  const ak = process.env.KLING_ACCESS_KEY
  const sk = process.env.KLING_SECRET_KEY
  if (!ak || !sk) throw new Error('KLING_ACCESS_KEY or KLING_SECRET_KEY is not configured')

  const now = Math.floor(Date.now() / 1000)
  const payload = {
    iss: ak,
    exp: now + 1800,
    nbf: now - 5,
  }
  return jwt.sign(payload, sk, { algorithm: 'HS256', header: { alg: 'HS256', typ: 'JWT' } })
}

async function klingRequest(url: string, options?: RequestInit) {
  const token = generateKlingToken()
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...options?.headers,
    },
  })
  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Kling API ${res.status}: ${body}`)
  }
  return res.json()
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export async function POST(req: Request) {
  try {
    const { prompt, aspectRatio = '1:1' } = await req.json()

    if (!prompt || typeof prompt !== 'string') {
      return NextResponse.json(
        { error: 'prompt is required' },
        { status: 400 },
      )
    }

    // Create image generation task
    const createRes = await klingRequest(KLING_API, {
      method: 'POST',
      body: JSON.stringify({
        model_name: 'kling-v2',
        prompt,
        aspect_ratio: aspectRatio,
        n: 1,
      }),
    })

    const taskId = createRes.data?.task_id
    if (!taskId) {
      return NextResponse.json(
        { error: 'Failed to create Kling task', detail: createRes },
        { status: 500 },
      )
    }

    // Poll for result
    for (let i = 0; i < MAX_POLLS; i++) {
      await sleep(POLL_INTERVAL_MS)

      const pollRes = await klingRequest(`${KLING_API}/${taskId}`)
      const status = pollRes.data?.task_status

      if (status === 'succeed') {
        const imageUrl = pollRes.data?.task_result?.images?.[0]?.url
        if (!imageUrl) {
          return NextResponse.json(
            { error: 'No image in Kling result' },
            { status: 500 },
          )
        }
        return NextResponse.json({ url: imageUrl })
      }

      if (status === 'failed') {
        return NextResponse.json(
          { error: `Kling generation failed: ${pollRes.data?.task_status_msg ?? 'unknown'}` },
          { status: 500 },
        )
      }
      // status is 'submitted' or 'processing' — keep polling
    }

    return NextResponse.json(
      { error: 'Kling generation timed out' },
      { status: 504 },
    )
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('[generate/image]', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
