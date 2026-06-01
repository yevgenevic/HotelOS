import { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { useMockHotelData } from './hooks/useMockHotelData'
import { BuildingIcon, PlusIcon, LogOutIcon } from './lib/icons'
import { SPRING } from './lib/constants'
import { ToastProvider } from './components/Toast'
import StatBar from './components/StatBar'
import RoomGrid from './components/RoomGrid'
import OrderFeed from './components/OrderFeed'
import MaintenancePanel from './components/MaintenancePanel'
import ActivityLog from './components/ActivityLog'
import LoginScreen from './components/LoginScreen'
import CommandBar from './components/CommandBar'
import RoomDetailModal from './components/RoomDetailModal'
import CheckInModal from './components/CheckInModal'
import HousekeepingPanel from './components/HousekeepingPanel'
import CheckoutArchive from './components/CheckoutArchive'
import AdminAnalytics from './components/AdminAnalytics'
import { GlassFilter } from './components/ui/LiquidGlass'

const VALID_TOKEN = import.meta.env.VITE_HOTELOS_TOKEN || 'hotel2024'

// Each role defines its own visual experience, layout, and feature flags.
const ROLE_CONFIG = {
  receptionist: {
    gradient: 'from-cyan-400 to-cyan-600',
    glow: 'shadow-cyan-500/25',
    tabActive: 'border-cyan-300/40 bg-cyan-300/15 text-cyan-100',
    label: 'Qabulxona xodimi',
    showStatBar: false,
    showScenario: false,
    showOrderFeed: false,
    showMaintenance: false,
    showHousekeeping: false,
    showCheckinFAB: true,
    showQuickCheckout: true,
    layout: 'rooms-first',
    tabs: [['rooms', 'Xonalar'], ['archive', 'Arxiv'], ['activity', 'Log']],
    defaultTab: 'rooms',
    highlightStatuses: [],
    roomGridReadOnly: false,
  },
  housekeeper: {
    gradient: 'from-emerald-400 to-emerald-600',
    glow: 'shadow-emerald-500/25',
    tabActive: 'border-emerald-300/40 bg-emerald-300/15 text-emerald-100',
    label: 'Uy xizmati',
    showStatBar: false,
    showScenario: false,
    showOrderFeed: false,
    showMaintenance: false,
    showHousekeeping: true,
    showCheckinFAB: false,
    showQuickCheckout: false,
    layout: 'rooms-first',
    tabs: [['rooms', 'Xonalar'], ['housekeeping', 'Tozalik'], ['activity', 'Log']],
    defaultTab: 'rooms',
    highlightStatuses: ['DIRTY'],
    roomGridReadOnly: false,
  },
  roomservice: {
    gradient: 'from-amber-400 to-amber-600',
    glow: 'shadow-amber-500/25',
    tabActive: 'border-amber-300/40 bg-amber-300/15 text-amber-100',
    label: 'Room Service',
    showStatBar: false,
    showScenario: false,
    showOrderFeed: true,
    showMaintenance: false,
    showHousekeeping: false,
    showCheckinFAB: false,
    showQuickCheckout: false,
    layout: 'service-first',
    tabs: [['service', 'Servis'], ['rooms', 'Xonalar'], ['activity', 'Log']],
    defaultTab: 'service',
    highlightStatuses: [],
    roomGridReadOnly: true,
  },
  technician: {
    gradient: 'from-rose-400 to-rose-600',
    glow: 'shadow-rose-500/25',
    tabActive: 'border-rose-300/40 bg-rose-300/15 text-rose-100',
    label: 'Texnik xodim',
    showStatBar: false,
    showScenario: false,
    showOrderFeed: false,
    showMaintenance: true,
    showHousekeeping: false,
    showCheckinFAB: false,
    showQuickCheckout: false,
    layout: 'maintenance-first',
    tabs: [['maintenance', 'Texnik'], ['rooms', 'Xonalar'], ['activity', 'Log']],
    defaultTab: 'maintenance',
    highlightStatuses: ['MAINTENANCE'],
    roomGridReadOnly: true,
  },
  admin: {
    gradient: 'from-violet-400 to-violet-600',
    glow: 'shadow-violet-500/25',
    tabActive: 'border-cyan-300/40 bg-cyan-300/15 text-cyan-100',
    label: 'Administrator',
    showStatBar: true,
    showScenario: true,
    showOrderFeed: true,
    showMaintenance: true,
    showHousekeeping: true,
    showCheckinFAB: true,
    showQuickCheckout: false,
    layout: 'rooms-first',
    tabs: [
      ['rooms', 'Xonalar'],
      ['service', 'Servis'],
      ['maintenance', 'Texnik'],
      ['analytics', 'Analitika'],
      ['archive', 'Arxiv'],
      ['housekeeping', 'Tozalik'],
      ['activity', 'Log'],
    ],
    defaultTab: 'rooms',
    highlightStatuses: [],
    roomGridReadOnly: false,
  },
}

function getRole() {
  try {
    const role = JSON.parse(localStorage.getItem('hotelos-session') || '{}').role || 'admin'
    return role === 'room_service' ? 'roomservice' : role
  } catch {
    return 'admin'
  }
}

export default function App() {
  const {
    rooms,
    orders,
    maintenance,
    activity,
    status,
    mode,
    notice,
    checkouts,
    clearCheckoutArchive,
    assignTicket,
    resolveTicket,
    checkinGuest,
    checkoutGuest,
    cleanRoom,
    addOrderMock,
    advanceOrder,
    addIssueMock,
  } = useMockHotelData()

  const [authed, setAuthed] = useState(() => localStorage.getItem('hotelos-token')?.length > 0)
  const [role, setRole] = useState(getRole)
  const [query, setQuery] = useState('')
  const [selectedFloor, setSelectedFloor] = useState('ALL')
  const [selectedRoom, setSelectedRoom] = useState(null)
  const [showCheckin, setShowCheckin] = useState(false)

  const cfg = ROLE_CONFIG[role] ?? ROLE_CONFIG.admin
  const [activeTab, setActiveTab] = useState(cfg.defaultTab)

  // Reset tab whenever role changes (e.g. immediately after login)
  useEffect(() => {
    setActiveTab((ROLE_CONFIG[role] ?? ROLE_CONFIG.admin).defaultTab)
  }, [role])



  const selectedRoomLive = useMemo(
    () => (selectedRoom ? rooms.find((r) => r.id === selectedRoom.id) ?? selectedRoom : null),
    [rooms, selectedRoom],
  )

  function login(token, userRole = 'admin') {
    const roleMapped = userRole === 'room_service' ? 'roomservice' : userRole
    localStorage.setItem('hotelos-token', token)
    localStorage.setItem('hotelos-session', JSON.stringify({ jwt: token, role: roleMapped }))
    setRole(roleMapped)
    setAuthed(true)
  }

  function logout() {
    localStorage.removeItem('hotelos-token')
    localStorage.removeItem('hotelos-session')
    setAuthed(false)
    setRole('admin')
  }

  if (!authed) return <LoginScreen onLogin={login} validToken={VALID_TOKEN} />

  const { layout, tabs } = cfg

  // Shared RoomGrid props — varies by role
  const roomGridProps = {
    rooms,
    query,
    selectedFloor,
    onFloorChange: setSelectedFloor,
    onRoomSelect: cfg.roomGridReadOnly ? undefined : setSelectedRoom,
    highlightStatuses: cfg.highlightStatuses,
    onQuickCheckout: cfg.showQuickCheckout ? checkoutGuest : undefined,
  }

  return (
    <ToastProvider>
      <div className="min-h-dvh">
        {/* Global SVG distortion filter for liquid glass effects */}
        <GlassFilter />
        {/* ── Header ─────────────────────────────────────────────────── */}
        <header className="sticky top-0 z-30 glass-header">
          <div className="mx-auto flex max-w-[1600px] items-center justify-between gap-4 px-4 py-3.5 sm:px-6 lg:px-8">
            <div className="flex items-center gap-3">
              <span
                className={`grid h-11 w-11 place-items-center rounded-xl bg-gradient-to-br ${cfg.gradient} text-white shadow-lg ${cfg.glow}`}
              >
                <BuildingIcon className="h-6 w-6" />
              </span>
              <div className="leading-tight">
                <div className="flex items-center gap-2">
                  <h1 className="text-lg font-bold tracking-tight text-white">HotelOS</h1>
                </div>
                <p className="hidden text-xs text-slate-400 sm:block">{cfg.label}</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={logout}
                aria-label="Chiqish"
                className="grid h-10 w-10 place-items-center rounded-full border border-white/10 bg-white/5 text-slate-300 transition hover:bg-white/10 sm:hidden"
              >
                <LogOutIcon className="h-4 w-4" />
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

        {/* ── Main ───────────────────────────────────────────────────── */}
        <main className="mx-auto max-w-[1600px] px-4 py-6 sm:px-6 lg:px-8">
          <CommandBar query={query} onQueryChange={setQuery} notice={notice} />

          {cfg.showStatBar && (
            <div className="mt-6">
              <StatBar rooms={rooms} orders={orders} maintenance={maintenance} />
            </div>
          )}


          {/* Universal tabs — liquid glass style */}
          <div className="mt-6 flex flex-wrap gap-2">
            {tabs.map(([id, label]) => (
              <button
                key={id}
                type="button"
                onClick={() => setActiveTab(id)}
                aria-pressed={activeTab === id}
                className={`rounded-xl px-3.5 py-2.5 text-xs font-black transition active:scale-95 ${
                  activeTab === id
                    ? 'glass-tab glass-tab-active'
                    : 'glass-tab text-slate-400 hover:text-slate-200'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {/* ── Layout: rooms-first (receptionist, housekeeper, admin) ── */}
          {layout === 'rooms-first' && (
            <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-3">
              <div className="xl:col-span-2">
                {activeTab === 'rooms' && (
                  <RoomGrid {...roomGridProps} />
                )}
                {activeTab === 'service' && (
                  <OrderFeed
                    orders={orders}
                    role={role}
                    onPlaceOrder={addOrderMock}
                    onAdvanceOrder={advanceOrder}
                  />
                )}
                {activeTab === 'maintenance' && (
                  <MaintenancePanel
                    maintenance={maintenance}
                    onAssign={assignTicket}
                    onResolve={resolveTicket}
                    onAddIssue={addIssueMock}
                    role={role}
                  />
                )}
                {activeTab === 'analytics' && (
                  <AdminAnalytics rooms={rooms} orders={orders} checkouts={checkouts} />
                )}
                {activeTab === 'archive' && (
                  <CheckoutArchive checkouts={checkouts} onClearArchive={clearCheckoutArchive} />
                )}
                {activeTab === 'housekeeping' && cfg.showHousekeeping && (
                  <HousekeepingPanel role={role} rooms={rooms} />
                )}
                {activeTab === 'activity' && (
                  <ActivityLog activity={activity} />
                )}

              </div>

              <div className="hidden xl:flex xl:flex-col xl:gap-6">
                {cfg.showOrderFeed && activeTab !== 'service' && (
                  <OrderFeed
                    orders={orders}
                    role={role}
                    onPlaceOrder={addOrderMock}
                    onAdvanceOrder={advanceOrder}
                  />
                )}
                {cfg.showMaintenance && activeTab !== 'maintenance' && (
                  <MaintenancePanel
                    maintenance={maintenance}
                    onAssign={assignTicket}
                    onResolve={resolveTicket}
                    onAddIssue={addIssueMock}
                    role={role}
                  />
                )}
                {activeTab !== 'activity' && (
                  <ActivityLog activity={activity} />
                )}
              </div>
            </div>
          )}

          {/* ── Layout: service-first (roomservice) ─────────────────── */}
          {layout === 'service-first' && (
            <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-3">
              <div className={`xl:col-span-2 xl:block ${activeTab === 'service' ? 'block' : 'hidden'}`}>
                <OrderFeed
                  orders={orders}
                  role={role}
                  onPlaceOrder={addOrderMock}
                  onAdvanceOrder={advanceOrder}
                />
              </div>

              <div className="contents xl:block">
                <div className={`xl:block ${activeTab === 'rooms' ? 'block' : 'hidden'}`}>
                  <RoomGrid {...roomGridProps} />
                </div>
                <div className={`mt-6 xl:block ${activeTab === 'activity' ? 'block' : 'hidden'}`}>
                  <ActivityLog activity={activity} />
                </div>
              </div>
            </div>
          )}

          {/* ── Layout: maintenance-first (technician) ───────────────── */}
          {layout === 'maintenance-first' && (
            <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-3">
              <div
                className={`xl:col-span-2 xl:block ${activeTab === 'maintenance' ? 'block' : 'hidden'}`}
              >
                <MaintenancePanel
                  maintenance={maintenance}
                  onAssign={assignTicket}
                  onResolve={resolveTicket}
                  onAddIssue={addIssueMock}
                  role={role}
                />
              </div>

              <div className="contents xl:block">
                <div className={`xl:block ${activeTab === 'rooms' ? 'block' : 'hidden'}`}>
                  <RoomGrid {...roomGridProps} />
                </div>
                <div className={`mt-6 xl:block ${activeTab === 'activity' ? 'block' : 'hidden'}`}>
                  <ActivityLog activity={activity} />
                </div>
              </div>
            </div>
          )}

          <footer className="mt-8 pb-4 text-center text-xs text-slate-600">
            HotelOS · real-time operatsion boshqaruv tizimi
          </footer>
        </main>

        {/* ── Check-in FAB (receptionist + admin) ────────────────────── */}
        {cfg.showCheckinFAB && (
          <motion.button
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            transition={SPRING}
            type="button"
            onClick={() => setShowCheckin(true)}
            aria-label="Yangi mehmon joylash"
            className={`fixed bottom-6 right-6 z-40 inline-flex h-14 items-center gap-2.5 rounded-2xl bg-gradient-to-br ${cfg.gradient} px-5 text-sm font-black text-white shadow-[0_8px_32px_rgba(34,211,238,0.3)] transition hover:shadow-[0_8px_40px_rgba(34,211,238,0.45)]`}
          >
            <PlusIcon className="h-5 w-5" />
            Joylash
          </motion.button>
        )}

        <CheckInModal
          open={showCheckin}
          onClose={() => setShowCheckin(false)}
          checkinGuest={checkinGuest}
        />

        <RoomDetailModal
          room={selectedRoomLive}
          orders={orders}
          maintenance={maintenance}
          onClose={() => setSelectedRoom(null)}
          role={role}
          onCheckout={checkoutGuest}
          onClean={cleanRoom}
        />
      </div>
    </ToastProvider>
  )
}
