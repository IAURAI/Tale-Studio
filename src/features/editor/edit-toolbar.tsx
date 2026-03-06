'use client'

import { Pencil, Paintbrush, Scissors } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'

const TOOLS = [
  { icon: Pencil, label: 'Edit', tip: 'Coming in Post-MVP' },
  { icon: Paintbrush, label: 'In-Painting', tip: 'Coming in Post-MVP' },
  { icon: Scissors, label: 'Trim', tip: 'Coming in Post-MVP' },
]

export function EditToolbar() {
  return (
    <TooltipProvider>
      <div className="flex flex-col items-center gap-2 border-l border-border px-2 py-4">
        {TOOLS.map(({ icon: Icon, label, tip }) => (
          <Tooltip key={label}>
            <TooltipTrigger asChild>
              <Button
                size="icon"
                variant="ghost"
                className="size-8"
                disabled
              >
                <Icon className="size-4 text-muted-foreground" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="left">
              <p className="text-xs">
                {label} — {tip}
              </p>
            </TooltipContent>
          </Tooltip>
        ))}
      </div>
    </TooltipProvider>
  )
}
