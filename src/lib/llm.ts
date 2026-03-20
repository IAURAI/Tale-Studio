/**
 * LLM Abstraction Layer
 *
 * 현재: Gemini 2.0 Flash (GOOGLE_API_KEYS)
 * 전환 시: 이 파일만 수정 → 모든 API 라우트 자동 전환
 *
 * Agent SDK 전환 계획:
 *   import { claudeChat, claudeJSON } from './claude'
 *   export const llmChat = claudeChat
 *   export const llmJSON = claudeJSON
 *
 * Tool-use 에이전트가 필요한 경우: claude.ts에 tool loop 추가
 */

import { GoogleGenAI } from '@google/genai'

const MODEL = 'gemini-2.0-flash'

function getApiKey(): string {
  const keys = process.env.GOOGLE_API_KEYS ?? ''
  const first = keys.split(',')[0]?.split(':')[0]?.trim()
  if (!first) throw new Error('GOOGLE_API_KEYS is not configured')
  return first
}

interface HistoryMessage {
  role: 'user' | 'model' | 'assistant'
  content: string
}

function toGeminiRole(role: string): 'user' | 'model' {
  return role === 'user' ? 'user' : 'model'
}

/** Multi-turn chat — returns assistant text */
export async function llmChat(
  system: string,
  history: HistoryMessage[],
  userMessage: string,
  temperature = 0.7,
): Promise<string> {
  const ai = new GoogleGenAI({ apiKey: getApiKey() })

  const contents = [
    ...history.map((m) => ({
      role: toGeminiRole(m.role),
      parts: [{ text: m.content }],
    })),
    { role: 'user' as const, parts: [{ text: userMessage }] },
  ]

  const response = await ai.models.generateContent({
    model: MODEL,
    contents,
    config: { systemInstruction: system, temperature },
  })

  const text = response.candidates?.[0]?.content?.parts?.[0]?.text
  if (!text) throw new Error('No response generated')
  return text
}

/** Single-turn JSON generation — parses and returns typed result */
export async function llmJSON<T = unknown>(
  system: string,
  userMessage: string,
  temperature = 0.3,
): Promise<T> {
  const ai = new GoogleGenAI({ apiKey: getApiKey() })

  const response = await ai.models.generateContent({
    model: MODEL,
    contents: userMessage,
    config: {
      systemInstruction: system,
      temperature,
      responseMimeType: 'application/json',
    },
  })

  const text = response.candidates?.[0]?.content?.parts?.[0]?.text
  if (!text) throw new Error('No response generated')
  return JSON.parse(text) as T
}
