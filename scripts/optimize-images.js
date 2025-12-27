const fs = require('fs');
const path = require('path');

const publicDir = path.join(__dirname, '..', 'public');
const teamImages = [
  { name: 'team-babalola-oluwatoyin.png', type: 'photo', recommended: 'avif/webp' },
  { name: 'team-ibukunoluwa-junaid-khadijat.jpg', type: 'photo', recommended: 'avif/webp' },
];

const maxSize = 500 * 1024;

console.log('checking team images for optimization...\n');

teamImages.forEach(({ name, type, recommended }) => {
  const imagePath = path.join(publicDir, name);
  if (fs.existsSync(imagePath)) {
    const stats = fs.statSync(imagePath);
    const sizeKB = (stats.size / 1024).toFixed(0);
    const sizeMB = (stats.size / (1024 * 1024)).toFixed(2);
    
    if (stats.size > maxSize) {
      console.warn(`⚠️  ${name}`);
      console.warn(`   size: ${sizeKB}kb (${sizeMB}mb) - exceeds recommended 500kb`);
      console.warn(`   type: ${type}`);
      console.warn(`   recommendation: optimize source to <500kb, next.js will convert to ${recommended}`);
      console.warn(`   tools: squoosh.app, imagemin, or sharp\n`);
    } else {
      console.log(`✓ ${name} - ${sizeKB}kb (within limits)\n`);
    }
  } else {
    console.warn(`⚠️  ${name} - file not found\n`);
  }
});

console.log('note: next.js automatically converts images to avif/webp at build/runtime.');
console.log('source optimization reduces build time and improves cdn cache efficiency.');
