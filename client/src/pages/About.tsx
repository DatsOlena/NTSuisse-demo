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
      <main className="relative z-10 bg-secondary">
        <div className="max-w-7xl mx-auto p-6 space-y-10">
          <div className="p-6 mb-6 backdrop-blur-sm">
            <h2 className="text-2xl font-bold mb-4 color-primary">Project Overview</h2>
            <p className="text-secondary mb-4">
              WaterLab Demo is a full-stack showcase inspired by the Eawag / NTSuisse partnership. It pairs a modern
              React + TypeScript interface with a modular Node.js backend to surface Swiss hydrological insights,
              manage local research records, and curate water-sector news in one cohesive experience.
            </p>
            <p className="text-secondary mb-4">
              The Dashboard blends live Basel Socrata feeds, FOEN fallbacks, and curated CSV snapshots into analytics
              cards plus an interactive Leaflet map, giving teams a quick situational view of key monitoring stations.
              A dedicated Data Management area preserves CRUD workflows for local datasets, and theme-aware components
              keep the UI responsive across devices.
            </p>
            <p className="text-secondary">
              Behind the scenes, the Express API is split into focused routes for water metrics, news aggregation, and
              SQLite persistence, each with caching and graceful degradation strategies. End-to-end tests powered by
              Jest and React Testing Library ensure these building blocks stay reliable as the project evolves.
            </p>
          </div>



          <div className="bg-primary max-w-2xl mx-auto bg-opacity-90 rounded-lg shadow-theme-lg p-6 backdrop-blur-sm">
            <h2 className="text-xl font-semibold text-secondary mb-3">Technologies Used</h2>
            <ul className="list-disc list-inside space-y-2 text-secondary">
              <li>
                <strong>Frontend UI:</strong> React 18, TypeScript, Vite, React Router, Tailwind CSS, theme context, React Leaflet
              </li>
              <li>
                <strong>Data & Visualisation:</strong> Basel Open Data (Socrata), FOEN hydrology backups, local CSV snapshot, GeoJSON station map
              </li>
              <li>
                <strong>Backend Services:</strong> Node.js + Express with modular routers, sql.js (SQLite) persistence, rss-parser + caching, node-fetch
              </li>
              <li>
                <strong>Tooling & Testing:</strong> TypeScript strict mode, ESLint, Jest, React Testing Library, ts-jest, identity-obj-proxy
              </li>
            </ul>
          </div>
          <WaterNews />

        </div>
      </main>
    </div>
  );
}
  