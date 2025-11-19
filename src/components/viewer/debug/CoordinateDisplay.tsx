import { useEffect, useMemo, useState } from 'react'
import type { BiomechState } from '@/biomech/engine/biomechState'
import { getJoint } from '@/biomech/model/joints'
import type { JointDef, JointState } from '@/biomech/model/types'
import { ghToClinical, stToClinical } from '@/biomech/mapping/shoulderMapping'

const RAD_TO_DEG = 180 / Math.PI
const WARN_DISTANCE_DEG = 5

type CoordinateDisplayProps = {
  jointId: string
  biomechState: BiomechState | null
  showClinical?: boolean
  titleOverride?: string
  defaultExpanded?: boolean
}

type CoordinateRow = {
  id: string
  label: string
  qLabel: string
  valueDeg: number | null
  minDeg: number
  maxDeg: number
  status: 'ok' | 'warning' | 'error'
}

type ClinicalRow = {
  label: string
  value: number
}

function toDegrees(rad: number | null | undefined): number | null {
  if (rad == null) return null
  return rad * RAD_TO_DEG
}

function getCoordinateRows(joint: JointDef | undefined, jointState: JointState | null): CoordinateRow[] {
  if (!joint) return []
  return joint.coordinates.map((coord) => {
    const coordState = jointState?.coordinates?.[coord.id]?.value ?? null
    const valueDeg = toDegrees(coordState)
    const minDeg = coord.range.min * RAD_TO_DEG
    const maxDeg = coord.range.max * RAD_TO_DEG

    let status: CoordinateRow['status'] = 'ok'
    if (valueDeg == null) {
      status = 'warning'
    } else if (valueDeg < minDeg || valueDeg > maxDeg) {
      status = 'error'
    } else {
      const distanceToLimit = Math.min(Math.abs(valueDeg - minDeg), Math.abs(maxDeg - valueDeg))
      if (distanceToLimit <= WARN_DISTANCE_DEG) {
        status = 'warning'
      }
    }

    return {
      id: coord.id,
      label: coord.displayName,
      qLabel: `q${coord.index}`,
      valueDeg,
      minDeg,
      maxDeg,
      status,
    }
  })
}

function getClinicalRows(joint: JointDef | undefined, jointState: JointState | null): ClinicalRow[] {
  if (!joint || !jointState || joint.coordinates.length < 3) return []
  const [c0, c1, c2] = joint.coordinates
  const q0 = jointState.coordinates[c0.id]?.value ?? 0
  const q1 = jointState.coordinates[c1.id]?.value ?? 0
  const q2 = jointState.coordinates[c2.id]?.value ?? 0

  if (joint.id.startsWith('gh_')) {
    const clinical = ghToClinical(q0, q1, q2)
    return Object.entries(clinical.angles).map(([label, value]) => ({
      label,
      value,
    }))
  }

  if (joint.id.startsWith('st_')) {
    const clinical = stToClinical(q0, q1, q2)
    return Object.entries(clinical.angles).map(([label, value]) => ({
      label,
      value,
    }))
  }

  return []
}

export function CoordinateDisplay({
  jointId,
  biomechState,
  showClinical = true,
  titleOverride,
  defaultExpanded = true,
}: CoordinateDisplayProps) {
  const joint = useMemo(() => getJoint(jointId), [jointId])
  const [expanded, setExpanded] = useState(defaultExpanded)
  const [jointSnapshot, setJointSnapshot] = useState<JointState | null>(null)

  useEffect(() => {
    if (!biomechState || !biomechState.isCalibrated()) {
      setJointSnapshot(null)
      return
    }

    let mounted = true
    const tick = () => {
      if (!mounted) return
      const snapshot = biomechState.getJointState(jointId)
      setJointSnapshot(snapshot)
    }

    tick()
    const handle = window.setInterval(tick, 120)
    return () => {
      mounted = false
      window.clearInterval(handle)
    }
  }, [biomechState, jointId])

  const coordinateRows = useMemo(() => getCoordinateRows(joint, jointSnapshot), [joint, jointSnapshot])
  const clinicalRows = useMemo(
    () => (showClinical ? getClinicalRows(joint, jointSnapshot) : []),
    [joint, jointSnapshot, showClinical]
  )

  const violationCount = coordinateRows.filter((row) => row.status === 'error').length
  const warningCount = coordinateRows.filter((row) => row.status === 'warning').length

  const cardStatus = !biomechState?.isCalibrated()
    ? 'pending'
    : violationCount > 0
      ? 'error'
      : warningCount > 0
        ? 'warning'
        : 'ok'

  const statusLabel = {
    pending: 'Awaiting calibration',
    warning: 'Near limit',
    error: 'ROM violation',
    ok: 'Within ROM',
  }[cardStatus]

  return (
    <div className={`coordinate-card status-${cardStatus}`}>
      <button
        type="button"
        className="coordinate-card-header"
        onClick={() => setExpanded((prev) => !prev)}
      >
        <div>
          <span className="coordinate-joint-id">{titleOverride ?? joint?.displayName ?? jointId}</span>
          {joint?.side && <span className="coordinate-joint-side">{joint.side.toUpperCase()}</span>}
        </div>
        <span className="coordinate-status-chip">{statusLabel}</span>
      </button>

      {expanded && (
        <div className="coordinate-card-body">
          {!biomechState?.isCalibrated() && (
            <p className="coordinate-card-note">Run neutral calibration to inspect q-space data.</p>
          )}

          {biomechState?.isCalibrated() && (
            <>
              <div className="coordinate-rows">
                {coordinateRows.map((row) => (
                  <div key={row.id} className={`coordinate-row severity-${row.status}`}>
                    <div className="coordinate-row-label">
                      <span className="coordinate-q-label">{row.qLabel}</span>
                      <span className="coordinate-axis-label">{row.label}</span>
                    </div>
                    <div className="coordinate-row-value">
                      {row.valueDeg == null ? '—' : `${row.valueDeg.toFixed(1)}°`}
                    </div>
                    <div className="coordinate-row-range">
                      {row.minDeg.toFixed(0)}° — {row.maxDeg.toFixed(0)}°
                    </div>
                  </div>
                ))}
              </div>

              {showClinical && clinicalRows.length > 0 && (
                <div className="clinical-row">
                  <span className="clinical-title">Clinical</span>
                  <div className="clinical-values">
                    {clinicalRows.map((row) => (
                      <span key={row.label} className="clinical-chip">
                        {row.label}: {row.value.toFixed(1)}°
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div className="coordinate-violations">
                {violationCount === 0 && warningCount === 0 && 'ROM Violations: None'}
                {violationCount > 0 && `ROM Violations: ${violationCount}`}
                {violationCount === 0 && warningCount > 0 && `Near Limit: ${warningCount}`}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}
