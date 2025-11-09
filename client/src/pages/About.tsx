import WaterNews from '../components/WaterNews'

export default function About() {
  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      {/* Hero section with inline video and title overlay */}
      <section className="relative w-full h-[40vh] min-h-[280px] md:h-[55vh] md:min-h-[360px] lg:h-[70vh] lg:min-h-[460px]">
        <video
          src="/videos/VideoWater.mp4"
          autoPlay
          loop
          muted
          playsInline
          className="absolute inset-0 w-full h-full object-cover"
        />
        {/* Overlay for readability */}
        <div className="absolute inset-0 bg-black bg-opacity-30" />
        <div className="relative z-10 h-full flex items-center justify-center px-6">
          <h1 className="text-4xl md:text-5xl font-bold text-inverse drop-shadow-lg text-center">
            About This Demo
          </h1>
        </div>
      </section>

      {/* Body content */}
      <main className="relative z-10">
        <div className="max-w-7xl mx-auto p-6 space-y-10">
          <div className="p-6 mb-6 backdrop-blur-sm">
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

          <WaterNews />

          <div className="bg-primary max-w-2xl mx-auto bg-opacity-90 rounded-lg shadow-theme-lg p-6 backdrop-blur-sm">
            <h2 className="text-xl font-semibold text-primary mb-3">Technologies Used</h2>
            <ul className="list-disc list-inside space-y-2 text-secondary">
              <li><strong>Frontend:</strong> React 18, TypeScript, Tailwind CSS</li>
              <li><strong>Backend:</strong> Node.js, Express, SQLite</li>
              <li><strong>Build Tool:</strong> Vite</li>
              <li><strong>Features:</strong> Theme switching, responsive design, RESTful API</li>
            </ul>
          </div>


        </div>
      </main>
    </div>
  );
}
  