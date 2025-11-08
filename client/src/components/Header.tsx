import { Link } from 'react-router-dom';
import ThemeToggle from './ThemeToggle'

export default function Header() {

  return (
    <header className="bg-color-primary sticky top-0 text-inverse px-6 py-3 flex justify-between items-center shadow-theme-md relative" style={{ zIndex: 100 }}>
      <Link to="/" className="flex items-center gap-3" aria-label="WaterLab Home">
        <img src="/logo/logoWaterLab.png" alt="Water Analysis Logo" className="h-14 md:h-16 lg:h-16 w-auto -my-2 object-contain" />
        <span className="text-base md:text-lg font-medium italic">Water Analysis</span>
      </Link>
      <div className="flex items-center gap-6">
        <nav className="flex gap-4">
          <Link to="/" className="hover:underline transition-opacity uppercase text-sm md:text-base">About</Link>
          <Link to="/dashboard" className="hover:underline transition-opacity uppercase text-sm md:text-base">Dashboard</Link>
          <Link to="/data" className="hover:underline transition-opacity uppercase text-sm md:text-base">Data</Link>
        </nav>
        <ThemeToggle />
      </div>
    </header>
  );
}
  