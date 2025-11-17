/**
 * Unit tests for angle conversion system
 * Run in browser console or with a test runner
 */

import { relativeToAnatomical, anatomicalToRelative, deg, rad } from './angleConversion';
import * as THREE from 'three';

// Test 1: Shoulder at T-pose
console.log('=== TEST 1: Shoulder at T-pose ===');
const tPoseOffset = { x: deg(57), y: 0, z: 0 };
const relativeAtTPose = new THREE.Euler(0, 0, 0, 'XYZ'); // At T-pose = 0° relative
const anatomicalAtTPose = relativeToAnatomical(relativeAtTPose, tPoseOffset);
console.log(`Relative: ${rad(relativeAtTPose.x).toFixed(1)}°`);
console.log(`Anatomical: ${rad(anatomicalAtTPose.x).toFixed(1)}°`);
console.log(`Expected: 57°`);
console.log(`✅ PASS: ${Math.abs(rad(anatomicalAtTPose.x) - 57) < 0.1 ? 'YES' : 'NO'}`);
console.log('');

// Test 2: Arms at sides (anatomical neutral)
console.log('=== TEST 2: Arms at sides (anatomical neutral) ===');
const relativeAtSides = new THREE.Euler(deg(-57), 0, 0, 'XYZ'); // Moved -57° from T-pose
const anatomicalAtSides = relativeToAnatomical(relativeAtSides, tPoseOffset);
console.log(`Relative: ${rad(relativeAtSides.x).toFixed(1)}°`);
console.log(`Anatomical: ${rad(anatomicalAtSides.x).toFixed(1)}°`);
console.log(`Expected: 0°`);
console.log(`✅ PASS: ${Math.abs(rad(anatomicalAtSides.x)) < 0.1 ? 'YES' : 'NO'}`);
console.log('');

// Test 3: Arms overhead
console.log('=== TEST 3: Arms overhead ===');
const relativeOverhead = new THREE.Euler(deg(60), 0, 0, 'XYZ'); // Moved +60° from T-pose
const anatomicalOverhead = relativeToAnatomical(relativeOverhead, tPoseOffset);
console.log(`Relative: ${rad(relativeOverhead.x).toFixed(1)}°`);
console.log(`Anatomical: ${rad(anatomicalOverhead.x).toFixed(1)}°`);
console.log(`Expected: 117°`);
console.log(`✅ PASS: ${Math.abs(rad(anatomicalOverhead.x) - 117) < 0.1 ? 'YES' : 'NO'}`);
console.log('');

// Test 4: Round-trip conversion
console.log('=== TEST 4: Round-trip conversion ===');
const anatomicalStart = 45; // 45° anatomical
console.log(`Starting anatomical: ${anatomicalStart}°`);
const relativeConverted = anatomicalToRelative(new THREE.Euler(deg(anatomicalStart), 0, 0, 'XYZ'), tPoseOffset);
console.log(`Convert to relative: ${rad(relativeConverted.x).toFixed(1)}°`);
const anatomicalBack = relativeToAnatomical(relativeConverted, tPoseOffset);
console.log(`Convert back to anatomical: ${rad(anatomicalBack.x).toFixed(1)}°`);
console.log(`✅ PASS: ${Math.abs(rad(anatomicalBack.x) - anatomicalStart) < 0.1 ? 'YES' : 'NO'}`);
console.log('');

// Test 5: Hip T-pose (negative offset)
console.log('=== TEST 5: Hip T-pose (negative offset) ===');
const hipTPoseOffset = { x: 0, y: 0, z: deg(-174) };
const hipRelativeAtTPose = new THREE.Euler(0, 0, 0, 'XYZ');
const hipAnatomicalAtTPose = relativeToAnatomical(hipRelativeAtTPose, hipTPoseOffset);
console.log(`Hip T-pose offset: ${rad(hipTPoseOffset.z).toFixed(1)}°`);
console.log(`Relative: ${rad(hipRelativeAtTPose.z).toFixed(1)}°`);
console.log(`Anatomical: ${rad(hipAnatomicalAtTPose.z).toFixed(1)}°`);
console.log(`Expected: -174°`);
console.log(`✅ PASS: ${Math.abs(rad(hipAnatomicalAtTPose.z) - (-174)) < 0.1 ? 'YES' : 'NO'}`);
console.log('');

// Test 6: Hip standing vertical (anatomical neutral)
console.log('=== TEST 6: Hip standing vertical ===');
const hipRelativeStanding = new THREE.Euler(0, 0, deg(174), 'XYZ'); // Moved +174° from T-pose
const hipAnatomicalStanding = relativeToAnatomical(hipRelativeStanding, hipTPoseOffset);
console.log(`Relative: ${rad(hipRelativeStanding.z).toFixed(1)}°`);
console.log(`Anatomical: ${rad(hipAnatomicalStanding.z).toFixed(1)}°`);
console.log(`Expected: 0°`);
console.log(`✅ PASS: ${Math.abs(rad(hipAnatomicalStanding.z)) < 0.1 ? 'YES' : 'NO'}`);
console.log('');

console.log('=== ALL TESTS COMPLETE ===');
