import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@mantine/core/styles.css'
import './index.css'
import { MantineProvider, createTheme } from '@mantine/core'
import App from './App.jsx'

const theme = createTheme({
  primaryColor: 'forest',
  primaryShade: 7,
  colors: {
    forest: [
      '#e9f3ef',
      '#cfe3da',
      '#a7c9b9',
      '#7fae97',
      '#5b9477',
      '#3f7b5e',
      '#28634a',
      '#0b3d2e',
      '#0a3327',
      '#062318',
    ],
    lime: [
      '#f7fde9',
      '#edfac6',
      '#d9f59e',
      '#c4ee75',
      '#bef264',
      '#a3e635',
      '#84cc16',
      '#65a30d',
      '#4d7c0f',
      '#365314',
    ],
  },
  fontFamily: "'Inter', ui-sans-serif, system-ui, -apple-system, sans-serif",
  headings: {
    fontFamily: "'Inter', ui-sans-serif, system-ui, sans-serif",
    fontWeight: '800',
  },
  defaultRadius: 'xl',
})

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <MantineProvider theme={theme} defaultColorScheme="light">
      <App />
    </MantineProvider>
  </StrictMode>,
)

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/service-worker.js').catch((err) => {
      console.warn('SW registration failed:', err)
    })
  })
}
