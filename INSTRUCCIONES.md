Proyecto: ParkControl 20 - Sistema de Gestión de Parqueadero.
Contexto: Parqueadero privado de 20 puestos. Acceso físico manual (llaves). Cada puesto tiene una cámara independiente con un link/QR único.
Stack: PocketBase (Backend/SQLite/Admin UI) + React (Vite) + Tailwind CSS + Lucide Icons.
Filosofía: Cero fricción. El cliente entra vía URL única con Token (sin registro/password). El administrador gestiona todo desde un grid visual de 20 espacios.
Regla de Oro: Si el cliente no está "al día", no ve el link de su cámara.

## Reglas de Arquitectura

**Single Source of Truth:** PocketBase es la ley. Si algo no está en la base de datos, no existe en la UI.

**Token-Based Access:** En lugar de /login, usa useEffect en la vista del cliente para buscar en la colección `clientes` el registro que coincida con el `token_acceso` de la URL. Si no existe, muestra "Acceso Inválido".

**No Over-Engineering:** No crees sistemas de mensajería ni notificaciones complejas. El "aviso de pago" es simplemente el cambio de color en la app del cliente.