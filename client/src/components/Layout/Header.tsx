import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import ThemeToggle from '../Shared/ThemeToggle'

const NAV_LINKS = [
  { to: '/', label: 'About' },
  { to: '/dashboard', label: 'Dashboard' },
  { to: '/data', label: 'Data' },
]

export default function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const location = useLocation()

  useEffect(() => {
    setIsMenuOpen(false)
  }, [location.pathname])

  function toggleMenu() {
    setIsMenuOpen((prev) => !prev)
  }

  return (
    <header className="bg-color-primary sticky top-0 text-inverse px-4 md:px-6 py-3 shadow-theme-md relative" style={{ zIndex: 100 }}>
      <div className="flex items-center justify-between gap-4">
        <Link to="/" className="flex items-center gap-3" aria-label="WaterLab Home">
          <img src="/logo/logoWaterLab.png" alt="Water Analysis Logo" className="h-14 md:h-16 lg:h-16 w-auto -my-2 object-contain" />
          <span className="text-base md:text-lg font-medium italic">WaterLab</span>
        </Link>
        <div className="flex items-center gap-4">
          <nav className="hidden md:flex gap-4" aria-label="Primary navigation">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className="hover:underline transition-opacity uppercase text-sm md:text-base"
              >
                {link.label}
              </Link>
            ))}
          </nav>
          <ThemeToggle />
          <button
            type="button"
            className="md:hidden flex flex-col justify-center items-center w-10 h-10 rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-white/80 focus-visible:ring-offset-2 focus-visible:ring-offset-[#195e6b]"
            onClick={toggleMenu}
            aria-label={isMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
            aria-expanded={isMenuOpen}
          >
            <span
              className={`block h-0.5 w-6 transform transition duration-200 ease-in-out bg-white ${isMenuOpen ? 'translate-y-1.5 rotate-45' : '-translate-y-1.5'
                }`}
            />
            <span
              className={`block h-0.5 w-6 transition-opacity duration-200 ease-in-out bg-white ${isMenuOpen ? 'opacity-0' : 'opacity-100'
                }`}
            />
            <span
              className={`block h-0.5 w-6 transform transition duration-200 ease-in-out bg-white ${isMenuOpen ? '-translate-y-1.5 -rotate-45' : 'translate-y-1.5'
                }`}
            />
          </button>
        </div>
      </div>
      {isMenuOpen ? (
        <nav
          className="md:hidden mt-4 rounded-lg border border-white/10 px-4 py-3 space-y-3 shadow-lg"
          style={{ backgroundColor: 'rgba(31, 114, 133, 0.92)' }}
          aria-label="Mobile navigation"
        >
          {NAV_LINKS.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className="block uppercase text-sm tracking-wide hover:underline"
            >
              {link.label}
            </Link>
          ))}
        </nav>
      ) : null}
    </header>
  )
}
