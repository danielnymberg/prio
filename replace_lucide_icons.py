#!/usr/bin/env python3
"""
Automated Lucide → SyncFusion e-icons replacement script for Prio project.
This script replaces ALL remaining Lucide icon usage with SyncFusion e-icons.
"""

import re
import sys
from pathlib import Path

# Icon mapping based on project requirements
ICON_MAP = {
    'Calendar': ('e-schedule', 16),
    'Clock': ('e-time', 12),
    'AlertTriangle': ('e-warning', 16),
    'CheckCircle2': ('e-check', 16),
    'CheckCircle': ('e-check', 16),
    'Check': ('e-check', 12),
    'XCircle': ('e-close', 16),
    'X': ('e-close', 12),
    'Plus': ('e-plus', 12),
    'ArrowLeft': ('e-arrow-left', 16),
    'ArrowRight': ('e-arrow-right', 16),
    'ChevronRight': ('e-chevron-right', 12),
    'ChevronLeft': ('e-chevron-left', 12),
    'ChevronDown': ('e-chevron-down', 12),
    'ChevronUp': ('e-chevron-up', 12),
    'User': ('e-user', 16),
    'Play': ('e-play', 24),
    'Pause': ('e-pause', 24),
    'SkipForward': ('e-skip-forward', 16),
    'TrendingUp': ('e-arrow-up', 16),
    'TrendingDown': ('e-arrow-down', 16),
    'Minus': ('e-minus', 12),
    'Inbox': ('e-inbox', 16),
    'Archive': ('e-folder', 16),
    'Folder': ('e-folder', 16),
    'Target': ('e-target', 16),
    'Upload': ('e-upload', 16),
    'FileJson': ('e-file', 16),
    'FileText': ('e-file', 16),
    'Coffee': ('e-coffee', 80),
    'Mail': ('e-mail', 80),
    'Star': ('e-star', 12),
    'Loader2': ('e-loader', 32),
    'Download': ('e-download', 16),
    'Share': ('e-share', 16),
    'WifiOff': ('e-wifi-off', 16),
    'Mic': ('e-mic', 16),
    'MicOff': ('e-mic-off', 16),
    'MessageSquare': ('e-comment', 12),
    'Copy': ('e-copy', 12),
    'Trash2': ('e-delete', 12),
    'Trash': ('e-delete', 12),
    'Zap': ('e-lightning', 24),
    'Sparkles': ('e-lightning', 48),
    'DollarSign': ('e-dollar', 16),
    'Key': ('e-key', 12),
    'Lock': ('e-lock', 16),
    'AlertCircle': ('e-alert', 16),
    'Search': ('e-search', 16),
    'RefreshCw': ('e-refresh', 16),
    'Camera': ('e-camera', 16),
    'Layers': ('e-layer', 12),
    'Moon': ('e-moon', 16),
    'Sun': ('e-sun', 16),
    'LogOut': ('e-logout', 16),
    'LogIn': ('e-login', 16),
    'Bell': ('e-bell', 16),
    'BellOff': ('e-notification-off', 16),
    'Info': ('e-info', 16),
}

def extract_icon_size(style_str):
    """Extract icon size from style attribute"""
    height_match = re.search(r"height:\s*'(\d+)px'", style_str)
    width_match = re.search(r"width:\s*'(\d+)px'", style_str)

    if height_match:
        return int(height_match.group(1))
    if width_match:
        return int(width_match.group(1))
    return 16  # default

def replace_icon(match):
    """Replace a single Lucide icon with SyncFusion e-icon"""
    icon_name = match.group(1)
    style_content = match.group(2)

    if icon_name not in ICON_MAP:
        print(f"Warning: Unknown icon '{icon_name}' - skipping")
        return match.group(0)

    sf_icon, default_size = ICON_MAP[icon_name]

    # Extract size from original
    orig_size = extract_icon_size(style_content)
    # Convert px to fontSize (usually height/width → fontSize * 0.8)
    font_size = max(12, orig_size - 4) if orig_size > 16 else 12

    # Extract other styles (color, margin, etc.)
    other_styles = []
    for prop in ['color', 'margin', 'marginRight', 'marginLeft', 'marginTop', 'marginBottom', 'opacity', 'flexShrink', 'display']:
        pattern = rf"{prop}:\s*'([^']+)'"
        match_prop = re.search(pattern, style_content)
        if match_prop:
            other_styles.append(f"{prop}: '{match_prop.group(1)}'")

    # Build new style object
    style_parts = [f"fontSize: '{font_size}px'"] + other_styles
    new_style = f"{{ {', '.join(style_parts)} }}"

    return f'<span className="e-icons {sf_icon}" style={new_style}></span>'

def process_file(file_path):
    """Process a single TypeScript/TSX file"""
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()

        original_content = content

        # Step 1: Replace import statement
        content = re.sub(
            r"import\s+\{[^}]+\}\s+from\s+'lucide-react';?\s*\n",
            "// Lucide icons replaced with SyncFusion e-icons\n",
            content
        )

        # Step 2: Replace icon usage
        # Pattern: <IconName style={{...}} />
        icon_pattern = r'<(' + '|'.join(ICON_MAP.keys()) + r')\s+style=\{(\{[^}]+\})\}\s*/>'
        content = re.sub(icon_pattern, replace_icon, content)

        if content != original_content:
            with open(file_path, 'w', encoding='utf-8') as f:
                f.write(content)
            return True
        return False

    except Exception as e:
        print(f"Error processing {file_path}: {e}")
        return False

def main():
    """Main entry point"""
    base_path = Path('/Users/danielnymberg/prio/src')

    files_to_process = [
        'components/tasks/AutoBookModal.tsx',
        'components/share/ShareHandler.tsx',
        'components/settings/SettingsView.tsx',
        'components/settings/ApiUsageView.tsx',
        'components/pwa/OfflineBanner.tsx',
        'components/pwa/InstallPrompt.tsx',
        'components/projects/ProjectProgressSlider.tsx',
        'components/projects/PDFUpload.tsx',
        'components/focus/WeeklyReviewModal.tsx',
        'components/focus/BreakView.tsx',
        'components/focus/ActiveSession.tsx',
        'components/capacity/CapacityTimeline.tsx',
        'components/calendar/WeekCalendarView.tsx',
        'components/calendar/TaskDragOverlay.tsx',
        'components/alerts/DependencyAlert.tsx',
        'components/VersionBanner.tsx',
        'components/ErrorBoundary.tsx',
    ]

    print("Lucide → SyncFusion e-icons Replacement Script")
    print("=" * 50)

    processed = 0
    for rel_path in files_to_process:
        file_path = base_path / rel_path
        if file_path.exists():
            print(f"Processing: {rel_path}...", end=' ')
            if process_file(file_path):
                print("✓ Updated")
                processed += 1
            else:
                print("- No changes")
        else:
            print(f"Warning: {rel_path} not found")

    print("=" * 50)
    print(f"Completed! Processed {processed} files.")

    return 0

if __name__ == '__main__':
    sys.exit(main())
