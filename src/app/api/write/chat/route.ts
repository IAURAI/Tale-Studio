import { GoogleGenAI } from '@google/genai'
import { NextResponse } from 'next/server'
import { getUser } from '@/lib/supabase/auth'

function getApiKey(): string {
  const keys = process.env.GOOGLE_API_KEYS ?? ''
  const first = keys.split(',')[0]?.split(':')[0]?.trim()
  if (!first) throw new Error('GOOGLE_API_KEYS is not configured')
  return first
}

const WRITER_SYSTEM = `You are a professional screenwriter and story consultant working in an AI video production pipeline.

Your role:
- Help users refine their scene structure (Ki-Seung-Jeon-Gyeol: Intro → Development → Turn → Conclusion)
- Suggest improvements to scene descriptions, locations, mood, and pacing
- Help refine individual shots: shot descriptions, dialogue, shot type choices, character presence
- Answer questions about storytelling, character arcs, and visual narrative
- When the user asks to modify a scene or shot, respond with specific suggestions

Style:
- Concise and practical (this is a production tool, not creative writing class)
- Focus on what can be FILMED and VISUALIZED
- Reference cinematic techniques when relevant
- Korean/English bilingual — match the user's language

You have access to the current scene manifest and optionally a selected shot in the conversation context. Reference specific scenes by their act (intro/dev/turn/conclusion) and shots by their ID when discussing changes.`

interface ChatMessage {
  role: 'user' | 'model'
  content: string
}

export async function POST(req: Request) {
  try {
    const user = await getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { message, history, sceneContext, shotContext } = await req.json()

    if (!message || typeof message !== 'string') {
      return NextResponse.json(
        { error: 'message is required' },
        { status: 400 },
      )
    }

    const ai = new GoogleGenAI({ apiKey: getApiKey() })

    let contextPrefix = ''
    if (sceneContext) {
      contextPrefix += `[Current Scene Manifest]\n${JSON.stringify(sceneContext, null, 2)}\n\n`
    }
    if (shotContext) {
      contextPrefix += `[Currently Selected Shot]\n${JSON.stringify(shotContext, null, 2)}\n\n`
    }

    const contents = [
      ...(history ?? []).map((msg: ChatMessage) => ({
        role: msg.role,
        parts: [{ text: msg.content }],
      })),
      {
        role: 'user' as const,
        parts: [{ text: `${contextPrefix}${message}` }],
      },
    ]

    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash',
      contents,
      config: {
        systemInstruction: WRITER_SYSTEM,
        temperature: 0.7,
      },
    })

    const text = response.candidates?.[0]?.content?.parts?.[0]?.text
    if (!text) {
      return NextResponse.json(
        { error: 'No response generated' },
        { status: 500 },
      )
    }

    return NextResponse.json({ message: text })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('[write/chat]', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
