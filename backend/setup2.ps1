$ErrorActionPreference = "Stop"
$PB = "http://127.0.0.1:8090"
$log = @()

function pb_post($uri, $body, $headers = $null) {
    $params = @{
        Method = "Post"
        Uri = $uri
        ContentType = "application/json"
        Body = $body
    }
    if ($headers) { $params.Headers = $headers }
    return Invoke-RestMethod @params
}

function pb_post_raw($uri, $body, $token) {
    try {
        $bytes = [System.Text.Encoding]::UTF8.GetBytes($body)
        $req = [System.Net.HttpWebRequest]::Create($uri)
        $req.Method = "POST"
        $req.ContentType = "application/json"
        $req.ContentLength = $bytes.Length
        $req.Headers.Add("Authorization", $token)
        $s = $req.GetRequestStream()
        $s.Write($bytes, 0, $bytes.Length)
        $s.Close()
        $resp = $req.GetResponse()
        $sr = New-Object System.IO.StreamReader($resp.GetResponseStream())
        return @{ ok = $true; body = $sr.ReadToEnd() }
    } catch [System.Net.WebException] {
        $sr = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        return @{ ok = $false; body = $sr.ReadToEnd() }
    }
}

# Login
$loginResult = pb_post "$PB/api/collections/_superusers/auth-with-password" '{"identity":"admin@parkcontrol.local","password":"Admin1234!"}'
$token = $loginResult.token
Add-Content "setup.log" "Login OK"

# Coleccion clientes
$clientesBody = @{
    name = "clientes"
    type = "base"
    listRule = ""
    viewRule = ""
    createRule = ""
    updateRule = ""
    deleteRule = ""
    fields = @(
        @{ name = "nombre"; type = "text"; required = $true; min = $null; max = $null; pattern = "" }
        @{ name = "token_acceso"; type = "text"; required = $true; min = $null; max = $null; pattern = "" }
    )
} | ConvertTo-Json -Depth 10 -Compress

$r = pb_post_raw "$PB/api/collections" $clientesBody $token
Add-Content "setup.log" "clientes: $($r.ok) $($r.body)"

# Coleccion puestos - sin campo select complejo
$puestosBody = @{
    name = "puestos"
    type = "base"
    listRule = ""
    viewRule = ""
    createRule = ""
    updateRule = ""
    deleteRule = ""
    fields = @(
        @{ name = "numero"; type = "number"; required = $true; min = 1; max = 20 }
        @{ name = "estado"; type = "text"; required = $true; min = $null; max = $null; pattern = "" }
        @{ name = "link_camara"; type = "text"; min = $null; max = $null; pattern = "" }
        @{ name = "cliente_id"; type = "text"; min = $null; max = $null; pattern = "" }
    )
} | ConvertTo-Json -Depth 10 -Compress

$r2 = pb_post_raw "$PB/api/collections" $puestosBody $token
Add-Content "setup.log" "puestos: $($r2.ok) $($r2.body)"

# Crear 20 puestos si la coleccion existe
for ($i = 1; $i -le 20; $i++) {
    $pBody = '{"numero":' + $i + ',"estado":"libre"}'
    $rp = pb_post_raw "$PB/api/collections/puestos/records" $pBody $token
    Add-Content "setup.log" "puesto $i $($rp.ok)"
}

Add-Content "setup.log" "DONE"
Write-Host "Revisa setup.log"
