import fs from 'fs';
import path from 'path';

// Copy index.html to 200.html for Render Static Site SPA support
// Render Static Sites use 200.html as fallback for all routes
const distPath = path.join(process.cwd(), 'dist');
const indexPath = path.join(distPath, 'index.html');
const fallbackPath = path.join(distPath, '200.html');

if (fs.existsSync(indexPath)) {
  fs.copyFileSync(indexPath, fallbackPath);
  console.log('✓ Created 200.html for SPA routing (Render Static Site)');
} else {
  console.error('✗ index.html not found in dist/');
  process.exit(1);
}
