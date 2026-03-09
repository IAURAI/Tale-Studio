'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { LogOut, Plus } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { createClient } from '@/lib/supabase/client'
import { useProjectStore } from '@/stores/project-store'

export function UserMenu() {
  const router = useRouter()
  const supabase = createClient()
  const createNewProject = useProjectStore((s) => s.createNewProject)

  const [avatar, setAvatar] = useState<string | null>(null)
  const [initials, setInitials] = useState('U')

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return
      const url = user.user_metadata?.avatar_url ?? null
      setAvatar(url)
      const name = user.user_metadata?.full_name ?? user.email ?? ''
      setInitials(
        name
          .split(' ')
          .map((w: string) => w[0])
          .join('')
          .slice(0, 2)
          .toUpperCase() || 'U',
      )
    })
  }, [supabase])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const handleNewProject = async () => {
    await createNewProject()
    router.push('/studio/producer')
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="flex h-10 w-10 items-center justify-center rounded-full border border-border bg-muted text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus:outline-none">
          {avatar ? (
            <img
              src={avatar}
              alt="User"
              className="h-10 w-10 rounded-full object-cover"
              referrerPolicy="no-referrer"
            />
          ) : (
            initials
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent side="right" align="end" className="w-44">
        <DropdownMenuItem onClick={handleNewProject}>
          <Plus className="mr-2 h-4 w-4" />
          New Project
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleLogout}>
          <LogOut className="mr-2 h-4 w-4" />
          Logout
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
