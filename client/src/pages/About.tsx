import BackgroundVideo from '../components/BackgroundVideo'

export default function About() {
  return (
    <div className="relative min-h-screen w-full overflow-hidden">
      <BackgroundVideo src="/videos/VideoWater.mp4" />
      
      <div className="relative" style={{ zIndex: 20, minHeight: '100vh' }}>
        <div className="max-w-4xl mx-auto p-6 pt-20">
          <h1 className="text-4xl font-bold mb-6 text-inverse drop-shadow-lg">About This Demo</h1>
          
          <div className="bg-primary bg-opacity-90 rounded-lg shadow-theme-lg p-6 mb-6 backdrop-blur-sm">
            <h2 className="text-xl font-semibold text-primary mb-3">Project Overview</h2>
            <p className="text-secondary mb-4">
              This is a full-stack CRUD demo application built with modern web technologies, 
              demonstrating data persistence and frontend–backend integration. The project 
              showcases a clean, responsive UI with real-time data management capabilities.
            </p>
            <p className="text-secondary">
              The application features a React + TypeScript frontend connected to a Node.js + Express 
              backend with SQLite database, providing a complete example of a working full-stack application.
            </p>
          </div>
          
          <div className="bg-primary bg-opacity-90 rounded-lg shadow-theme-lg p-6 backdrop-blur-sm">
            <h2 className="text-xl font-semibold text-primary mb-3">Technologies Used</h2>
            <ul className="list-disc list-inside space-y-2 text-secondary">
              <li><strong>Frontend:</strong> React 18, TypeScript, Tailwind CSS</li>
              <li><strong>Backend:</strong> Node.js, Express, SQLite</li>
              <li><strong>Build Tool:</strong> Vite</li>
              <li><strong>Features:</strong> Theme switching, responsive design, RESTful API</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
  