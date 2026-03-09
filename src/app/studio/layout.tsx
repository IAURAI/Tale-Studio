'use client'

import { useEffect } from 'react'
import { useProjectStore } from '@/stores/project-store'
import { Sidebar } from '@/components/layout/sidebar'
import { Samantha } from '@/components/layout/samantha'
import { useIdleTimeout } from '@/hooks/use-idle-timeout'

export default function StudioLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const initProject = useProjectStore((s) => s.initProject)
  useIdleTimeout()

  useEffect(() => {
    initProject()
  }, [initProject])

  return (
    <>
      <Sidebar />
      <main className="ml-16 min-h-screen">
        <div className="flex h-screen flex-col">{children}</div>
      </main>
      <Samantha />
    </>
  )
}
