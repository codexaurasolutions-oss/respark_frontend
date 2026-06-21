function Invoke-Json($method, $url, $token=$null, $body=$null) {
  try {
    $headers = @{}
    if ($token) { $headers['Authorization'] = "Bearer $token" }
    if ($null -ne $body) {
      $payload = $body | ConvertTo-Json -Depth 20
      $res = Invoke-RestMethod -Method $method -Uri $url -Headers $headers -ContentType 'application/json' -Body $payload -TimeoutSec 20
    } else {
      $res = Invoke-RestMethod -Method $method -Uri $url -Headers $headers -TimeoutSec 20
    }
    return @{ ok = $true; data = $res }
  } catch {
    $msg = $_.ErrorDetails.Message
    if (-not $msg) { $msg = $_.Exception.Message }
    return @{ ok = $false; error = $msg }
  }
}

$stamp = [DateTimeOffset]::UtcNow.ToUnixTimeSeconds()
$owner = Invoke-Json 'POST' 'http://127.0.0.1:5050/api/v1/auth/login' $null @{ email='owner@respark.local'; password='Owner@123' }
$token = $owner.data.accessToken
$branches = Invoke-Json 'GET' 'http://127.0.0.1:5050/api/v1/owner/branches' $token
$services = Invoke-Json 'GET' 'http://127.0.0.1:5050/api/v1/owner/services' $token

$branchCreate = Invoke-Json 'POST' 'http://127.0.0.1:5050/api/v1/owner/branches' $token @{
  name = "QA Branch Debug $stamp"
  phone = '03001110000'
  email = "debug-branch-$stamp@local"
}

$branchId = if ($branches.ok -and $branches.data.Count -gt 0) { $branches.data[0].id } else { $null }
$serviceCreate = Invoke-Json 'POST' 'http://127.0.0.1:5050/api/v1/owner/services' $token @{
  name = "QA Debug Service $stamp"
  price = 1200
  durationMin = 45
  branchId = $branchId
}

$userCreate = Invoke-Json 'POST' 'http://127.0.0.1:5050/api/v1/owner/users' $token @{
  name = "QA Debug Staff $stamp"
  email = "debug-staff-$stamp@local"
  password = 'password123'
  salonRole = 'STAFF'
  branchId = $branchId
}

[PSCustomObject]@{
  existingBranchCount = if ($branches.ok) { $branches.data.Count } else { -1 }
  pickedBranchId = $branchId
  branchCreate = $branchCreate
  serviceCreate = $serviceCreate
  userCreate = $userCreate
} | ConvertTo-Json -Depth 10
