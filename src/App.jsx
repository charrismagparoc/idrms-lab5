import { useEffect, useState } from 'react'
import { AppProvider, useApp } from './context/AppContext'
import { WeatherProvider } from './context/WeatherContext'

import Sidebar from './components/layout/Sidebar'
import Topbar from './components/layout/Topbar'
import Login from './pages/Login'

import ActivityLogPage from './pages/ActivityLogPage'
import AlertsPage from './pages/AlertsPage'
import Dashboard from './pages/Dashboard'
import EvacuationPage from './pages/EvacuationPage'
import IncidentsPage from './pages/IncidentsPage'
import MapPage from './pages/MapPage'
import ReportsPage from './pages/ReportsPage'
import ResidentsPage from './pages/ResidentsPage'
import ResourcesPage from './pages/ResourcesPage'
import RiskIntelligencePage from './pages/RiskIntelligencePage'
import UsersPage from './pages/UsersPage'

const PAGES = {
  dashboard:    Dashboard,
  map:          MapPage,
  incidents:    IncidentsPage,
  alerts:       AlertsPage,
  evacuation:   EvacuationPage,
  residents:    ResidentsPage,
  resources:    ResourcesPage,
  reports:      ReportsPage,
  intelligence: RiskIntelligencePage,
  users:        UsersPage,
  activity:     ActivityLogPage,
}

function Shell() {
  const { loginUser, logSignOut } = useApp()
  const [user, setUser] = useState(null)
  const [activePage, setActivePage] = useState(() => {
    const h = window.location.hash.slice(1)
    return h && PAGES[h] ? h : 'dashboard'
  })

  const handleLogin = async (email, password) => {
    const result = await loginUser(email, password)
    if (result.success) setUser(result.user)
    return result
  }

  const handleLogout = async () => {
    if (user) await logSignOut(user.name)
    setUser(null)
    setActivePage('dashboard')
  }

  useEffect(() => {
    if (window.location.hash.slice(1) !== activePage) {
      window.location.hash = activePage
    }
  }, [activePage])

  useEffect(() => {
    const onHash = () => {
      const h = window.location.hash.slice(1)
      if (h && PAGES[h] && h !== activePage) setActivePage(h)
    }
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [activePage])

  if (!user) return <Login onLogin={handleLogin} />

  const PageComponent = PAGES[activePage] || Dashboard

  return (
    <div className="app-shell">
      <Sidebar activePage={activePage} setActivePage={setActivePage} currentUser={user} />
      <div className="app-main">
        <Topbar activePage={activePage} currentUser={user} onLogout={handleLogout} />
        <main className="page-body">
          <PageComponent />
        </main>
      </div>
    </div>
  )
}

export default function App() {
  return (
    <AppProvider>
      <WeatherProvider>
        <Shell />
      </WeatherProvider>
    </AppProvider>
  )
}
