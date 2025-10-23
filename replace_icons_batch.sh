#!/bin/bash

# This script will help replace remaining Lucide icons in batch
# Run after manual edits to verify completion

# List of files still to process:
files=(
  "/Users/danielnymberg/prio/src/components/tasks/AutoBookModal.tsx"
  "/Users/danielnymberg/prio/src/components/share/ShareHandler.tsx"
  "/Users/danielnymberg/prio/src/components/settings/SettingsView.tsx"
  "/Users/danielnymberg/prio/src/components/settings/ApiUsageView.tsx"
  "/Users/danielnymberg/prio/src/components/pwa/OfflineBanner.tsx"
  "/Users/danielnymberg/prio/src/components/pwa/InstallPrompt.tsx"
  "/Users/danielnymberg/prio/src/components/projects/ProjectProgressSlider.tsx"
  "/Users/danielnymberg/prio/src/components/projects/PDFUpload.tsx"
  "/Users/danielnymberg/prio/src/components/focus/WeeklyReviewModal.tsx"
  "/Users/danielnymberg/prio/src/components/focus/BreakView.tsx"
  "/Users/danielnymberg/prio/src/components/focus/ActiveSession.tsx"
  "/Users/danielnymberg/prio/src/components/capacity/CapacityTimeline.tsx"
  "/Users/danielnymberg/prio/src/components/calendar/WeekCalendarView.tsx"
  "/Users/danielnymberg/prio/src/components/calendar/TaskDragOverlay.tsx"
  "/Users/danielnymberg/prio/src/components/alerts/DependencyAlert.tsx"
  "/Users/danielnymberg/prio/src/components/VersionBanner.tsx"
  "/Users/danielnymberg/prio/src/components/ErrorBoundary.tsx"
)

echo "Files remaining for icon replacement:"
for file in "${files[@]}"; do
  echo "- $file"
done

# Check for remaining lucide-react imports
echo -e "\nChecking for remaining lucide-react imports..."
grep -n "from 'lucide-react'" "${files[@]}" 2>/dev/null || echo "No lucide-react imports found!"
