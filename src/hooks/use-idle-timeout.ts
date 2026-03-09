'use client'

import { useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'

const IDLE_TIMEOUT = 30 * 60 * 1000 // 30 minutes
const WARNING_BEFORE = 5 * 60 * 1000 // warn 5 min before

export function useIdleTimeout() {
  const router = useRouter()
  const idleTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const warnTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const warned = useRef(false)

  useEffect(() => {
    const supabase = createClient()

    function resetTimers() {
      if (idleTimer.current) clearTimeout(idleTimer.current)
      if (warnTimer.current) clearTimeout(warnTimer.current)
      warned.current = false

      warnTimer.current = setTimeout(() => {
        warned.current = true
        toast.warning('세션이 곧 만료됩니다', {
          description: '5분 내 활동이 없으면 자동 로그아웃됩니다.',
          duration: 10_000,
        })
      }, IDLE_TIMEOUT - WARNING_BEFORE)

      idleTimer.current = setTimeout(async () => {
        await supabase.auth.signOut()
        router.push('/login')
      }, IDLE_TIMEOUT)
    }

    const events = ['mousemove', 'keydown', 'mousedown', 'touchstart'] as const

    events.forEach((e) => window.addEventListener(e, resetTimers, { passive: true }))
    resetTimers()

    return () => {
      events.forEach((e) => window.removeEventListener(e, resetTimers))
      if (idleTimer.current) clearTimeout(idleTimer.current)
      if (warnTimer.current) clearTimeout(warnTimer.current)
    }
  }, [router])
}
