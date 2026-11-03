/**
 * Pruebas automáticas de extremo a extremo.
 * Levanta el servidor con una base de datos temporal y verifica la API.
 * Ejecutar:  node pruebas/pruebas.js
 */
'use strict';
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

const PUERTO = 3199;
const BASE = `http://127.0.0.1:${PUERTO}`;
const DIR_PRUEBA = path.join(os.tmpdir(), 'qr-pedidos-pruebas-' + process.pid);

let pasadas = 0, fallidas = 0;
function verificar(nombre, condicion, detalle = '') {
  if (condicion) { pasadas++; console.log(`  ✓ ${nombre}`); }
  else { fallidas++; console.log(`  ✗ ${nombre} ${detalle}`); }
}

const galletas = {};
async function pedir(ruta, { metodo = 'GET', cuerpo, sesion } = {}) {
  const cabeceras = { 'Content-Type': 'application/json' };
  if (sesion && galletas[sesion]) cabeceras.Cookie = galletas[sesion];
  const r = await fetch(BASE + ruta, { method: metodo, headers: cabeceras,
    body: cuerpo ? JSON.stringify(cuerpo) : undefined, redirect: 'manual' });
  const set = r.headers.get('set-cookie');
  if (set && sesion) galletas[sesion] = set.split(';')[0];
  let datos = null;
  try { datos = await r.json(); } catch (_) {}
  return { estado: r.status, datos };
}

async function principal() {
  fs.rmSync(DIR_PRUEBA, { recursive: true, force: true });
  const servidor = spawn(process.execPath, [path.join(__dirname, '..', 'iniciar.js')], {
    env: { ...process.env, PORT: String(PUERTO), QR_DATOS: DIR_PRUEBA, LOG_LEVEL: 'error', QR_CLAVE_ADMIN: 'admin123' },
    stdio: 'ignore',
  });
  await new Promise(r => setTimeout(r, 1500));

  try {
    console.log('\n1) Sesiones y roles');
    verificar('login con clave incorrecta es rechazado',
      (await pedir('/api/login', { metodo: 'POST', cuerpo: { usuario: 'admin', clave: 'mala' } })).estado === 401);
    verificar('login de admin funciona',
      (await pedir('/api/login', { metodo: 'POST', cuerpo: { usuario: 'admin', clave: 'admin123' }, sesion: 'admin' })).estado === 200);
    verificar('sin sesión no se ve /api/yo', (await pedir('/api/yo')).estado === 401);
    verificar('/cocina sin sesión redirige al login', (await pedir('/cocina')).estado === 302);

    console.log('\n2) Cuentas individuales');
    await pedir('/api/admin/usuarios', { metodo: 'POST', sesion: 'admin',
      cuerpo: { usuario: 'carlos', nombre: 'Carlos Q.', rol: 'cocina', clave: 'carlos123' } });
    await pedir('/api/admin/usuarios', { metodo: 'POST', sesion: 'admin',
      cuerpo: { usuario: 'maria', nombre: 'Maria L.', rol: 'mozo', clave: 'maria123' } });
    verificar('usuario duplicado es rechazado',
      (await pedir('/api/admin/usuarios', { metodo: 'POST', sesion: 'admin',
        cuerpo: { usuario: 'carlos', rol: 'cocina', clave: 'otra123' } })).estado === 409);
    verificar('contraseña corta es rechazada',
      (await pedir('/api/admin/usuarios', { metodo: 'POST', sesion: 'admin',
        cuerpo: { usuario: 'pepe', rol: 'mozo', clave: '123' } })).estado === 400);
    verificar('carlos inicia sesión',
      (await pedir('/api/login', { metodo: 'POST', cuerpo: { usuario: 'carlos', clave: 'carlos123' }, sesion: 'carlos' })).estado === 200);
    verificar('maria inicia sesión',
      (await pedir('/api/login', { metodo: 'POST', cuerpo: { usuario: 'maria', clave: 'maria123' }, sesion: 'maria' })).estado === 200);
    verificar('un cocinero no puede crear usuarios',
      (await pedir('/api/admin/usuarios', { metodo: 'POST', sesion: 'carlos',
        cuerpo: { usuario: 'intruso', rol: 'admin', clave: 'intruso123' } })).estado === 403);

    console.log('\n3) Pedidos y máquina de estados');
    const menu = (await pedir('/api/menu')).datos.menu;
    verificar('la carta tiene categorías', menu.length >= 4);
    const plato = menu[0].items[0];
    const creado = await pedir('/api/pedidos', { metodo: 'POST',
      cuerpo: { mesa: '7', nota: 'sin ají', items: [{ id: plato.id, cant: 2 }] } });
    verificar('se crea el pedido', creado.estado === 201);
    const idPedido = creado.datos.pedido.id;
    verificar('el total lo calcula el servidor', creado.datos.pedido.total === Math.round(plato.precio * 2 * 100) / 100);
    verificar('pedido sin platos es rechazado',
      (await pedir('/api/pedidos', { metodo: 'POST', cuerpo: { mesa: '7', items: [] } })).estado === 400);
    verificar('no se puede saltar de ordenado a entregado',
      (await pedir(`/api/pedidos/${idPedido}/estado`, { metodo: 'POST', sesion: 'maria', cuerpo: { estado: 'entregado' } })).estado === 409);
    verificar('el mozo no puede marcar cocinado',
      (await pedir(`/api/pedidos/${idPedido}/estado`, { metodo: 'POST', sesion: 'maria', cuerpo: { estado: 'cocinado' } })).estado === 403);
    verificar('la cocina marca cocinado',
      (await pedir(`/api/pedidos/${idPedido}/estado`, { metodo: 'POST', sesion: 'carlos', cuerpo: { estado: 'cocinado' } })).estado === 200);
    verificar('la cocina marca listo',
      (await pedir(`/api/pedidos/${idPedido}/estado`, { metodo: 'POST', sesion: 'carlos', cuerpo: { estado: 'listo' } })).estado === 200);
    verificar('el mozo marca entregado',
      (await pedir(`/api/pedidos/${idPedido}/estado`, { metodo: 'POST', sesion: 'maria', cuerpo: { estado: 'entregado' } })).estado === 200);
    verificar('pedido inexistente da 404',
      (await pedir('/api/pedidos/99999')).estado === 404);

    console.log('\n4) Llamadas al mozo');
    verificar('se registra la llamada',
      (await pedir('/api/llamadas', { metodo: 'POST', cuerpo: { mesa: '7', tipo: 'cuenta' } })).estado === 201);
    verificar('llamada repetida no duplica',
      (await pedir('/api/llamadas', { metodo: 'POST', cuerpo: { mesa: '7', tipo: 'cuenta' } })).datos.repetida === true);
    verificar('el mozo la atiende',
      (await pedir('/api/llamadas/1/atender', { metodo: 'POST', sesion: 'maria' })).estado === 200);

    console.log('\n5) Reportes personales y de gerencia');
    const statsCarlos = (await pedir('/api/mis-stats', { sesion: 'carlos' })).datos;
    verificar('carlos ve 1 cocinado', statsCarlos.stats.hoy.cocinados === 1);
    verificar('carlos no ve entregas ajenas', statsCarlos.stats.hoy.entregados === 0);
    const statsMaria = (await pedir('/api/mis-stats', { sesion: 'maria' })).datos;
    verificar('maria ve 1 entrega y 1 llamada',
      statsMaria.stats.hoy.entregados === 1 && statsMaria.stats.hoy.llamadas === 1);
    const rep = (await pedir('/api/admin/reportes?rango=hoy', { sesion: 'admin' })).datos;
    verificar('el reporte suma la venta', rep.resumen.pedidos === 1 && rep.resumen.ventas > 0);
    verificar('el reporte lista a los empleados',
      rep.porEmpleado.find(e => e.usuario === 'carlos').cocinados === 1);
    verificar('rango inválido es rechazado',
      (await pedir('/api/admin/reportes?rango=zzz', { sesion: 'admin' })).estado === 400);

    console.log('\n6) Carta editable');
    const nuevo = await pedir('/api/admin/platos', { metodo: 'POST', sesion: 'admin',
      cuerpo: { categoria_id: 2, nombre: 'Pollo a la brasa', descripcion: '1/4 con papas', precio: 22, emoji: '🍗' } });
    verificar('se agrega un plato', nuevo.estado === 201);
    verificar('se edita el precio',
      (await pedir(`/api/admin/platos/${nuevo.datos.id}`, { metodo: 'PUT', sesion: 'admin', cuerpo: { precio: 25 } })).estado === 200);
    verificar('se oculta un plato',
      (await pedir(`/api/admin/platos/${nuevo.datos.id}`, { metodo: 'PUT', sesion: 'admin', cuerpo: { activo: 0 } })).estado === 200);
    const menu2 = (await pedir('/api/menu')).datos.menu;
    verificar('el plato oculto no aparece en la carta',
      !menu2.some(c => c.items.some(i => i.nombre === 'Pollo a la brasa')));
    verificar('precio negativo es rechazado',
      (await pedir('/api/admin/platos', { metodo: 'POST', sesion: 'admin',
        cuerpo: { categoria_id: 1, nombre: 'X', precio: -5 } })).estado === 400);

    console.log('\n7) Configuración y seguridad');
    verificar('URL pública inválida es rechazada',
      (await pedir('/api/admin/config', { metodo: 'POST', sesion: 'admin', cuerpo: { url_publica: 'no-es-url' } })).estado === 400);
    verificar('URL pública válida se guarda',
      (await pedir('/api/admin/config', { metodo: 'POST', sesion: 'admin', cuerpo: { url_publica: 'https://demo.trycloudflare.com' } })).estado === 200);
    verificar('los QRs usan la URL pública',
      (await pedir('/api/info')).datos.base === 'https://demo.trycloudflare.com');
    verificar('no se puede eliminar la propia cuenta',
      (await pedir('/api/admin/usuarios/admin', { metodo: 'DELETE', sesion: 'admin' })).estado === 400);
    verificar('se elimina un empleado',
      (await pedir('/api/admin/usuarios/maria', { metodo: 'DELETE', sesion: 'admin' })).estado === 200);
    verificar('la sesión del eliminado deja de valer',
      (await pedir('/api/yo', { sesion: 'maria' })).estado === 401);
    verificar('el chequeo de salud responde', (await pedir('/api/salud')).datos.estado === 'ok');
    verificar('ruta inexistente da 404', (await pedir('/api/no-existe')).estado === 404);

    console.log(`\n${'='.repeat(46)}\n  RESULTADO: ${pasadas} pasadas, ${fallidas} fallidas\n${'='.repeat(46)}\n`);
  } finally {
    servidor.kill();
    await new Promise(r => setTimeout(r, 300));
    fs.rmSync(DIR_PRUEBA, { recursive: true, force: true });
  }
  process.exit(fallidas ? 1 : 0);
}
principal();
