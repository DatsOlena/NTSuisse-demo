import ThemeToggle from './ThemeToggle'

export default function Header({ 
  onNavigate, 
  currentPage 
}: { 
  onNavigate?: (page: 'dashboard' | 'about') => void;
  currentPage?: 'dashboard' | 'about';
}) {
  const handleNav = (page: 'dashboard' | 'about') => {
    if (onNavigate) {
      onNavigate(page)
    }
  }

  return (
    <header className="bg-color-primary sticky top-0 text-inverse px-6 py-3 flex justify-between items-center shadow-theme-md relative" style={{ zIndex: 100 }}>
      <a href="#" className="flex items-center gap-3" aria-label="WaterLab Home">
        <img src="/logo/1.png" alt="Water Analysis Logo" className="h-10 md:h-14 lg:h-14 w-auto object-contain color-white" />
        <span className="text-sm italic">Water Analysis</span>
      </a>
      <div className="flex items-center gap-4">
        <nav className="flex gap-4">
          <button 
            onClick={() => handleNav('about')}
            className={`hover:underline transition-opacity uppercase ${currentPage === 'about' ? 'underline' : 'opacity-90'}`}
          >
            About
          </button>
          <button 
            onClick={() => handleNav('dashboard')}
            className={`hover:underline transition-opacity uppercase ${currentPage === 'dashboard' ? 'underline' : 'opacity-90'}`}
          >
            Dashboard
          </button>
        </nav>
        <ThemeToggle />
      </div>
    </header>
  );
}
  