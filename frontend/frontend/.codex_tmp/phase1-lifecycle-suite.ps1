$ErrorActionPreference = 'Stop'

function Invoke-Json {
  param(
    [string]$Method,
    [string]$Url,
    $Headers,
    $Body = $null
  )
  if ($null -ne $Body) {
    $json = $Body | ConvertTo-Json -Depth 10
    return Invoke-RestMethod -Method $Method -Uri $Url -Headers $Headers -ContentType 'application/json' -Body $json
  }
  return Invoke-RestMethod -Method $Method -Uri $Url -Headers $Headers
}

function Try-Json {
  param(
    [string]$Method,
    [string]$Url,
    $Headers,
    $Body = $null
  )
  try {
    $resp = Invoke-Json -Method $Method -Url $Url -Headers $Headers -Body $Body
    return [pscustomobject]@{ ok = $true; status = 200; body = $resp }
  } catch {
    $status = 0
    $raw = ''
    if ($_.Exception.Response) {
      $status = [int]$_.Exception.Response.StatusCode
      $stream = $_.Exception.Response.GetResponseStream()
      if ($stream) {
        $reader = New-Object System.IO.StreamReader($stream)
        $raw = $reader.ReadToEnd()
      }
    }
    return [pscustomobject]@{ ok = $false; status = $status; raw = $raw }
  }
}

$base = 'http://127.0.0.1:5050/api/v1'
$now = [int][double]::Parse((Get-Date -UFormat %s))

$super = Invoke-Json POST "$base/auth/login" @{} @{ email = 'superadmin@respark.local'; password = 'Admin@123' }
$superHeaders = @{ Authorization = "Bearer $($super.accessToken)" }
$owner = Invoke-Json POST "$base/auth/login" @{} @{ email = 'qa-owner-1780867232@local'; password = 'password123' }
$ownerHeaders = @{ Authorization = "Bearer $($owner.accessToken)" }
$plans = Invoke-Json GET "$base/super-admin/plans" $superHeaders
$planId = $plans[0].id

$results = [ordered]@{}

$salon = Invoke-Json POST "$base/super-admin/salons" $superHeaders @{
  name = "Phase1 Lifecycle Salon $now"
  slug = "phase1-lifecycle-$now"
  businessType = 'Salon'
  email = "phase1-lifecycle-$now@local"
  phone = '5551002000'
  city = 'QA City'
  country = 'PK'
  ownerName = 'Lifecycle Owner'
  ownerEmail = "phase1-lifecycle-owner-$now@local"
  ownerPassword = 'password123'
  featureFlags = @{ pos = $true; crm = $true; reports = $true }
}
$results.superSalonCreate = [bool]$salon.id

$featuresPatch = Try-Json PATCH "$base/super-admin/salons/$($salon.id)/features" $superHeaders @{ featureFlags = @{ pos = $false; crm = $true; reports = $false; publicCatalog = $true } }
$results.superSalonFeaturesPatch = $featuresPatch.ok
$salonAfterFeatures = (Invoke-Json GET "$base/super-admin/salons" $superHeaders | Where-Object { $_.id -eq $salon.id } | Select-Object -First 1)
$results.superSalonFeaturesReadback = ([bool]$salonAfterFeatures -and $salonAfterFeatures.featureFlags.publicCatalog -eq $true -and $salonAfterFeatures.featureFlags.pos -eq $false)

$statusPatch = Try-Json PATCH "$base/super-admin/salons/$($salon.id)/status" $superHeaders @{ status = 'SUSPENDED' }
$results.superSalonStatusPatch = $statusPatch.ok
$salonAfterStatus = (Invoke-Json GET "$base/super-admin/salons" $superHeaders | Where-Object { $_.id -eq $salon.id } | Select-Object -First 1)
$results.superSalonStatusReadback = ($salonAfterStatus.status -eq 'SUSPENDED')

$archivePatch = Try-Json PATCH "$base/super-admin/salons/$($salon.id)/archive" $superHeaders
$results.superSalonArchive = $archivePatch.ok
$salonAfterArchive = (Invoke-Json GET "$base/super-admin/salons" $superHeaders | Where-Object { $_.id -eq $salon.id } | Select-Object -First 1)
$results.superSalonArchiveReadback = ($salonAfterArchive.status -eq 'EXPIRED')

$rejectLead = Invoke-Json POST "$base/public/demo-leads" @{} @{
  name = 'Reject Lead'
  email = "reject-lead-$now@local"
  phone = '5551110000'
  company = 'Reject Co'
  message = 'Need demo'
}
$results.demoLeadCreateForReject = [bool]$rejectLead.id
$rejectAction = Try-Json POST "$base/super-admin/demo-leads/$($rejectLead.id)/reject" $superHeaders @{ reviewNote = 'Not a fit' }
$results.demoLeadReject = $rejectAction.ok
$rejectLeadRow = (Invoke-Json GET "$base/super-admin/demo-leads" $superHeaders | Where-Object { $_.id -eq $rejectLead.id } | Select-Object -First 1)
$results.demoLeadRejectReadback = ($rejectLeadRow.status -eq 'REJECTED')

$approveLead = Invoke-Json POST "$base/public/demo-leads" @{} @{
  name = 'Approve Lead'
  email = "approve-lead-$now@local"
  phone = '5551110001'
  company = 'Approve Co'
  message = 'Approve me'
}
$results.demoLeadCreateForApprove = [bool]$approveLead.id
$approveAction = Try-Json POST "$base/super-admin/demo-leads/$($approveLead.id)/approve" $superHeaders @{
  planId = $planId
  trialDays = 7
  salonName = "Approved Demo Salon $now"
  businessType = 'Salon'
  reviewNote = 'Approved in runtime QA'
}
$results.demoLeadApprove = $approveAction.ok
$rejectApproved = Try-Json POST "$base/super-admin/demo-leads/$($approveLead.id)/reject" $superHeaders @{ reviewNote = 'Should fail' }
$results.demoLeadRejectApprovedBlocked = (-not $rejectApproved.ok -and $rejectApproved.status -eq 400 -and $rejectApproved.raw -match 'cannot be rejected directly')

$archivedBranch = Invoke-Json POST "$base/owner/branches" $ownerHeaders @{
  name = "Lifecycle Branch Archived $now"
  phone = '5552223333'
  email = "branch-archived-$now@local"
  address = 'QA Street'
  businessHours = '9-6'
  weeklyOff = 'Sunday'
}
$results.ownerBranchCreate = [bool]$archivedBranch.id
$branchArchive = Try-Json PATCH "$base/owner/branches/$($archivedBranch.id)/archive" $ownerHeaders
$results.ownerBranchArchive = $branchArchive.ok
$branchesAfter = Invoke-Json GET "$base/owner/branches" $ownerHeaders
$results.ownerBranchHiddenAfterArchive = (-not ($branchesAfter | Where-Object { $_.id -eq $archivedBranch.id }))

$activeBranch = Invoke-Json POST "$base/owner/branches" $ownerHeaders @{
  name = "Lifecycle Branch Active $now"
  phone = '5552224444'
  email = "branch-active-$now@local"
  address = 'QA Street 2'
  businessHours = '10-7'
  weeklyOff = 'Monday'
}
$results.ownerActiveBranchCreate = [bool]$activeBranch.id

$category = Invoke-Json POST "$base/owner/service-categories" $ownerHeaders @{ name = "Lifecycle Category $now" }
$results.ownerCategoryCreate = [bool]$category.id
$categoryArchive = Try-Json PATCH "$base/owner/service-categories/$($category.id)/archive" $ownerHeaders
$results.ownerCategoryArchive = $categoryArchive.ok
$categoriesAfter = Invoke-Json GET "$base/owner/service-categories" $ownerHeaders
$results.ownerCategoryHiddenAfterArchive = (-not ($categoriesAfter | Where-Object { $_.id -eq $category.id }))

$service = Invoke-Json POST "$base/owner/services" $ownerHeaders @{
  name = "Lifecycle Service $now"
  price = 1200
  durationMin = 45
  branchId = $activeBranch.id
  description = 'Archive me'
  onlineBookingEnabled = $true
  isFeatured = $false
  isPopular = $false
}
$results.ownerServiceCreate = [bool]$service.id
$serviceArchive = Try-Json PATCH "$base/owner/services/$($service.id)/archive" $ownerHeaders
$results.ownerServiceArchive = $serviceArchive.ok
$servicesAfter = Invoke-Json GET "$base/owner/services" $ownerHeaders
$results.ownerServiceHiddenAfterArchive = (-not ($servicesAfter | Where-Object { $_.id -eq $service.id }))

$serviceOnArchivedBranch = Try-Json POST "$base/owner/services" $ownerHeaders @{
  name = "Should Fail Archived Branch $now"
  price = 999
  durationMin = 30
  branchId = $archivedBranch.id
  description = 'Should not create'
}
$results.ownerServiceCreateOnArchivedBranchBlocked = (-not $serviceOnArchivedBranch.ok -and ($serviceOnArchivedBranch.status -eq 404 -or $serviceOnArchivedBranch.raw -match 'Active branch not found'))

$results | ConvertTo-Json -Depth 6
