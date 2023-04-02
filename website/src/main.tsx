import './index.css'

import React from 'react'
import ReactDOM from 'react-dom/client'
import { RouterProvider } from 'react-router-dom'
import { ConfigProvider, theme as antdTheme } from 'antd'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

import { Router } from './router'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false, // default: true
    },
  },
})

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <ConfigProvider theme={{ algorithm: antdTheme.darkAlgorithm }}>
        <RouterProvider router={Router} />
      </ConfigProvider>
    </QueryClientProvider>
  </React.StrictMode>
)
