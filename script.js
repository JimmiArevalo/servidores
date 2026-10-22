// Dirección del balanceador (FastAPI). Cambia el puerto si arrancaste uvicorn en otro.
const API_URL = "http://127.0.0.1:8000";

const $ = (id) => document.getElementById(id);

// Nombres de los servidores según /servidores (sirve para mostrar 0 en las estadísticas)
let servidoresConocidos = [];

// Evita inyectar HTML con datos que vienen de la API
function esc(valor) {
  const div = document.createElement("div");
  div.textContent = valor;
  return div.innerHTML;
}

// ---------- Mensajes del sistema ----------
function mostrarMensaje(texto, tipo = "info") {
  const lista = $("mensajes");
  const vacio = lista.querySelector(".vacio");
  if (vacio) vacio.remove();

  const li = document.createElement("li");
  li.className = "msg " + tipo;
  li.textContent = `[${new Date().toLocaleTimeString()}] ${texto}`;
  lista.prepend(li);

  while (lista.children.length > 10) lista.lastChild.remove();
}

// ---------- Petición genérica a la API ----------
async function pedir(ruta) {
  let respuesta;
  try {
    respuesta = await fetch(API_URL + ruta);
  } catch {
    throw new Error("La API no responde. Verifica que el balanceador esté en ejecución en " + API_URL);
  }

  let datos = null;
  try {
    datos = await respuesta.json();
  } catch {
    // la respuesta no era JSON
  }

  if (!respuesta.ok) {
    const error = new Error(datos && datos.detail ? datos.detail : "Error HTTP " + respuesta.status);
    error.status = respuesta.status;
    throw error;
  }
  return datos;
}

// ---------- GET /servidores ----------
async function cargarServidores() {
  const cuerpo = $("tabla-servidores");
  try {
    const datos = await pedir("/servidores");
    servidoresConocidos = datos.servidores.map((s) => s.nombre);
    $("total-servidores").textContent = datos.total_servidores;

    cuerpo.innerHTML = datos.servidores.map((s) => `
      <tr>
        <td>${esc(s.nombre)}</td>
        <td>${esc(s.puerto)}</td>
        <td><span class="estado ${s.estado === "activo" ? "activo" : "inactivo"}">${esc(s.estado)}</span></td>
      </tr>`).join("");

    const activos = datos.servidores.filter((s) => s.estado === "activo").length;
    if (activos === 0) {
      mostrarMensaje("No hay servidores disponibles: todos están inactivos.", "error");
    } else if (activos < datos.total_servidores) {
      mostrarMensaje(`Hay ${activos} de ${datos.total_servidores} servidores activos.`, "aviso");
    } else {
      mostrarMensaje("Servidores consultados: todos están activos.", "ok");
    }
  } catch (e) {
    cuerpo.innerHTML = '<tr><td colspan="3" class="vacio">No se pudo consultar la lista de servidores.</td></tr>';
    mostrarMensaje("Error al consultar los servidores: " + e.message, "error");
  }
}

// ---------- GET /estadisticas ----------
async function cargarEstadisticas() {
  const caja = $("estadisticas");
  try {
    const datos = await pedir("/estadisticas");
    const total = datos.total_solicitudes;
    const porServidor = datos.solicitudes_por_servidor;
    $("total-solicitudes").textContent = total;

    // /estadisticas solo trae servidores que ya atendieron algo; se completan con los de /servidores
    const nombres = [...new Set([...servidoresConocidos, ...Object.keys(porServidor)])];
    if (nombres.length === 0) {
      caja.innerHTML = '<p class="vacio">Todavía no hay datos para mostrar.</p>';
      return;
    }

    caja.innerHTML = nombres.map((nombre) => {
      const cantidad = porServidor[nombre] || 0;
      const porcentaje = total ? Math.round((cantidad / total) * 100) : 0;
      return `
        <div class="barra-fila">
          <span>${esc(nombre)}</span>
          <div class="barra"><div style="width:${porcentaje}%"></div></div>
          <span>${cantidad} (${porcentaje}%)</span>
        </div>`;
    }).join("");
  } catch (e) {
    caja.innerHTML = '<p class="vacio">No se pudieron consultar las estadísticas.</p>';
    mostrarMensaje("No se pueden consultar las estadísticas: " + e.message, "error");
  }
}

// ---------- GET /solicitud ----------
async function enviarSolicitud() {
  const boton = $("btn-solicitar");
  const caja = $("resultado");
  boton.disabled = true;

  try {
    const datos = await pedir("/solicitud");
    caja.className = "resultado ok";
    caja.innerHTML = `
      <p><strong>Servidor que atendió:</strong> ${esc(datos.servidor)}</p>
      <p><strong>Resultado:</strong> ${esc(datos.Resultado)}</p>
      <p><strong>Solicitudes atendidas por ese servidor:</strong> ${esc(datos.contador)}</p>`;
    mostrarMensaje(`Solicitud atendida por ${datos.servidor}.`, "ok");
  } catch (e) {
    caja.className = "resultado error";
    if (e.status === 503) {
      caja.textContent = "No hay servidores disponibles para atender la solicitud.";
      mostrarMensaje("No hay servidores disponibles. Inicia al menos uno y pulsa Actualizar.", "error");
    } else {
      caja.textContent = "La solicitud no pudo procesarse. " + e.message;
      mostrarMensaje("Error al enviar la solicitud: " + e.message, "error");
    }
  } finally {
    boton.disabled = false;
  }

  // Las estadísticas se actualizan después de cada solicitud
  await cargarEstadisticas();
}

// ---------- Inicio ----------
$("btn-actualizar").addEventListener("click", async () => {
  await cargarServidores();
  await cargarEstadisticas();
});
$("btn-solicitar").addEventListener("click", enviarSolicitud);

cargarServidores().then(cargarEstadisticas);
