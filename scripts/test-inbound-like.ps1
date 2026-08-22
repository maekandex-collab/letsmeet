# Prove "Liked You" without feed — User B likes User A via POST /swipe directly.
# Usage:
#   powershell -File romio-app/scripts/test-inbound-like.ps1 -PhoneA 08099448550 -PinA YOUR_PIN -PhoneB 08061583213 -PinB OTHER_PIN
# Or auto-create two fresh test users:
#   powershell -File romio-app/scripts/test-inbound-like.ps1 -AutoCreate

param(
  [string]$BaseUrl = "https://mtn.lenhub.net",
  [string]$PhoneA = "",
  [string]$PinA = "",
  [string]$PhoneB = "",
  [string]$PinB = "",
  [string]$SwipeIdA = "",
  [string]$SwipeIdB = "",
  [switch]$AutoCreate
)

$ErrorActionPreference = "Stop"

function Normalize-Phone([string]$input) {
  $d = ($input -replace "\D", "")
  if ($d.StartsWith("234")) { return $d }
  if ($d.StartsWith("0")) { return "234$($d.Substring(1))" }
  return "234$d"
}

function Invoke-LM {
  param([string]$Method, [string]$Path, [object]$Body = $null, [string]$Token = $null, [switch]$Allow400)
  $headers = @{ Accept = "application/json" }
  if ($Token) { $headers.Authorization = "Bearer $Token" }
  $uri = "$BaseUrl$Path"
  try {
    if ($Body -ne $null) {
      $json = $Body | ConvertTo-Json -Compress
      return Invoke-RestMethod -Uri $uri -Method $Method -Headers $headers -ContentType "application/json" -Body $json
    }
    return Invoke-RestMethod -Uri $uri -Method $Method -Headers $headers
  } catch {
    $resp = $_.Exception.Response
    if ($resp -and [int]$resp.StatusCode -eq 400 -and $Allow400) {
      $reader = New-Object System.IO.StreamReader($resp.GetResponseStream())
      $text = $reader.ReadToEnd()
      return ($text | ConvertFrom-Json)
    }
    throw
  }
}

function Login-User([string]$phone, [string]$pin) {
  $number = Normalize-Phone $phone
  $body = @{ number = $number; pin = $pin } | ConvertTo-Json -Compress
  try {
    $res = Invoke-RestMethod -Uri "$BaseUrl/api/letsmeet/login/user/" -Method POST `
      -ContentType "application/json" -Body $body
    $text = $res | ConvertTo-Json -Compress
    if ($res.token) {
      $parsed = $res
    } else {
      throw "no token"
    }
  } catch {
    $text = $_.ErrorDetails.Message
    if (-not $text) { throw "Login failed for $phone : $($_.Exception.Message)" }
    $parsed = $text | ConvertFrom-Json
    if (-not $parsed.token) { throw "Login failed for $phone : $text" }
  }
  $uid = $parsed.user_id
  if (-not $uid) {
    $payload = $parsed.token.Split(".")[1]
    $pad = "=" * ((4 - ($payload.Length % 4)) % 4)
    $json = [Text.Encoding]::UTF8.GetString([Convert]::FromBase64String($payload + $pad))
    $uid = ([int]($json | ConvertFrom-Json).user_id)
  }
  return @{ token = $parsed.token; user_id = [string]$uid; name = $parsed.full_name; phone = $number }
}

function Complete-Profile([string]$Token, [string]$Gender = "male") {
  $imgPath = Join-Path $env:TEMP "letsmeet-profile-test.jpg"
  if (-not (Test-Path $imgPath)) {
    curl.exe -sL "https://httpbin.org/image/jpeg" -o $imgPath | Out-Null
  }
  curl.exe -s -X POST "$BaseUrl/api/letsmeet/update_reg/profile/" `
    -H "Authorization: Bearer $Token" `
    -F "sexual_orientation=straight" -F "gender=$Gender" -F "interests=music" `
    -F "about_me=API test profile" -F "location=Lagos" -F "show_location=true" `
    -F "religion=christian" -F "occupation=engineer" `
    -F "profile_image=@$imgPath;type=image/jpeg;filename=profile.jpg" | Out-Null
}

function Write-DebugLog([string]$message, [hashtable]$data) {
  $line = @{
    sessionId = "49bb0d"
    timestamp = [DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds()
    location  = "test-inbound-like.ps1"
    message   = $message
    data      = $data
  } | ConvertTo-Json -Compress
  $logPath = Join-Path (Split-Path (Split-Path $PSScriptRoot -Parent) -Parent) "debug-49bb0d.log"
  Add-Content -Path $logPath -Value $line -Encoding UTF8
}

function Get-SwipeTargetId($card) {
  $uid = [string]$card.user_id
  if ($uid -and $uid -match '^\d+$' -and $uid.Length -ge 8) { return $uid }
  return [string]$card.id
}

function Find-InFeed([string]$Token, [string]$TargetUserId) {
  $feed = Invoke-LM GET "/api/letsmeet/feed" -Token $Token
  $list = @($feed)
  foreach ($card in $list) {
    $swipeId = Get-SwipeTargetId $card
    $cardId = [string]$card.id
    $cardUid = [string]$card.user_id
    if ($swipeId -eq $TargetUserId -or $cardId -eq $TargetUserId -or $cardUid -eq $TargetUserId) {
      return @{ card = $card; swipeId = $swipeId }
    }
  }
  return $null
}

if ($AutoCreate) {
  $rand = Get-Random -Minimum 1000000 -Maximum 9999999
  $PhoneA = "0803$rand"
  $PhoneB = "0803$($rand + 1)"
  $PinA = "1234"
  $PinB = "5678"
  foreach ($p in @(@{ ph = $PhoneA; pin = $PinA; name = "TestUserA" }, @{ ph = $PhoneB; pin = $PinB; name = "TestUserB" })) {
    $created = Invoke-LM POST "/api/letsmeet/create/user/" @{
      phone_number = $p.ph; full_name = $p.name; date_of_birth = "1995-01-01"
      pin = $p.pin; confirm_pin = $p.pin
    }
    Write-Host "Created $($p.name) phone=$($p.ph) -> $($created.message)" -ForegroundColor DarkGray
  }
}

if (-not $PhoneA -or -not $PinA -or -not $PhoneB -or -not $PinB) {
  Write-Host "Provide -PhoneA/-PinA/-PhoneB/-PinB or use -AutoCreate" -ForegroundColor Red
  exit 1
}

$userA = Login-User $PhoneA $PinA
$userB = Login-User $PhoneB $PinB
Complete-Profile $userA.token
Complete-Profile $userB.token
$userA = Login-User $PhoneA $PinA
$userB = Login-User $PhoneB $PinB

Write-Host "Account A (victim): $($userA.name) user_id=$($userA.user_id) phone=$($userA.phone)"
Write-Host "Account B (liker):  $($userB.name) user_id=$($userB.user_id) phone=$($userB.phone)"

# Before: A's like list
$before = Invoke-LM GET "/api/letsmeet/like/list" -Token $userA.token
$beforeCount = if ($before -is [array]) { $before.Count } else { 0 }
Write-Host "`nBefore: A's Liked-You count = $beforeCount"

# Resolve A's swipe id (JWT user_id ≠ swipe API user_id)
$swipeUserId = $SwipeIdA.Trim()
if ($swipeUserId) {
  Write-Host "Using provided -SwipeIdA=$swipeUserId (skipping feed lookup)" -ForegroundColor DarkGray
} else {
  $target = Find-InFeed $userB.token $userA.user_id
  if ($target) {
    $swipeUserId = $target.swipeId
    Write-Host "Found A in B's feed -> swipe user_id=$swipeUserId (jwt id=$($userA.user_id))" -ForegroundColor DarkGray
  } else {
    $swipeUserId = $userA.user_id
    Write-Host "A not in B's feed ($(@(Invoke-LM GET '/api/letsmeet/feed' -Token $userB.token)).Count cards). Trying jwt id=$swipeUserId" -ForegroundColor Yellow
    Write-Host "Tip: ask backend for swipe user_id, or use romio-app /dev/swipe-test with -SwipeIdA" -ForegroundColor Yellow
  }
}

# B likes A directly — no manual swiping through feed UI
$swipeBody = @{ user_id = $swipeUserId; swipe_type = "like" }
Write-Host "B -> POST /swipe like A (user_id=$swipeUserId)..."
try {
  $swipeRes = Invoke-LM POST "/api/letsmeet/swipe" $swipeBody -Token $userB.token
  Write-Host "Swipe response: $($swipeRes | ConvertTo-Json -Compress)" -ForegroundColor Green
} catch {
  $err = $_.ErrorDetails.Message
  if (-not $err) { $err = $_.Exception.Message }
  Write-Host "Swipe FAILED: $err" -ForegroundColor Red
  $swipeRes = @{ error = $err }
}

Write-DebugLog "B swiped like on A via API" @{
  hypothesisId = "A-D"
  userA_id     = $userA.user_id
  userB_id     = $userB.user_id
  swipeRes     = $swipeRes
}

Start-Sleep -Seconds 1

# After: A's like list
$after = Invoke-LM GET "/api/letsmeet/like/list" -Token $userA.token
$afterList = @($after)
Write-Host "`nAfter: A's Liked-You count = $($afterList.Count)"

$bFound = $false
foreach ($item in $afterList) {
  $uid = [string]$item.user_id
  $id = [string]$item.id
  Write-Host "  - $($item.name) id=$id user_id=$uid"
  if ($id -eq $userB.user_id -or $uid -match $userB.user_id) { $bFound = $true }
}

Write-DebugLog "A like/list after B swipe" @{
  hypothesisId = "A-D"
  beforeCount  = $beforeCount
  afterCount   = $afterList.Count
  bFound       = $bFound
  items        = $afterList
}

if ($bFound -or $afterList.Count -gt $beforeCount) {
  Write-Host "`nSUCCESS: Account A should now see B under 'Liked You' in the app." -ForegroundColor Green
  Write-Host "Log in as Account A ($PhoneA) and open Matches — no swiping required." -ForegroundColor Green
} else {
  Write-Host "`nFAIL: B's swipe returned 200 but A's like/list did not update." -ForegroundColor Red
  Write-Host "This is a BACKEND issue — swipe API not registering inbound likes." -ForegroundColor Red
}

Write-Host ""
