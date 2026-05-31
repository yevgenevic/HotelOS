import { useEffect, useMemo, useState } from 'react'
import { useMockHotelData } from './hooks/useMockHotelData'
import { BuildingIcon, MoonIcon, SunIcon } from './lib/icons'
import ConnectionStatus from './components/ConnectionStatus'
import StatBar from './components/StatBar'
import RoomGrid from './components/RoomGrid'
import OrderFeed from './components/OrderFeed'
import MaintenancePanel from './components/MaintenancePanel'
import ActivityLog from './components/ActivityLog'
import HeroScene from './components/HeroScene'
import LoginScreen from './components/LoginScreen'
import CommandBar from './components/CommandBar'
import ScenarioPanel from './components/ScenarioPanel'
import RoomDetailModal from './components/RoomDetailModal'

const VALID_TOKEN = import.meta.env.VITE_HOTELOS_TOKEN || 'hotel2024'

const MOBILE_TABS = [
  ['rooms', 'Xonalar'],
  ['service', 'Service'],
  ['maintenance', 'Texnik'],
  ['activity', 'Log'],
]

export default function App() {
  const { rooms, orders, maintenance, activity, status, mode, notice, assignTicket, runScenario } =
    useMockHotelData()
  const [authed, setAuthed] = useState(() => localStorage.getItem('hotelos-token')?.length > 0)
  const [theme, setTheme] = useState(() => localStorage.getItem('hotelos-theme') || 'night')
  const [query, setQuery] = useState('')
  const [selectedFloor, setSelectedFloor] = useState('ALL')
  const [selectedRoom, setSelectedRoom] = useState(null)
  const [activeTab, setActiveTab] = useState('rooms')

  useEffect(() => {
    localStorage.setItem('hotelos-theme', theme)
  }, [theme])

  const selectedRoomLive = useMemo(
    () => (selectedRoom ? rooms.find((room) => room.id === selectedRoom.id) ?? selectedRoom : null),
    [rooms, selectedRoom],
  )

  function login(token) {
    localStorage.setItem('hotelos-token', token)
    setAuthed(true)
  }

  function logout() {
    localStorage.removeItem('hotelos-token')
    setAuthed(false)
  }

  if (!authed) return <LoginScreen onLogin={login} validToken={VALID_TOKEN} />

  return (
    <div className={`min-h-dvh ${theme === 'day' ? 'theme-day' : ''}`}>
      <header className="sticky top-0 z-30 border-b border-white/5 bg-gray-950/70 backdrop-blur-xl">
        <div className="mx-auto flex max-w-[1600px] items-center justify-between gap-4 px-4 py-3.5 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <span className="grid h-11 w-11 place-items-center rounded-xl bg-gradient-to-br from-cyan-400 to-indigo-600 text-white shadow-lg shadow-cyan-500/25">
              <BuildingIcon className="h-6 w-6" />
            </span>
            <div className="leading-tight">
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-bold tracking-tight text-white">HotelOS</h1>
                <span className="rounded-md border border-white/10 bg-white/5 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                  {mode}
                </span>
              </div>
              <p className="hidden text-xs text-slate-400 sm:block">Operatsion boshqaruv paneli</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <ConnectionStatus status={status} />
            <button
              type="button"
              onClick={() => setTheme((value) => (value === 'night' ? 'day' : 'night'))}
              aria-label="Rang rejimini almashtirish"
              className="grid h-10 w-10 place-items-center rounded-full border border-white/10 bg-white/5 text-slate-200 transition hover:bg-white/10"
            >
              {theme === 'night' ? <SunIcon className="h-4 w-4" /> : <MoonIcon className="h-4 w-4" />}
            </button>
            <button
              type="button"
              onClick={logout}
              className="hidden h-10 rounded-full border border-white/10 bg-white/5 px-3 text-xs font-bold text-slate-300 transition hover:bg-white/10 sm:inline-flex sm:items-center"
            >
              Chiqish
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1600px] px-4 py-6 sm:px-6 lg:px-8">
        <HeroScene />
        <CommandBar query={query} onQueryChange={setQuery} notice={notice} />

        <div className="mt-6">
          <StatBar rooms={rooms} orders={orders} maintenance={maintenance} />
        </div>

        <ScenarioPanel onRun={runScenario} />

        <div className="mt-6 grid grid-cols-4 gap-2 xl:hidden">
          {MOBILE_TABS.map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setActiveTab(id)}
              aria-pressed={activeTab === id}
              className={`rounded-xl border px-2 py-2 text-xs font-black transition ${
                activeTab === id
                  ? 'border-cyan-300/40 bg-cyan-300/15 text-cyan-100'
                  : 'border-white/10 bg-white/5 text-slate-400'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-3">
          <div className={`${activeTab === 'rooms' ? 'block' : 'hidden'} xl:col-span-2 xl:block`}>
            <RoomGrid
              rooms={rooms}
              query={query}
              selectedFloor={selectedFloor}
              onFloorChange={setSelectedFloor}
              onRoomSelect={setSelectedRoom}
            />
          </div>

          <div className="contents xl:block">
            <div className={`${activeTab === 'service' ? 'block' : 'hidden'} xl:block`}>
              <OrderFeed orders={orders} />
            </div>
            <div className={`${activeTab === 'maintenance' ? 'block' : 'hidden'} mt-6 xl:block`}>
              <MaintenancePanel maintenance={maintenance} onAssign={assignTicket} />
            </div>
            <div className={`${activeTab === 'activity' ? 'block' : 'hidden'} mt-6 xl:block`}>
              <ActivityLog activity={activity} />
            </div>
          </div>
        </div>

        <footer className="mt-8 pb-4 text-center text-xs text-slate-600">
          HotelOS · real-time operatsion monitoring · WebSocket yoki mock oqim bilan ishlaydi
        </footer>
      </main>

      <RoomDetailModal
        room={selectedRoomLive}
        orders={orders}
        maintenance={maintenance}
        onClose={() => setSelectedRoom(null)}
      />
    </div>
  )
}
