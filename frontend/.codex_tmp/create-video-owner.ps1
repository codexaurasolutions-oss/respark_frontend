$ErrorActionPreference = 'Stop'
function Invoke-Json {
  param([string]$Method,[string]$Url,$Headers,$Body=$null)
  if ($null -ne $Body) {
    $json = $Body | ConvertTo-Json -Depth 10
    return Invoke-RestMethod -Method $Method -Uri $Url -Headers $Headers -ContentType 'application/json' -Body $json
  }
  return Invoke-RestMethod -Method $Method -Uri $Url -Headers $Headers
}
$base = 'http://127.0.0.1:5050/api/v1'
$stamp = [int][double]::Parse((Get-Date -UFormat %s))
$ownerEmail = "video-owner-$stamp@local"
$super = Invoke-Json POST "$base/auth/login" @{} @{ email = 'superadmin@respark.local'; password = 'Admin@123' }
$headers = @{ Authorization = "Bearer $($super.accessToken)" }
$salon = Invoke-Json POST "$base/super-admin/salons" $headers @{
  name = "Video Demo Salon $stamp"
  slug = "video-demo-$stamp"
  businessType = 'Salon'
  email = "video-demo-$stamp@local"
  phone = '5557001000'
  city = 'Lahore'
  country = 'Pakistan'
  ownerName = 'Video Demo Owner'
  ownerEmail = $ownerEmail
  ownerPassword = 'Owner@123'
  featureFlags = @{ pos = $true; crm = $true; reports = $true; publicCatalog = $true }
}
$result = [pscustomobject]@{
  salonId = $salon.id
  salonName = $salon.name
  salonSlug = $salon.slug
  ownerEmail = $ownerEmail
  ownerPassword = 'Owner@123'
}
$result | ConvertTo-Json -Depth 5
