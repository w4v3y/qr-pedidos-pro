/**
 * Punto de entrada del sistema.
 * Orden: base de datos -> datos iniciales -> copias -> servidor -> apagado ordenado.
 */
'use strict';
const { APP, PUERTO, RUTAS } = require('./src/config');
const log = require('./src/utilidades/registro');
const esquema = require('./src/base-datos/esquema');
const semillas = require('./src/base-datos/semillas');
const copias = require('./src/base-datos/copias');
const conexion = require('./src/base-datos/conexion');
const auth = require('./src/servicios/autenticacion');
const eventos = require('./src/web/eventos');
const middlewares = require('./src/web/middlewares');
const servidorWeb = require('./src/web/servidor');
const os = require('os');

// Nunca dejar caer el proceso por un error suelto: se registra y se sigue.
process.on('uncaughtException', (e) => log.error('Excepción no capturada', e));
process.on('unhandledRejection', (e) => log.error('Promesa rechazada sin manejar', e));

esquema.aplicar();
semillas.sembrar(auth.crearUsuario);
copias.programar();

// Mantenimiento periódico en segundo plano.
const mantenimiento = setInterval(() => {
  auth.limpiarExpiradas();
  middlewares.limpiarContadores();
}, 10 * 60 * 1000);
mantenimiento.unref();

const servidor = servidorWeb.crear();
servidor.listen(PUERTO, () => {
  const ips = Object.values(os.networkInterfaces()).flat()
    .filter(i => i && i.family === 'IPv4' && !i.internal).map(i => i.address);
  const base = ips.length ? `http://${ips[0]}:${PUERTO}` : `http://localhost:${PUERTO}`;
  log.info(`${APP.nombre} v${APP.version} iniciado en el puerto ${PUERTO}`);
  console.log(`
==================================================
  ${APP.nombre}  v${APP.version}
==================================================
  Cliente (mesa 1):  ${base}/mesa/1
  Cocina:            ${base}/cocina
  Mozo:              ${base}/mozo
  Administracion:    ${base}/admin
  Imprimir QRs:      ${base}/qr
--------------------------------------------------
  Base de datos:  ${RUTAS.baseDatos}
  Registro:       ${RUTAS.registro}
  Copias:         ${RUTAS.copias}
--------------------------------------------------
  Deja esta ventana abierta mientras uses el sistema.
==================================================
`);
});

function apagar(senal) {
  log.info(`Apagando por ${senal}...`);
  eventos.cerrarTodo();
  servidor.close(() => { conexion.cerrar(); process.exit(0); });
  setTimeout(() => process.exit(0), 5000).unref(); // no colgarse esperando conexiones
}
process.on('SIGINT', () => apagar('SIGINT'));
process.on('SIGTERM', () => apagar('SIGTERM'));
