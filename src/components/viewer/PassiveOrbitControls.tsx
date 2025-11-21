import { OrbitControls } from '@react-three/drei'
import { useEffect, useMemo, useRef } from 'react'
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib'
import { forwardRef, useImperativeHandle } from 'react'

/**
 * OrbitControls wrapper that adds passive event listeners to reduce console warnings
 */
export const PassiveOrbitControls = forwardRef<OrbitControlsImpl, React.ComponentProps<typeof OrbitControls>>(
  (props, ref) => {
    const controlsRef = useRef<OrbitControlsImpl>(null)
    const patchedInstances = useMemo(() => new WeakSet<OrbitControlsImpl>(), [])

    const attachRef = (instance: OrbitControlsImpl | null) => {
      if (!instance || patchedInstances.has(instance)) {
        if (controlsRef.current !== instance) {
          (controlsRef as any).current = instance
        }
        return
      }

      const originalConnect = instance.connect.bind(instance)
      instance.connect = (domElement: HTMLElement | Document | undefined) => {
        if (!domElement || !('addEventListener' in domElement)) {
          return originalConnect(domElement as any)
        }

        const element = domElement as HTMLElement & { addEventListener: typeof window.addEventListener }
        const originalAddEventListener = element.addEventListener.bind(element)
        element.addEventListener = ((type: string, listener: EventListenerOrEventListenerObject, options?: boolean | AddEventListenerOptions) => {
          if (type === 'wheel') {
            const normalizedOptions =
              typeof options === 'boolean'
                ? { capture: options, passive: false }
                : { passive: false, ...(options ?? {}) }
            return originalAddEventListener(type, listener, normalizedOptions)
          }
          return originalAddEventListener(type, listener, options as any)
        }) as typeof element.addEventListener

        try {
          return originalConnect(element as any)
        } finally {
          element.addEventListener = originalAddEventListener
        }
      }

      patchedInstances.add(instance)
        ; (controlsRef as any).current = instance
    }

    useImperativeHandle(ref, () => controlsRef.current!, [])

    useEffect(() => {
      const controls = controlsRef.current
      const domElement = controls?.domElement as HTMLElement | undefined
      if (!domElement) return
      // Hint browsers not to scroll/zoom the page on touch interactions
      domElement.style.touchAction = 'none'
        ; (domElement.style as any).msTouchAction = 'none'
    }, [])

    return <OrbitControls ref={attachRef} {...props} />
  }
)

PassiveOrbitControls.displayName = 'PassiveOrbitControls'
