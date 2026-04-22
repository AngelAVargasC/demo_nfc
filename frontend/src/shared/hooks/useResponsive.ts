import { useEffect, useState } from 'react'

type ResponsiveState = {
  width: number
  isMobile: boolean
  isTablet: boolean
  isDesktop: boolean
}

const MOBILE_MAX = 768
const TABLET_MAX = 1100

function getState(): ResponsiveState {
  if (typeof window === 'undefined') {
    return { width: 1280, isMobile: false, isTablet: false, isDesktop: true }
  }

  const width = window.innerWidth
  return {
    width,
    isMobile: width <= MOBILE_MAX,
    isTablet: width > MOBILE_MAX && width <= TABLET_MAX,
    isDesktop: width > TABLET_MAX,
  }
}

export function useResponsive() {
  const [state, setState] = useState<ResponsiveState>(getState)

  useEffect(() => {
    let rafId = 0
    const onResize = () => {
      cancelAnimationFrame(rafId)
      rafId = requestAnimationFrame(() => setState(getState()))
    }
    window.addEventListener('resize', onResize)
    return () => {
      cancelAnimationFrame(rafId)
      window.removeEventListener('resize', onResize)
    }
  }, [])

  return state
}
