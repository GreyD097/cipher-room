import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import Unlock from '@/pages/Unlock'
import Room from '@/pages/Room'
import Admin from '@/pages/Admin'

export default function App() {
  return (
    <Router>
      <div className="h-full">
        <Routes>
          <Route path="/" element={<Unlock />} />
          <Route path="/r/:roomId" element={<Room />} />
          <Route path="/admin" element={<Admin />} />
        </Routes>
      </div>
    </Router>
  )
}
