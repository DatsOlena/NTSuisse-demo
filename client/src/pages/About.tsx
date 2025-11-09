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
            <h2 className="text-2xl font-bold mb-4 color-primary">Project Overview</h2>
            <p className="text-secondary mb-4">
              WaterLab Demo is a full-stack experience that mirrors the Eawag / NTSuisse initiative by blending
              operational CRUD workflows with live Swiss hydrological intelligence. The goal is to show how a modern
              React + TypeScript interface can surface actionable insights from a Node.js + Express API backed by
              SQLite, all while staying performant and easy to extend.
            </p>
            <p className="text-secondary mb-4">
              On the surface you will find intuitive data management for local records, theme-aware UI components, and
              responsive layouts crafted with Tailwind CSS. Under the hood the server harmonises multiple data sources –
              Basel’s open Socrata feeds, FOEN fallbacks, and curated CSV snapshots – to serve consistent measurement
              payloads for Swiss monitoring stations.
            </p>
            <p className="text-secondary">
              The Dashboard visualises this stream through analytics cards and an interactive Leaflet map, while the
              About page now pulls real-time water headlines via RSS to keep stakeholders informed. Together these
              pieces illustrate how research teams can combine open data, graceful degradation, and rich storytelling in
              a single, production-ready foundation.
            </p>
          </div>



          <div className="bg-primary max-w-2xl mx-auto bg-opacity-90 rounded-lg shadow-theme-lg p-6 backdrop-blur-sm">
            <h2 className="text-xl font-semibold text-secondary mb-3">Technologies Used</h2>
            <ul className="list-disc list-inside space-y-2 text-secondary">
              <li>
                <strong>Frontend:</strong> React 18, TypeScript, Vite, React Router, Tailwind CSS, React Leaflet, RSS-driven widgets
              </li>
              <li>
                <strong>Backend:</strong> Node.js, Express, sql.js (SQLite), node-fetch, rss-parser with multi-source aggregation
              </li>
              <li>
                <strong>Data sources:</strong> Basel Open Data (Socrata API), FOEN hydrological feeds, curated CSV snapshots, UN Water news
              </li>
              <li>
                <strong>Tooling & DX:</strong> ESBuild via Vite, TypeScript strictness, Theme context with localStorage, graceful API fallbacks
              </li>
            </ul>
          </div>
          <WaterNews />

        </div>
      </main>
    </div>
  );
}
  