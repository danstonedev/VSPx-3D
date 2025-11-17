import { useState } from 'react'
import Viewer3D from './Viewer3D'
import { DEFAULT_ANIMATION_ID } from './components/viewer/animations/manifest'
import './index.css'

function App() {
  const [showViewer, setShowViewer] = useState(false)

  if (showViewer) {
    return <Viewer3D initialAnimation={DEFAULT_ANIMATION_ID} />
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
        textAlign: 'center',
      }}
    >
      <div
        style={{
          background: 'white',
          borderRadius: '20px',
          padding: '40px',
          maxWidth: '600px',
          boxShadow: '0 20px 50px rgba(0, 0, 0, 0.3)',
        }}
      >
        <h1
          style={{
            fontSize: '48px',
            marginBottom: '20px',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
          }}
        >
          🎭 3D Animation Viewer
        </h1>

        <p style={{ fontSize: '18px', color: '#666', marginBottom: '30px' }}>
          Interactive 3D human figure with realistic animations
        </p>

        <div
          style={{
            background: '#f3f4f6',
            borderRadius: '10px',
            padding: '20px',
            marginBottom: '30px',
            textAlign: 'left',
          }}
        >
          <h3 style={{ marginBottom: '15px', color: '#333' }}>✨ Features:</h3>
          <ul style={{ color: '#555', lineHeight: '1.8', paddingLeft: '20px' }}>
            <li>11 realistic human animations (walk, sit, stand, swim, etc.)</li>
            <li>Interactive 3D camera controls (rotate, zoom, pan)</li>
            <li>Real-time animation speed control</li>
            <li>Play/pause functionality</li>
            <li>Built with Three.js and React Three Fiber</li>
          </ul>
        </div>

        <div
          style={{
            background: '#e0e7ff',
            borderRadius: '10px',
            padding: '15px',
            marginBottom: '30px',
            fontSize: '14px',
            color: '#4338ca',
          }}
        >
          <strong>💡 Tip:</strong> Once loaded, use your mouse to interact with the 3D
          scene!
        </div>

        <button
          onClick={() => setShowViewer(true)}
          style={{
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            color: 'white',
            border: 'none',
            padding: '18px 40px',
            fontSize: '18px',
            fontWeight: 'bold',
            borderRadius: '50px',
            cursor: 'pointer',
            boxShadow: '0 10px 25px rgba(102, 126, 234, 0.4)',
            transition: 'all 0.3s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-2px)'
            e.currentTarget.style.boxShadow = '0 15px 35px rgba(102, 126, 234, 0.5)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)'
            e.currentTarget.style.boxShadow = '0 10px 25px rgba(102, 126, 234, 0.4)'
          }}
        >
          🚀 Launch 3D Viewer
        </button>

        <p style={{ marginTop: '30px', fontSize: '14px', color: '#999' }}>
          Extracted from VSPx Project • Powered by Three.js
        </p>
      </div>
    </div>
  )
}

export default App
