#------------------------------------------------------------------------------
# Script: run_devcontainer_claude_code.ps1
# Description: Automates the setup and connection to a DevContainer environment
#              using either Docker or Podman on Windows.
#
# IMPORTANT USAGE REQUIREMENT:
# This script MUST be executed from the ROOT directory of your project.
# It assumes the script file itself is located in a 'Script' subdirectory.
#
# Assumed Project Structure:
# Project/
# ├── .devcontainer/
# └── Script/
#     └── run_devcontainer_claude_code.ps1  <-- This script's location
#
# How to Run:
# 1. Open PowerShell.
# 2. Change your current directory to the project root:
#    cd c:\path\to\your\Project
# 3. Execute the script, specifying the container backend:
#    .\Script\run_devcontainer_claude_code.ps1 -Backend <docker|podman>
#
# The -Backend parameter is mandatory and accepts 'docker' or 'podman'.
#------------------------------------------------------------------------------

[CmdletBinding()]
param(
    [Parameter(Mandatory=$true)]
    [ValidateSet('docker', 'podman')]
    [string]$Backend
)

# Function to test container backend connection
function Test-ContainerConnection {
    param([string]$Backend)
    
    try {
        $null = & $Backend version 2>&1
        return $?
    } catch {
        return $false
    }
}

# Function to restart Podman machine with retry logic
function Restart-PodmanMachine {
    param(
        [string]$MachineName = "claudeVM",
        [int]$MaxRetries = 3
    )
    
    $retryCount = 0
    $connected = $false
    
    while (-not $connected -and $retryCount -lt $MaxRetries) {
        if ($retryCount -gt 0) {
            Write-Host "Connection attempt $($retryCount + 1) of $MaxRetries..."
        }
        
        # Stop machine if running
        Write-Host "Stopping Podman machine '$MachineName'..."
        try {
            podman machine stop $MachineName 2>&1 | Out-Null
            Start-Sleep -Seconds 2
        } catch {
            # Machine might not be running, continue
        }
        
        # Start machine
        Write-Host "Starting Podman machine '$MachineName'..."
        try {
            podman machine start $MachineName -q
            Start-Sleep -Seconds 5  # Wait for initialization
            
            # Set default connection
            podman system connection default $MachineName 2>&1 | Out-Null
            
            # Test connection
            if (Test-ContainerConnection -Backend "podman") {
                Write-Host "Podman machine started and connection verified."
                $connected = $true
            } else {
                Write-Warning "Machine started but connection test failed."
            }
        } catch {
            Write-Warning "Failed to start machine: $($_.Exception.Message)"
        }
        
        $retryCount++
    }
    
    return $connected
}

# Main script starts here
Write-Host "--- DevContainer Launch & Connection Script ---"
Write-Host "Using backend: $Backend"

# --- Backend-Specific Initialization ---
if ($Backend -eq 'podman') {
    Write-Host "--- Podman Backend Initialization ---"
    
    # Check if machine exists, create if not
    $machineList = podman machine list --format "{{.Name}}" 2>&1
    if ($machineList -notcontains "claudeVM") {
        Write-Host "Creating Podman machine 'claudeVM'..."
        try {
            podman machine init claudeVM
            Write-Host "Podman machine 'claudeVM' created."
        } catch {
            Write-Error "Failed to create Podman machine: $($_.Exception.Message)"
            exit 1
        }
    }
    
    # Ensure Podman connection
    if (-not (Test-ContainerConnection -Backend "podman")) {
        Write-Host "Podman connection not available. Establishing connection..."
        
        if (-not (Restart-PodmanMachine)) {
            Write-Error "Failed to establish Podman connection after multiple attempts."
            exit 1
        }
    } else {
        Write-Host "Podman connection verified."
    }
    
} elseif ($Backend -eq 'docker') {
    Write-Host "--- Docker Backend Initialization ---"
    
    # Check Docker Desktop
    Write-Host "Checking if Docker Desktop is running..."
    if (-not (Test-ContainerConnection -Backend "docker")) {
        Write-Error "Docker Desktop is not running or docker command not found."
        Write-Error "Please ensure Docker Desktop is running and try again."
        exit 1
    }
    Write-Host "Docker Desktop is running."
}

# --- Start DevContainer ---
Write-Host "Starting DevContainer in the current folder..."
$devcontainerCmd = "devcontainer up --workspace-folder ."
if ($Backend -eq 'podman') {
    $devcontainerCmd += " --docker-path podman"
}

try {
    Invoke-Expression $devcontainerCmd
    Write-Host "DevContainer startup process completed."
} catch {
    Write-Error "Failed to start DevContainer: $($_.Exception.Message)"
    
    # For Podman, try connection restart
    if ($Backend -eq 'podman') {
        Write-Host "Attempting to restart Podman connection and retry..."
        if (Restart-PodmanMachine) {
            try {
                Invoke-Expression $devcontainerCmd
                Write-Host "DevContainer startup successful after retry."
            } catch {
                Write-Error "Failed to start DevContainer after retry: $($_.Exception.Message)"
                exit 1
            }
        } else {
            exit 1
        }
    } else {
        exit 1
    }
}

# --- Get DevContainer container ID ---
Write-Host "Searching for DevContainer container ID..."
$currentFolder = (Get-Location).Path

# Retry logic for container ID retrieval
$maxAttempts = 3
$attemptCount = 0
$containerId = $null

while (-not $containerId -and $attemptCount -lt $maxAttempts) {
    if ($attemptCount -gt 0) {
        Write-Host "Retrying container ID retrieval... (Attempt $($attemptCount + 1)/$maxAttempts)"
        Start-Sleep -Seconds 2
    }
    
    try {
        $psCmd = "$Backend ps --filter `"label=devcontainer.local_folder=$currentFolder`" --format `"{{.ID}}`""
        $containerId = $(Invoke-Expression $psCmd).Trim()
    } catch {
        Write-Warning "Failed to query container: $($_.Exception.Message)"
    }
    
    $attemptCount++
}

if (-not $containerId) {
    Write-Error "No DevContainer container ID found for the current folder ('$currentFolder')."
    Write-Error "Please verify that 'devcontainer up' completed successfully."
    exit 1
}

Write-Host "Container ID found: $containerId"

# --- Execute commands in container ---
Write-Host "Executing 'claude' command and starting zsh session..."
try {
    $execCmd = "$Backend exec -it $containerId zsh -c 'claude; exec zsh'"
    Invoke-Expression $execCmd
    Write-Host "Interactive session ended."
} catch {
    Write-Error "Failed to execute command in container: $($_.Exception.Message)"
    
    Write-Host ""
    Write-Host "Troubleshooting tips:"
    Write-Host "1. Check if container is running: $Backend ps"
    Write-Host "2. Try connecting manually: $Backend exec -it $containerId zsh"
    
    exit 1
}

# Notify script end
Write-Host "--- Script Completed ---"