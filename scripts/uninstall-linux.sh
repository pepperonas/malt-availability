#!/bin/bash
# Uninstall systemd user timer for profile-pulse

SERVICE_NAME="profile-pulse"
SERVICE_PATH="$HOME/.config/systemd/user/${SERVICE_NAME}.service"
TIMER_PATH="$HOME/.config/systemd/user/${SERVICE_NAME}.timer"

if [ ! -f "$TIMER_PATH" ] && [ ! -f "$SERVICE_PATH" ]; then
    echo "Systemd timer not installed."
    exit 0
fi

systemctl --user disable --now "${SERVICE_NAME}.timer" 2>/dev/null || true
rm -f "$SERVICE_PATH" "$TIMER_PATH"
systemctl --user daemon-reload

echo "Systemd timer uninstalled."
