export function isDebug(): boolean {
  try {
    const params = new URLSearchParams(window.location.search)
    return params.get('debug') === '1'
  } catch {
    return false
  }
}

export function isVerbose(): boolean {
  try {
    const params = new URLSearchParams(window.location.search)
    return params.get('verbose') === '1'
  } catch {
    return false
  }
}

function truthy(v: any): boolean {
  if (v == null) return false
  const s = String(v).toLowerCase()
  return s === '1' || s === 'true' || s === 'yes' || s === 'on' || s === 'enable' || s === 'enabled'
}

// Unified viewer debug flag: env var OR URL param (?debug=1 or ?viewerDebug=1)
export function viewerDebugEnabled(): boolean {
  try {
    const envVal = (import.meta as any)?.env?.VITE_VIEWER_DEBUG
    if (truthy(envVal)) return true
  } catch { /* ignore */ }
  try {
    const params = new URLSearchParams(window.location.search)
    if (truthy(params.get('viewerDebug')) || truthy(params.get('debug'))) return true
  } catch { /* ignore */ }
  try {
    const fromStorage = window.localStorage?.getItem('viewer.debug')
    if (truthy(fromStorage)) return true
    const fromWindow = (window as any).__VIEWER_DEBUG
    if (truthy(fromWindow)) return true
  } catch { /* ignore */ }
  return false
}

/**
 * Feature flag: Use new coordinate engine (q-space biomechanics)
 * 
 * MIGRATION DEADLINE: December 15, 2025
 * After this date, the new coordinate engine becomes MANDATORY.
 * See docs/MIGRATION_COMMITMENT.md for full migration plan.
 * 
 * When enabled, uses the new OpenSim-compatible coordinate system with:
 * - Proper ST + GH joint separation
 * - Generalized coordinates (q₀, q₁, q₂)
 * - Coordinate-level ROM constraints
 * 
 * Enable via: ?coordinateEngine=1 or localStorage.setItem('feature.coordinateEngine', 'true')
 */
export function useCoordinateEngine(): boolean {
  // FORCING FUNCTION: Auto-enable after migration deadline
  const migrationDeadline = new Date('2025-12-15T00:00:00')
  const now = new Date()
  
  if (now > migrationDeadline) {
    console.warn('⚠️ MIGRATION DEADLINE PASSED: Coordinate engine now MANDATORY')
    console.warn('📖 Legacy constraint system disabled. See docs/MIGRATION_COMMITMENT.md')
    return true
  }
  
  // TEMPORARY: Auto-enable for Phase 2 testing (remove after migration)
  console.log('🧬 Coordinate engine AUTO-ENABLED for Phase 2 testing')
  return true;
  
  /* eslint-disable no-unreachable */
  // During migration period (Phase 2-3), respect manual flag
  try {
    const envVal = (import.meta as any)?.env?.VITE_USE_COORDINATE_ENGINE
    if (truthy(envVal)) {
      console.log('🧬 Coordinate engine enabled via VITE_USE_COORDINATE_ENGINE')
      return true
    }
  } catch { /* ignore */ }
  try {
    const params = new URLSearchParams(window.location.search)
    const coordEngineParam = params.get('coordinateEngine')
    console.log(`🔍 URL search: "${window.location.search}"`)
    console.log(`🔍 coordinateEngine param: "${coordEngineParam}"`)
    if (truthy(coordEngineParam)) {
      console.log('🧬 Coordinate engine enabled via URL parameter')
      return true
    }
  } catch (e) { 
    console.error('Error reading URL params:', e)
  }
  try {
    const fromStorage = window.localStorage?.getItem('feature.coordinateEngine')
    if (truthy(fromStorage)) {
      console.log('🧬 Coordinate engine enabled via localStorage')
      return true
    }
  } catch { /* ignore */ }
  return false
  /* eslint-enable no-unreachable */
}
