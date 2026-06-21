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
$freshOwner = Invoke-Json 'POST' 'http://127.0.0.1:5050/api/v1/auth/login' $null @{ email='qa-owner-1780867232@local'; password='password123' }
$token = $freshOwner.data.accessToken
$branchList = Invoke-Json 'GET' 'http://127.0.0.1:5050/api/v1/owner/branches' $token
$branchId = $branchList.data[0].id
$userEmail = "inactive-recheck-$stamp@local"
$userCreate = Invoke-Json 'POST' 'http://127.0.0.1:5050/api/v1/owner/users' $token @{
  name = "Inactive Recheck $stamp"
  email = $userEmail
  password = 'password123'
  salonRole = 'STAFF'
  branchId = $branchId
}
$membershipId = $userCreate.data.membership.id
$deactivate = Invoke-Json 'PATCH' "http://127.0.0.1:5050/api/v1/owner/users/$membershipId/status" $token @{ isActive = $false }
$loginAfter = Invoke-Json 'POST' 'http://127.0.0.1:5050/api/v1/auth/login' $null @{ email=$userEmail; password='password123' }
[PSCustomObject]@{
  userCreate = $userCreate.ok
  deactivate = $deactivate.ok
  loginBlocked = (-not $loginAfter.ok)
  loginError = if ($loginAfter.ok) { '' } else { $loginAfter.error }
} | ConvertTo-Json -Depth 8
