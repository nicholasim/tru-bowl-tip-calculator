'use client'

import dynamic from 'next/dynamic'

// The app is a fully client-rendered, login/guest-gated tool with no SEO or
// server-data needs, and several pieces of its state (localStorage, theme)
// were written assuming a browser is always present. Loading it client-only
// (ssr: false) reproduces the original Vite SPA's load behavior exactly,
// rather than retrofitting every hook to be SSR/hydration-safe.
const App = dynamic(() => import('@/components/App').then((mod) => mod.App), {
  ssr: false,
})

export default function Page() {
  return <App />
}
