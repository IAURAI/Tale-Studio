import { create } from 'zustand'
import type { Shot, VideoClip, CameraConfig, LightingConfig } from '@/types'

interface ChatMessage {
  role: 'user' | 'model'
  content: string
}

interface DirectorState {
  shots: Shot[]
  videoClips: VideoClip[]
  selectedSceneId: string | null
  selectedShotId: string | null

  // Chat
  chatMessages: ChatMessage[]
  chatLoading: boolean

  // Generation
  generatingVideoShotId: string | null
  error: string | null

  loadMockData: () => void
  selectScene: (id: string) => void
  selectShot: (id: string) => void
  updateCamera: (shotId: string, config: Partial<CameraConfig>) => void
  updateLighting: (shotId: string, config: Partial<LightingConfig>) => void
  sendChatMessage: (message: string) => Promise<void>
  applySuggestedCamera: (config: Partial<CameraConfig>) => void
  applySuggestedLighting: (config: Partial<LightingConfig>) => void
  generateVideo: (shotId: string) => Promise<void>
}

export const useDirectorStore = create<DirectorState>((set, get) => ({
  shots: [],
  videoClips: [],
  selectedSceneId: null,
  selectedShotId: null,
  chatMessages: [],
  chatLoading: false,
  generatingVideoShotId: null,
  error: null,

  loadMockData: async () => {
    const [{ mockShots }, { mockVideoClips }] = await Promise.all([
      import('@/mocks/shot-sequences'),
      import('@/mocks/video-clips'),
    ])

    set({
      shots: mockShots,
      videoClips: mockVideoClips,
      selectedSceneId: mockShots[0]?.sceneId ?? null,
      selectedShotId: mockShots[0]?.shotId ?? null,
    })
  },

  selectScene: (id) =>
    set((state) => {
      const firstShot = state.shots.find((s) => s.sceneId === id)
      return {
        selectedSceneId: id,
        selectedShotId: firstShot?.shotId ?? null,
      }
    }),

  selectShot: (id) => set({ selectedShotId: id }),

  updateCamera: (shotId, config) =>
    set((state) => ({
      shots: state.shots.map((s) =>
        s.shotId === shotId ? { ...s, camera: { ...s.camera, ...config } } : s,
      ),
    })),

  updateLighting: (shotId, config) =>
    set((state) => ({
      shots: state.shots.map((s) =>
        s.shotId === shotId
          ? { ...s, lighting: { ...s.lighting, ...config } }
          : s,
      ),
    })),

  sendChatMessage: async (message: string) => {
    const { chatMessages, selectedShotId, shots } = get()
    const selectedShot = shots.find((s) => s.shotId === selectedShotId)

    set({
      chatMessages: [...chatMessages, { role: 'user', content: message }],
      chatLoading: true,
      error: null,
    })

    try {
      const history = chatMessages.map((m) => ({
        role: m.role,
        content: m.content,
      }))

      const shotContext = selectedShot
        ? {
            shotType: selectedShot.shotType,
            actionDescription: selectedShot.actionDescription,
            camera: selectedShot.camera,
            lighting: selectedShot.lighting,
            generationMethod: selectedShot.generationMethod,
          }
        : undefined

      const res = await fetch('/api/director/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, history, shotContext }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Chat failed')
      }

      const data = await res.json()

      set((state) => ({
        chatMessages: [
          ...state.chatMessages,
          { role: 'model', content: data.reply },
        ],
        chatLoading: false,
      }))
    } catch (err) {
      set({
        chatLoading: false,
        error: err instanceof Error ? err.message : 'Chat failed',
      })
    }
  },

  applySuggestedCamera: (config) => {
    const { selectedShotId } = get()
    if (!selectedShotId) return
    get().updateCamera(selectedShotId, config)
  },

  applySuggestedLighting: (config) => {
    const { selectedShotId } = get()
    if (!selectedShotId) return
    get().updateLighting(selectedShotId, config)
  },

  generateVideo: async (shotId: string) => {
    set({ generatingVideoShotId: shotId, error: null })

    try {
      const res = await fetch('/api/director/generate-video', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ shotId }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Video generation failed')
      }

      const data = await res.json()

      set((state) => ({
        videoClips: state.videoClips.map((c) =>
          c.shotId === shotId
            ? { ...c, status: data.status, url: data.url ?? c.url }
            : c,
        ),
        generatingVideoShotId: null,
      }))
    } catch (err) {
      set({
        generatingVideoShotId: null,
        error: err instanceof Error ? err.message : 'Video generation failed',
      })
    }
  },
}))
