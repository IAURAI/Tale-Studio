'use client'

import { useEffect } from 'react'
import { useProjectStore } from '@/stores/project-store'
import { Sidebar } from '@/components/layout/sidebar'
import { Samantha } from '@/components/layout/samantha'

export default function StudioLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const initProject = useProjectStore((s) => s.initProject)

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
