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
$super = Invoke-Json 'POST' 'http://127.0.0.1:5050/api/v1/auth/login' $null @{ email='superadmin@respark.local'; password='Admin@123' }
$owner = Invoke-Json 'POST' 'http://127.0.0.1:5050/api/v1/auth/login' $null @{ email='owner@respark.local'; password='Owner@123' }
if (-not $super.ok -or -not $owner.ok) { throw 'Auth bootstrap failed' }
$superToken = $super.data.accessToken
$ownerToken = $owner.data.accessToken

$result = [ordered]@{}

# Super Admin create/edit
$salonCreate = Invoke-Json 'POST' 'http://127.0.0.1:5050/api/v1/super-admin/salons' $superToken @{
  name = "QA Salon $stamp"
  slug = "qa-salon-$stamp"
  businessType = 'Spa'
  email = "qa-salon-$stamp@local"
  phone = '03001112222'
  city = 'Lahore'
  country = 'Pakistan'
  ownerName = 'QA Owner'
  ownerEmail = "qa-owner-$stamp@local"
  ownerPassword = 'password123'
  featureFlags = @{ pos = $true; crm = $true; reports = $true }
}
$result.superSalonCreate = $salonCreate.ok
if ($salonCreate.ok) {
  $salonId = $salonCreate.data.id
  $salonEdit = Invoke-Json 'PATCH' "http://127.0.0.1:5050/api/v1/super-admin/salons/$salonId" $superToken @{
    name = "QA Salon $stamp Updated"
    slug = "qa-salon-$stamp"
    businessType = 'Beauty Studio'
    email = "qa-salon-$stamp@local"
    phone = '03003334444'
    city = 'Karachi'
    country = 'Pakistan'
    featureFlags = @{ pos = $true; crm = $true; reports = $true }
  }
  $result.superSalonEdit = $salonEdit.ok
  $result.superSalonUpdatedName = if ($salonEdit.ok) { $salonEdit.data.name } else { $salonEdit.error }
}

$planCreate = Invoke-Json 'POST' 'http://127.0.0.1:5050/api/v1/super-admin/plans' $superToken @{
  name = "QA Plan $stamp"
  monthlyPrice = 4444
  yearlyPrice = 44440
  trialDays = 7
  branchLimit = 2
  userLimit = 10
  customerLimit = 500
  invoiceLimit = 1000
  storageLimit = 5
  isCustom = $false
  featureFlags = @{ pos = $true; crm = $true; reports = $true }
}
$result.superPlanCreate = $planCreate.ok
if ($planCreate.ok) {
  $planId = $planCreate.data.id
  $planEdit = Invoke-Json 'PATCH' "http://127.0.0.1:5050/api/v1/super-admin/plans/$planId" $superToken @{
    name = "QA Plan $stamp Updated"
    monthlyPrice = 5555
    yearlyPrice = 55550
    trialDays = 10
    branchLimit = 3
    userLimit = 12
    customerLimit = 700
    invoiceLimit = 1500
    storageLimit = 7
    isCustom = $true
    featureFlags = @{ pos = $true; crm = $true; reports = $true; publicCatalog = $true }
  }
  $result.superPlanEdit = $planEdit.ok
  $result.superPlanUpdatedName = if ($planEdit.ok) { $planEdit.data.name } else { $planEdit.error }
}

if ($salonCreate.ok -and $planCreate.ok) {
  $startsAt = (Get-Date).ToString('o')
  $endsAt = (Get-Date).AddDays(14).ToString('o')
  $subCreate = Invoke-Json 'POST' 'http://127.0.0.1:5050/api/v1/super-admin/subscriptions' $superToken @{
    salonId = $salonCreate.data.id
    planId = $planCreate.data.id
    status = 'TRIAL'
    paymentStatus = 'PENDING'
    manualDiscount = 100
    notes = 'QA subscription'
    startsAt = $startsAt
    endsAt = $endsAt
  }
  $result.superSubscriptionCreate = $subCreate.ok
  if ($subCreate.ok) {
    $subId = $subCreate.data.id
    $subEdit = Invoke-Json 'PATCH' "http://127.0.0.1:5050/api/v1/super-admin/subscriptions/$subId" $superToken @{
      status = 'ACTIVE'
      paymentStatus = 'PAID'
      notes = 'QA subscription updated'
      manualDiscount = 50
    }
    $result.superSubscriptionEdit = $subEdit.ok
    $result.superSubscriptionUpdatedStatus = if ($subEdit.ok) { $subEdit.data.status } else { $subEdit.error }
  }
}

# Owner create/edit
$branchCreate = Invoke-Json 'POST' 'http://127.0.0.1:5050/api/v1/owner/branches' $ownerToken @{
  name = "QA Branch $stamp"
  phone = '03005556666'
  email = "branch-$stamp@local"
  address = 'QA Address'
  businessHours = '10:00-20:00'
  weeklyOff = 'Sunday'
}
$result.ownerBranchCreate = $branchCreate.ok
if ($branchCreate.ok) {
  $branchId = $branchCreate.data.id
  $branchEdit = Invoke-Json 'PATCH' "http://127.0.0.1:5050/api/v1/owner/branches/$branchId" $ownerToken @{
    name = "QA Branch $stamp Updated"
    phone = '03007778888'
    email = "branch-$stamp@local"
    address = 'QA Address Updated'
    businessHours = '11:00-21:00'
    weeklyOff = 'Monday'
  }
  $result.ownerBranchEdit = $branchEdit.ok
}

$categoryCreate = Invoke-Json 'POST' 'http://127.0.0.1:5050/api/v1/owner/service-categories' $ownerToken @{
  name = "QA Category $stamp"
}
$result.ownerServiceCategoryCreate = $categoryCreate.ok
if ($categoryCreate.ok) {
  $catId = $categoryCreate.data.id
  $categoryEdit = Invoke-Json 'PATCH' "http://127.0.0.1:5050/api/v1/owner/service-categories/$catId" $ownerToken @{
    name = "QA Category $stamp Updated"
  }
  $result.ownerServiceCategoryEdit = $categoryEdit.ok
}

$serviceCreate = Invoke-Json 'POST' 'http://127.0.0.1:5050/api/v1/owner/services' $ownerToken @{
  name = "QA Service $stamp"
  price = 2500
  durationMin = 60
  branchId = $branchCreate.data.id
  description = 'QA service'
  taxRate = 5
  onlineBookingEnabled = $true
  commissionPct = 10
  isFeatured = $true
  isPopular = $false
}
$result.ownerServiceCreate = $serviceCreate.ok
if ($serviceCreate.ok) {
  $serviceId = $serviceCreate.data.id
  $serviceEdit = Invoke-Json 'PATCH' "http://127.0.0.1:5050/api/v1/owner/services/$serviceId" $ownerToken @{
    name = "QA Service $stamp Updated"
    price = 2700
    durationMin = 75
    branchId = $branchCreate.data.id
    description = 'QA service updated'
    taxRate = 8
    onlineBookingEnabled = $true
    commissionPct = 12
    isFeatured = $true
    isPopular = $true
  }
  $result.ownerServiceEdit = $serviceEdit.ok
}

$customerCreate = Invoke-Json 'POST' 'http://127.0.0.1:5050/api/v1/owner/customers' $ownerToken @{
  name = "QA Customer $stamp"
  phone = "03$stamp"
  email = "customer-$stamp@local"
  gender = 'FEMALE'
  source = 'Walk In'
  tags = @('VIP','QA')
  notes = 'QA customer note'
}
$result.ownerCustomerCreate = $customerCreate.ok
if ($customerCreate.ok) {
  $customerId = $customerCreate.data.id
  $customerEdit = Invoke-Json 'PATCH' "http://127.0.0.1:5050/api/v1/owner/customers/$customerId" $ownerToken @{
    name = "QA Customer $stamp Updated"
    phone = "03$stamp"
    email = "customer-$stamp@local"
    gender = 'FEMALE'
    source = 'Instagram'
    tags = @('VIP','Updated')
    notes = 'QA customer updated'
  }
  $result.ownerCustomerEdit = $customerEdit.ok
}

$customRoleCreate = Invoke-Json 'POST' 'http://127.0.0.1:5050/api/v1/owner/custom-roles' $ownerToken @{
  name = "QA Role $stamp"
  description = 'QA role'
  permissions = @{ customers = @('view'); support = @('view','create') }
}
$result.ownerCustomRoleCreate = $customRoleCreate.ok
if ($customRoleCreate.ok) {
  $roleId = $customRoleCreate.data.id
  $customRoleEdit = Invoke-Json 'PATCH' "http://127.0.0.1:5050/api/v1/owner/custom-roles/$roleId" $ownerToken @{
    name = "QA Role $stamp Updated"
    description = 'QA role updated'
    permissions = @{ customers = @('view','edit'); support = @('view','create') }
  }
  $result.ownerCustomRoleEdit = $customRoleEdit.ok
}

$userCreate = Invoke-Json 'POST' 'http://127.0.0.1:5050/api/v1/owner/users' $ownerToken @{
  name = "QA Staff $stamp"
  email = "staff-$stamp@local"
  password = 'password123'
  salonRole = 'STAFF'
  branchId = $branchCreate.data.id
  customRoleId = $customRoleCreate.data.id
  phone = '03009990000'
  profileNote = 'QA profile'
  roleTitle = 'Stylist'
  showInCatalog = $true
  serviceIds = @($serviceCreate.data.id)
}
$result.ownerUserCreate = $userCreate.ok
if ($userCreate.ok) {
  $membershipId = $userCreate.data.membership.id
  $userEdit = Invoke-Json 'PATCH' "http://127.0.0.1:5050/api/v1/owner/users/$membershipId" $ownerToken @{
    salonRole = 'STAFF'
    branchId = $branchCreate.data.id
    customRoleId = $customRoleCreate.data.id
    phone = '03008887777'
    profileNote = 'QA profile updated'
    roleTitle = 'Senior Stylist'
    showInCatalog = $false
    serviceIds = @($serviceCreate.data.id)
  }
  $result.ownerUserEdit = $userEdit.ok
}

# UI route smoke for create/edit surfaces
$uiTargets = @(
  'http://127.0.0.1:5173/super-admin/salons',
  'http://127.0.0.1:5173/super-admin/plans',
  'http://127.0.0.1:5173/super-admin/subscriptions',
  'http://127.0.0.1:5173/admin/branches',
  'http://127.0.0.1:5173/admin/services',
  'http://127.0.0.1:5173/admin/customers',
  'http://127.0.0.1:5173/admin/users',
  'http://127.0.0.1:5173/admin/support-tickets',
  'http://127.0.0.1:5173/admin/settings/business'
)
$uiResults = @()
foreach ($target in $uiTargets) {
  try {
    $res = Invoke-WebRequest -UseBasicParsing -Uri $target -TimeoutSec 10
    $uiResults += [PSCustomObject]@{ target = $target; ok = ($res.StatusCode -eq 200) }
  } catch {
    $uiResults += [PSCustomObject]@{ target = $target; ok = $false }
  }
}
$result.uiRoutes = $uiResults

[PSCustomObject]$result | ConvertTo-Json -Depth 12
