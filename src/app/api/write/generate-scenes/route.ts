import { GoogleGenAI } from '@google/genai'
import { NextResponse } from 'next/server'
import type { SceneManifest, Shot } from '@/types'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { getUser } from '@/lib/supabase/auth'

function getApiKey(): string {
  const keys = process.env.GOOGLE_API_KEYS ?? ''
  const first = keys.split(',')[0]?.split(':')[0]?.trim()
  if (!first) throw new Error('GOOGLE_API_KEYS is not configured')
  return first
}

const PUMPUP_SYSTEM = `You are a visual story expander. Your job is to take a short story and add visual details that help cinematographers and video AI systems create stunning imagery.

ADD these details:
- Time of day, lighting direction, light quality
- Specific locations with physical details (textures, scale, materials)
- Physical actions with speed, direction, body parts
- Environmental details (weather, atmosphere, ambient elements)

DO NOT:
- Add new characters or change the plot
- Add internal emotions or abstract concepts that can't be filmed
- Change dialogue (preserve exact quotes)
- Alter the narrative sequence

PRESERVE exactly:
- All proper nouns
- All dialogue (verbatim)
- Cause-and-effect relationships
- Story sequence

Output: The expanded story text only (1000-2500 characters). No explanations.`

const SCENE_ARCHITECT_SYSTEM = `You are a scene architect. Split the story into exactly 4 scenes following the Ki-Seung-Jeon-Gyeol (기승전결) structure.

Output a JSON object matching this exact schema:
{
  "scenes": [
    {
      "sceneId": "sc_01",
      "act": "intro",
      "narrativeSummary": "One sentence summary",
      "originalTextQuote": "Direct quote from the story",
      "location": "loc_01",
      "timeOfDay": "night",
      "mood": "tense, mysterious",
      "charactersPresent": ["char_01"],
      "estimatedDurationSeconds": 30
    }
  ],
  "characters": [
    {
      "characterId": "char_01",
      "name": "Name",
      "role": "protagonist",
      "description": "Visual appearance description",
      "fixedPrompt": "Concise visual prompt for consistent image generation (clothing, features, distinguishing marks)",
      "referenceImages": []
    }
  ],
  "locations": [
    {
      "locationId": "loc_01",
      "name": "Location Name",
      "visualDescription": "Detailed visual description for image generation",
      "timeOfDay": "night",
      "lightingDirection": "top-front, neon sides"
    }
  ]
}

Rules:
- Exactly 4 scenes with acts: "intro", "dev", "turn", "conclusion"
- Scene IDs: sc_01 through sc_04
- Character IDs: char_{lowercase_name}
- Location IDs: loc_01 through loc_N
- Role must be "protagonist", "antagonist", or "supporting"
- Each scene ~30 seconds (total ~2 min video)
- fixedPrompt: physical appearance only, no actions or emotions
- Extract ALL characters mentioned, even briefly
- Output valid JSON only, no markdown fences`

const SHOT_COMPOSER_SYSTEM = `You are a shot composer. Given a scene manifest and expanded story, generate 4-6 shots per scene.

Focus on NARRATIVE data only — no camera or lighting settings (those are added later by the Director).

Output a JSON array of shots matching this exact schema:
[
  {
    "shotId": "sh_01_01",
    "sceneId": "sc_01",
    "shotType": "WS",
    "actionDescription": "Describe what happens visually in this shot",
    "characters": ["char_01"],
    "durationSeconds": 5,
    "generationMethod": "T2V",
    "dialogueLines": [
      {
        "characterId": "char_01",
        "text": "Exact dialogue text",
        "emotion": "determined",
        "delivery": "whispered",
        "durationHint": 2
      }
    ]
  }
]

Rules:
- Shot IDs: sh_{sceneNumber}_{shotNumber} (e.g., sh_01_01, sh_01_02)
- 4-6 shots per scene
- shotType must be one of: ECU, CU, MCU, MS, MFS, FS, WS, EWS, OTS, POV, TRACK, 2S
- generationMethod: "T2V" (text-to-video) or "I2V" (image-to-video)
- Use "I2V" when a specific character face or background is crucial
- dialogueLines: include ONLY lines from the original story. Empty array if no dialogue in that shot
- durationSeconds: 3-8 seconds per shot
- Vary shot types for visual interest (wide establishing → medium → close-up for emotion)
- characters: list character IDs present in this shot
- Output valid JSON array only, no markdown fences`

export async function POST(req: Request) {
  try {
    const user = await getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { storyText, projectId } = await req.json()

    if (!storyText || typeof storyText !== 'string') {
      return NextResponse.json(
        { error: 'storyText is required' },
        { status: 400 },
      )
    }

    if (storyText.length < 20) {
      return NextResponse.json(
        { error: 'Story is too short (min 20 characters)' },
        { status: 400 },
      )
    }

    const ai = new GoogleGenAI({ apiKey: getApiKey() })

    // Step 1: Pumpup — expand story with visual details
    const pumpupResponse = await ai.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: storyText,
      config: {
        systemInstruction: PUMPUP_SYSTEM,
        temperature: 0.7,
      },
    })

    const expandedStory =
      pumpupResponse.candidates?.[0]?.content?.parts?.[0]?.text
    if (!expandedStory) {
      return NextResponse.json(
        { error: 'Pumpup failed: no expanded story generated' },
        { status: 500 },
      )
    }

    // Step 2: Scene Architect — split into 4 scenes
    const sceneResponse = await ai.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: expandedStory,
      config: {
        systemInstruction: SCENE_ARCHITECT_SYSTEM,
        temperature: 0.3,
        responseMimeType: 'application/json',
      },
    })

    const sceneJson = sceneResponse.candidates?.[0]?.content?.parts?.[0]?.text
    if (!sceneJson) {
      return NextResponse.json(
        { error: 'Scene Architect failed: no scene manifest generated' },
        { status: 500 },
      )
    }

    const manifest: SceneManifest = JSON.parse(sceneJson)

    // Basic validation
    if (!manifest.scenes?.length || !manifest.characters?.length) {
      return NextResponse.json(
        { error: 'Invalid manifest: missing scenes or characters' },
        { status: 500 },
      )
    }

    // Step 3: L2 Lite Shot Composer — generate shots per scene
    const shotInput = JSON.stringify({
      expandedStory,
      scenes: manifest.scenes,
      characters: manifest.characters,
    })

    const shotResponse = await ai.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: shotInput,
      config: {
        systemInstruction: SHOT_COMPOSER_SYSTEM,
        temperature: 0.4,
        responseMimeType: 'application/json',
      },
    })

    const shotJson = shotResponse.candidates?.[0]?.content?.parts?.[0]?.text
    let shots: Shot[] = []

    if (shotJson) {
      const parsed = JSON.parse(shotJson)
      const rawShots = Array.isArray(parsed) ? parsed : parsed.shots ?? []

      // Normalize — add default camera/lighting
      shots = rawShots.map((s: Record<string, unknown>) => ({
        shotId: s.shotId as string,
        sceneId: s.sceneId as string,
        shotType: s.shotType as string,
        actionDescription: (s.actionDescription as string) ?? '',
        characters: (s.characters as string[]) ?? [],
        durationSeconds: (s.durationSeconds as number) ?? 5,
        generationMethod: (s.generationMethod as string) ?? 'T2V',
        dialogueLines: (s.dialogueLines as Shot['dialogueLines']) ?? [],
        camera: { horizontal: 0, vertical: 0, pan: 0, tilt: 0, roll: 0, zoom: 0 },
        lighting: { position: 'front', brightness: 50, colorTemp: 5000 },
      }))
    }

    // Persist to Supabase if projectId provided
    if (projectId) {
      await supabaseAdmin
        .from('projects')
        .update({
          story_text: storyText,
          expanded_story: expandedStory,
          current_stage: 'writer',
        })
        .eq('id', projectId)

      // Clear old data (re-generation replaces all)
      await Promise.all([
        supabaseAdmin.from('scenes').delete().eq('project_id', projectId),
        supabaseAdmin.from('characters').delete().eq('project_id', projectId),
        supabaseAdmin.from('locations').delete().eq('project_id', projectId),
        supabaseAdmin.from('shots').delete().eq('project_id', projectId),
      ])

      // Insert scenes
      await supabaseAdmin.from('scenes').insert(
        manifest.scenes.map((s, i) => ({
          project_id: projectId,
          scene_id: s.sceneId,
          act: s.act,
          narrative_summary: s.narrativeSummary,
          original_text_quote: s.originalTextQuote,
          location: s.location,
          time_of_day: s.timeOfDay,
          mood: s.mood,
          characters_present: s.charactersPresent,
          estimated_duration_seconds: s.estimatedDurationSeconds,
          sort_order: i,
        })),
      )

      // Insert characters
      await supabaseAdmin.from('characters').insert(
        manifest.characters.map((c) => ({
          project_id: projectId,
          character_id: c.characterId,
          name: c.name,
          role: c.role,
          description: c.description,
          fixed_prompt: c.fixedPrompt,
        })),
      )

      // Insert locations
      if (manifest.locations?.length) {
        await supabaseAdmin.from('locations').insert(
          manifest.locations.map((l) => ({
            project_id: projectId,
            location_id: l.locationId,
            name: l.name,
            visual_description: l.visualDescription,
            time_of_day: l.timeOfDay,
            lighting_direction: l.lightingDirection,
          })),
        )
      }

      // Insert shots
      if (shots.length) {
        await supabaseAdmin.from('shots').insert(
          shots.map((s, i) => ({
            project_id: projectId,
            scene_id: s.sceneId,
            shot_id: s.shotId,
            shot_type: s.shotType,
            action_description: s.actionDescription,
            characters: s.characters,
            duration_seconds: s.durationSeconds,
            generation_method: s.generationMethod,
            dialogue_lines: s.dialogueLines,
            camera_config: s.camera,
            lighting_config: s.lighting,
            sort_order: i,
          })),
        )
      }
    }

    return NextResponse.json({
      manifest,
      expandedStory,
      shots,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('[write/generate-scenes]', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
