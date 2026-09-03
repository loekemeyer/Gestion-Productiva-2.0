"use strict";
/* ============================================================
   gp2-stock-sector.js — pantalla de stock por sector.

   Una sola implementacion para Stock SC y Stock SP (y sirve para
   cualquier otro sector). Reproduce la estructura de Gestion
   Productiva Entero: Base | Online (Kg/Caj/Uni) | Movimientos | Info,
   con las celdas de movimiento clickeables para ver el detalle.

   El stock sale del motor (GP2.inventario). La pantalla NO recalcula
   stock: solo convierte a kg/cajones con los factores del componente.

   Config por pagina:
     window.STOCK_CFG = {
       sector_id: 1,
       titulo: "Stock SC",
       columnas: [ {k:'fabricacion', label:'Fabricación', tipos:['fabricacion','produccion'], lado:'neto'}, ... ]
     }
   ============================================================ */

(function(){

var CFG = window.STOCK_CFG;
var SB = window.SB_CLIENT;
var $ = function(id){ return document.getElementById(id); };

var D = { filas: [], sector: {}, ubicacion_id: null };
var filtro = "todos";

/* ---------- helpers ---------- */
function esc(s){ return String(s==null?"":s).replace(/[&<>"]/g, function(c){
  return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]; }); }
function fmt(n,d){ d=(d==null?1:d);
  return Number(n||0).toLocaleString("es-AR",{minimumFractionDigits:0,maximumFractionDigits:d}); }
function fmtFecha(f){ if(!f) return ""; try{ return new Date(f).toLocaleDateString("es-AR"); }catch(e){ return f; } }

/* uni es la unidad canonica de las piezas; kg y cajones son derivados */
function kgDe(x){ return x.kg_x_uni ? Number(x.online||0)*Number(x.kg_x_uni) : null; }
function cajDe(x){ return x.uni_x_cajon ? Number(x.online||0)/Number(x.uni_x_cajon) : null; }

/* valor de una columna de movimientos segun su config */
function valorCol(x, col){
  var tot = 0, hubo = false;
  (col.tipos||[]).forEach(function(t){
    var m = (x.mov||{})[t];
    if (!m) return;
    hubo = true;
    if (col.lado === "ent") tot += Number(m.ent||0);
    else if (col.lado === "sal") tot += Number(m.sal||0);
    else tot += Number(m.ent||0) - Number(m.sal||0);
  });
  return hubo ? tot : null;
}

function clsNum(n){ n=Number(n||0); return n>0?"pos":(n<0?"neg":"cero"); }

/* ---------- carga ---------- */
async function cargar(){
  var r = await SB.rpc("stock_sector_bundle", { p_sector_id: CFG.sector_id });
  if (r.error){ $("status").textContent = "Error: " + r.error.message; return; }
  D = r.data || { filas: [] };
  avisarFactores();
  render();
  $("status").textContent = (D.filas||[]).length + " componentes en " +
    ((D.sector&&D.sector.nombre)||"el sector") + ".";
}

/* Si el sector no tiene cargados kg_x_uni / uni_x_cajon, las columnas Kg y Caj
   van a salir en "—". Se avisa en vez de dejar al usuario adivinando por qué. */
function avisarFactores(){
  var el = $("avisoFactores");
  if (!el || CFG.sin_min_max) { if (el) el.classList.add("hidden"); return; }
  var filas = D.filas || [];
  if (!filas.length){ el.classList.add("hidden"); return; }
  var sinKg  = filas.filter(function(x){ return !x.kg_x_uni; }).length;
  var sinCaj = filas.filter(function(x){ return !x.uni_x_cajon; }).length;
  if (!sinKg && !sinCaj){ el.classList.add("hidden"); return; }
  var faltan = [];
  if (sinKg)  faltan.push("<b>"+sinKg+"</b> sin <code>kg_x_uni</code>");
  if (sinCaj) faltan.push("<b>"+sinCaj+"</b> sin <code>uni_x_cajon</code>");
  el.innerHTML = "⚠ De " + filas.length + " componentes, " + faltan.join(" y ") +
    ". Las columnas <b>Kg</b> y <b>Caj</b> muestran “—” en esas filas: el stock en " +
    "<b>Uni</b> es correcto igual, solo falta cargar los factores de conversión.";
  el.classList.remove("hidden");
}

/* ---------- filtros ---------- */
function filtradas(){
  var arr = (D.filas||[]).slice();
  var q = String($("q").value||"").trim().toLowerCase();
  if (q) arr = arr.filter(function(x){
    return (String(x.cod||"")+" "+String(x["desc"]||"")).toLowerCase().indexOf(q) >= 0;
  });
  if (filtro === "con")  arr = arr.filter(function(x){ return Number(x.online||0) > 0; });
  if (filtro === "sin")  arr = arr.filter(function(x){ return !(Number(x.online||0) > 0); });
  if (filtro === "bajo") arr = arr.filter(function(x){
    return x.minimo != null && Number(x.online||0) < Number(x.minimo); });
  if (filtro === "mov")  arr = arr.filter(function(x){
    return x.mov && Object.keys(x.mov).length > 0; });
  return arr;
}

/* ---------- render ---------- */
function render(){
  var arr = filtradas(), tb = $("tbody");
  tb.innerHTML = "";
  $("tblEmpty").classList.toggle("hidden", arr.length > 0);

  var tKg=0, tUni=0, tBajo=0, tConMov=0;

  arr.forEach(function(x){
    var kg = kgDe(x), caj = cajDe(x), uni = Number(x.online||0);
    tKg += (kg||0); tUni += uni;
    var bajo = x.minimo != null && uni < Number(x.minimo);
    if (bajo) tBajo++;
    if (x.mov && Object.keys(x.mov).length) tConMov++;

    var celdasMov = (CFG.columnas||[]).map(function(col, i){
      var sep = i===0 ? " sep" : "";
      var v = valorCol(x, col);
      if (v == null) return '<td class="num cero'+sep+'">—</td>';
      // Solo se colorea por signo lo que es un NETO (puede dar negativo).
      // Un envío o una entrega es una cantidad, no algo bueno ni malo.
      var cls = col.lado === "neto" ? (" "+clsNum(v)) : (v < 0 ? " neg" : "");
      return '<td class="num mov-cell'+cls+sep+'" data-cid="'+x.comp_id+'" data-col="'+esc(col.k)+'" '+
             'title="Ver detalle">'+fmt(v,0)+'</td>';
    }).join("");

    var tr = document.createElement("tr");
    if (bajo) tr.className = "bajo";
    tr.innerHTML =
      '<td><span class="cod">'+esc(x.cod)+'</span></td>'+
      '<td>'+esc(x["desc"]||"")+'</td>'+
      '<td class="num sep stk-cell" data-cid="'+x.comp_id+'" title="Ver cómo se compone">'+(kg==null?"—":fmt(kg,0))+'</td>'+
      '<td class="num stk-cell" data-cid="'+x.comp_id+'" title="Ver cómo se compone">'+(caj==null?"—":fmt(caj,1))+'</td>'+
      '<td class="num stk-cell" data-cid="'+x.comp_id+'" title="Ver cómo se compone"><b>'+fmt(uni,0)+'</b></td>'+
      celdasMov +
      '<td class="num sep">'+(x.kg_x_uni?fmt(x.kg_x_uni,6):"—")+'</td>'+
      '<td class="num">'+(x.uni_x_cajon?fmt(x.uni_x_cajon,0):"—")+'</td>'+
      (CFG.sin_min_max ? "" :
        '<td class="num">'+(x.minimo!=null?fmt(x.minimo,0):"—")+'</td>'+
        '<td class="num">'+(x.maximo!=null?fmt(x.maximo,0):"—")+'</td>')+
      (CFG.mostrar_fleje ? '<td class="num">'+(x.n_fleje!=null?esc(x.n_fleje):"—")+'</td>' : "");
    tb.appendChild(tr);
  });

  $("kpis").innerHTML =
    '<div class="kpi"><div class="k">Componentes</div><div class="v">'+arr.length+'</div></div>'+
    '<div class="kpi"><div class="k">Total uni</div><div class="v">'+fmt(tUni,0)+'</div></div>'+
    '<div class="kpi"><div class="k">Total kg</div><div class="v">'+fmt(tKg,0)+'</div></div>'+
    (CFG.sin_min_max ? "" :
      '<div class="kpi"><div class="k">Bajo mínimo</div><div class="v '+(tBajo?"neg":"cero")+'">'+tBajo+'</div></div>')+
    '<div class="kpi"><div class="k">Con movimientos</div><div class="v">'+tConMov+'</div></div>';
}

/* ---------- popup de detalle ---------- */
var DET_LIMIT = 500;
var DET_SEQ = 0; // token: si se abre otro detalle mientras carga, la respuesta vieja no pinta
async function abrirDetalle(comp_id, colKey){
  var miSeq = ++DET_SEQ;
  var fila = (D.filas||[]).filter(function(x){ return String(x.comp_id)===String(comp_id); })[0] || {};
  var col  = (CFG.columnas||[]).filter(function(c){ return c.k===colKey; })[0] || { label:"Movimientos", tipos:[] };

  $("popTitle").innerHTML = '<span class="cod">'+esc(fila.cod||"")+'</span> — '+esc(fila["desc"]||"")+
    '<br><small style="color:#666;font-weight:600">'+esc(col.label)+'</small>';
  $("popBody").innerHTML = '<div class="empty">Cargando…</div>';
  $("popup").classList.add("open");

  var r = await SB.rpc("movimientos_componente", {
    p_comp_id: Number(comp_id), p_ubic_id: Number(D.ubicacion_id), p_limit: DET_LIMIT
  });
  if (miSeq !== DET_SEQ) return;
  if (r.error){ $("popBody").innerHTML = '<div class="empty">Error: '+esc(r.error.message)+'</div>'; return; }

  var truncado = (r.data||[]).length >= DET_LIMIT;
  var rows = (r.data||[]).filter(function(m){
    return !col.tipos.length || col.tipos.indexOf(m.tipo) >= 0;
  });
  if (!rows.length){ $("popBody").innerHTML = '<div class="empty">Sin movimientos de este tipo.</div>'; return; }

  var tot = rows.reduce(function(s,m){
    return s + (m.signo==="ent" ? Number(m.cantidad||0) : -Number(m.cantidad||0)); }, 0);

  $("popBody").innerHTML =
    '<div class="table-wrap"><table class="t"><thead><tr>'+
      '<th>Fecha</th><th>Tipo</th><th>Contraparte</th><th class="num">Uni</th><th class="num">Caj</th>'+
    '</tr></thead><tbody>'+
    rows.map(function(m){
      var signo = m.signo==="ent" ? "+" : "−";
      var via = m.via ? ' <small style="color:#777">(vía '+esc(m.via)+')</small>' : "";
      var falt = m.faltante ? ' <span style="color:#c2410c;font-weight:800">F</span>' : "";
      return '<tr><td>'+esc(fmtFecha(m.fecha))+'</td>'+
        '<td>'+esc(m.tipo)+via+falt+'</td>'+
        '<td>'+esc(m.contraparte||"—")+'</td>'+
        '<td class="num '+(m.signo==="ent"?"pos":"neg")+'">'+signo+fmt(m.cantidad,0)+'</td>'+
        '<td class="num">'+(m.cajones!=null?fmt(m.cajones,1):"—")+'</td></tr>';
    }).join("")+
    '</tbody><tfoot><tr><td colspan="3">'+rows.length+' movimientos'+
    (truncado?' <small style="color:#c2410c;font-weight:700">(solo los últimos '+DET_LIMIT+' del componente: puede haber más viejos y el total no cerrar)</small>':'')+'</td>'+
    '<td class="num '+clsNum(tot)+'">'+fmt(tot,0)+'</td><td></td></tr></tfoot></table></div>';
}

/* ---------- CSV ---------- */
function exportarCSV(){
  var arr = filtradas();
  if (!arr.length){ alert("No hay filas para exportar."); return; }
  var cols = ["Codigo","Descripcion","Kg","Caj","Uni"]
    .concat((CFG.columnas||[]).map(function(c){ return c.label; }))
    .concat(["Kg x Uni","Uni x Cajon","Minimo","Maximo"]);
  if (CFG.mostrar_fleje) cols.push("N Fleje");
  var q = function(v){ return '"'+String(v==null?"":v).replace(/"/g,'""')+'"'; };
  var dec = function(v){ return v==null?"":String(v).replace(".",","); };
  var lineas = [cols.map(q).join(";")];
  arr.forEach(function(x){
    var f = [x.cod||"", x["desc"]||"", dec(kgDe(x)), dec(cajDe(x)), dec(x.online)]
      .concat((CFG.columnas||[]).map(function(c){ return dec(valorCol(x,c)); }))
      .concat([dec(x.kg_x_uni), dec(x.uni_x_cajon), dec(x.minimo), dec(x.maximo)]);
    if (CFG.mostrar_fleje) f.push(x.n_fleje==null?"":x.n_fleje);
    lineas.push(f.map(q).join(";"));
  });
  var blob = new Blob(["﻿"+"sep=;\n"+lineas.join("\n")], {type:"text/csv;charset=utf-8"});
  var a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = (CFG.titulo||"stock").toLowerCase().replace(/\s+/g,"_")+".csv";
  a.click();
  setTimeout(function(){ URL.revokeObjectURL(a.href); }, 1000);
}

/* ---------- eventos ---------- */
/* El thead se arma entero acá: la cantidad de columnas de movimiento
   depende de la config de cada pantalla. */
function renderHead(){
  var cols = CFG.columnas || [];
  var nInfo = (CFG.sin_min_max ? 2 : 4) + (CFG.mostrar_fleje ? 1 : 0);
  $("thead").innerHTML =
    '<tr>'+
      '<th colspan="2">Base</th>'+
      '<th colspan="3" class="num sep" title="Tocá una celda para ver cómo se compone">Online</th>'+
      '<th colspan="'+cols.length+'" class="num sep">Movimientos (Uni)</th>'+
      '<th colspan="'+nInfo+'" class="num sep">Info</th>'+
    '</tr>'+
    '<tr>'+
      '<th>Código</th><th>Descripción</th>'+
      '<th class="num sep">Kg</th><th class="num">Caj</th><th class="num">Uni</th>'+
      cols.map(function(c,i){
        return '<th class="num'+(i===0?" sep":"")+'" title="Tocá una celda para ver el detalle">'+esc(c.label)+'</th>';
      }).join("")+
      '<th class="num sep">Kg × Uni</th><th class="num">Uni × Cajón</th>'+
      /* "Máximo" = lo que TENDRIA QUE HABER en esta ubicacion segun la demanda
         (consumo mensual x los meses de la ubicacion). Se llamaba "Mínimo"
         [usuario 2026-09-03: "el minimo/maximo es lo que tendria que haber en
         cada ubicacion/sector segun la demanda"] — no es un piso, es el nivel
         objetivo. La de al lado es otra cosa: la CAPACIDAD FISICA del lugar
         (5 cajones en crudo/procesado), por eso ya no se llama "Máximo". */
      (CFG.sin_min_max ? "" : '<th class="num">Máximo</th><th class="num">Capacidad</th>')+
      (CFG.mostrar_fleje ? '<th class="num">N° Fleje</th>' : "")+
    '</tr>';
}

function init(){
  renderHead();

  $("q").addEventListener("input", render);
  var _csv = $("btnCSV"); if (_csv) _csv.addEventListener("click", exportarCSV);  // opcional: hay pantallas sin CSV

  document.querySelectorAll(".seg-btn").forEach(function(b){
    b.addEventListener("click", function(){
      document.querySelectorAll(".seg-btn").forEach(function(x){ x.classList.remove("active"); });
      b.classList.add("active");
      filtro = b.dataset.f;
      render();
    });
  });

  $("tbody").addEventListener("click", function(e){
    var mov = e.target.closest("td.mov-cell");
    if (mov){ abrirDetalle(mov.dataset.cid, mov.dataset.col); return; }
    // celda de stock online -> composicion: el stock de hoy y el ledger que lo explica
    var stk = e.target.closest("td.stk-cell");
    if (stk && window.GP2Composicion){
      var f = (D.filas||[]).filter(function(x){ return String(x.comp_id)===String(stk.dataset.cid); })[0] || {};
      window.GP2Composicion.abrir({
        SB: SB, comp_id: stk.dataset.cid, ubic_id: D.ubicacion_id,
        cod: f.cod, desc: f["desc"], kg_x_uni: f.kg_x_uni, uni_x_cajon: f.uni_x_cajon
      });
    }
  });

  $("popClose").addEventListener("click", function(){ $("popup").classList.remove("open"); });
  $("popup").addEventListener("click", function(e){
    if (e.target === $("popup")) $("popup").classList.remove("open");
  });

  cargar().catch(function(e){
    $("status").textContent = "Error: " + (e && e.message ? e.message : e);
  });
}

if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
else init();

})();
