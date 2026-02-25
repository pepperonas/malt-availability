# Install Windows Task Scheduler job for malt-availability
# Runs daily at 10:00 AM and on logon.

$ErrorActionPreference = "Stop"

$scriptDir = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$nodePath = (Get-Command node -ErrorAction Stop).Source
$logDir = Join-Path $scriptDir "logs"
$taskName = "MaltAvailability"

if (-not (Test-Path $logDir)) { New-Item -ItemType Directory -Path $logDir -Force | Out-Null }

# Remove existing task if present
Unregister-ScheduledTask -TaskName $taskName -Confirm:$false -ErrorAction SilentlyContinue

# Create action
$action = New-ScheduledTaskAction `
    -Execute $nodePath `
    -Argument "`"$(Join-Path $scriptDir 'src\confirm-availability.js')`"" `
    -WorkingDirectory $scriptDir

# Create triggers: daily at 10:00 AM + at logon
$triggerDaily = New-ScheduledTaskTrigger -Daily -At "10:00AM"
$triggerLogon = New-ScheduledTaskTrigger -AtLogon

# Create settings
$settings = New-ScheduledTaskSettingsSet `
    -AllowStartIfOnBatteries `
    -DontStopIfGoingOnBatteries `
    -StartWhenAvailable `
    -RunOnlyIfNetworkAvailable

# Register the task
Register-ScheduledTask `
    -TaskName $taskName `
    -Action $action `
    -Trigger @($triggerDaily, $triggerLogon) `
    -Settings $settings `
    -Description "Automated availability confirmation for malt.de freelancer profiles" `
    -RunLevel Limited

Write-Host ""
Write-Host "  Task Scheduler job installed."
Write-Host "  Task:  $taskName"
Write-Host "  Runs:  Daily at 10:00 AM + at logon"
Write-Host "  Logs:  $logDir\"
Write-Host ""
Write-Host "  To run immediately:  npm run confirm"
Write-Host "  To check status:     npm run status"
Write-Host "  To uninstall:        npm run uninstall-schedule"
Write-Host ""
