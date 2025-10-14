#!/bin/bash

# Safe CSS variable removal script
# This removes only CSS variable references (var(--*)) from style attributes

# Find all .tsx files in src/components
find src/components -name "*.tsx" -type f | while read file; do
  echo "Processing: $file"

  # Use perl for more sophisticated regex handling
  # Remove color properties with CSS variables
  perl -i -pe 's/color:\s*[\x27"]?var\([^)]+\)[\x27"]?,?\s*//g' "$file"
  perl -i -pe 's/backgroundColor:\s*[\x27"]?var\([^)]+\)[\x27"]?,?\s*//g' "$file"
  perl -i -pe 's/borderColor:\s*[\x27"]?var\([^)]+\)[\x27"]?,?\s*//g' "$file"

  # Clean up trailing commas and empty style objects
  perl -i -pe 's/,\s*}/ }/g' "$file"
  perl -i -pe 's/{\s*,/ {/g' "$file"
  perl -i -pe 's/style=\{\{\s*\}\}//' "$file"
done

echo "CSS variables removed. Running build check..."
npm run build