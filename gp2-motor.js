"use strict";
/* ============================================================
   gp2-motor.js — el motor de GP2, extraido de
   Movimientos/Registrar_Movimiento.html para que los modulos del
   menu usen LA MISMA logica y no una copia propia.

   Lee GP2.movimientos_bundle() y escribe con GP2.registrar_movimientos(jsonb).
   Los triggers fn_movimiento_calc / fn_movimiento_aplicar convierten a
   canonico y actualizan GP2.inventario: la app NO calcula stock.

   Uso:
     await GP2M.cargar(SB);
     var r = GP2M.recepcionTall({tall:6, comp_id:70, cantidad:50, fecha:'2026-08-28'});
     if (r.elegir) { ...preguntar cual de r.elegir... }
     else await GP2M.registrar(SB, r.rows);
   ============================================================ */

(function(global){

var D = null;
var UB = {};
var UBIC_VIRGILIO = null;
var SECTOR_TERMINADO = 12;   // los terminados NO pasan por recepcion de tallerista
var TALL_FABRICA = 3;

/* ---------- carga ---------- */
async function cargar(SB){
  var res = await SB.rpc("movimientos_bundle");
  if (res.error) throw res.error;
  D = res.data;
  for (var rid in D.rp) D.rp[rid].sort(function(a,b){ return a.o - b.o; });
  UB = {}; UBIC_VIRGILIO = null;
  for (var uid in D.ubic){
    var u = D.ubic[uid], id = parseInt(uid);
    if (u.tipo === "sector") UB["sector:" + u.ref] = id;
    else if (u.tipo === "proveedor_servicio") UB["prov:" + u.ref] = id;
    else if (u.tipo === "tallerista") UB["tall:" + u.ref] = id;
    else if (u.tipo === "virgilio") UBIC_VIRGILIO = id;
  }
  return D;
}

/* ---------- lookups ---------- */
function comp(cid){ return (D && D.comp[String(cid)]) || { cod:"?", d:"" }; }
function sectorNom(sid){ return ((D && D.sect[String(sid)]) || { nom:"" }).nom; }
function ubicSector(s){ return UB["sector:" + parseInt(s)] || null; }
function ubicProvServ(p){ return UB["prov:" + parseInt(p)] || null; }
function ubicTall(t){ return UB["tall:" + parseInt(t)] || null; }
function ubicNom(uid){ return uid ? ((D && D.ubic[String(uid)]) || { nom:"?" }).nom : ""; }

/* stock de un componente en una ubicacion, leido del inventario del bundle */
function stock(cid, ubicId){
  var k = String(cid) + ":" + String(ubicId);
  var i = (D && D.inv && D.inv[k]) || null;
  return i ? Number(i.cant || 0) : 0;
}
function minimo(cid, ubicId){
  var k = String(cid) + ":" + String(ubicId);
  var i = (D && D.inv && D.inv[k]) || null;
  return i ? Number(i.min || 0) : 0;
}

/* ---------- derivaciones sobre ruta_paso ----------
   Identicas a las de Registrar_Movimiento.html. */

/* La entrada efectiva de un paso: si el paso no declara comp_entrada,
   se hereda la salida del paso anterior que si la tenga. */
function entradaEfectiva(ps, i){
  var p = ps[i], j;
  if (p.ce) return p.ce;
  for (j = i - 1; j >= 0; j--) if (ps[j].cs) return ps[j].cs;
  for (j = i - 1; j >= 0; j--)
    if ((ps[j].tipo === "insumo" || ps[j].tipo === "ingreso") && ps[j].ce) return ps[j].ce;
  return null;
}

/* side 'para' = lo que se le manda; side 'de' = lo que devuelve. */
function compsFor(role, keyVal, side){
  var set = {};
  for (var rid in D.rp){
    var ps = D.rp[rid];
    for (var i = 0; i < ps.length; i++){
      var p = ps[i];
      var match = (role === "tall" && p.tipo === "tallerista" && p.tall == keyVal) ||
                  (role === "prov" && p.tipo === "proveedor_servicio" && p.prov == keyVal);
      if (!match) continue;
      if (side === "para"){ var ce = entradaEfectiva(ps, i); if (ce) set[ce] = 1; }
      else if (p.cs) set[p.cs] = 1;
    }
  }
  return Object.keys(set).map(Number);
}

/* Lo que un tallerista devuelve por recepcion de tallerista.
   Excluye los TERMINADOS: esos entran por Recepcion Virgilio.
   (mismo filtro que onTallRec() en Registrar_Movimiento.html) */
function compsRecepcionTall(t){
  return compsFor("tall", t, "de").filter(function(id){
    var c = D.comp[String(id)];
    return c && c.s !== SECTOR_TERMINADO;
  });
}

/* Las entradas que un tallerista pudo consumir para devolver cid.
   0 = paso in-place (devuelve lo mismo que recibe)
   1 = transformacion univoca
   >1 = hay que preguntar cual consumio (en Movimientos es un prompt) */
function entradasPosibles(t, cid){
  var hayInPlace = false;
  for (var rid in D.rp) D.rp[rid].forEach(function(pp){
    if (pp.tipo === "tallerista" && pp.tall == t && pp.cs == cid && pp.ce == cid) hayInPlace = true;
  });
  if (hayInPlace) return [];
  var set = {};
  for (var rid2 in D.rp){
    var ps = D.rp[rid2];
    for (var i = 0; i < ps.length; i++){
      var pp2 = ps[i];
      if (pp2.tipo === "tallerista" && pp2.tall == t && pp2.cs == cid){
        var ce = entradaEfectiva(ps, i);
        if (ce && ce !== cid) set[ce] = 1;
      }
    }
  }
  return Object.keys(set).map(Number);
}

/* Lo que se le descuenta al tallerista al recibir cid (sin la entrada principal) */
function bomDe(cid){ return (D.bom_comp && D.bom_comp[String(cid)]) || []; }

function talleristas(incFabrica){
  return Object.keys(D.tall)
    .filter(function(k){ return incFabrica || parseInt(k) !== TALL_FABRICA; })
    .map(function(k){ return { id: parseInt(k), nombre: D.tall[k].nom }; })
    .sort(function(a,b){ return a.nombre.localeCompare(b.nombre); });
}

/* ---------- constructor de movimientos: recepcion de tallerista ----------
   Reproduce el bloque tipo==='recepcion_tall' de saveMov().

   Devuelve { rows:[...] } listo para registrar, o
            { elegir:[comp_ids] } cuando el componente recibido puede venir
            de mas de una entrada y hay que preguntar cual consumio.        */
function recepcionTall(o){
  var t = parseInt(o.tall);
  var cid = parseInt(o.comp_id);
  var qty = Number(o.cantidad);
  var fecha = o.fecha || null;
  var rows = [];

  if (!t) throw new Error("Falta el tallerista");
  if (!cid) throw new Error("Falta el componente");
  if (!(qty > 0)) throw new Error("La cantidad debe ser mayor a 0");

  var recibido = cid;
  var comp_transformado = null, cant_transformada = null;

  // ¿el tallerista devuelve el MISMO componente que recibe? (paso in-place)
  var hayInPlace = false;
  for (var rid in D.rp) D.rp[rid].forEach(function(pp){
    if (pp.tipo === "tallerista" && pp.tall == t && pp.cs == cid && pp.ce == cid) hayInPlace = true;
  });

  // si no, buscar que entrada consumio para producirlo
  var ce_set = {};
  if (!hayInPlace){
    for (var rid2 in D.rp){
      var ps = D.rp[rid2];
      for (var i = 0; i < ps.length; i++){
        var pp2 = ps[i];
        if (pp2.tipo === "tallerista" && pp2.tall == t && pp2.cs == cid){
          var ce_c = entradaEfectiva(ps, i);
          if (ce_c && ce_c !== cid) ce_set[ce_c] = 1;
        }
      }
    }
  }
  var ce_arr = Object.keys(ce_set).map(Number);

  if (ce_arr.length > 1 && !o.comp_entrada_id){
    return { elegir: ce_arr };            // la pantalla decide como preguntarlo
  }
  if (o.comp_entrada_id && ce_arr.indexOf(parseInt(o.comp_entrada_id)) >= 0){
    cid = parseInt(o.comp_entrada_id); comp_transformado = recibido; cant_transformada = qty;
  } else if (ce_arr.length === 1){
    cid = ce_arr[0]; comp_transformado = recibido; cant_transformada = qty;
  }

  var ubic_o = ubicTall(t);
  var ubic_d = ubicSector(comp(comp_transformado || cid).s);
  if (!ubic_o) throw new Error("El tallerista no tiene ubicación");
  if (!ubic_d) throw new Error("El componente no tiene ubicación de sector");

  // cascada BOM: lo demas que el tallerista consumio se le descuenta
  if (comp_transformado){
    var bom = D.bom_comp[String(comp_transformado)] || [];
    var used = cid;
    var principal = bom.filter(function(b){ return b.c === used; })[0];
    if (principal && principal.q > 1) qty = qty * principal.q;
    bom.forEach(function(b){
      if (b.c === used) return;
      rows.push({
        tipo: "consumo_tall", fecha: fecha, comp_id: b.c,
        ubic_origen_id: ubic_o, ubic_destino_id: null,
        cantidad: b.q * cant_transformada,
        comp_transformado_id: null, cantidad_transformada: null,
        unidad_origen: "uni", unidad_destino: "uni"
      });
    });
  }

  rows.push({
    tipo: "recepcion_tall", fecha: fecha, comp_id: cid,
    ubic_origen_id: ubic_o, ubic_destino_id: ubic_d,
    cantidad: qty,
    comp_transformado_id: comp_transformado, cantidad_transformada: cant_transformada,
    unidad_origen: "uni", unidad_destino: "uni"
  });

  return { rows: rows };
}

/* ---------- escritura ---------- */
async function registrar(SB, rows){
  if (!rows || !rows.length) throw new Error("No hay movimientos para registrar");
  var payload = rows.map(function(m){
    return {
      fecha: m.fecha ? (m.fecha + "T12:00:00") : null,
      tipo_mov: m.tipo,
      comp_id: m.comp_id == null ? null : m.comp_id,
      ubic_origen_id: m.ubic_origen_id == null ? null : m.ubic_origen_id,
      ubic_destino_id: m.ubic_destino_id == null ? null : m.ubic_destino_id,
      cantidad: m.cantidad,
      unidad_origen: m.unidad_origen || "uni",
      comp_transformado_id: m.comp_transformado_id == null ? null : m.comp_transformado_id,
      cantidad_transformada: m.cantidad_transformada == null ? null : m.cantidad_transformada,
      unidad_destino: m.unidad_destino || "uni",
      cajones: m.cajones == null ? null : m.cajones,
      faltante: !!m.faltante
    };
  });
  var res = await SB.rpc("registrar_movimientos", { p_rows: payload });
  if (res.error) throw res.error;
  return res.data;
}

global.GP2M = {
  cargar: cargar,
  registrar: registrar,
  get D(){ return D; },
  comp: comp,
  sectorNom: sectorNom,
  ubicSector: ubicSector,
  ubicProvServ: ubicProvServ,
  ubicTall: ubicTall,
  ubicNom: ubicNom,
  stock: stock,
  minimo: minimo,
  entradaEfectiva: entradaEfectiva,
  compsFor: compsFor,
  compsRecepcionTall: compsRecepcionTall,
  entradasPosibles: entradasPosibles,
  bomDe: bomDe,
  talleristas: talleristas,
  recepcionTall: recepcionTall,
  SECTOR_TERMINADO: SECTOR_TERMINADO
};

})(window);
