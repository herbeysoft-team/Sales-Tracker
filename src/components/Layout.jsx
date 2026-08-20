import { useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import {
  LayoutGrid,
  Users,
  Receipt,
  UserCog,
  UserCircle,
  FileText,
  ShieldCheck,
  LogOut,
  Menu,
  X,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'

const navItem = 'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition'
const navActive = 'bg-paper/10 text-paper'
const navInactive = 'text-paper/60 hover:bg-paper/5 hover:text-paper'

const tabItem = 'flex flex-1 flex-col items-center justify-center gap-1 py-2 text-[11px] font-medium'
const tabActive = 'text-brand'
const tabInactive = 'text-ink-faint'

export default function Layout({ children }) {
  const { profile, isAdmin, logout } = useAuth()
  const navigate = useNavigate()
  const [drawerOpen, setDrawerOpen] = useState(false)

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  return (
    <div className="flex min-h-screen flex-col bg-paper md:flex-row">
      {/* Mobile top bar */}
      <header className="flex items-center justify-between border-b border-line bg-card px-4 py-3 md:hidden print:hidden">
        <div className="flex items-center gap-2">
          <img src="/favicon.svg" alt="" className="h-5 w-5 rounded" />
          <span className="text-base font-semibold">SALES TRACKER</span>
        </div>
        <button
          onClick={() => setDrawerOpen(true)}
          className="rounded-md p-1.5 text-ink-soft active:bg-paper"
          aria-label="Open menu"
        >
          <Menu size={22} />
        </button>
      </header>

      {/* Mobile slide-out drawer (account info, admin-only links) */}
      {drawerOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-brand-dark/40" onClick={() => setDrawerOpen(false)} />
          <div className="absolute right-0 top-0 h-full w-72 bg-brand-dark px-4 py-6">
            <div className="mb-6 flex items-center justify-between">
              <span className="text-base font-semibold text-paper">Menu</span>
              <button onClick={() => setDrawerOpen(false)} className="text-paper/70" aria-label="Close menu">
                <X size={22} />
              </button>
            </div>

            <nav className="space-y-1">
              <NavLink
                to="/profile"
                onClick={() => setDrawerOpen(false)}
                className={({ isActive }) => `${navItem} ${isActive ? navActive : navInactive}`}
              >
                <UserCircle size={17} /> Profile
              </NavLink>
              <NavLink
                to="/reports"
                onClick={() => setDrawerOpen(false)}
                className={({ isActive }) => `${navItem} ${isActive ? navActive : navInactive}`}
              >
                <FileText size={17} /> Reports
              </NavLink>
              {isAdmin && (
                <NavLink
                  to="/marketers"
                  onClick={() => setDrawerOpen(false)}
                  className={({ isActive }) => `${navItem} ${isActive ? navActive : navInactive}`}
                >
                  <UserCog size={17} /> Marketers
                </NavLink>
              )}
              {isAdmin && (
                <NavLink
                  to="/audit-trail"
                  onClick={() => setDrawerOpen(false)}
                  className={({ isActive }) => `${navItem} ${isActive ? navActive : navInactive}`}
                >
                  <ShieldCheck size={17} /> Audit trail
                </NavLink>
              )}
            </nav>

            <div className="mt-8 space-y-3 border-t border-paper/10 pt-4">
              <div>
                <p className="truncate text-sm font-medium text-paper">{profile?.name || '—'}</p>
                <p className="text-xs uppercase tracking-wide text-paper/40">{profile?.role}</p>
              </div>
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 rounded-md py-1.5 text-sm text-paper/60"
              >
                <LogOut size={16} /> Sign out
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Desktop sidebar */}
      <aside className="hidden w-60 flex-shrink-0 flex-col justify-between bg-brand-dark px-4 py-6 md:flex print:hidden">
        <div>
          <div className="mb-8 flex items-center gap-2 px-2">
            <img src="/favicon.svg" alt="" className="h-6 w-6 rounded" />
            <span className="text-lg font-semibold text-paper">SALES TRACKER</span>
          </div>

          <nav className="space-y-1">
            <NavLink to="/dashboard" className={({ isActive }) => `${navItem} ${isActive ? navActive : navInactive}`}>
              <LayoutGrid size={17} /> Dashboard
            </NavLink>
            <NavLink to="/customers" className={({ isActive }) => `${navItem} ${isActive ? navActive : navInactive}`}>
              <Users size={17} /> Customers
            </NavLink>
            <NavLink to="/sales" className={({ isActive }) => `${navItem} ${isActive ? navActive : navInactive}`}>
              <Receipt size={17} /> Sales Ledger
            </NavLink>
            <NavLink to="/reports" className={({ isActive }) => `${navItem} ${isActive ? navActive : navInactive}`}>
              <FileText size={17} /> Reports
            </NavLink>
            {isAdmin && (
              <NavLink to="/marketers" className={({ isActive }) => `${navItem} ${isActive ? navActive : navInactive}`}>
                <UserCog size={17} /> Marketers
              </NavLink>
            )}
            {isAdmin && (
              <NavLink to="/audit-trail" className={({ isActive }) => `${navItem} ${isActive ? navActive : navInactive}`}>
                <ShieldCheck size={17} /> Audit trail
              </NavLink>
            )}
            <NavLink to="/profile" className={({ isActive }) => `${navItem} ${isActive ? navActive : navInactive}`}>
              <UserCircle size={17} /> Profile
            </NavLink>
          </nav>
        </div>

        <div className="space-y-3 px-2">
          <div className="border-t border-paper/10 pt-3">
            <p className="truncate text-sm font-medium text-paper">{profile?.name || '—'}</p>
            <p className="text-xs uppercase tracking-wide text-paper/40">{profile?.role}</p>
          </div>
          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm text-paper/60 transition hover:text-paper"
          >
            <LogOut size={16} /> Sign out
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto pb-20 md:pb-0 print:pb-0">
        <div className="mx-auto max-w-6xl px-4 py-5 sm:px-6 md:px-8 md:py-8 print:max-w-none print:p-0">{children}</div>
      </main>

      {/* Mobile bottom tab bar */}
      <nav className="fixed inset-x-0 bottom-0 z-40 flex border-t border-line bg-card md:hidden print:hidden">
        <NavLink to="/dashboard" className={({ isActive }) => `${tabItem} ${isActive ? tabActive : tabInactive}`}>
          <LayoutGrid size={20} />
          Dashboard
        </NavLink>
        <NavLink to="/customers" className={({ isActive }) => `${tabItem} ${isActive ? tabActive : tabInactive}`}>
          <Users size={20} />
          Customers
        </NavLink>
        <NavLink to="/sales" className={({ isActive }) => `${tabItem} ${isActive ? tabActive : tabInactive}`}>
          <Receipt size={20} />
          Sales
        </NavLink>
        <button onClick={() => setDrawerOpen(true)} className={`${tabItem} ${tabInactive}`}>
          <Menu size={20} />
          More
        </button>
      </nav>
    </div>
  )
}
