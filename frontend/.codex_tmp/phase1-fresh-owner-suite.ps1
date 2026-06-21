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
$email = 'qa-owner-1780867232@local'
$owner = Invoke-Json 'POST' 'http://127.0.0.1:5050/api/v1/auth/login' $null @{ email=$email; password='password123' }
if (-not $owner.ok) { throw "QA owner login failed: $($owner.error)" }
$token = $owner.data.accessToken

$result = [ordered]@{}

$branchCreate = Invoke-Json 'POST' 'http://127.0.0.1:5050/api/v1/owner/branches' $token @{
  name = "QA Branch Fresh $stamp"
  phone = '03001230000'
  email = "fresh-branch-$stamp@local"
  address = 'Fresh Address'
  businessHours = '10:00-19:00'
  weeklyOff = 'Sunday'
}
$result.branchCreate = $branchCreate.ok
if ($branchCreate.ok) {
  $branchId = $branchCreate.data.id
  $branchEdit = Invoke-Json 'PATCH' "http://127.0.0.1:5050/api/v1/owner/branches/$branchId" $token @{
    name = "QA Branch Fresh $stamp Updated"
    phone = '03001239999'
    email = "fresh-branch-$stamp@local"
    address = 'Fresh Address Updated'
    businessHours = '11:00-20:00'
    weeklyOff = 'Monday'
  }
  $result.branchEdit = $branchEdit.ok

  $categoryCreate = Invoke-Json 'POST' 'http://127.0.0.1:5050/api/v1/owner/service-categories' $token @{ name = "Fresh Category $stamp" }
  $result.categoryCreate = $categoryCreate.ok
  if ($categoryCreate.ok) {
    $result.categoryEdit = (Invoke-Json 'PATCH' "http://127.0.0.1:5050/api/v1/owner/service-categories/$($categoryCreate.data.id)" $token @{ name = "Fresh Category $stamp Updated" }).ok
  }

  $serviceCreate = Invoke-Json 'POST' 'http://127.0.0.1:5050/api/v1/owner/services' $token @{
    name = "Fresh Service $stamp"
    price = 1800
    durationMin = 50
    branchId = $branchId
    description = 'Fresh service'
    taxRate = 5
    onlineBookingEnabled = $true
    commissionPct = 10
    isFeatured = $true
    isPopular = $false
  }
  $result.serviceCreate = $serviceCreate.ok
  if ($serviceCreate.ok) {
    $serviceId = $serviceCreate.data.id
    $result.serviceEdit = (Invoke-Json 'PATCH' "http://127.0.0.1:5050/api/v1/owner/services/$serviceId" $token @{
      name = "Fresh Service $stamp Updated"
      price = 1900
      durationMin = 55
      branchId = $branchId
      description = 'Fresh service updated'
      taxRate = 7
      onlineBookingEnabled = $true
      commissionPct = 12
      isFeatured = $true
      isPopular = $true
    }).ok

    $roleCreate = Invoke-Json 'POST' 'http://127.0.0.1:5050/api/v1/owner/custom-roles' $token @{
      name = "Fresh Role $stamp"
      description = 'Fresh role'
      permissions = @{ services = @('view'); customers = @('view','edit') }
    }
    $result.roleCreate = $roleCreate.ok
    if ($roleCreate.ok) {
      $roleId = $roleCreate.data.id
      $result.roleEdit = (Invoke-Json 'PATCH' "http://127.0.0.1:5050/api/v1/owner/custom-roles/$roleId" $token @{
        name = "Fresh Role $stamp Updated"
        description = 'Fresh role updated'
        permissions = @{ services = @('view'); customers = @('view','edit'); support = @('view','create') }
      }).ok

      $userCreate = Invoke-Json 'POST' 'http://127.0.0.1:5050/api/v1/owner/users' $token @{
        name = "Fresh Staff $stamp"
        email = "fresh-staff-$stamp@local"
        password = 'password123'
        salonRole = 'STAFF'
        branchId = $branchId
        customRoleId = $roleId
        phone = '03005550000'
        profileNote = 'Fresh profile'
        roleTitle = 'Specialist'
        showInCatalog = $true
        serviceIds = @($serviceId)
      }
      $result.userCreate = $userCreate.ok
      if ($userCreate.ok) {
        $membershipId = $userCreate.data.membership.id
        $result.userEdit = (Invoke-Json 'PATCH' "http://127.0.0.1:5050/api/v1/owner/users/$membershipId" $token @{
          salonRole = 'STAFF'
          branchId = $branchId
          customRoleId = $roleId
          phone = '03005551111'
          profileNote = 'Fresh profile updated'
          roleTitle = 'Senior Specialist'
          showInCatalog = $false
          serviceIds = @($serviceId)
        }).ok
      }
    }
  }

  $customerCreate = Invoke-Json 'POST' 'http://127.0.0.1:5050/api/v1/owner/customers' $token @{
    name = "Fresh Customer $stamp"
    phone = "09$stamp"
    email = "fresh-customer-$stamp@local"
    gender = 'MALE'
    source = 'Walk In'
    tags = @('Fresh','QA')
    notes = 'Fresh customer'
  }
  $result.customerCreate = $customerCreate.ok
  if ($customerCreate.ok) {
    $customerId = $customerCreate.data.id
    $result.customerEdit = (Invoke-Json 'PATCH' "http://127.0.0.1:5050/api/v1/owner/customers/$customerId" $token @{
      name = "Fresh Customer $stamp Updated"
      phone = "09$stamp"
      email = "fresh-customer-$stamp@local"
      gender = 'MALE'
      source = 'Instagram'
      tags = @('Fresh','Updated')
      notes = 'Fresh customer updated'
    }).ok
  }
}

[PSCustomObject]$result | ConvertTo-Json -Depth 10
