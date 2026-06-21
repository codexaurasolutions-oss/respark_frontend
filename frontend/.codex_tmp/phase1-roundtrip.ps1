function Invoke-Json($method, $url, $token=$null, $body=$null) {
  try {
    $headers = @{}
    if ($token) { $headers['Authorization'] = "Bearer $token" }
    if ($null -ne $body) {
      $payload = $body | ConvertTo-Json -Depth 10
      $res = Invoke-RestMethod -Method $method -Uri $url -Headers $headers -ContentType 'application/json' -Body $payload -TimeoutSec 15
    } else {
      $res = Invoke-RestMethod -Method $method -Uri $url -Headers $headers -TimeoutSec 15
    }
    return @{ ok = $true; data = $res }
  } catch {
    $msg = $_.ErrorDetails.Message
    if (-not $msg) { $msg = $_.Exception.Message }
    return @{ ok = $false; error = $msg }
  }
}

$stamp = [DateTimeOffset]::UtcNow.ToUnixTimeSeconds()
$demoEmail = "qa.phase1.$stamp@example.com"
$ticketTitle = "QA Phase1 Ticket $stamp"

$super = Invoke-Json 'POST' 'http://127.0.0.1:5050/api/v1/auth/login' $null @{ email='superadmin@respark.local'; password='Admin@123' }
$owner = Invoke-Json 'POST' 'http://127.0.0.1:5050/api/v1/auth/login' $null @{ email='owner@respark.local'; password='Owner@123' }
$superToken = $super.data.accessToken
$ownerToken = $owner.data.accessToken

$results = [ordered]@{}

$results.publicDemoCreate = Invoke-Json 'POST' 'http://127.0.0.1:5050/api/v1/public/demo-leads' $null @{
  name = 'QA Phase1 Lead'
  email = $demoEmail
  phone = '03001234567'
  company = 'QA Salon Prospect'
  message = 'Phase 1 runtime validation'
}

$demoList = Invoke-Json 'GET' 'http://127.0.0.1:5050/api/v1/super-admin/demo-leads' $superToken
$results.demoVisibleInSuperAdmin = if ($demoList.ok) { [bool]($demoList.data | Where-Object { $_.email -eq $demoEmail }) } else { $false }

$results.ownerSettingsSave = Invoke-Json 'POST' 'http://127.0.0.1:5050/api/v1/owner/settings' $ownerToken @{
  invoicePrefix = 'INV'
  invoiceFooter = 'Runtime QA footer'
  taxLabel = 'GST'
  paymentModes = @('Cash','Card')
  whatsappNumber = '923001234567'
  bookingNotes = 'Runtime booking note'
  cancellationPolicy = '24 hours notice'
  allowNegativeStock = $false
  paymentGatewaySettings = @{ paymentLinkEnabled = $true; provider = 'placeholder' }
}
$ownerSettingsRead = Invoke-Json 'GET' 'http://127.0.0.1:5050/api/v1/owner/settings' $ownerToken
$results.ownerSettingsReadback = if ($ownerSettingsRead.ok) { $ownerSettingsRead.data.invoiceFooter } else { $ownerSettingsRead.error }

$results.ownerSupportCreate = Invoke-Json 'POST' 'http://127.0.0.1:5050/api/v1/owner/support-tickets' $ownerToken @{
  title = $ticketTitle
  description = 'Runtime manual validation support message'
  priority = 'MEDIUM'
  category = 'GENERAL'
}
$ticketList = Invoke-Json 'GET' 'http://127.0.0.1:5050/api/v1/super-admin/support-tickets' $superToken
$results.ticketVisibleInSuperAdmin = if ($ticketList.ok) { [bool]($ticketList.data | Where-Object { $_.title -eq $ticketTitle }) } else { $false }

$results.ownerReportsAppointments = Invoke-Json 'GET' 'http://127.0.0.1:5050/api/v1/owner/reports/appointments' $ownerToken
$results.ownerReportsStock = Invoke-Json 'GET' 'http://127.0.0.1:5050/api/v1/owner/reports/stock' $ownerToken

$csvHeaders = @{ Authorization = "Bearer $ownerToken" }
try {
  $csvRes = Invoke-WebRequest -UseBasicParsing -Uri 'http://127.0.0.1:5050/api/v1/reports/export.csv' -Headers $csvHeaders -TimeoutSec 15
  $results.reportCsvExport = @{ ok = $true; status = $csvRes.StatusCode; contentType = $csvRes.Headers['Content-Type'] }
} catch {
  $results.reportCsvExport = @{ ok = $false; error = $_.Exception.Message }
}

[PSCustomObject]$results | ConvertTo-Json -Depth 10
