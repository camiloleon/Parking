$PB = "http://127.0.0.1:8090"

# Login
$loginBody = '{"identity":"admin@parkcontrol.local","password":"Admin1234!"}'
$login = Invoke-RestMethod -Method Post -Uri "$PB/api/collections/_superusers/auth-with-password" -ContentType "application/json" -Body $loginBody
$authHeaders = @{ "Authorization" = $login.token; "Content-Type" = "application/json" }
Write-Host "Login OK"

# Coleccion clientes
$col1 = '{"name":"clientes","type":"base","listRule":"","viewRule":"","createRule":"","updateRule":"","deleteRule":"","fields":[{"name":"nombre","type":"text","required":true},{"name":"token_acceso","type":"text","required":true}]}'
try { Invoke-RestMethod -Method Post -Uri "$PB/api/collections" -Headers $authHeaders -Body $col1 | Out-Null; Write-Host "clientes: OK" }
catch { Write-Host "clientes: $($_.Exception.Message)" }

# Coleccion puestos
$col2 = '{"name":"puestos","type":"base","listRule":"","viewRule":"","createRule":"","updateRule":"","deleteRule":"","fields":[{"name":"numero","type":"number","required":true},{"name":"estado","type":"select","required":true,"options":{"values":["libre","ocupado","mora"]}},{"name":"link_camara","type":"url"},{"name":"cliente_id","type":"text"}]}'
try { Invoke-RestMethod -Method Post -Uri "$PB/api/collections" -Headers $authHeaders -Body $col2 | Out-Null; Write-Host "puestos: OK" }
catch { Write-Host "puestos: $($_.Exception.Message)" }

# Crear 20 puestos
for ($i = 1; $i -le 20; $i++) {
  $p = '{"numero":' + $i + ',"estado":"libre"}'
  try { Invoke-RestMethod -Method Post -Uri "$PB/api/collections/puestos/records" -Headers $authHeaders -Body $p | Out-Null; Write-Host "Puesto $i OK" }
  catch { Write-Host "Puesto $i error $($_.Exception.Message)" }
}

Write-Host "SETUP_COMPLETE"
