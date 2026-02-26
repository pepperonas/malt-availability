#!/bin/bash
# Uninstall macOS LaunchAgent for profile-pulse

PLIST_NAME="com.celox.profile-pulse"
PLIST_PATH="$HOME/Library/LaunchAgents/${PLIST_NAME}.plist"

if [ ! -f "$PLIST_PATH" ]; then
    echo "LaunchAgent not installed."
    exit 0
fi

launchctl bootout "gui/$(id -u)/${PLIST_NAME}" 2>/dev/null || true
rm -f "$PLIST_PATH"

echo "LaunchAgent uninstalled."
