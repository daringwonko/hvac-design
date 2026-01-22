import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { SessionProvider } from './context/SessionContext'
import Layout from './components/Layout/Layout'
import Dashboard from './components/Dashboard'
import Calculator from './components/Calculator/Calculator'
import Projects from './components/Projects/Projects'
import ProjectDetail from './components/Projects/ProjectDetail'
import Visualization from './components/Visualization/Visualization'
import Monitoring from './components/Monitoring/Monitoring'
import Materials from './components/Materials'
import Exports from './components/Exports'
import FloorPlanEditor from './components/FloorPlanEditor'
import HVACRouter from './components/HVACRouter'
import ElectricalRouter from './components/ElectricalRouter'
import PlumbingRouter from './components/PlumbingRouter'

function App() {
  return (
    <SessionProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<Dashboard />} />
            <Route path="calculator" element={<Calculator />} />
            <Route path="projects" element={<Projects />} />
            <Route path="projects/:id" element={<ProjectDetail />} />
            <Route path="visualization" element={<Visualization />} />
            <Route path="monitoring" element={<Monitoring />} />
            <Route path="materials" element={<Materials />} />
            <Route path="exports" element={<Exports />} />
            <Route path="floor-plan" element={<FloorPlanEditor />} />
            <Route path="hvac" element={<HVACRouter />} />
            <Route path="electrical" element={<ElectricalRouter />} />
            <Route path="plumbing" element={<PlumbingRouter />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </SessionProvider>
  )
}

export default App
