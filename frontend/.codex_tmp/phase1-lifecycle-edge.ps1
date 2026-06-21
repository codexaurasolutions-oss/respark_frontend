$ErrorActionPreference = 'Stop'
function Invoke-Json { param([string]$Method,[string]$Url,$Headers,$Body=$null) if($null -ne $Body){$json=$Body|ConvertTo-Json -Depth 10; return Invoke-RestMethod -Method $Method -Uri $Url -Headers $Headers -ContentType 'application/json' -Body $json}; return Invoke-RestMethod -Method $Method -Uri $Url -Headers $Headers }
function Try-Json { param([string]$Method,[string]$Url,$Headers,$Body=$null) try { $resp=Invoke-Json -Method $Method -Url $Url -Headers $Headers -Body $Body; return [pscustomobject]@{ ok=$true; body=$resp } } catch { $status=0; $raw=''; if($_.Exception.Response){ $status=[int]$_.Exception.Response.StatusCode; $stream=$_.Exception.Response.GetResponseStream(); if($stream){ $reader=New-Object System.IO.StreamReader($stream); $raw=$reader.ReadToEnd() } }; return [pscustomobject]@{ ok=$false; status=$status; raw=$raw } } }
$base='http://127.0.0.1:5050/api/v1'
$now=[int][double]::Parse((Get-Date -UFormat %s))
$super=Invoke-Json POST "$base/auth/login" @{} @{ email='superadmin@respark.local'; password='Admin@123' }
$superHeaders=@{ Authorization="Bearer $($super.accessToken)" }
$owner=Invoke-Json POST "$base/auth/login" @{} @{ email='qa-owner-1780867232@local'; password='password123' }
$ownerHeaders=@{ Authorization="Bearer $($owner.accessToken)" }
$plans=Invoke-Json GET "$base/super-admin/plans" $superHeaders
$planId=$plans[0].id
$lead=Invoke-Json POST "$base/public/demo-leads" @{} @{ name='Approve Edge'; email="approve-edge-$now@local"; phone='5553334444'; company='Edge'; message='Edge case' }
$approve=Try-Json POST "$base/super-admin/demo-leads/$($lead.id)/approve" $superHeaders @{ planId=$planId; trialDays=7; salonName="Approve Edge $now"; businessType='Salon'; reviewNote='ok' }
$rejectAfter=Try-Json POST "$base/super-admin/demo-leads/$($lead.id)/reject" $superHeaders @{ reviewNote='should fail' }
$branch=Invoke-Json POST "$base/owner/branches" $ownerHeaders @{ name="Archived Branch Edge $now"; phone='5558880000'; email="archived-edge-$now@local"; address='x'; businessHours='9-5'; weeklyOff='Sun' }
$archive=Try-Json PATCH "$base/owner/branches/$($branch.id)/archive" $ownerHeaders
$serviceOnArchived=Try-Json POST "$base/owner/services" $ownerHeaders @{ name="Archived Branch Service Edge $now"; price=100; durationMin=30; branchId=$branch.id; description='x' }
[pscustomobject]@{
 approveOk = $approve.ok
 rejectAfterApproveStatus = $rejectAfter.status
 rejectAfterApproveRaw = $rejectAfter.raw
 serviceOnArchivedStatus = $serviceOnArchived.status
 serviceOnArchivedRaw = $serviceOnArchived.raw
} | ConvertTo-Json -Depth 5
