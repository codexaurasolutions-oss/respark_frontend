$ErrorActionPreference = "Stop"

$projectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$backendPath = Join-Path $projectRoot "backend"
$frontendPath = Join-Path $projectRoot "frontend"
$mysqlExe = "C:\xampp\mysql\bin\mysqld.exe"
$mysqlIni = "C:\xampp\mysql\bin\my.ini"

function Test-Url {
  param(
    [string]$Url
  )

  try {
    $response = Invoke-WebRequest -UseBasicParsing -Uri $Url -TimeoutSec 3
    return $response.StatusCode -ge 200 -and $response.StatusCode -lt 500
  } catch {
    return $false
  }
}

Write-Host "Checking MariaDB..." -ForegroundColor Cyan
if (-not (Get-Process mysqld -ErrorAction SilentlyContinue)) {
  Start-Process -FilePath "cmd.exe" -ArgumentList "/k", "`"$mysqlExe`" --defaults-file=`"$mysqlIni`" --standalone" -WindowStyle Minimized
  Start-Sleep -Seconds 4
}

Write-Host "Checking backend..." -ForegroundColor Cyan
if (-not (Test-Url "http://127.0.0.1:5050/health")) {
  Start-Process -FilePath "cmd.exe" -ArgumentList "/k", "cd /d `"$backendPath`" && npm.cmd run dev" -WindowStyle Minimized
  Start-Sleep -Seconds 4
}

Write-Host "Checking frontend..." -ForegroundColor Cyan
if (-not (Test-Url "http://127.0.0.1:5173/login")) {
  Start-Process -FilePath "cmd.exe" -ArgumentList "/k", "cd /d `"$frontendPath`" && npm.cmd run dev -- --host 127.0.0.1 --port 5173" -WindowStyle Minimized
  Start-Sleep -Seconds 4
}

Write-Host ""
Write-Host "Stack status" -ForegroundColor Green
Write-Host ("MariaDB:  " + ($(if (Get-Process mysqld -ErrorAction SilentlyContinue) { "RUNNING" } else { "DOWN" })))
Write-Host ("Backend:  " + ($(if (Test-Url "http://127.0.0.1:5050/health") { "RUNNING" } else { "DOWN" })))
Write-Host ("Frontend: " + ($(if (Test-Url "http://127.0.0.1:5173/login") { "RUNNING" } else { "DOWN" })))
Write-Host ""
Write-Host "Frontend URL: http://127.0.0.1:5173/login"
Write-Host "Backend URL:  http://127.0.0.1:5050/health"
