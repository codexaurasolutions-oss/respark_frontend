$ErrorActionPreference = "Stop"

$projectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$backupRoot = Join-Path $projectRoot "backups"
$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$backupDir = Join-Path $backupRoot $timestamp

New-Item -ItemType Directory -Force -Path $backupDir | Out-Null

$databaseName = $env:RESPARK_DB_NAME
if (-not $databaseName) {
  $databaseName = "respark"
}

$mysqlDump = "C:\xampp\mysql\bin\mysqldump.exe"
if (-not (Test-Path $mysqlDump)) {
  throw "mysqldump.exe not found at $mysqlDump"
}

$dbUser = if ($env:RESPARK_DB_USER) { $env:RESPARK_DB_USER } else { "root" }
$dbPassword = $env:RESPARK_DB_PASSWORD
$passwordArg = if ($dbPassword) { "--password=$dbPassword" } else { "" }
$sqlPath = Join-Path $backupDir "$databaseName.sql"

& $mysqlDump --user=$dbUser $passwordArg --databases $databaseName | Out-File -FilePath $sqlPath -Encoding utf8

Compress-Archive -Path $sqlPath -DestinationPath (Join-Path $backupDir "$databaseName.zip") -Force

Write-Host "Backup created at $backupDir" -ForegroundColor Green
