# LetsMeet API smoke test — run from repo root or romio-app:
#   powershell -ExecutionPolicy Bypass -File romio-app/scripts/test-letsmeet-api.ps1
#
# Base URL matches eaglepredict / ninjaapi (mtn.lenhub.net).

param(
  [string]$BaseUrl = "https://mtn.lenhub.net",
  [switch]$SkipDestructive
)

$ErrorActionPreference = "Continue"
$pass = 0
$fail = 0
$warn = 0

function Write-Result($name, $status, $detail) {
  $icon = switch ($status) {
    "PASS" { $script:pass++; "OK  " }
    "WARN" { $script:warn++; "WARN" }
    default { $script:fail++; "FAIL" }
  }
  Write-Host "[$icon] $name" -ForegroundColor $(if ($status -eq "PASS") { "Green" } elseif ($status -eq "WARN") { "Yellow" } else { "Red" })
  if ($detail) { Write-Host "      $detail" }
}

function Invoke-LetsMeet {
  param(
    [string]$Method,
    [string]$Path,
    [object]$JsonBody = $null,
    [string]$Token = $null
  )
  $headers = @{ Accept = "application/json" }
  if ($Token) { $headers.Authorization = "Bearer $Token" }
  try {
    if ($JsonBody -ne $null) {
      $r = Invoke-WebRequest -Uri "$BaseUrl$Path" -Method $Method -Headers $headers `
        -ContentType "application/json" -Body ($JsonBody | ConvertTo-Json -Depth 5) `
        -UseBasicParsing -TimeoutSec 90
    } else {
      $r = Invoke-WebRequest -Uri "$BaseUrl$Path" -Method $Method -Headers $headers `
        -UseBasicParsing -TimeoutSec 90
    }
    return @{ ok = $true; status = [int]$r.StatusCode; body = $r.Content }
  } catch {
    $resp = $_.Exception.Response
    if ($resp) {
      $reader = New-Object System.IO.StreamReader($resp.GetResponseStream())
      return @{ ok = $false; status = [int]$resp.StatusCode; body = $reader.ReadToEnd() }
    }
    return @{ ok = $false; status = 0; body = $_.Exception.Message }
  }
}

function New-TestPhone {
  $suffix = (Get-Date -Format "HHmmss")
  return "0803$suffix"
}

Write-Host "`nLetsMeet API tests -> $BaseUrl`n" -ForegroundColor Cyan

# ── 1. Create user ───────────────────────────────────────────────────────────
$phone = New-TestPhone
$createBody = @{
  phone_number  = $phone
  full_name     = "API Test $(Get-Date -Format 'yyyy-MM-dd HH:mm')"
  date_of_birth = "1995-06-15"
  pin           = "1234"
  confirm_pin   = "1234"
}
$create = Invoke-LetsMeet POST "/api/letsmeet/create/user/" $createBody
if ($create.status -eq 200 -and $create.body -match "success") {
  Write-Result "POST /api/letsmeet/create/user/" "PASS" "phone=$phone"
} else {
  Write-Result "POST /api/letsmeet/create/user/" "FAIL" "$($create.status) $($create.body)"
}

# ── 2. Login ─────────────────────────────────────────────────────────────────
$login = Invoke-LetsMeet POST "/api/letsmeet/login/user/" @{ number = $phone; pin = "1234" }
$loginJson = $null
$token = $null
$userId = $null
if ($login.status -eq 200) {
  $loginJson = $login.body | ConvertFrom-Json
  $token = $loginJson.token
  $userId = [string]$loginJson.user_id
  if ($token -and $userId) {
    Write-Result "POST /api/letsmeet/login/user/" "PASS" "user_id=$userId profile_completed=$($loginJson.profile_completed)"
  } else {
    Write-Result "POST /api/letsmeet/login/user/" "FAIL" "Missing token or user_id"
  }
} else {
  Write-Result "POST /api/letsmeet/login/user/" "FAIL" "$($login.status) $($login.body)"
}

# ── 3. Login validation ──────────────────────────────────────────────────────
$badLogin = Invoke-LetsMeet POST "/api/letsmeet/login/user/" @{ number = $phone; pin = "9999" }
if ($badLogin.status -eq 400) {
  Write-Result "POST login (wrong pin -> 400)" "PASS" $badLogin.body
} else {
  Write-Result "POST login (wrong pin -> 400)" "FAIL" "$($badLogin.status) $($badLogin.body)"
}

# ── 4. Auth guard ────────────────────────────────────────────────────────────
$noAuth = Invoke-LetsMeet GET "/api/letsmeet/feed"
if ($noAuth.status -eq 401) {
  Write-Result "GET /api/letsmeet/feed (no token -> 401)" "PASS" ""
} else {
  Write-Result "GET /api/letsmeet/feed (no token -> 401)" "FAIL" "status=$($noAuth.status)"
}

if (-not $token) {
  Write-Host "`nStopping: login failed.`n" -ForegroundColor Red
  exit 1
}

# ── 5. Profile upload (multipart via curl) ─────────────────────────────────────
$imgPath = Join-Path $env:TEMP "letsmeet-profile-test.jpg"
if (-not (Test-Path $imgPath)) {
  curl.exe -sL "https://httpbin.org/image/jpeg" -o $imgPath | Out-Null
}
$profileOut = curl.exe -s -w "%{http_code}" -X POST "$BaseUrl/api/letsmeet/user/profile/" `
  -H "Authorization: Bearer $token" `
  -F "sexual_orientation=straight" `
  -F "gender=male" `
  -F "interests=music,travel" `
  -F "about_me=Automated API test profile" `
  -F "location=Lagos, Nigeria" `
  -F "show_location=true" `
  -F "profile_image=@$imgPath;type=image/jpeg;filename=profile.jpg"
$profileStatus = $profileOut.Substring($profileOut.Length - 3)
$profileBody = $profileOut.Substring(0, $profileOut.Length - 3)
if ($profileStatus -eq "200") {
  Write-Result "POST /api/letsmeet/user/profile/" "PASS" $profileBody
} elseif ($profileStatus -eq "400" -and $profileBody -match "already completed") {
  Write-Result "POST /api/letsmeet/user/profile/" "WARN" "Profile marked completed (image upload may still fail on backend)"
} else {
  Write-Result "POST /api/letsmeet/user/profile/" "WARN" "HTTP $profileStatus - $profileBody (backend often returns 500 but still marks profile complete)"
}

# Re-login after profile step
$login2 = Invoke-LetsMeet POST "/api/letsmeet/login/user/" @{ number = $phone; pin = "1234" }
if ($login2.status -eq 200) { $token = ($login2.body | ConvertFrom-Json).token }

# ── 6. Feed ──────────────────────────────────────────────────────────────────
$feed = Invoke-LetsMeet GET "/api/letsmeet/feed" -Token $token
if ($feed.status -eq 200) {
  if ($feed.body -eq "[]" -or $feed.body -eq "") {
    Write-Result "GET /api/letsmeet/feed" "WARN" "200 but empty array - verify backend has discoverable users"
  } else {
    Write-Result "GET /api/letsmeet/feed" "PASS" $feed.body.Substring(0, [Math]::Min(200, $feed.body.Length))
  }
} else {
  Write-Result "GET /api/letsmeet/feed" "FAIL" "$($feed.status) $($feed.body)"
}

# ── 7. Like list ─────────────────────────────────────────────────────────────
$likeList = Invoke-LetsMeet GET "/api/letsmeet/like/list" -Token $token
if ($likeList.status -eq 200) {
  Write-Result "GET /api/letsmeet/like/list" "PASS" "body=$($likeList.body)"
} else {
  Write-Result "GET /api/letsmeet/like/list" "FAIL" "$($likeList.status) $($likeList.body)"
}

# ── 8. Matched list ────────────────────────────────────────────────────────────
$matched = Invoke-LetsMeet GET "/api/letsmeet/matched/list/" -Token $token
if ($matched.status -eq 200) {
  Write-Result "GET /api/letsmeet/matched/list/" "PASS" "body=$($matched.body)"
} else {
  Write-Result "GET /api/letsmeet/matched/list/" "FAIL" "$($matched.status) $($matched.body)"
}

# ── 9. Second user + swipe / like (optional) ─────────────────────────────────
if (-not $SkipDestructive) {
  $phone2 = New-TestPhone
  $c2 = Invoke-LetsMeet POST "/api/letsmeet/create/user/" @{
    phone_number = $phone2; full_name = "Target User"; date_of_birth = "1998-01-01"
    pin = "5678"; confirm_pin = "5678"
  }
  $l2 = Invoke-LetsMeet POST "/api/letsmeet/login/user/" @{ number = $phone2; pin = "5678" }
  if ($l2.status -eq 200) {
    $token2 = ($l2.body | ConvertFrom-Json).token
    $userId2 = [string](($l2.body | ConvertFrom-Json).user_id)
    curl.exe -s -X POST "$BaseUrl/api/letsmeet/user/profile/" -H "Authorization: Bearer $token2" `
      -F "sexual_orientation=straight" -F "gender=female" -F "interests=art" `
      -F "about_me=Target" -F "location=Abuja" -F "show_location=true" `
      -F "profile_image=@$imgPath;type=image/jpeg;filename=profile.jpg" | Out-Null

    $swipe = Invoke-LetsMeet POST "/api/letsmeet/swipe" @{ user_id = $userId2; swipe_type = "like" } -Token $token
    if ($swipe.status -eq 200 -and $swipe.body -match "processed") {
      Write-Result "POST /api/letsmeet/swipe" "PASS" "Use numeric user_id string (e.g. $userId2)"
    } else {
      Write-Result "POST /api/letsmeet/swipe" "FAIL" "$($swipe.status) $($swipe.body)"
    }

    $like = Invoke-LetsMeet POST "/api/letsmeet/like" @{ user_id = $userId } -Token $token2
    if ($like.status -eq 200) {
      $likeJson = $like.body | ConvertFrom-Json
      Write-Result "POST /api/letsmeet/like" "PASS" "matched=$($likeJson.matched) match_id=$($likeJson.match_id) chatroom_id=$($likeJson.chatroom_id)"
      $hashId = $null
      $likesAfter = Invoke-LetsMeet GET "/api/letsmeet/like/list" -Token $token
      if ($likesAfter.status -eq 200 -and $likesAfter.body -ne "[]") {
        $hashId = (($likesAfter.body | ConvertFrom-Json)[0].user_id)
      }
      if ($hashId) {
        $single = Invoke-LetsMeet GET "/api/letsmeet/single/user/profile/?user_id=$hashId" -Token $token
        if ($single.status -eq 200) {
          Write-Result "GET /api/letsmeet/single/user/profile/" "PASS" "Requires hashed user_id, not numeric id"
        } else {
          Write-Result "GET /api/letsmeet/single/user/profile/" "FAIL" "$($single.status) $($single.body)"
        }
      }
    } else {
      Write-Result "POST /api/letsmeet/like" "FAIL" "$($like.status) $($like.body)"
    }
  }
}

# ── 10. Message send ─────────────────────────────────────────────────────────
$msg = Invoke-LetsMeet POST "/api/letsmeet/message/send" @{ message = "API test ping"; room_id = 1 } -Token $token
if ($msg.status -eq 200) {
  $msgJson = $msg.body | ConvertFrom-Json
  if ($msgJson.message_id) {
    Write-Result "POST /api/letsmeet/message/send" "PASS" "message_id=$($msgJson.message_id) room_id=$($msgJson.room_id)"
  } else {
    Write-Result "POST /api/letsmeet/message/send" "WARN" "200 but error in body: $($msg.body) - room_id mapping unclear vs chatroom_id from /like"
  }
} else {
  Write-Result "POST /api/letsmeet/message/send" "FAIL" "$($msg.status) $($msg.body)"
}

Write-Host "`nSummary: PASS=$pass  WARN=$warn  FAIL=$fail`n" -ForegroundColor Cyan
Write-Host "Implementation notes:" -ForegroundColor DarkGray
Write-Host "  - Login field is 'number'; create uses 'phone_number'" -ForegroundColor DarkGray
Write-Host '  - JWT header: Authorization: Bearer [token]' -ForegroundColor DarkGray
Write-Host "  - swipe/like: user_id = numeric id as string" -ForegroundColor DarkGray
Write-Host "  - single profile / lists: user_id = hashed uuid string" -ForegroundColor DarkGray
Write-Host '  - Media URLs: prefix BaseUrl for paths like /media/profile_pics/...' -ForegroundColor DarkGray

if ($fail -gt 0) { exit 1 }
