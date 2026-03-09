import { create } from 'zustand'
import type { StageId } from '@/types'
import { STAGES } from '@/lib/constants'

interface ProjectState {
  currentStage: StageId
  videoGenerationStarted: boolean
  workspaceId: string | null
  projectId: string | null
  initLoading: boolean

  setStage: (stage: StageId) => void
  startVideoGeneration: () => void
  canNavigateTo: (stage: StageId) => boolean
  initProject: () => Promise<void>
  createNewProject: () => Promise<void>
  resetProject: () => void
}

function getStageIndex(id: StageId): number {
  return STAGES.findIndex((s) => s.id === id)
}

export const useProjectStore = create<ProjectState>((set, get) => ({
  currentStage: 'producer',
  videoGenerationStarted: false,
  workspaceId: null,
  projectId: null,
  initLoading: false,

  setStage: (stage) => set({ currentStage: stage }),

  startVideoGeneration: () => set({ videoGenerationStarted: true }),

  canNavigateTo: (stage) => {
    const { videoGenerationStarted, currentStage } = get()
    if (!videoGenerationStarted) return true
    return getStageIndex(stage) >= getStageIndex(currentStage)
  },

  initProject: async () => {
    if (get().projectId) return
    set({ initLoading: true })
    try {
      const res = await fetch('/api/project/init', { method: 'POST' })
      if (!res.ok) throw new Error('Failed to init project')
      const { workspaceId, projectId, project } = await res.json()
      set({
        workspaceId,
        projectId,
        initLoading: false,
        currentStage: project.current_stage ?? 'producer',
      })
    } catch (err) {
      console.error('[project-store] initProject failed:', err)
      set({ initLoading: false })
    }
  },

  createNewProject: async () => {
    set({ initLoading: true })
    try {
      const res = await fetch('/api/project/new', { method: 'POST' })
      if (!res.ok) throw new Error('Failed to create project')
      const { workspaceId, projectId } = await res.json()
      set({
        workspaceId,
        projectId,
        initLoading: false,
        currentStage: 'producer',
        videoGenerationStarted: false,
      })
    } catch (err) {
      console.error('[project-store] createNewProject failed:', err)
      set({ initLoading: false })
    }
  },

  resetProject: () => {
    set({
      workspaceId: null,
      projectId: null,
      currentStage: 'producer',
      videoGenerationStarted: false,
      initLoading: false,
    })
  },
}))
