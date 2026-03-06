'use client'

import { Play, Pause } from 'lucide-react'
import { useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import type { Shot, VideoClip } from '@/types'

interface VideoPreviewerProps {
  shot: Shot | undefined
  clip: VideoClip | undefined
}

export function VideoPreviewer({ shot, clip }: VideoPreviewerProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [playing, setPlaying] = useState(false)

  const togglePlay = () => {
    if (!videoRef.current) return
    if (playing) {
      videoRef.current.pause()
    } else {
      videoRef.current.play()
    }
    setPlaying(!playing)
  }

  if (!shot) {
    return (
      <div className="flex h-full items-center justify-center bg-black/40">
        <p className="text-sm text-muted-foreground">Select a clip to preview</p>
      </div>
    )
  }

  return (
    <div className="relative flex h-full flex-col items-center justify-center bg-black">
      {clip?.url ? (
        <video
          ref={videoRef}
          src={clip.url}
          className="max-h-full max-w-full"
          onEnded={() => setPlaying(false)}
        />
      ) : (
        <div className="flex flex-col items-center gap-3">
          <div className="flex h-48 w-80 items-center justify-center rounded-lg border border-dashed border-muted-foreground/30 bg-muted/10">
            <div className="text-center">
              <p className="text-lg font-semibold text-muted-foreground">
                {shot.shotType}
              </p>
              <p className="mt-1 max-w-[260px] text-xs text-muted-foreground/70">
                {shot.actionDescription}
              </p>
              <p className="mt-2 text-[10px] text-muted-foreground/50">
                {clip?.status === 'generating'
                  ? 'Generating...'
                  : 'No video generated yet'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Playback controls overlay */}
      {clip?.url && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2">
          <Button
            size="icon"
            variant="secondary"
            className="size-10 rounded-full"
            onClick={togglePlay}
          >
            {playing ? (
              <Pause className="size-4" />
            ) : (
              <Play className="size-4" />
            )}
          </Button>
        </div>
      )}

      {/* Duration badge */}
      <div className="absolute right-3 top-3 rounded bg-black/60 px-2 py-0.5 text-xs text-white">
        {shot.durationSeconds}s
      </div>
    </div>
  )
}
