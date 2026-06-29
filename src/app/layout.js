import './globals.css'

export const metadata = {
  title: 'TRŪ Bowl Employee Tip Calculator',
  icons: {
    icon: '/TruBowlLogo.jpg',
  },
}

export const viewport = {
  width: 'device-width',
  initialScale: 1,
}

// Applied before paint so there's no flash of the wrong theme on load.
const THEME_INIT_SCRIPT = `
(function () {
  var stored = localStorage.getItem('tipcalc_theme')
  var theme = stored === 'light' || stored === 'dark' ? stored : 'dark'
  document.documentElement.classList.toggle('dark', theme === 'dark')
})()
`

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body>{children}</body>
    </html>
  )
}
