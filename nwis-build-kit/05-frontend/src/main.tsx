import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import App from './App'
import './styles/index.css'
import { installPalette } from './components/landing/heroPalette'

/* The hero's colours, before the first paint: the flat SVG, the CSS and the WebGL rock all read
   these, and the last of those reads them off the document root rather than off its own box. */
installPalette()

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // The starter serves a fixed dataset, so a short stale time keeps navigation snappy
      // without hiding the live feed, which arrives over the WebSocket instead.
      staleTime: 15_000,
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
})

const container = document.getElementById('root')
if (!container) throw new Error('#root is missing from index.html')

createRoot(container).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </QueryClientProvider>
  </StrictMode>,
)
