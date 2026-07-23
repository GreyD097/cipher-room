import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import Home from '@/pages/Home'
import Unlock from '@/pages/Unlock'
import Room from '@/pages/Room'
import Admin from '@/pages/Admin'
import Lock from '@/pages/Lock'
import PublicList from '@/pages/PublicList'
import PublicCreate from '@/pages/PublicCreate'
import PublicChat from '@/pages/PublicChat'
import { hasLock } from '@/lib/lock'

function LockGuard({ children }: { children: React.ReactNode }) {
  const locked = hasLock()
  const unlocked = sessionStorage.getItem('cipher:unlocked') === '1'
  if (locked && !unlocked) {
    return <Navigate to="/lock" replace />
  }
  return <>{children}</>
}

export default function App() {
  return (
    <Router>
      <div className="h-full">
        <Routes>
          <Route path="/lock" element={<Lock />} />
          <Route
            path="/"
            element={
              <LockGuard>
                <Home />
              </LockGuard>
            }
          />
          <Route
            path="/unlock"
            element={
              <LockGuard>
                <Unlock />
              </LockGuard>
            }
          />
          <Route
            path="/r/:roomId"
            element={
              <LockGuard>
                <Room />
              </LockGuard>
            }
          />
          <Route
            path="/public"
            element={
              <LockGuard>
                <PublicList />
              </LockGuard>
            }
          />
          <Route
            path="/public/create"
            element={
              <LockGuard>
                <PublicCreate />
              </LockGuard>
            }
          />
          <Route
            path="/public/:roomId"
            element={
              <LockGuard>
                <PublicChat />
              </LockGuard>
            }
          />
          <Route path="/admin" element={<Admin />} />
        </Routes>
      </div>
    </Router>
  )
}
