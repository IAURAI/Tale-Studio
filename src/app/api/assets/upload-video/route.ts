import { supabaseAdmin } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'
import { getUser } from '@/lib/supabase/auth'
import fs from 'fs/promises'
import path from 'path'

export const maxDuration = 300

type VideoStorage = 'supabase' | 'local'

async function downloadVideo(url: string): Promise<Buffer> {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Failed to download video: ${res.status}`)
  return Buffer.from(await res.arrayBuffer())
}

/* ── Supabase Storage ── */
async function saveToSupabase(
  buffer: Buffer,
  projectId: string,
  shotId: string,
): Promise<string> {
  const { data: project } = await supabaseAdmin
    .from('projects')
    .select('workspace_id')
    .eq('id', projectId)
    .single()

  if (!project) throw new Error('Project not found')

  const storagePath = `${project.workspace_id}/${projectId}/videos/${shotId}.mp4`
  const { error: uploadErr } = await supabaseAdmin.storage
    .from('media')
    .upload(storagePath, buffer, { contentType: 'video/mp4', upsert: true })

  if (uploadErr) throw uploadErr

  const {
    data: { publicUrl },
  } = supabaseAdmin.storage.from('media').getPublicUrl(storagePath)

  return publicUrl
}

/* ── Local Server Storage ── */
async function saveToLocal(
  buffer: Buffer,
  projectId: string,
  shotId: string,
): Promise<string> {
  const baseDir = process.env.OUTPUT_DIR || './generated_videos'
  const dir = path.join(baseDir, projectId)
  await fs.mkdir(dir, { recursive: true })

  const filePath = path.join(dir, `${shotId}.mp4`)
  await fs.writeFile(filePath, buffer)

  return filePath
}

export async function POST(req: Request) {
  try {
    const user = await getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { videoUrl, projectId, shotId, storage = 'supabase' } = await req.json() as {
      videoUrl: string
      projectId: string
      shotId: string
      storage?: VideoStorage
    }

    if (!videoUrl || !projectId || !shotId) {
      return NextResponse.json(
        { error: 'videoUrl, projectId, shotId are required' },
        { status: 400 },
      )
    }

    const buffer = await downloadVideo(videoUrl)

    let savedUrl: string

    if (storage === 'local') {
      const filePath = await saveToLocal(buffer, projectId, shotId)
      savedUrl = filePath
      // Also save to Supabase as backup
      try {
        savedUrl = await saveToSupabase(buffer, projectId, shotId)
      } catch {
        // Supabase failed, use local path
        console.warn('[upload-video] Supabase backup failed, using local path')
      }
    } else {
      savedUrl = await saveToSupabase(buffer, projectId, shotId)
    }

    // Update shot record in DB
    await supabaseAdmin
      .from('shots')
      .update({ video_url: savedUrl })
      .eq('project_id', projectId)
      .eq('shot_id', shotId)

    return NextResponse.json({ url: savedUrl, storage })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('[assets/upload-video]', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
