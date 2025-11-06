# Public Assets

This folder contains static assets that are served directly by Vite.

## Video Files

Place video files in the `videos/` subfolder.

### Supported Formats
- `.mp4` (recommended for best compatibility)
- `.webm` (good compression, modern browsers)
- `.ogg` (alternative format)

### Usage in Components

```tsx
// Option 1: Direct reference (recommended for public folder)
<video src="/videos/your-video.mp4" controls />

// Option 2: Using a variable
const videoPath = "/videos/your-video.mp4"
<video src={videoPath} controls />
```

### File Size Considerations
- Large videos (>10MB) should be optimized or hosted externally
- Consider using a CDN for production deployments
- Use appropriate video codecs for web (H.264 for .mp4)

