import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import Unlock from '@/pages/Unlock'
import Room from '@/pages/Room'
import Admin from '@/pages/Admin'
import Lock from '@/pages/Lock'
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
          <Route path="/admin" element={<Admin />} />
        </Routes>
      </div>
    </Router>
  )
}
