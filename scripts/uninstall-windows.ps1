# Uninstall Windows Task Scheduler job for profile-pulse

$taskName = "ProfilePulse"

$task = Get-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue
if (-not $task) {
    Write-Host "Task Scheduler job not installed."
    exit 0
}

Unregister-ScheduledTask -TaskName $taskName -Confirm:$false
Write-Host "Task Scheduler job uninstalled."
