/**
 * Eventos en tiempo real (Server-Sent Events).
 * Dos canales: público (clientes de mesa) y staff (cocina/mozo/admin).
 * El canal público NO expone notas, montos ni datos de otras mesas.
 */
'use strict';
const pedidosRepo = require('../repositorios/pedidosRepo');
const llamadasRepo = require('../repositorios/llamadasRepo');
const log = require('../utilidades/registro');

const canales = { publico: new Set(), staff: new Set() };

const estadoPublico = () => ({ pedidos: pedidosRepo.estadosDeHoy() });
const estadoStaff = () => ({ pedidos: pedidosRepo.activosDeHoy(), llamadas: llamadasRepo.pendientes() });

function abrir(req, res, canal, datosIniciales) {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream; charset=utf-8',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no',
  });
  res.write(`data: ${JSON.stringify(datosIniciales)}\n\n`);
  canales[canal].add(res);
  const latido = setInterval(() => { try { res.write(': ping\n\n'); } catch (_) {} }, 25000);
  const cerrar = () => { canales[canal].delete(res); clearInterval(latido); };
  req.on('close', cerrar);
  res.on('error', cerrar);
}

/** Envía el estado actualizado a todos los conectados. */
function difundir() {
  try {
    enviar(canales.publico, estadoPublico());
    enviar(canales.staff, estadoStaff());
  } catch (e) { log.error('Error al difundir eventos', e); }
}
function enviar(conjunto, datos) {
  if (!conjunto.size) return;
  const mensaje = `data: ${JSON.stringify(datos)}\n\n`;
  for (const res of conjunto) {
    try { res.write(mensaje); } catch (_) { conjunto.delete(res); }
  }
}
function cerrarTodo() {
  for (const conjunto of Object.values(canales))
    for (const res of conjunto) { try { res.end(); } catch (_) {} }
}
const conectados = () => ({ publico: canales.publico.size, staff: canales.staff.size });

module.exports = { abrir, difundir, cerrarTodo, conectados, estadoPublico, estadoStaff };
