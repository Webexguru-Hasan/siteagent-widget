#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get the directory of the current script
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Try to use terser if available, otherwise use simple minification
let minifyFunction = simpleMinify;

try {
  const { minify } = await import('terser');
  minifyFunction = async (code) => {
    const result = await minify(code, {
      compress: {
        passes: 2,
        dead_code: true,
        unused: true,
      },
      mangle: true,
      output: {
        beautify: false,
        comments: false,
      },
    });
    return result.code;
  };
  console.log('✓ Using terser for minification');
} catch (e) {
  console.log('⚠ terser not found, using simple minification');
  console.log('  Install with: npm install --save-dev terser');
}

// Simple minification fallback
function simpleMinify(code) {
  return code
    // Remove comments
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\/\/.*$/gm, '')
    // Remove unnecessary whitespace
    .replace(/\s+/g, ' ')
    // Trim lines
    .replace(/^\s+|\s+$/g, '')
    // Remove spaces around special characters
    .replace(/\s*([{}()[\],:;=])\s*/g, '$1')
    // Preserve newlines for readability (optional, can remove)
    .trim();
}

async function build() {
  try {
    // Read source file
    const srcPath = path.join(__dirname, 'src', 'index.js');
    const code = fs.readFileSync(srcPath, 'utf-8');

    // Minify code
    console.log('Minifying widget...');
    const minified = await minifyFunction(code);

    // Ensure dist directory exists
    const distDir = path.join(__dirname, 'dist');
    if (!fs.existsSync(distDir)) {
      fs.mkdirSync(distDir, { recursive: true });
    }

    // Write minified file
    const distPath = path.join(distDir, 'siteagent.min.js');
    fs.writeFileSync(distPath, minified, 'utf-8');

    // Calculate file sizes
    const originalSize = code.length;
    const minifiedSize = minified.length;
    const reduction = ((1 - minifiedSize / originalSize) * 100).toFixed(2);

    console.log(`\n✓ Build complete!`);
    console.log(`  Original size: ${(originalSize / 1024).toFixed(2)} KB`);
    console.log(`  Minified size: ${(minifiedSize / 1024).toFixed(2)} KB`);
    console.log(`  Reduction: ${reduction}%`);
    console.log(`\n📦 Output: ${distPath}`);

    // Generate integration snippet
    const snippet = `<!-- SiteAgent Chat Widget -->
<script>
  window.SiteAgentConfig = {
    apiKey: 'YOUR_API_KEY',
    serverUrl: 'https://your-siteagent-server.com',
    tenantId: 'YOUR_TENANT_ID'
  };
</script>
<script src="https://your-cdn.com/siteagent.min.js"></script>`;

    const snippetPath = path.join(__dirname, 'INTEGRATION.html');
    fs.writeFileSync(snippetPath, snippet, 'utf-8');
    console.log(`📝 Integration snippet: ${snippetPath}`);
  } catch (error) {
    console.error('❌ Build failed:', error.message);
    process.exit(1);
  }
}

// Run build
build();
