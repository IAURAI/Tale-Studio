import { supabaseAdmin } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST() {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Find workspace for this user
    const { data: workspace } = await supabaseAdmin
      .from('workspaces')
      .select('id')
      .eq('owner_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (!workspace) {
      return NextResponse.json(
        { error: 'Workspace not found' },
        { status: 404 },
      )
    }

    // Create new project
    const { data: project, error } = await supabaseAdmin
      .from('projects')
      .insert({ workspace_id: workspace.id, title: 'Untitled' })
      .select()
      .single()

    if (error || !project) {
      return NextResponse.json(
        { error: error?.message ?? 'Failed to create project' },
        { status: 500 },
      )
    }

    return NextResponse.json({
      workspaceId: workspace.id,
      projectId: project.id,
      project,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('[project/new]', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
