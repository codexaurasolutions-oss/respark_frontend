$ErrorActionPreference = 'Stop'
function Invoke-Json {
  param([string]$Method,[string]$Url,$Headers,$Body=$null)
  if ($null -ne $Body) {
    $json = $Body | ConvertTo-Json -Depth 10
    return Invoke-RestMethod -Method $Method -Uri $Url -Headers $Headers -ContentType 'application/json' -Body $json
  }
  return Invoke-RestMethod -Method $Method -Uri $Url -Headers $Headers
}
$base='http://127.0.0.1:5050/api/v1'
$super=Invoke-Json POST "$base/auth/login" @{} @{ email='superadmin@respark.local'; password='Admin@123' }
$headers=@{ Authorization="Bearer $($super.accessToken)" }
$current=Invoke-Json GET "$base/super-admin/settings" $headers
$notificationDefaults = if ($current.notificationDefaults) { $current.notificationDefaults } else { @{ email = $true; sms = $false; whatsapp = $true } }
$payload=@{
  systemName = $(if($current.systemName){$current.systemName}else{'ReSpark'})
  maintenanceMode = [bool]$current.maintenanceMode
  taxLabel = $(if($current.taxLabel){$current.taxLabel}else{'Tax'})
  defaultCurrency = 'INR'
  currencyOptions = @('INR','USD','AED')
  defaultCountry = $current.defaultCountry
  defaultCity = $current.defaultCity
  defaultTimezone = $current.defaultTimezone
  notificationDefaults = $notificationDefaults
  whatsappNumber = $current.whatsappNumber
  smsProviderName = $current.smsProviderName
  emailProviderName = $current.emailProviderName
  whatsappProviderName = $current.whatsappProviderName
  contactEmail = $current.contactEmail
  supportEmail = $current.supportEmail
  notificationEmail = $current.notificationEmail
  termsUrl = $(if($current.termsUrl){$current.termsUrl}else{'/terms'})
  privacyUrl = $(if($current.privacyUrl){$current.privacyUrl}else{'/privacy'})
  demoBookingUrl = $(if($current.demoBookingUrl){$current.demoBookingUrl}else{'/book-demo'})
  blogTitle = $current.blogTitle
  blogIntro = $current.blogIntro
  backupPolicyNote = $current.backupPolicyNote
  invoicePrefix = $(if($current.invoicePrefix){$current.invoicePrefix}else{'INV'})
}
$result=Invoke-Json POST "$base/super-admin/settings" $headers $payload
$result | Select-Object systemName,defaultCurrency,currencyOptions | ConvertTo-Json -Depth 5
