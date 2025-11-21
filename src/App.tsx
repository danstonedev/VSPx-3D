import { useState } from 'react'
import Viewer3D from './Viewer3D'
import { DEFAULT_ANIMATION_ID } from './components/viewer/animations/manifest'
import './index.css'
import './App.css'

function App() {
  const [showViewer, setShowViewer] = useState(false)

  if (showViewer) {
    return <Viewer3D initialAnimation={DEFAULT_ANIMATION_ID} />
  }

  return (
    <div className="app-container">
      <div className="app-card">
        <h1 className="app-title">
          🎭 3D Animation Viewer
        </h1>

        <p className="app-subtitle">
          Interactive 3D human figure with realistic animations
        </p>

        <div className="features-box">
          <h3 className="features-title">✨ Features:</h3>
          <ul className="features-list">
            <li>11 realistic human animations (walk, sit, stand, swim, etc.)</li>
            <li>Interactive 3D camera controls (rotate, zoom, pan)</li>
            <li>Real-time animation speed control</li>
            <li>Play/pause functionality</li>
            <li>Built with Three.js and React Three Fiber</li>
          </ul>
        </div>

        <div className="tip-box">
          <strong>💡 Tip:</strong> Once loaded, use your mouse to interact with the 3D
          scene!
        </div>

        <button
          onClick={() => setShowViewer(true)}
          className="launch-button"
        >
          🚀 Launch 3D Viewer
        </button>

        <p className="app-footer">
          Extracted from VSPx Project • Powered by Three.js
        </p>
      </div>
    </div>
  )
}

export default App
