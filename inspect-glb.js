// Node.js script to inspect GLB file structure
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const glbPath = join(__dirname, 'public', 'models', 'Manny_Static.glb');
const buffer = readFileSync(glbPath);

// Parse GLB header
const magic = buffer.readUInt32LE(0);
const version = buffer.readUInt32LE(4);
const length = buffer.readUInt32LE(8);

console.log('GLB Header:');
console.log('  Magic:', magic.toString(16), magic === 0x46546C67 ? '(valid glTF)' : '(INVALID)');
console.log('  Version:', version);
console.log('  Length:', length, 'bytes');
console.log('  File size:', buffer.length, 'bytes');

// Parse JSON chunk
const chunk0Length = buffer.readUInt32LE(12);
const chunk0Type = buffer.readUInt32LE(16);
const jsonData = buffer.slice(20, 20 + chunk0Length).toString('utf8');
const gltf = JSON.parse(jsonData);

console.log('\n=== GLTF Structure ===');
console.log('Asset:', gltf.asset);
console.log('\nScenes:', gltf.scenes?.length || 0);
console.log('Nodes:', gltf.nodes?.length || 0);
console.log('Meshes:', gltf.meshes?.length || 0);
console.log('Materials:', gltf.materials?.length || 0);
console.log('Textures:', gltf.textures?.length || 0);
console.log('Animations:', gltf.animations?.length || 0);
console.log('Skins:', gltf.skins?.length || 0);

// Check for root node transforms
console.log('\n=== Root Scene Analysis ===');
if (gltf.scenes && gltf.scenes[0]) {
  const rootScene = gltf.scenes[0];
  console.log('Default scene nodes:', rootScene.nodes);
  
  rootScene.nodes?.forEach(nodeIdx => {
    const node = gltf.nodes[nodeIdx];
    console.log(`\nNode ${nodeIdx}:`, node.name || '(unnamed)');
    if (node.translation) console.log('  Translation:', node.translation);
    if (node.rotation) console.log('  Rotation:', node.rotation);
    if (node.scale) console.log('  Scale:', node.scale);
    if (node.matrix) console.log('  Matrix:', node.matrix);
    if (node.mesh !== undefined) console.log('  Mesh index:', node.mesh);
    if (node.skin !== undefined) console.log('  Skin index:', node.skin);
    if (node.children) console.log('  Children:', node.children);
  });
}

// Check all nodes for scale issues
console.log('\n=== All Nodes with Transforms ===');
gltf.nodes?.forEach((node, idx) => {
  if (node.scale || node.rotation || node.translation || node.matrix) {
    console.log(`\nNode ${idx}: ${node.name || '(unnamed)'}`);
    if (node.translation) console.log('  Translation:', node.translation);
    if (node.rotation) console.log('  Rotation (quat):', node.rotation);
    if (node.scale) console.log('  Scale:', node.scale);
    if (node.matrix) console.log('  Matrix:', node.matrix);
  }
});

// Check mesh accessors for bounds
console.log('\n=== Mesh Bounds (from accessors) ===');
gltf.meshes?.forEach((mesh, meshIdx) => {
  console.log(`\nMesh ${meshIdx}: ${mesh.name || '(unnamed)'}`);
  mesh.primitives?.forEach((prim, primIdx) => {
    const posAccessorIdx = prim.attributes?.POSITION;
    if (posAccessorIdx !== undefined) {
      const accessor = gltf.accessors[posAccessorIdx];
      console.log(`  Primitive ${primIdx}:`);
      console.log('    Position count:', accessor.count);
      if (accessor.min) console.log('    Min:', accessor.min);
      if (accessor.max) console.log('    Max:', accessor.max);
      
      if (accessor.min && accessor.max) {
        const width = accessor.max[0] - accessor.min[0];
        const height = accessor.max[1] - accessor.min[1];
        const depth = accessor.max[2] - accessor.min[2];
        console.log(`    Size (x,y,z): ${width.toFixed(6)}, ${height.toFixed(6)}, ${depth.toFixed(6)}`);
        console.log(`    Aspect ratio (width/height): ${(width / height).toFixed(2)}`);
      }
    }
  });
});

// Check skins
console.log('\n=== Skins ===');
gltf.skins?.forEach((skin, idx) => {
  console.log(`\nSkin ${idx}: ${skin.name || '(unnamed)'}`);
  console.log('  Joints:', skin.joints?.length || 0);
  console.log('  Skeleton root:', skin.skeleton);
  if (skin.inverseBindMatrices !== undefined) {
    console.log('  Has inverse bind matrices:', skin.inverseBindMatrices);
  }
});
