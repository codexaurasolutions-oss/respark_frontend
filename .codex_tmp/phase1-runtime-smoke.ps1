function Test-FrontendRoute($url) {
  try {
    $res = Invoke-WebRequest -UseBasicParsing -Uri $url -TimeoutSec 8
    [PSCustomObject]@{ kind='frontend'; target=$url; status=$res.StatusCode; ok=$true }
  } catch {
    $status = if ($_.Exception.Response) { [int]$_.Exception.Response.StatusCode } else { 0 }
    [PSCustomObject]@{ kind='frontend'; target=$url; status=$status; ok=$false; error=$_.Exception.Message }
  }
}

function Invoke-Json($method, $url, $token=$null, $body=$null) {
  try {
    $headers = @{}
    if ($token) { $headers['Authorization'] = "Bearer $token" }
    if ($null -ne $body) {
      $payload = $body | ConvertTo-Json -Depth 8
      $res = Invoke-RestMethod -Method $method -Uri $url -Headers $headers -ContentType 'application/json' -Body $payload -TimeoutSec 12
    } else {
      $res = Invoke-RestMethod -Method $method -Uri $url -Headers $headers -TimeoutSec 12
    }
    return @{ ok = $true; data = $res }
  } catch {
    $msg = $_.ErrorDetails.Message
    if (-not $msg) { $msg = $_.Exception.Message }
    return @{ ok = $false; error = $msg }
  }
}

$routes = @(
  'http://127.0.0.1:5173/',
  'http://127.0.0.1:5173/features',
  'http://127.0.0.1:5173/pricing',
  'http://127.0.0.1:5173/platform',
  'http://127.0.0.1:5173/book-demo',
  'http://127.0.0.1:5173/login',
  'http://127.0.0.1:5173/super-admin/dashboard',
  'http://127.0.0.1:5173/admin/dashboard'
)

$routeResults = $routes | ForEach-Object { Test-FrontendRoute $_ }

$superLogin = Invoke-Json 'POST' 'http://127.0.0.1:5050/api/v1/auth/login' $null @{ email='superadmin@respark.local'; password='Admin@123' }
$ownerLogin = Invoke-Json 'POST' 'http://127.0.0.1:5050/api/v1/auth/login' $null @{ email='owner@respark.local'; password='Owner@123' }

$checks = @()
if ($superLogin.ok) {
  $superToken = $superLogin.data.accessToken
  $checks += [PSCustomObject]@{ kind='api'; target='super-admin dashboard'; ok=(Invoke-Json 'GET' 'http://127.0.0.1:5050/api/v1/super-admin/dashboard' $superToken).ok }
  $checks += [PSCustomObject]@{ kind='api'; target='salons list'; ok=(Invoke-Json 'GET' 'http://127.0.0.1:5050/api/v1/super-admin/salons' $superToken).ok }
  $checks += [PSCustomObject]@{ kind='api'; target='plans list'; ok=(Invoke-Json 'GET' 'http://127.0.0.1:5050/api/v1/super-admin/plans' $superToken).ok }
  $checks += [PSCustomObject]@{ kind='api'; target='subscriptions list'; ok=(Invoke-Json 'GET' 'http://127.0.0.1:5050/api/v1/super-admin/subscriptions' $superToken).ok }
  $checks += [PSCustomObject]@{ kind='api'; target='demo leads list'; ok=(Invoke-Json 'GET' 'http://127.0.0.1:5050/api/v1/super-admin/demo-leads' $superToken).ok }
  $checks += [PSCustomObject]@{ kind='api'; target='support tickets list'; ok=(Invoke-Json 'GET' 'http://127.0.0.1:5050/api/v1/super-admin/support-tickets' $superToken).ok }
  $settingsRead = Invoke-Json 'GET' 'http://127.0.0.1:5050/api/v1/super-admin/settings' $superToken
  $checks += [PSCustomObject]@{ kind='api'; target='super-admin settings read'; ok=$settingsRead.ok }
}
if ($ownerLogin.ok) {
  $ownerToken = $ownerLogin.data.accessToken
  $checks += [PSCustomObject]@{ kind='api'; target='owner dashboard'; ok=(Invoke-Json 'GET' 'http://127.0.0.1:5050/api/v1/owner/dashboard' $ownerToken).ok }
  $checks += [PSCustomObject]@{ kind='api'; target='branches'; ok=(Invoke-Json 'GET' 'http://127.0.0.1:5050/api/v1/owner/branches' $ownerToken).ok }
  $checks += [PSCustomObject]@{ kind='api'; target='services'; ok=(Invoke-Json 'GET' 'http://127.0.0.1:5050/api/v1/owner/services' $ownerToken).ok }
  $checks += [PSCustomObject]@{ kind='api'; target='customers'; ok=(Invoke-Json 'GET' 'http://127.0.0.1:5050/api/v1/owner/customers' $ownerToken).ok }
  $checks += [PSCustomObject]@{ kind='api'; target='users'; ok=(Invoke-Json 'GET' 'http://127.0.0.1:5050/api/v1/owner/users' $ownerToken).ok }
  $checks += [PSCustomObject]@{ kind='api'; target='invoices'; ok=(Invoke-Json 'GET' 'http://127.0.0.1:5050/api/v1/owner/invoices' $ownerToken).ok }
  $checks += [PSCustomObject]@{ kind='api'; target='payments'; ok=(Invoke-Json 'GET' 'http://127.0.0.1:5050/api/v1/owner/payments' $ownerToken).ok }
  $checks += [PSCustomObject]@{ kind='api'; target='reports'; ok=(Invoke-Json 'GET' 'http://127.0.0.1:5050/api/v1/owner/reports/summary' $ownerToken).ok }
  $checks += [PSCustomObject]@{ kind='api'; target='support tickets'; ok=(Invoke-Json 'GET' 'http://127.0.0.1:5050/api/v1/owner/support-tickets' $ownerToken).ok }
  $checks += [PSCustomObject]@{ kind='api'; target='owner settings read'; ok=(Invoke-Json 'GET' 'http://127.0.0.1:5050/api/v1/owner/settings' $ownerToken).ok }
}

$result = [PSCustomObject]@{
  routeResults = $routeResults
  superLogin = $superLogin.ok
  ownerLogin = $ownerLogin.ok
  checks = $checks
}
$result | ConvertTo-Json -Depth 8
