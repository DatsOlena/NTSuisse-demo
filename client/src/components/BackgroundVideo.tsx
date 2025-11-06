import { useEffect, useRef, useState } from 'react'

interface BackgroundVideoProps {
  src: string;
  className?: string;
}

export default function BackgroundVideo({ src, className = '' }: BackgroundVideoProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const video = videoRef.current
    if (video) {
      const handleCanPlay = () => {
        setLoading(false)
        video.play().catch((err) => {
          console.warn('Video autoplay failed:', err)
        })
      }

      const handleLoadedData = () => {
        setLoading(false)
        video.play().catch((err) => {
          console.warn('Video autoplay failed:', err)
        })
      }

      video.addEventListener('canplay', handleCanPlay)
      video.addEventListener('loadeddata', handleLoadedData)
      
      video.load()

      return () => {
        video.removeEventListener('canplay', handleCanPlay)
        video.removeEventListener('loadeddata', handleLoadedData)
      }
    }
  }, [src])

  return (
    <div className={`fixed inset-0 w-full h-full overflow-hidden z-0 ${className}`} style={{ backgroundColor: '#000' }}>
      <video
        ref={videoRef}
        src={src}
        autoPlay
        loop
        muted
        playsInline
        preload="auto"
        className="absolute inset-0 w-full h-full"
        style={{ 
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          opacity: loading ? 0 : 1,
          transition: 'opacity 0.5s ease-in',
          zIndex: 1
        }}
        onPlaying={() => setLoading(false)}
      >
        Your browser does not support the video tag.
      </video>
      {loading && (
        <div className="absolute inset-0 bg-gradient-to-br from-blue-600 to-blue-800 flex items-center justify-center" style={{ zIndex: 2 }}>
          <div className="text-white text-center">
            <div className="text-lg mb-2">Loading video...</div>
          </div>
        </div>
      )}
      {/* Overlay for better text readability */}
      <div className="absolute inset-0 bg-black bg-opacity-30" style={{ zIndex: 3 }}></div>
    </div>
  );
}

