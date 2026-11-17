# Lineamientos técnicos — QR Pedidos PRO

Reglas de trabajo para que el sistema se mantenga **robusto, escalable y organizado** a medida que crece.
Si vas a tocar el código (tú o alguien más), lee esto primero.

---

## 1. Arquitectura: cuatro capas, una responsabilidad cada una

El flujo de una petición siempre va en una sola dirección:

```
Navegador
   ↓
web/          ← recibe HTTP, valida sesión, responde. NO tiene reglas de negocio.
   ↓
servicios/    ← reglas del restaurante (precios, fases, permisos). NO conoce HTTP ni SQL.
   ↓
repositorios/ ← único lugar donde se escribe SQL. NO decide nada.
   ↓
base-datos/   ← conexión, esquema, migraciones, copias.
```

**Reglas que no se rompen:**

1. **Nunca escribas SQL fuera de `repositorios/`.** Si un servicio necesita un dato nuevo, se agrega un método al repositorio.
2. **Nunca uses `req` o `res` fuera de `web/`.** Los servicios reciben y devuelven objetos planos; así se pueden reutilizar desde una app móvil, un script o pruebas.
3. **Nunca pongas constantes de negocio en el código.** Precios límite, roles, fases, tiempos: todo vive en `src/config.js`.
4. **Una carpeta = una responsabilidad.** Si un archivo pasa de ~200 líneas, probablemente hay que partirlo.

### Por qué importa
Cuando quieras cambiar de SQLite a PostgreSQL, solo reescribes `repositorios/` y `base-datos/`. Cuando quieras una app móvil, reutilizas `servicios/` tal cual. Esa es la definición práctica de escalable.

---

## 2. Cómo agregar cosas nuevas (receta)

**Un endpoint nuevo** (ej. "cancelar pedido"):

1. `repositorios/pedidosRepo.js` → método `cancelar(id)` con el SQL.
2. `servicios/pedidosServicio.js` → función `cancelar(id, usuario)` con las reglas (¿quién puede? ¿en qué estado?).
3. `web/rutas/rutasPedidos.js` → una entrada más en el array:
   ```js
   { metodo: 'POST', ruta: '/api/pedidos/:id/cancelar', manejador(ctx) { ... } }
   ```
4. `pruebas/pruebas.js` → al menos dos verificaciones: el caso feliz y el caso prohibido.

**Un campo nuevo en la base de datos:** agrégalo al `ESQUEMA` **y** a la lista `MIGRACIONES` en `src/base-datos/esquema.js`. Nunca borres migraciones anteriores: así las bases de datos viejas siguen actualizándose solas.

**Una pantalla nueva:** archivo en `publico/`, ruta en `rutasPaginas.js` (con `protegida()` si es para el personal).

---

## 3. Seguridad (no negociable)

| Regla | Dónde está implementada |
|---|---|
| Las contraseñas nunca se guardan en texto plano (scrypt + sal única) | `servicios/autenticacion.js` |
| Comparación en tiempo constante para evitar ataques de tiempo | `autenticacion.verificar()` |
| **Los precios y totales se calculan SIEMPRE en el servidor**, jamás se confía en lo que envía el celular | `servicios/pedidosServicio.js` |
| Toda entrada externa se valida y se recorta | `utilidades/validacion.js` |
| SQL siempre con parámetros `?`; los rangos de reportes son lista blanca | `repositorios/` |
| Cookies `HttpOnly` + `SameSite=Lax` (el JavaScript de la página no puede leer la sesión) | `rutasAuth.js` |
| Cada endpoint declara qué rol lo puede usar | `middlewares.exigirRol` |
| Límite de intentos de login y de pedidos por mesa | `middlewares.limitar` + `config.RATE_LIMIT` |
| El canal público de eventos no expone notas ni montos de otras mesas | `web/eventos.js` |
| No se pueden servir archivos fuera de `publico/` | `web/respuestas.js` |

**Antes de usarlo en producción:** el primer arranque crea las cuentas `admin`, `cocina` y `mozo` con contraseñas aleatorias (se muestran en la consola y en `datos/CLAVES-INICIALES.txt`). Cámbialas en `/admin → Usuarios` y borra ese archivo.

---

## 4. Robustez: qué pasa cuando algo falla

- **Errores controlados:** se lanzan con `errores.noEncontrado(...)`, `errores.sinPermiso(...)`, etc. El servidor los convierte en el código HTTP correcto. No uses `try/catch` en cada ruta.
- **Errores inesperados:** se registran con traza completa y el cliente recibe un 500 genérico (nunca detalles internos).
- **El proceso no se cae:** `uncaughtException` y `unhandledRejection` se registran, no terminan el servidor.
- **Transacciones:** todo lo que escribe varias tablas usa `enTransaccion()` — o se guarda todo, o no se guarda nada.
- **Copias de seguridad:** automáticas cada 24 h en `datos/copias/`, se conservan las últimas 7. Para restaurar: apaga el servidor y copia el archivo sobre `datos/restaurante.db`.
- **Registro (logs):** `datos/registro.log`, con rotación al superar 2 MB. Ahí queda quién inició sesión, qué pedidos se crearon y todo error.
- **Apagado ordenado:** al cerrar la ventana se cierran las conexiones en vivo y la base de datos sin corromper datos.
- **Salud:** `GET /api/salud` devuelve tiempo activo, memoria y conexiones — útil si algún día lo monitoreas.

---

## 5. Pruebas automáticas

`node pruebas/pruebas.js` (o el acceso **Probar sistema**) levanta el servidor con una base de datos temporal y corre 41 verificaciones: sesiones, roles, fases del pedido, reportes, carta y seguridad.

**Regla:** cada vez que agregues una función, agrega su prueba. Antes de instalar una versión nueva en el restaurante, las pruebas deben salir todas en verde. Es la diferencia entre "creo que funciona" y "sé que funciona".

---

## 6. Convenciones de código

- Todo en **español** (nombres de archivos, funciones y variables) para que cualquiera del equipo lo entienda.
- `'use strict'` al inicio de cada archivo.
- `camelCase` en JavaScript, `snake_case` en columnas de la base de datos.
- Funciones cortas y con un solo propósito; nombres que digan lo que hacen (`cambiarEstado`, no `procesar`).
- Comentarios que expliquen **por qué**, no **qué** (el qué ya lo dice el código).
- Sin dependencias externas: el sistema corre solo con Node.js. Antes de agregar una librería, pregúntate si vale el riesgo de mantenimiento.

---

## 7. Ruta de escalamiento (en orden recomendado)

| Etapa | Cuándo | Qué hacer |
|---|---|---|
| **Hoy** | 1 local, hasta ~20 mesas | SQLite + túnel de Cloudflare. Ya está listo. |
| **Dirección fija** | Cuando reimprimir QRs moleste | Cuenta gratuita de Cloudflare → túnel con nombre y dominio propio. Los QRs dejan de cambiar. |
| **Sin depender de tu PC** | Cuando el restaurante opere sin ti | Subir a un servidor (Render/Railway/VPS ~US$5/mes). El código ya está preparado: `PORT` y `QR_DATOS` se configuran por variables de entorno. |
| **Varios locales** | Segunda sucursal | Migrar a PostgreSQL (solo cambian `repositorios/` y `base-datos/`) y agregar columna `local_id` a las tablas principales. |
| **Volumen alto** | Cientos de pedidos por hora | Sesiones en Redis (hoy están en memoria), varios procesos con balanceador, y cambiar SSE por WebSockets si necesitas comunicación bidireccional. |
| **Extras de negocio** | Cuando el flujo básico esté probado | Facturación electrónica, pagos en línea, control de stock, app para repartidores. |

---

## 8. Operación diaria

1. Encender la PC → acceso **1. Iniciar Restaurante** (deja la ventana negra abierta).
2. Si necesitas internet fuera del WiFi → acceso **6. Activar Internet**, copiar la dirección y pegarla en `/admin → Usuarios → URL pública`.
3. Al terminar el día: cerrar la ventana negra. Los datos quedan guardados.
4. Una vez al mes: copia la carpeta `datos/` a una USB o la nube. Ahí está todo tu historial de ventas.

---

## 9. Estructura de carpetas

```
QR-Pedidos-Codigo/
├── iniciar.js              Punto de entrada (arranca todo, en orden)
├── package.json            Metadatos y scripts
├── src/
│   ├── config.js           TODA la configuración del sistema
│   ├── base-datos/         Conexión, esquema + migraciones, semillas, copias
│   ├── repositorios/       Único lugar con SQL
│   ├── servicios/          Reglas de negocio
│   ├── web/                HTTP: servidor, enrutador, middlewares, eventos, rutas/
│   └── utilidades/         Registro, errores, validación
├── publico/                Interfaces (cliente, cocina, mozo, admin, login, QRs)
├── datos/                  Base de datos, logs y copias  ← RESPALDA ESTA CARPETA
├── pruebas/                Pruebas automáticas
├── docs/                   Este documento
└── *.bat                   Accesos e instalador de Windows
```
