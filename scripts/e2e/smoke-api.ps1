$ProgressPreference = 'SilentlyContinue'
$ErrorActionPreference = 'Stop'

function Invoke-Json {
    param(
        [string]$Method = 'GET',
        [string]$Url,
        [string]$Body = $null,
        [hashtable]$Headers = @{}
    )
    $params = @{ Method = $Method; Uri = $Url; UseBasicParsing = $true; TimeoutSec = 5 }
    if ($Headers -and $Headers.Count -gt 0) { $params.Headers = $Headers }
    if ($Body) {
        $params.Body = $Body
        $params.ContentType = 'application/json'
    }
    try {
        $r = Invoke-WebRequest @params
        return [PSCustomObject]@{ Status = [int]$r.StatusCode; Body = $r.Content }
    } catch [System.Net.WebException] {
        $resp = $_.Exception.Response
        if ($resp) {
            $stream = $resp.GetResponseStream()
            $reader = New-Object System.IO.StreamReader($stream)
            $body = $reader.ReadToEnd()
            $reader.Close()
            return [PSCustomObject]@{ Status = [int]$resp.StatusCode; Body = $body }
        }
        throw
    }
}

function Test-Case {
    param([string]$Name, [int]$Expect, [int]$Got, [string]$Body = '')
    $pass = ($Expect -eq $Got)
    $tag = if ($pass) { 'PASS' } else { 'FAIL' }
    $color = if ($pass) { 'Green' } else { 'Red' }
    if ($Body.Length -gt 120) { $Body = $Body.Substring(0, 120) + '...' }
    Write-Host ("[{0}] {1,-44} esperado={2} obtido={3} {4}" -f $tag, $Name, $Expect, $Got, $Body) -ForegroundColor $color
    if (-not $pass) { $script:failures++ }
}

$script:failures = 0
$base = 'http://127.0.0.1:3333'

Write-Host '=== Smoke API: Bloco 4 (sem auth) ===' -ForegroundColor Cyan

# Health
$r = Invoke-Json GET "$base/health"
Test-Case 'GET /health' 200 $r.Status $r.Body
$r = Invoke-Json GET "$base/health/db"
Test-Case 'GET /health/db' 200 $r.Status $r.Body

# Convites publicos (sem auth)
$r = Invoke-Json GET "$base/api/convites/publico/INVALIDO"
Test-Case 'GET /api/convites/publico/:token (404)' 404 $r.Status $r.Body

$r = Invoke-Json POST "$base/api/convites/publico/INVALIDO/responder" '{"status":"confirmado"}'
Test-Case 'POST .../publico/:token/responder (404)' 404 $r.Status $r.Body

$r = Invoke-Json POST "$base/api/convites/publico/INVALIDO/responder" '{"status":"INVALIDO"}'
Test-Case 'POST .../publico/:token/responder (400 zod)' 400 $r.Status $r.Body

# Notificacoes (todas exigem auth)
$r = Invoke-Json GET "$base/api/notificacoes"
Test-Case 'GET /api/notificacoes (401)' 401 $r.Status $r.Body
$r = Invoke-Json GET "$base/api/notificacoes/contagem"
Test-Case 'GET /api/notificacoes/contagem (401)' 401 $r.Status $r.Body
$r = Invoke-Json POST "$base/api/notificacoes/marcar-todas-lidas" '{}'
Test-Case 'POST .../marcar-todas-lidas (401)' 401 $r.Status $r.Body
$r = Invoke-Json PATCH "$base/api/notificacoes/abc/lida"
Test-Case 'PATCH /api/notificacoes/:id/lida (401)' 401 $r.Status $r.Body

# Reenvio / patch convite (auth requerida)
$r = Invoke-Json POST "$base/api/partidas/abc/convites/reenviar" '{"conviteIds":["x"],"canais":"email"}'
Test-Case 'POST /api/partidas/:id/convites/reenviar (401)' 401 $r.Status $r.Body
$r = Invoke-Json PATCH "$base/api/partidas/abc/convites/xyz" '{"status":"confirmado"}'
Test-Case 'PATCH /api/partidas/:id/convites/:cid (401)' 401 $r.Status $r.Body

# Webhook Resend (sem signature, sem auth)
$r = Invoke-Json POST "$base/api/webhooks/resend" '{"type":"email.delivered","data":{"email_id":"abc"}}'
Write-Host ("[INFO] POST /api/webhooks/resend status={0} body={1}" -f $r.Status, ($r.Body.Substring(0, [Math]::Min($r.Body.Length, 80)))) -ForegroundColor Yellow

Write-Host ""
if ($script:failures -eq 0) {
    Write-Host '=== TODOS OS CASOS PASSARAM ===' -ForegroundColor Green
    exit 0
} else {
    Write-Host ("=== {0} FALHA(S) ===" -f $script:failures) -ForegroundColor Red
    exit 1
}
