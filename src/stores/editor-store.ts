import { create } from 'zustand'
import type { Shot, VideoClip } from '@/types'

interface EditorState {
  shots: Shot[]
  videoClips: VideoClip[]
  selectedSceneId: string | null
  selectedClipShotId: string | null
  clipOrder: Record<string, string[]> // sceneId → shotId[]
  rendering: boolean
  error: string | null

  loadMockData: () => void
  selectScene: (sceneId: string) => void
  selectClip: (shotId: string) => void
  reorderClips: (sceneId: string, fromIndex: number, toIndex: number) => void
  setTrim: (shotId: string, trimStart: number, trimEnd: number) => void
  deleteClip: (shotId: string) => void
  renderDraft: () => Promise<void>
}

function buildClipOrder(shots: Shot[]): Record<string, string[]> {
  const order: Record<string, string[]> = {}
  for (const shot of shots) {
    if (!order[shot.sceneId]) order[shot.sceneId] = []
    order[shot.sceneId].push(shot.shotId)
  }
  return order
}

export const useEditorStore = create<EditorState>((set, get) => ({
  shots: [],
  videoClips: [],
  selectedSceneId: null,
  selectedClipShotId: null,
  clipOrder: {},
  rendering: false,
  error: null,

  loadMockData: async () => {
    const [{ mockShots }, { mockVideoClips }] = await Promise.all([
      import('@/mocks/shot-sequences'),
      import('@/mocks/video-clips'),
    ])

    const order = buildClipOrder(mockShots)

    set({
      shots: mockShots,
      videoClips: mockVideoClips,
      clipOrder: order,
      selectedSceneId: mockShots[0]?.sceneId ?? null,
      selectedClipShotId: mockShots[0]?.shotId ?? null,
    })
  },

  selectScene: (sceneId) =>
    set((state) => {
      const firstShotId = state.clipOrder[sceneId]?.[0] ?? null
      return {
        selectedSceneId: sceneId,
        selectedClipShotId: firstShotId,
      }
    }),

  selectClip: (shotId) => set({ selectedClipShotId: shotId }),

  reorderClips: (sceneId, fromIndex, toIndex) =>
    set((state) => {
      const order = [...(state.clipOrder[sceneId] ?? [])]
      const [moved] = order.splice(fromIndex, 1)
      order.splice(toIndex, 0, moved)
      return {
        clipOrder: { ...state.clipOrder, [sceneId]: order },
      }
    }),

  setTrim: (shotId, trimStart, trimEnd) =>
    set((state) => ({
      videoClips: state.videoClips.map((c) =>
        c.shotId === shotId ? { ...c, trimStart, trimEnd } : c,
      ),
    })),

  deleteClip: (shotId) =>
    set((state) => {
      const newOrder: Record<string, string[]> = {}
      for (const [sceneId, ids] of Object.entries(state.clipOrder)) {
        newOrder[sceneId] = ids.filter((id) => id !== shotId)
      }
      return {
        clipOrder: newOrder,
        videoClips: state.videoClips.filter((c) => c.shotId !== shotId),
        selectedClipShotId:
          state.selectedClipShotId === shotId ? null : state.selectedClipShotId,
      }
    }),

  renderDraft: async () => {
    set({ rendering: true, error: null })

    try {
      const { clipOrder, selectedSceneId } = get()

      const res = await fetch('/api/editor/render-draft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clipOrder,
          sceneId: selectedSceneId,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Render failed')
      }

      // MVP: just marks render complete (actual video merge is post-MVP)
      set({ rendering: false })
    } catch (err) {
      set({
        rendering: false,
        error: err instanceof Error ? err.message : 'Render failed',
      })
    }
  },
}))
