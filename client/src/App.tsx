import Header from './components/Header'
import Footer from './components/Footer'
import About from './pages/About'
import Dashboard from './pages/Dashboard'
import DataManagement from './pages/DataManagement'
import { Routes, Route } from 'react-router-dom'


function App() {

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Header />
      <main className="flex-1">
        <Routes>
          <Route path="/" element={<About />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/data" element={<DataManagement />} />
        </Routes>
      </main>
      <Footer />
    </div>
  )
}

export default App

