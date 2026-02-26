#!/bin/bash
# Install systemd user timer for profile-pulse
# Runs daily at 10:00 AM and on login.

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
NODE_PATH="$(which node)"
LOG_DIR="${SCRIPT_DIR}/logs"
SERVICE_NAME="profile-pulse"

mkdir -p "$LOG_DIR"
mkdir -p "$HOME/.config/systemd/user"

# Create systemd service unit
cat > "$HOME/.config/systemd/user/${SERVICE_NAME}.service" << EOF
[Unit]
Description=Malt.de Availability Confirmation
After=network-online.target
Wants=network-online.target

[Service]
Type=oneshot
WorkingDirectory=${SCRIPT_DIR}
ExecStart=${NODE_PATH} ${SCRIPT_DIR}/src/confirm-availability.js
Environment=PATH=/usr/local/bin:/usr/bin:/bin:$(dirname "$NODE_PATH")
Environment=HOME=${HOME}
Environment=DISPLAY=:0
StandardOutput=append:${LOG_DIR}/systemd-stdout.log
StandardError=append:${LOG_DIR}/systemd-stderr.log

[Install]
WantedBy=default.target
EOF

# Create systemd timer unit
cat > "$HOME/.config/systemd/user/${SERVICE_NAME}.timer" << EOF
[Unit]
Description=Daily Malt.de Availability Confirmation

[Timer]
OnCalendar=*-*-* 10:00:00
OnStartupSec=60
Persistent=true

[Install]
WantedBy=timers.target
EOF

# Reload and enable
systemctl --user daemon-reload
systemctl --user enable --now "${SERVICE_NAME}.timer"

echo "Systemd timer installed and started."
echo "  Service: ~/.config/systemd/user/${SERVICE_NAME}.service"
echo "  Timer:   ~/.config/systemd/user/${SERVICE_NAME}.timer"
echo "  Runs:    Daily at 10:00 AM + 60s after login"
echo "  Logs:    $LOG_DIR/"
echo ""
echo "To run immediately:   npm run confirm"
echo "To check timer:       systemctl --user status ${SERVICE_NAME}.timer"
echo "To check status:      npm run status"
echo "To uninstall:         npm run uninstall-schedule"
