# ParkControl 20 — Configuración de PocketBase
# =============================================
# Ejecuta PocketBase con: ./pocketbase serve (en /backend)
# Luego entra a http://127.0.0.1:8090/_/ y crea las colecciones manualmente.

## COLECCIÓN: clientes
# Campos:
#   nombre        — Text (required)
#   token_acceso  — Text (required, unique) — genera con crypto.randomUUID()
#   puesto        — Relation -> puestos (optional, single)

## COLECCIÓN: puestos
# Campos:
#   numero        — Number (required, 1-20)
#   estado        — Select: libre | ocupado | mora (default: libre)
#   cliente       — Relation -> clientes (optional, single)
#   link_camara   — URL (optional)

## REGLAS DE API (en el panel de PocketBase)
# puestos:  List/View = "" (público para el admin local)
#           Update = "" (público para el admin local)
# clientes: List/View = "" (público — el token actúa como autenticación)

## POBLAR DATOS INICIALES
# Puedes usar el Admin UI de PocketBase para crear 20 registros en "puestos"
# con números del 1 al 20 y estado "libre".

# URL del cliente de ejemplo:
#   http://localhost:5173/acceso/<token_acceso_del_cliente>
