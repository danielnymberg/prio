#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const glob = require('glob');

// Patterns to remove from style objects
const CSS_VAR_PATTERN = /var\(--[^)]+\)/g;
const COLOR_VARS = [
  '--primary-600', '--primary-500', '--primary-400', '--primary-700', '--primary-100',
  '--e-text', '--e-text-secondary', '--e-surface', '--e-border', '--e-surface-hover',
  '--error-500', '--error-600', '--error-700', '--error-800', '--error-100',
  '--warning-500', '--warning-600', '--warning-700', '--warning-800', '--warning-100',
  '--success-500', '--success-600', '--success-700', '--success-800', '--success-100',
  '--e-success', '--e-warning', '--e-error', '--e-info', '--e-primary', '--e-accent',
  '--e-warning-dark', '--primary-400'
];

// Properties to remove entirely (color-related)
const PROPS_TO_REMOVE = ['color', 'backgroundColor', 'borderColor', 'background'];

// Properties to keep (layout-related)
const LAYOUT_PROPS = [
  'display', 'flexDirection', 'flex', 'flexShrink', 'flexGrow', 'flexWrap',
  'gap', 'gridTemplateColumns', 'gridTemplateRows', 'gridColumn', 'gridRow',
  'padding', 'paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft',
  'margin', 'marginTop', 'marginRight', 'marginBottom', 'marginLeft',
  'width', 'height', 'maxWidth', 'maxHeight', 'minWidth', 'minHeight',
  'position', 'top', 'right', 'bottom', 'left',
  'overflow', 'overflowX', 'overflowY',
  'alignItems', 'justifyContent', 'alignSelf', 'justifyItems',
  'borderRadius', 'border', 'borderWidth', 'borderTop', 'borderRight', 'borderBottom', 'borderLeft',
  'boxShadow', 'transition', 'transform', 'animation',
  'opacity', 'cursor', 'pointerEvents',
  'textAlign', 'verticalAlign',
  'zIndex', 'resize',
  'fontWeight', 'fontFamily', 'textDecoration', 'textTransform',
  'lineHeight', 'letterSpacing', 'whiteSpace',
  'listStyle', 'listStyleType',
  'outline'
];

// Hardcoded colors to remove (not layout critical)
const HARDCODED_COLORS = [
  '#ef4444', '#dc2626', '#b91c1c', '#991b1b', '#7f1d1d', // reds
  '#f59e0b', '#f97316', '#ea580c', '#b45309', '#92400e', '#78350f', '#7c2d12', '#9a3412', // oranges/ambers
  '#10b981', '#059669', '#047857', '#065f46', '#064e3b', // greens
  '#3b82f6', '#2563eb', '#1e40af', '#1e3a8a', // blues
  '#8b5cf6', '#9333ea', '#7c3aed', '#6d28d9', '#ec4899', // purples/pinks
  '#6B7280', '#374151', // grays used for colors not layout
  '#f9fafb', '#e5e7eb', // light grays used for backgrounds
  '#ffffff', 'white', // whites (usually safe to remove)
  '#fef3c7', '#fed7aa', '#fee2e2', '#fecaca', '#fde68a', // light tints
  '#d1fae5', '#dcfce7', '#dbeafe', // light tints
  '#ecfdf5', // light green
  'rgba(245, 158, 11, 0.1)', 'rgba(16, 185, 129, 0.1)', 'rgba(0,0,0,0.1)', 'rgba(0,0,0,0.25)' // rgba
];

function cleanStyleObject(styleStr) {
  if (!styleStr || !styleStr.includes('style={{')) return styleStr;

  try {
    // Extract the style object
    const match = styleStr.match(/style=\{\{([^}]+)\}\}/);
    if (!match) return styleStr;

    const styleContent = match[1];
    const lines = styleContent.split(',');
    const cleanedLines = [];

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;

      const [key, ...valueParts] = trimmed.split(':');
      const value = valueParts.join(':').trim();

      if (!key || !value) continue;

      const propName = key.trim().replace(/['"]/g, '');

      // Skip if it's a color-related property
      if (PROPS_TO_REMOVE.includes(propName)) continue;

      // Skip if value contains CSS variables
      if (CSS_VAR_PATTERN.test(value)) continue;

      // Skip if value contains hardcoded colors (unless it's border or critical layout)
      let hasHardcodedColor = false;
      for (const color of HARDCODED_COLORS) {
        if (value.includes(color)) {
          hasHardcodedColor = true;
          break;
        }
      }

      if (hasHardcodedColor && !['borderRadius', 'border', 'borderWidth'].includes(propName)) {
        continue;
      }

      // Skip gradient backgrounds
      if (value.includes('linear-gradient') || value.includes('gradient')) continue;

      // Keep fontSize only if it's layout critical (usually not)
      if (propName === 'fontSize') {
        // Remove font sizes unless they seem structural
        const sizeMatch = value.match(/(\d+)px/);
        if (sizeMatch && parseInt(sizeMatch[1]) < 200) {
          continue; // Remove normal text sizing
        }
      }

      cleanedLines.push(trimmed);
    }

    if (cleanedLines.length === 0) {
      // Remove empty style object
      return styleStr.replace(/\s*style=\{\{[^}]+\}\}/, '');
    }

    return styleStr.replace(
      /style=\{\{[^}]+\}\}/,
      `style={{ ${cleanedLines.join(', ')} }}`
    );
  } catch (e) {
    console.warn('Failed to parse style:', e.message);
    return styleStr;
  }
}

function cleanFile(filePath) {
  console.log(`Cleaning: ${filePath}`);

  let content = fs.readFileSync(filePath, 'utf8');
  const originalLength = content.length;

  // Remove CSS variables from style objects
  content = content.replace(
    /style=\{\{[^}]*var\(--[^)]+\)[^}]*\}\}/g,
    (match) => cleanStyleObject(match)
  );

  // Remove hardcoded color styles
  HARDCODED_COLORS.forEach(color => {
    const escapedColor = color.replace(/[()]/g, '\\$&');
    const regex = new RegExp(`(backgroundColor|color|borderColor|background):\\s*['"]${escapedColor}['"]`, 'g');
    content = content.replace(regex, '');
  });

  // Clean up empty style objects
  content = content.replace(/\s*style=\{\{\s*\}\}/g, '');

  // Clean up double spaces
  content = content.replace(/  +/g, ' ');

  fs.writeFileSync(filePath, content, 'utf8');

  const reduction = originalLength - content.length;
  console.log(`  Removed ${reduction} bytes of CSS`);
}

// Find all .tsx files in components directory
const componentsDir = path.join(__dirname, 'src', 'components');
const files = glob.sync(`${componentsDir}/**/*.tsx`);

console.log(`Found ${files.length} component files to clean\n`);

files.forEach(cleanFile);

console.log('\n✅ All files cleaned');
