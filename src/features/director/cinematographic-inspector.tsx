'use client'

import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { AngleControl } from './angle-control'
import { KeyLight } from './key-light'
import type { Shot, CameraConfig, LightingConfig } from '@/types'

interface CinematographicInspectorProps {
  shot: Shot | undefined
  onUpdateCamera: (config: Partial<CameraConfig>) => void
  onUpdateLighting: (config: Partial<LightingConfig>) => void
}

export function CinematographicInspector({
  shot,
  onUpdateCamera,
  onUpdateLighting,
}: CinematographicInspectorProps) {
  if (!shot) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-sm text-muted-foreground">Select a shot</p>
      </div>
    )
  }

  return (
    <ScrollArea className="h-full">
      <div className="space-y-4 p-4">
        {/* Shot info header */}
        <div>
          <h3 className="text-sm font-semibold">Inspector</h3>
          <p className="mt-1 text-xs text-muted-foreground">
            {shot.shotType} — {shot.generationMethod}
          </p>
        </div>

        <Separator />

        <AngleControl camera={shot.camera} onUpdate={onUpdateCamera} />

        <Separator />

        <KeyLight lighting={shot.lighting} onUpdate={onUpdateLighting} />

        {/* Dialogue preview */}
        {shot.dialogueLines.length > 0 && (
          <>
            <Separator />
            <div className="space-y-2">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Dialogue
              </h4>
              {shot.dialogueLines.map((line, i) => (
                <p key={i} className="text-xs italic text-muted-foreground">
                  &ldquo;{line.text}&rdquo;
                </p>
              ))}
            </div>
          </>
        )}
      </div>
    </ScrollArea>
  )
}
