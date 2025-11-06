import { useState } from 'react'
import Header from './components/Header'
import Footer from './components/Footer'
import ItemsPage from './pages/ItemsPage'
import About from './pages/About'

function App() {
  const [currentPage, setCurrentPage] = useState<'dashboard' | 'about'>('about')

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Header onNavigate={setCurrentPage} currentPage={currentPage} />
      <main className="flex-1">
        {currentPage === 'dashboard' ? <ItemsPage /> : <About />}
      </main>
      <Footer />
    </div>
  )
}

export default App

