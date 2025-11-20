import React from 'react';
import { getCollisionSummary, type CollisionResult } from '../../constraints/selfCollisionDetector';

interface CollisionSummaryProps {
  collisionData: CollisionResult | null;
}

export function CollisionSummary({ collisionData }: CollisionSummaryProps) {
  const collisionSummary = collisionData ? getCollisionSummary(collisionData) : null;

  if (!collisionSummary || collisionSummary.total === 0) {
    return null;
  }

  return (
    <div className="collision-summary">
      <h5>🚨 Collision Warnings</h5>
      <div className="collision-stats">
        {collisionSummary.critical > 0 && (
          <div className="stat critical">
            <span className="label">Critical:</span>
            <span className="value">{collisionSummary.critical}</span>
          </div>
        )}
        {collisionSummary.warning > 0 && (
          <div className="stat warning">
            <span className="label">Warning:</span>
            <span className="value">{collisionSummary.warning}</span>
          </div>
        )}
        {collisionSummary.minor > 0 && (
          <div className="stat minor">
            <span className="label">Minor:</span>
            <span className="value">{collisionSummary.minor}</span>
          </div>
        )}
      </div>
      {collisionSummary.maxPenetration > 0 && (
        <div className="max-penetration">
          <span className="label">Max Penetration:</span>
          <span className="value">
            {(collisionSummary.maxPenetration * 100).toFixed(1)} cm
          </span>
        </div>
      )}
    </div>
  );
}
