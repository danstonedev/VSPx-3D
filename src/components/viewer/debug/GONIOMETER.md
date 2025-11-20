# Digital Goniometer

A 3D visual measurement tool that displays three transparent circles aligned with X, Y, Z coordinate planes when a joint is selected.

## Features

- **3 Transparent Circles**: One for each coordinate plane (X, Y, Z)
- **Color-Coded Edges**:
  - Red = X-axis (YZ plane)
  - Green = Y-axis (XZ plane)
  - Blue = Z-axis (XY plane)
- **Moving Arms**: Each plane has a rotating arm showing the current angle
- **Digital Readouts**: Live numeric angle values displayed next to each plane
- **Reference Arm**: Semi-transparent reference line at 0° for comparison

## Usage

The goniometer automatically appears when you select a joint:

1. **Select a joint** by Shift+clicking on a purple joint handle sphere
2. The goniometer will appear at the joint location with three overlapping circles
3. **Observe the angles** as you manipulate the joint
4. The colored arms rotate to show the current rotation on each axis
5. Digital readouts show precise angle values in degrees

## Integration

The component is integrated into `InteractiveBoneController.tsx` and appears automatically when `highlightedBone` is set:

```tsx
{highlightedBone && skeleton && (
  <DigitalGoniometer
    bone={highlightedBone}
    skeleton={skeleton}
    size={0.25}
    opacity={0.12}
    showLabels={true}
  />
)}
```

## Props

- `bone`: The THREE.Bone to attach the goniometer to
- `skeleton`: The THREE.Skeleton (for reference)
- `size`: Radius of the circles (default: 0.3)
- `opacity`: Transparency of the circle fill (default: 0.15)
- `showLabels`: Whether to show axis labels and numeric readouts (default: true)

## Visual Design

The design mimics a physical goniometer used in biomechanics and physical therapy:

- Transparent circles allow you to see the joint and model through them
- Bright colored edges make the planes visible against any background
- Moving arms provide immediate visual feedback of rotation
- Digital readouts give precise measurements

## Technical Details

- Uses Three.js Line objects for the circle edges and arms
- Updates every frame using `useFrame` hook
- Positioned and oriented in world space at the selected joint
- Renders with high `renderOrder` to stay on top of the model
- Uses `depthTest: false` to ensure visibility
