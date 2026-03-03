import type { StageConfig } from '@/types'

export const STAGES = [
  {
    id: 'producer',
    name: 'The Meeting Room',
    agent: 'Producer',
    path: '/studio/producer',
    handoffLabel: 'Hand over to Writer',
    nextStage: 'writer',
  },
  {
    id: 'writer',
    name: 'The Script Room',
    agent: 'Writer',
    path: '/studio/writer',
    handoffLabel: 'Ask Concept Artist',
    nextStage: 'artist',
  },
  {
    id: 'artist',
    name: 'The Visual Studio',
    agent: 'Concept Artist',
    path: '/studio/artist',
    handoffLabel: 'Approve & Direct',
    nextStage: 'director',
  },
  {
    id: 'director',
    name: 'The Set',
    agent: 'Director',
    path: '/studio/director',
    handoffLabel: 'Head to Editor',
    nextStage: 'editor',
  },
  {
    id: 'editor',
    name: 'Post-Production Suite',
    agent: 'Editor',
    path: '/studio/editor',
    handoffLabel: '',
    nextStage: null,
  },
] as const satisfies readonly StageConfig[]

export const CAMERA_AXIS_RANGE = { min: -10, max: 10 } as const
export const PROMPT_MAX_LENGTH = 150
export const SHOTS_PER_SCENE = 6
export const DEFAULT_SCENES_COUNT = 4
export const DEFAULT_SHOT_DURATION = 8
