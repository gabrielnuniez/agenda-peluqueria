document.addEventListener('DOMContentLoaded', () => {
    let hoyReal = new Date();
    let mesActual = hoyReal.getMonth();
    let añoActual = hoyReal.getFullYear();
    let fechaSeleccionada = "";
    let indiceEdicion = -1;

    // --- CONFIGURACIÓN SUPABASE ---
    const SUPABASE_URL = 'https://neyvklveqledlurvpcmr.supabase.co';
    const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5leXZrbHZlcWxlZGx1cnZwY21yIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM1MzQ3NjYsImV4cCI6MjA4OTExMDc2Nn0.JVlEPagEGj-Tz7jY5OvrozXvjXA41CPkb0wxgJVrWRE';
    const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

    let registros = JSON.parse(localStorage.getItem('pelu_datos_v6')) || [];
    let config = JSON.parse(localStorage.getItem('pelu_config')) || { nombre: "BARBERIA 41545", bannerImg: "" };

    const contenedor = document.getElementById('calendar');
    const displayMes = document.getElementById('monthYear');
    const bannerBg = document.getElementById('bannerBg');

    async function sincronizarDesdeNube() {
        try {
            const { data, error } = await supabaseClient
                .from('turnos')
                .select('*')
                .eq('barberia_id', 'barberia_41545');

            if (!error && data) {
                const registrosNube = data.map(t => ({
                    fecha: t.fecha,
                    titulo: t.titulo,
                    hora: t.hora,
                    monto: t.monto || 0,
                    tipo: 'ingreso',
                    esNube: true
                }));
                const localesLimpios = registros.filter(r => !r.esNube);
                registros = [...localesLimpios, ...registrosNube];
                renderizar();
            }
        } catch (err) { console.error("Error nube:", err); }
    }

    function aplicamosConfig() {
        document.getElementById('txtBannerDisplay').innerText = config.nombre;
        if (config.bannerImg && bannerBg) bannerBg.style.backgroundImage = `url(${config.bannerImg})`;
    }

    window.renderizar = () => {
        contenedor.innerHTML = '';
        const meses = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
        displayMes.innerText = `${meses[mesActual]} ${añoActual}`;

        const primerDia = new Date(añoActual, mesActual, 1).getDay();
        const totalDias = new Date(añoActual, mesActual + 1, 0).getDate();
        const desfase = (primerDia === 0 ? 6 : primerDia - 1);

        for (let i = 0; i < desfase; i++) {
            const vacio = document.createElement('div');
            vacio.className = 'day empty';
            contenedor.appendChild(vacio);
        }

        for (let dia = 1; dia <= totalDias; dia++) {
            const mm = String(mesActual + 1).padStart(2, '0');
            const dd = String(dia).padStart(2, '0');
            const fKey = `${añoActual}-${mm}-${dd}`;
            
            const regDia = registros.filter(r => {
                let parts = r.fecha.split('-');
                if(parts.length === 3) {
                    return `${parts[0]}-${parts[1].padStart(2,'0')}-${parts[2].padStart(2,'0')}` === fKey;
                }
                return r.fecha === fKey;
            });
            
            const diaDiv = document.createElement('div');
            diaDiv.className = 'day';
            if(dia === hoyReal.getDate() && mesActual === hoyReal.getMonth() && añoActual === hoyReal.getFullYear()) {
                diaDiv.classList.add('today');
            }

            diaDiv.innerHTML = `<span class="day-number">${dia}</span>`;
            const list = document.createElement('div');
            list.className = 'list';
            
            regDia.slice(0, 6).forEach(r => {
                const dot = document.createElement('div');
                let clase = 'morning';
                if (r.tipo === 'gasto') clase = 'danger';
                else if (r.esNube) clase = 'evening';
                dot.className = `event ${clase}`;
                list.appendChild(dot);
            });

            diaDiv.appendChild(list);
            diaDiv.onclick = () => abrirModalDia(fKey);
            contenedor.appendChild(diaDiv);
        }
        actualizarEconomia();
    };

    window.abrirModalDia = (fecha) => {
        fechaSeleccionada = fecha;
        const regDia = registros.filter(r => {
            let p = r.fecha.split('-');
            return `${p[0]}-${p[1].padStart(2,'0')}-${p[2].padStart(2,'0')}` === fecha;
        });
        const lista = document.getElementById('listaTurnosDia');
        const partes = fecha.split('-');
        document.getElementById('fechaDiaTitulo').innerText = `${partes[2]}/${partes[1]}/${partes[0]}`;
        lista.innerHTML = regDia.length ? '' : '<p style="text-align:center; opacity:0.5; padding:40px;">Sin movimientos</p>';
        
        regDia.sort((a,b) => a.hora > b.hora ? 1 : -1).forEach(r => {
            const item = document.createElement('div');
            item.className = 'lista-dia-item';
            item.innerHTML = `
                <div><small>${r.hora || 'S/H'}</small><br><b>${r.esNube ? '🤖' : ''} ${r.titulo}</b></div>
                <span style="color:${r.tipo==='gasto'?'#F2B8B5':'#B2F2BB'}">$${Number(r.monto).toLocaleString()}</span>
            `;
            if(!r.esNube) item.onclick = (e) => { e.stopPropagation(); prepararEdicion(registros.indexOf(r)); };
            lista.appendChild(item);
        });
        document.getElementById('modalDia').style.display = 'flex';
    };

    // Funciones básicas de UI
    window.cerrarModalDia = () => document.getElementById('modalDia').style.display = 'none';
    window.cerrarModal = () => document.getElementById('modalTurno').style.display = 'none';
    window.abrirFormularioNuevo = () => { cerrarModalDia(); indiceEdicion = -1; document.getElementById('modalTitle').innerText = "Nuevo Registro"; document.getElementById('nombreCliente').value = ""; document.getElementById('horaTurno').value = ""; document.getElementById('montoTurno').value = ""; document.getElementById('btnBorrar').style.display = "none"; document.getElementById('modalTurno').style.display = 'flex'; };
    
    window.prepararEdicion = (id) => { 
        const r = registros[id]; indiceEdicion = id; 
        document.getElementById('modalTurno').style.display = 'flex';
        document.getElementById('nombreCliente').value = r.titulo;
        document.getElementById('horaTurno').value = r.hora;
        document.getElementById('montoTurno').value = r.monto;
        document.getElementById('btnBorrar').style.display = "block";
    };

    document.getElementById('btnGuardar').onclick = () => {
        const titulo = document.getElementById('nombreCliente').value;
        const dato = { fecha: fechaSeleccionada, titulo, hora: document.getElementById('horaTurno').value, monto: document.getElementById('montoTurno').value, tipo: document.getElementById('tipoRegistro').value };
        if(indiceEdicion > -1) registros[indiceEdicion] = dato; else registros.push(dato);
        localStorage.setItem('pelu_datos_v6', JSON.stringify(registros.filter(r => !r.esNube)));
        cerrarModal(); renderizar();
    };

    function actualizarEconomia() {
        const regMes = registros.filter(r => r.fecha.startsWith(`${añoActual}-${String(mesActual+1).padStart(2,'0')}`));
        const ing = regMes.filter(r => r.tipo === 'ingreso').reduce((a, b) => a + Number(b.monto), 0);
        const gas = regMes.filter(r => r.tipo === 'gasto').reduce((a, b) => a + Number(b.monto), 0);
        document.getElementById('totalIngresos').innerText = `$${ing.toLocaleString()}`;
        document.getElementById('totalGastos').innerText = `$${gas.toLocaleString()}`;
        document.getElementById('totalNeto').innerText = `$${(ing - gas).toLocaleString()}`;
    }

    document.getElementById('prevMonth').onclick = () => { mesActual--; if(mesActual<0){mesActual=11; añoActual--;} renderizar(); };
    document.getElementById('nextMonth').onclick = () => { mesActual++; if(mesActual>11){mesActual=0; añoActual++;} renderizar(); };
    window.irAHoy = () => { mesActual = hoyReal.getMonth(); añoActual = hoyReal.getFullYear(); renderizar(); };
    window.abrirConfig = () => document.getElementById('modalConfig').style.display = 'flex';
    window.cerrarConfig = () => document.getElementById('modalConfig').style.display = 'none';

    iniciar();
    function iniciar() { aplicamosConfig(); renderizar(); sincronizarDesdeNube(); setInterval(sincronizarDesdeNube, 30000); }
});