/**
 * Lógica de negocio de pedidos: validación, cálculo de totales y máquina de estados.
 */
'use strict';
const { PEDIDO, LIMITES, RATE_LIMIT } = require('../config');
const pedidosRepo = require('../repositorios/pedidosRepo');
const menuRepo = require('../repositorios/menuRepo');
const { errores } = require('../utilidades/errores');
const v = require('../utilidades/validacion');
const log = require('../utilidades/registro');

function crear({ mesa, nota, items }) {
  const mesaOk = v.texto(mesa, { max: 10, minimo: 1, campo: 'número de mesa' });
  const notaOk = v.texto(nota, { max: LIMITES.largoNota });
  if (!Array.isArray(items) || items.length === 0)
    throw errores.peticionInvalida('El pedido no tiene platos');
  if (items.length > LIMITES.itemsPorPedido)
    throw errores.peticionInvalida('El pedido tiene demasiados platos distintos');

  // Anti-abuso: máximo de pedidos por mesa por minuto
  const recientes = pedidosRepo.contarRecientesDeMesa(mesaOk, RATE_LIMIT.ventanaMs / 1000);
  if (recientes >= RATE_LIMIT.pedidos)
    throw errores.demasiadas('Se registraron demasiados pedidos desde esta mesa. Espera un minuto.');

  // El precio SIEMPRE se toma de la base de datos, nunca del cliente.
  const validados = [];
  for (const it of items) {
    const plato = menuRepo.platoActivo(v.entero(it.id, { min: 1, campo: 'plato' }));
    if (!plato) continue;
    const cant = v.entero(it.cant, { min: 1, max: LIMITES.cantidadPorItem, campo: 'cantidad' });
    validados.push({ ...plato, cant });
  }
  if (!validados.length) throw errores.peticionInvalida('Ningún plato del pedido está disponible');

  const total = Math.round(validados.reduce((s, p) => s + p.precio * p.cant, 0) * 100) / 100;
  const id = pedidosRepo.crear({ mesa: mesaOk, nota: notaOk, items: validados, total });
  log.info('Pedido creado', { id, mesa: mesaOk, total });
  return pedidosRepo.obtener(id);
}

function cambiarEstado(id, nuevoEstado, usuario) {
  v.opcion(nuevoEstado, PEDIDO.estados, 'estado');
  const rolesOk = PEDIDO.rolesPermitidos[nuevoEstado];
  if (!rolesOk) throw errores.peticionInvalida('Ese estado no se puede asignar manualmente');
  if (!rolesOk.includes(usuario.rol)) throw errores.sinPermiso();

  const actual = pedidosRepo.estadoDe(id);
  if (!actual) throw errores.noEncontrado('El pedido no existe');
  if (PEDIDO.transiciones[actual.estado] !== nuevoEstado)
    throw errores.conflicto(`No se puede pasar de "${actual.estado}" a "${nuevoEstado}"`);

  pedidosRepo.cambiarEstado(id, nuevoEstado, usuario.usuario);
  log.info('Pedido actualizado', { id, estado: nuevoEstado, por: usuario.usuario });
  return pedidosRepo.obtener(id);
}

const obtener = (id) => pedidosRepo.obtener(id);
module.exports = { crear, cambiarEstado, obtener };
