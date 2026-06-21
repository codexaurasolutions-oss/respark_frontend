function Invoke-Json($method, $url, $token=$null, $body=$null) {
  try {
    $headers = @{}
    if ($token) { $headers['Authorization'] = "Bearer $token" }
    if ($null -ne $body) {
      $payload = $body | ConvertTo-Json -Depth 30
      $res = Invoke-RestMethod -Method $method -Uri $url -Headers $headers -ContentType 'application/json' -Body $payload -TimeoutSec 25
    } else {
      $res = Invoke-RestMethod -Method $method -Uri $url -Headers $headers -TimeoutSec 25
    }
    return @{ ok = $true; data = $res }
  } catch {
    $msg = $_.ErrorDetails.Message
    if (-not $msg) { $msg = $_.Exception.Message }
    return @{ ok = $false; error = $msg }
  }
}

function Ensure-SettingDefaults([hashtable]$body) {
  if (-not $body.ContainsKey('systemName') -or [string]::IsNullOrWhiteSpace([string]$body['systemName'])) { $body['systemName'] = 'ReSpark Clone SaaS' }
  if (-not $body.ContainsKey('defaultCurrency') -or [string]::IsNullOrWhiteSpace([string]$body['defaultCurrency'])) { $body['defaultCurrency'] = 'PKR' }
  if (-not $body.ContainsKey('invoicePrefix') -or [string]::IsNullOrWhiteSpace([string]$body['invoicePrefix'])) { $body['invoicePrefix'] = 'INV' }
  if (-not $body.ContainsKey('currencyOptions') -or $null -eq $body['currencyOptions']) { $body['currencyOptions'] = @('PKR') }
  if (-not $body.ContainsKey('notificationDefaults') -or $null -eq $body['notificationDefaults']) { $body['notificationDefaults'] = @{ email = $true } }
  return $body
}

$stamp = [DateTimeOffset]::UtcNow.ToUnixTimeSeconds()
$super = Invoke-Json 'POST' 'http://127.0.0.1:5050/api/v1/auth/login' $null @{ email='superadmin@respark.local'; password='Admin@123' }
$owner = Invoke-Json 'POST' 'http://127.0.0.1:5050/api/v1/auth/login' $null @{ email='owner@respark.local'; password='Owner@123' }
if (-not $super.ok -or -not $owner.ok) { throw 'bootstrap login failed' }
$superToken = $super.data.accessToken
$ownerToken = $owner.data.accessToken

$result = [ordered]@{}

$salonEmail = "phase1-suspend-$stamp@local"
$ownerEmail = "phase1-suspend-owner-$stamp@local"
$createSalon = Invoke-Json 'POST' 'http://127.0.0.1:5050/api/v1/super-admin/salons' $superToken @{
  name = "Phase1 Suspend Salon $stamp"
  slug = "phase1-suspend-$stamp"
  businessType = 'Spa'
  email = $salonEmail
  ownerName = 'Suspend Owner'
  ownerEmail = $ownerEmail
  ownerPassword = 'password123'
  featureFlags = @{ pos = $true; crm = $true; reports = $true }
}
$result.suspendSalonCreate = $createSalon.ok
if ($createSalon.ok) {
  $salonId = $createSalon.data.id
  $ownerBefore = Invoke-Json 'POST' 'http://127.0.0.1:5050/api/v1/auth/login' $null @{ email=$ownerEmail; password='password123' }
  $suspendSalon = Invoke-Json 'PATCH' "http://127.0.0.1:5050/api/v1/super-admin/salons/$salonId/status" $superToken @{ status = 'SUSPENDED' }
  $ownerAfter = Invoke-Json 'POST' 'http://127.0.0.1:5050/api/v1/auth/login' $null @{ email=$ownerEmail; password='password123' }
  $result.suspendOwnerLoginBefore = $ownerBefore.ok
  $result.suspendSalonPatch = $suspendSalon.ok
  $result.suspendOwnerLoginAfterBlocked = (-not $ownerAfter.ok)
}

$existingSettings = Invoke-Json 'GET' 'http://127.0.0.1:5050/api/v1/super-admin/settings' $superToken
$result.settingsReadBeforeMaintenance = $existingSettings.ok
if ($existingSettings.ok) {
  $settingsBody = @{}
  $existingSettings.data.PSObject.Properties | ForEach-Object {
    if ($_.Name -ne 'id' -and $_.Name -ne 'createdAt' -and $_.Name -ne 'updatedAt') {
      $settingsBody[$_.Name] = $_.Value
    }
  }
  $enableBody = @{}
  foreach ($k in $settingsBody.Keys) { $enableBody[$k] = $settingsBody[$k] }
  Ensure-SettingDefaults $enableBody | Out-Null
  $enableBody['maintenanceMode'] = $true
  $maintenanceEnable = Invoke-Json 'POST' 'http://127.0.0.1:5050/api/v1/super-admin/settings' $superToken $enableBody
  $ownerDuringMaintenance = Invoke-Json 'POST' 'http://127.0.0.1:5050/api/v1/auth/login' $null @{ email='owner@respark.local'; password='Owner@123' }
  $superDuringMaintenance = Invoke-Json 'POST' 'http://127.0.0.1:5050/api/v1/auth/login' $null @{ email='superadmin@respark.local'; password='Admin@123' }
  $restoreBody = @{}
  foreach ($k in $settingsBody.Keys) { $restoreBody[$k] = $settingsBody[$k] }
  Ensure-SettingDefaults $restoreBody | Out-Null
  $restoreBody['maintenanceMode'] = [bool]$settingsBody['maintenanceMode']
  $maintenanceRestore = Invoke-Json 'POST' 'http://127.0.0.1:5050/api/v1/super-admin/settings' $superToken $restoreBody
  $result.maintenanceEnable = $maintenanceEnable.ok
  $result.ownerBlockedDuringMaintenance = (-not $ownerDuringMaintenance.ok)
  $result.superAllowedDuringMaintenance = $superDuringMaintenance.ok
  $result.maintenanceRestore = $maintenanceRestore.ok
}

$freshOwnerEmail = 'qa-owner-1780867232@local'
$freshOwner = Invoke-Json 'POST' 'http://127.0.0.1:5050/api/v1/auth/login' $null @{ email=$freshOwnerEmail; password='password123' }
$result.freshOwnerLogin = $freshOwner.ok
if ($freshOwner.ok) {
  $freshToken = $freshOwner.data.accessToken
  $branchList = Invoke-Json 'GET' 'http://127.0.0.1:5050/api/v1/owner/branches' $freshToken
  $branchId = if ($branchList.ok -and $branchList.data.Count -gt 0) { $branchList.data[0].id } else { $null }
  $userEmail = "phase1-staff-$stamp@local"
  $userCreate = Invoke-Json 'POST' 'http://127.0.0.1:5050/api/v1/owner/users' $freshToken @{
    name = "Phase1 Staff $stamp"
    email = $userEmail
    password = 'password123'
    salonRole = 'STAFF'
    branchId = $branchId
  }
  $result.staffCreate = $userCreate.ok
  if ($userCreate.ok) {
    $membershipId = $userCreate.data.membership.id
    $loginBeforeDeactivate = Invoke-Json 'POST' 'http://127.0.0.1:5050/api/v1/auth/login' $null @{ email=$userEmail; password='password123' }
    $deactivate = Invoke-Json 'PATCH' "http://127.0.0.1:5050/api/v1/owner/users/$membershipId/status" $freshToken @{ isActive = $false }
    $loginAfterDeactivate = Invoke-Json 'POST' 'http://127.0.0.1:5050/api/v1/auth/login' $null @{ email=$userEmail; password='password123' }
    $archive = Invoke-Json 'PATCH' "http://127.0.0.1:5050/api/v1/owner/users/$membershipId/archive" $freshToken @{}
    $userListAfterArchive = Invoke-Json 'GET' 'http://127.0.0.1:5050/api/v1/owner/users' $freshToken
    $visibleAfterArchive = $false
    if ($userListAfterArchive.ok) {
      $visibleAfterArchive = [bool]($userListAfterArchive.data | Where-Object { $_.id -eq $membershipId })
    }
    $result.staffLoginBeforeDeactivate = $loginBeforeDeactivate.ok
    $result.staffDeactivate = $deactivate.ok
    $result.staffLoginBlockedAfterDeactivate = (-not $loginAfterDeactivate.ok)
    $result.staffArchive = $archive.ok
    $result.staffHiddenAfterArchive = (-not $visibleAfterArchive)
  }
}

$ticketTitle = "Phase1 Lifecycle Ticket $stamp"
$ticketCreate = Invoke-Json 'POST' 'http://127.0.0.1:5050/api/v1/owner/support-tickets' $ownerToken @{
  title = $ticketTitle
  category = 'BILLING'
  priority = 'HIGH'
  description = 'Phase1 lifecycle test'
}
$result.supportCreate = $ticketCreate.ok
if ($ticketCreate.ok) {
  $ticketId = $ticketCreate.data.id
  $superReply = Invoke-Json 'POST' "http://127.0.0.1:5050/api/v1/super-admin/support-tickets/$ticketId/messages" $superToken @{
    message = 'Support reply from super admin'
    status = 'CLOSED'
  }
  $ownerReplyClosed = Invoke-Json 'POST' "http://127.0.0.1:5050/api/v1/owner/support-tickets/$ticketId/messages" $ownerToken @{
    message = 'Owner tries reply on closed ticket'
  }
  $reopen = Invoke-Json 'PATCH' "http://127.0.0.1:5050/api/v1/super-admin/support-tickets/$ticketId" $superToken @{
    status = 'OPEN'
  }
  $ownerReplyReopened = Invoke-Json 'POST' "http://127.0.0.1:5050/api/v1/owner/support-tickets/$ticketId/messages" $ownerToken @{
    message = 'Owner reply after reopen'
  }
  $result.supportSuperReplyClose = $superReply.ok
  $result.supportOwnerBlockedWhenClosed = (-not $ownerReplyClosed.ok)
  $result.supportReopen = $reopen.ok
  $result.supportOwnerReplyAfterReopen = $ownerReplyReopened.ok
}

[PSCustomObject]$result | ConvertTo-Json -Depth 20
