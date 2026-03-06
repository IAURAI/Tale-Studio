'use client'

import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'

interface SceneTabsProps {
  sceneIds: string[]
  selectedSceneId: string | null
  onSelect: (sceneId: string) => void
}

export function SceneTabs({
  sceneIds,
  selectedSceneId,
  onSelect,
}: SceneTabsProps) {
  return (
    <Tabs
      value={selectedSceneId ?? undefined}
      onValueChange={onSelect}
    >
      <TabsList className="bg-muted/50">
        {sceneIds.map((id, i) => (
          <TabsTrigger key={id} value={id} className="text-xs">
            SC_{String(i + 1).padStart(2, '0')}
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  )
}
