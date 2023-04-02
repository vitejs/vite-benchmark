import {
  createBrowserRouter,
  createRoutesFromElements,
  Route,
} from 'react-router-dom'
import App from './App'
import { CommitPage } from './pages/Commit'
import { ComparePage } from './pages/Compare'

export const Router = createBrowserRouter(
  createRoutesFromElements(
    <Route path="/vite-benchmark">
      <Route index element={<App />} />
      <Route path="commit" element={<CommitPage />} />
      <Route path="compare" element={<ComparePage />} />
    </Route>
  )
)
