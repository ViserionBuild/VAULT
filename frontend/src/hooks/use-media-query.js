import { useSyncExternalStore } from 'react'

/** Live result of a CSS media query, e.g. useMediaQuery('(max-width: 767px)'). */
export function useMediaQuery(query) {
  return useSyncExternalStore(
    (onChange) => {
      const mql = window.matchMedia(query)
      mql.addEventListener('change', onChange)
      return () => mql.removeEventListener('change', onChange)
    },
    () => window.matchMedia(query).matches,
    () => false,
  )
}

// Matches Tailwind's `md` breakpoint: below it the app uses the phone layout.
export const useIsMobile = () => useMediaQuery('(max-width: 767px)')
