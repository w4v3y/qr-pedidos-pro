/**
 * Lógica de llamadas al mozo y pedidos de cuenta.
 */
'use strict';
const { RATE_LIMIT } = require('../config');
const llamadasRepo = require('../repositorios/llamadasRepo');
const { errores } = require('../utilidades/errores');
const v = require('../utilidades/validacion');
const log = require('../utilidades/registro');

function crear({ mesa, tipo }) {
  const mesaOk = v.texto(mesa, { max: 10, minimo: 1, campo: 'número de mesa' });
  const tipoOk = v.opcion(tipo === 'cuenta' ? 'cuenta' : 'mozo', ['mozo', 'cuenta'], 'tipo');
  if (llamadasRepo.pendienteDe(mesaOk, tipoOk)) return { repetida: true };
  if (llamadasRepo.contarRecientesDeMesa(mesaOk, RATE_LIMIT.ventanaMs / 1000) >= RATE_LIMIT.llamadas)
    throw errores.demasiadas('Ya avisamos al mozo varias veces. Espera un momento.');
  llamadasRepo.crear(mesaOk, tipoOk);
  log.info('Llamada de mesa', { mesa: mesaOk, tipo: tipoOk });
  return { repetida: false };
}

function atender(id, usuario) {
  const cambios = llamadasRepo.atender(v.entero(id, { min: 1, campo: 'llamada' }), usuario.usuario);
  if (!cambios) throw errores.noEncontrado('Esa llamada ya fue atendida o no existe');
  log.info('Llamada atendida', { id, por: usuario.usuario });
}
module.exports = { crear, atender };
