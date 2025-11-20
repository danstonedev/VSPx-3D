# 🎭 VSPx 3D Animation Viewer - Standalone Demo

A fully interactive, standalone web application featuring a 3D human figure with realistic animations. Built with React, Three.js, and React Three Fiber.

![Demo Preview](https://img.shields.io/badge/Status-Ready%20to%20Run-green)
![React](https://img.shields.io/badge/React-18.3-blue)
![Three.js](https://img.shields.io/badge/Three.js-0.162-orange)

---

## 🚀 Quick Start

### Prerequisites

- **Node.js**: Version 18 or higher
- **npm**: Version 9 or higher

### Installation & Running

1. **Install Dependencies**

```bash
npm install
```

2. **Start Development Server**

```bash
npm run dev
```

3. **Open Your Browser**

The app will automatically open at `http://localhost:3000`

If it doesn't open automatically, navigate to: **http://localhost:3000**

---

## ✨ Features

### 🎬 11 Realistic Animations
- **Walk** - Natural walking motion
- **Stand** - Standing pose
- **Sit** - Basic sitting position
- **Long Sit** - Extended sitting position
- **Kick** - Kicking motion
- **Swim** - Swimming animation
- **Limp** - Limping gait
- And more medical/clinical poses!

### 🎮 Interactive Controls
- **Mouse Controls**:
  - Left click + drag: Rotate the camera
  - Right click + drag: Pan the view
  - Scroll wheel: Zoom in/out
  
- **UI Controls**:
  - Animation selector dropdown
  - Play/Pause button
  - Speed control slider (0.1x - 2.0x)

### 🎨 Professional Features
- Realistic lighting and shadows
- Smooth animation transitions
- Performance-optimized 3D rendering
- Responsive design
- Clean, modern UI

---

## 📂 Project Structure

```
VSPx_3D_Viewer_Demo/
├── public/
│   └── models/                  # 3D Models (GLB files)
│       ├── Manny_Static.glb     # Base mannequin (T-Pose with mesh geometry)
│       └── animations/          # Animation files including Neutral.glb (skeleton-only)
├── src/
│   ├── components/
│   │   └── viewer/              # 3D viewer components
│   │       ├── animations/      # Animation manifest
│   │       ├── hooks/           # Custom React hooks
│   │       └── utils/           # Utilities
│   ├── shared/                  # Shared utilities
│   ├── styles/                  # CSS files
│   ├── App.tsx                  # Landing page
│   ├── Viewer3D.tsx             # 3D viewer component
│   ├── main.tsx                 # App entry point
│   └── index.css                # Global styles
├── index.html                   # HTML entry point
├── package.json                 # Dependencies
├── vite.config.ts               # Vite configuration
└── tsconfig.json                # TypeScript config
```

---

## 🛠️ Available Scripts

### `npm run dev`
Starts the development server at http://localhost:3000

### `npm run build`
Builds the app for production to the `dist/` folder

### `npm run preview`
Preview the production build locally

---

## 🎯 How It Works

### Architecture

1. **React + Vite**: Fast development and optimal builds
2. **Three.js**: Core 3D graphics engine
3. **React Three Fiber**: React renderer for Three.js
4. **React Three Drei**: Helper components (OrbitControls, etc.)

### Key Components

- **App.tsx**: Landing page with "Launch Viewer" button
- **Viewer3D.tsx**: Main 3D viewer with controls
- **HumanFigure.tsx**: 3D model loader and animator
- **Animation System**: Manages animation playback and transitions

### 3D Models

All models are in GLB format (compressed GLTF):
- Optimized for web delivery
- Include animations and skeleton data
- Loaded on-demand for performance

---

## 🎨 Customization

### Change Initial Animation

Edit `App.tsx`:
```tsx
<Viewer3D initialAnimation="walk" />  // Change to any animation name
```

### Add More Animations

1. Place GLB file in `public/models/animations/`
2. Add to animation list in `Viewer3D.tsx`:
```tsx
{ name: 'your_animation', label: 'Your Animation' }
```

### Modify Colors/Styling

- **Landing page**: Edit `App.tsx` inline styles
- **Viewer UI**: Edit `Viewer3D.tsx` inline styles
- **Global styles**: Edit `src/index.css`
- **Viewer styles**: Edit `src/styles/viewer3d.css`

---

## 🐛 Troubleshooting

### Models Not Loading

**Issue**: 3D model doesn't appear

**Solutions**:
- Check browser console for errors
- Verify GLB files exist in `public/models/`
- Clear browser cache and refresh

### Animation Not Playing

**Issue**: Model loads but doesn't animate

**Solutions**:
- Check animation name matches file name
- Click Play button if paused
- Check browser console for errors

### Performance Issues

**Issue**: Low frame rate or stuttering

**Solutions**:
- Close other browser tabs
- Reduce animation speed
- Update graphics drivers
- Try in Chrome/Edge (best WebGL support)

### Port Already in Use

**Issue**: Port 3000 is already in use

**Solution**:
```bash
# Vite will automatically try port 3001, 3002, etc.
# Or specify a different port:
npm run dev -- --port 3001
```

---

## 🚀 Deployment

### Build for Production

```bash
npm run build
```

This creates an optimized build in the `dist/` folder.

### Deploy to Static Hosting

The built app can be deployed to:
- **Vercel**: `vercel deploy`
- **Netlify**: Drag & drop `dist/` folder
- **GitHub Pages**: Use gh-pages package
- **Any static host**: Upload `dist/` contents

### Environment Variables

None required! The app works out of the box.

---

## 📚 Tech Stack

| Technology | Version | Purpose |
|-----------|---------|---------|
| React | 18.3.1 | UI framework |
| Three.js | 0.162.0 | 3D graphics |
| React Three Fiber | 8.15.0 | React renderer for Three.js |
| React Three Drei | 9.88.0 | Three.js helpers |
| Vite | 5.4.3 | Build tool |
| TypeScript | 5.9.2 | Type safety |

---

## 🎓 Learning Resources

### Three.js
- [Three.js Documentation](https://threejs.org/docs/)
- [Three.js Examples](https://threejs.org/examples/)

### React Three Fiber
- [Official Docs](https://docs.pmnd.rs/react-three-fiber)
- [Examples](https://docs.pmnd.rs/react-three-fiber/getting-started/examples)

### GLTF/GLB Models
- [Mixamo](https://www.mixamo.com/) - Free animated characters
- [Sketchfab](https://sketchfab.com/) - 3D model marketplace

---

## 📝 License

This demo is extracted from the VSPx project. Ensure you have appropriate rights to use these files.

---

## 🤝 Contributing

This is a standalone demo. For the full VSPx project:
- Repository: https://github.com/danstonedev/VSPx.git
- Branch: main

---

## 💡 Tips & Tricks

### Optimize Performance
- Reduce shadow quality in production if needed
- Use lower poly models for mobile
- Enable GPU acceleration in browser

### Add Custom Models
1. Export from Blender as GLB
2. Place in `public/models/`
3. Update HumanFigure component path

### Debug Mode
Open browser DevTools (F12) to see:
- Console logs for animation state
- Performance metrics
- WebGL info

---

## 🎉 You're Ready!

Your 3D animation viewer is set up and ready to go!

### Next Steps:
1. Run `npm install`
2. Run `npm run dev`
3. Open http://localhost:3000
4. Click "Launch 3D Viewer"
5. Interact with the 3D model!

### Need Help?
- Check console for errors
- Review troubleshooting section
- Check Three.js/React Three Fiber docs

---

**Happy animating! 🚀✨**

Extracted from VSPx Project • Built with ❤️ using React & Three.js
