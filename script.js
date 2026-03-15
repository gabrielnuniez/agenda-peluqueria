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

    // Cargar datos locales (mantener compatibilidad)
    let registros = JSON.parse(localStorage.getItem('pelu_datos_v6')) || [];
    let config = JSON.parse(localStorage.getItem('pelu_config')) || { nombre: "BARBERIA 41545", bannerImg: "" };

    const contenedor = document.getElementById('calendar');
    const displayMes = document.getElementById('monthYear');
    const bannerBg = document.getElementById('bannerBg');

    // --- FUNCIÓN CLAVE: SINCRONIZAR CON LA NUBE ---
    async function sincronizarDesdeNube() {
        try {
            const { data, error } = await supabaseClient
                .from('turnos')
                .select('*')
                .eq('barberia_id', 'barberia_41545');

            if (error) throw error;

            if (data) {
                // Unimos los datos del Bot con los manuales que anotes en el cel
                // Filtramos duplicados para que no se repitan
                const registrosNube = data.map(t => ({
                    fecha: t.fecha, // Viene como YYYY-MM-DD
                    titulo: t.titulo,
                    hora: t.hora,
                    monto: t.monto || 0,
                    tipo: 'ingreso',
                    esNube: true
                }));

                // Combinamos y evitamos mostrar el mismo turno dos veces
                const localesLimpios = registros.filter(r => !r.esNube);
                registros = [...localesLimpios, ...registrosNube];
                
                renderizar();
                console.log("☁️ Sincronizado con el Bot");
            }
        } catch (err) {
            console.error("Error nube:", err);
        }
    }

    // --- NAVEGACIÓN ---
    document.getElementById('prevMonth').onclick = (e) => { e.preventDefault(); prevMonth(); };
    document.getElementById('nextMonth').onclick = (e) => { e.preventDefault(); nextMonth(); };

    let touchstartX = 0;
    let touchendX = 0;

    contenedor.addEventListener('touchstart', e => { 
        touchstartX = e.changedTouches[0].screenX; 
    }, {passive: true});

    contenedor.addEventListener('touchend', e => { 
        touchendX = e.changedTouches[0].screenX;
        handleGesture();
    }, {passive: true});

    function handleGesture() {
        if (touchendX < touchstartX - 70) window.nextMonth();
        if (touchendX > touchstartX + 70) window.prevMonth();
    }

    function iniciar() { 
        aplicamosConfig(); 
        renderizar();
        sincronizarDesdeNube();
        // Revisar si hay turnos nuevos cada 30 segundos
        setInterval(sincronizarDesdeNube, 30000); 
    }

    function aplicamosConfig() {
        const txtBanner = document.getElementById('txtBannerDisplay');
        if(txtBanner) txtBanner.innerText = config.nombre;
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
            // Formatear fecha para comparar (ojo con los ceros)
            const mm = String(mesActual + 1).padStart(2, '0');
            const dd = String(dia).padStart(2, '0');
            const fKey = `${añoActual}-${mm}-${dd}`;
            
            // Filtramos registros (corregimos comparación de fecha)
            const regDia = registros.filter(r => {
                const fNormalizada = r.fecha.includes('-') ? r.fecha : ''; // Asegurar formato
                // Normalizamos fechas del localstorage (que a veces no tienen ceros) a YYYY-MM-DD
                let parts = r.fecha.split('-');
                if(parts.length === 3) {
                    let y = parts[0], m = parts[1].padStart(2, '0'), d = parts[2].padStart(2, '0');
                    return `${y}-${m}-${d}` === fKey;
                }
                return r.fecha === fKey;
            });
            
            const diaDiv = document.createElement('div');
            diaDiv.className = 'day';
            
            if(dia === hoyReal.getDate() && mesActual === hoyReal.getMonth() && añoActual === hoyReal.getFullYear()) {
                diaDiv.style.backgroundColor = "rgba(208, 188, 255, 0.15)";
                diaDiv.style.border = "1px solid var(--md-sys-color-primary)";
            }

            diaDiv.innerHTML = `<span class="day-number">${dia}</span>`;
            const list = document.createElement('div');
            list.className = 'list';
            
            regDia.slice(0, 6).forEach(r => {
                const dot = document.createElement('div');
                let claseColor = 'morning';
                if (r.tipo === 'gasto') claseColor = 'danger';
                else if (r.esNube) claseColor = 'evening'; // Color especial para turnos de WhatsApp
                else if (r.hora && parseInt(r.hora.split(':')[0]) >= 18) claseColor = 'evening';
                else if (r.hora && parseInt(r.hora.split(':')[0]) >= 13) claseColor = 'afternoon';
                dot.className = `event ${claseColor}`;
                list.appendChild(dot);
            });

            diaDiv.appendChild(list);
            diaDiv.onclick = () => abrirModalDia(fKey);
            contenedor.appendChild(diaDiv);
        }
        actualizarEconomia();
    };

    // --- EL RESTO DE TUS FUNCIONES SE MANTIENEN IGUAL ---
    window.copiarResumen = () => {
        const meses = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
        const regMes = registros.filter(r => {
            const f = r.fecha.split('-');
            return parseInt(f[0]) === añoActual && (parseInt(f[1]) - 1) === mesActual;
        });
        const ing = regMes.filter(r => r.tipo === 'ingreso').reduce((a, b) => a + Number(b.monto), 0);
        const gas = regMes.filter(r => r.tipo === 'gasto').reduce((a, b) => a + Number(b.monto), 0);
        const texto = `📊 *RESUMEN ${meses[mesActual].toUpperCase()}*\n💈 ${config.nombre}\n\n✂️ Ingresos: $${ing.toLocaleString()}\n💸 Gastos: $${gas.toLocaleString()}\n💰 *Balance Neto: $${(ing - gas).toLocaleString()}*`;
        navigator.clipboard.writeText(texto).then(() => alert("✅ Resumen copiado"));
    };

    window.irAHoy = () => { mesActual = hoyReal.getMonth(); añoActual = hoyReal.getFullYear(); renderizar(); };
    window.abrirConfig = () => { document.getElementById('configNombre').value = config.nombre; document.getElementById('modalConfig').style.display = 'flex'; };
    window.cerrarConfig = () => { document.getElementById('modalConfig').style.display = 'none'; };
    window.guardarConfig = () => {
        const fileInput = document.getElementById('configFoto');
        config.nombre = document.getElementById('configNombre').value.trim() || "BARBERIA 41545";
        if (fileInput.files && fileInput.files[0]) {
            const reader = new FileReader();
            reader.onload = (e) => { config.bannerImg = e.target.result; localStorage.setItem('pelu_config', JSON.stringify(config)); aplicamosConfig(); cerrarConfig(); };
            reader.readAsDataURL(fileInput.files[0]);
        } else { localStorage.setItem('pelu_config', JSON.stringify(config)); aplicamosConfig(); cerrarConfig(); }
    };

    window.abrirModalDia = (fecha) => {
        fechaSeleccionada = fecha;
        // Normalizamos fecha para filtrar
        const regDia = registros.filter(r => {
            let parts = r.fecha.split('-');
            let fNorm = `${parts[0]}-${parts[1].padStart(2,'0')}-${parts[2].padStart(2,'0')}`;
            return fNorm === fecha;
        });
        const lista = document.getElementById('listaTurnosDia');
        const modal = document.getElementById('modalDia');
        const partes = fecha.split('-');
        document.getElementById('fechaDiaTitulo').innerText = `${partes[2]}/${partes[1]}/${partes[0]}`;
        lista.innerHTML = '';
        if (regDia.length === 0) { lista.innerHTML = '<p style="text-align:center; opacity:0.5; padding:40px;">Sin movimientos</p>'; }
        else {
            regDia.sort((a,b) => (a.hora > b.hora) ? 1 : -1).forEach(r => {
                const item = document.createElement('div');
                item.className = 'lista-dia-item';
                const icono = r.esNube ? '🤖' : (r.tipo === 'gasto' ? '💸' : '✂️');
                item.innerHTML = `
                    <div style="display:flex; flex-direction:column;">
                        <span style="font-size:11px; color:var(--md-sys-color-primary); font-weight:bold;">${r.hora || 'S/H'}</span>
                        <span style="font-weight:600; font-size:15px;">${icono} ${r.titulo}</span>
                    </div>
                    <span style="font-weight:800; color:${r.tipo==='gasto'?'#F2B8B5':'#B2F2BB'}">$${Number(r.monto).toLocaleString()}</span>
                `;
                if(!r.esNube) item.onclick = (e) => { e.stopPropagation(); prepararEdicion(registros.indexOf(r)); };
                lista.appendChild(item);
            });
        }
        modal.style.display = 'flex';
    };

    window.cerrarModalDia = () => document.getElementById('modalDia').style.display = 'none';
    window.abrirFormularioNuevo = () => { cerrarModalDia(); indiceEdicion = -1; document.getElementById('modalTitle').innerText = "Nuevo Registro"; document.getElementById('nombreCliente').value = ""; document.getElementById('horaTurno').value = ""; document.getElementById('montoTurno').value = ""; document.getElementById('tipoRegistro').value = "ingreso"; document.getElementById('btnBorrar').style.display = "none"; document.getElementById('modalTurno').style.display = 'flex'; };
    window.prepararEdicion = (id) => { const r = registros[id]; if(!r) return; indiceEdicion = id; document.getElementById('modalTurno').style.display = 'flex'; document.getElementById('nombreCliente').value = r.titulo; document.getElementById('horaTurno').value = r.hora; document.getElementById('montoTurno').value = r.monto; document.getElementById('tipoRegistro').value = r.tipo; document.getElementById('btnBorrar').style.display = "block"; };
    window.cerrarModal = () => document.getElementById('modalTurno').style.display = 'none';

    document.getElementById('btnGuardar').onclick = () => {
        const titulo = document.getElementById('nombreCliente').value.trim();
        const hora = document.getElementById('horaTurno').value;
        const monto = parseFloat(document.getElementById('montoTurno').value) || 0;
        const tipo = document.getElementById('tipoRegistro').value;
        if (!titulo) return alert("Ingresa un nombre");
        const dato = { fecha: fechaSeleccionada, titulo, hora, monto, tipo };
        if(indiceEdicion > -1) registros[indiceEdicion] = dato;
        else registros.push(dato);
        localStorage.setItem('pelu_datos_v6', JSON.stringify(registros.filter(r => !r.esNube)));
        cerrarModal(); renderizar();
    };

    document.getElementById('btnBorrar').onclick = () => {
        if(confirm("¿Eliminar?")) {
            registros.splice(indiceEdicion, 1);
            localStorage.setItem('pelu_datos_v6', JSON.stringify(registros.filter(r => !r.esNube)));
            cerrarModal(); renderizar();
        }
    };

    function actualizarEconomia() {
        const regMes = registros.filter(r => {
            const f = r.fecha.split('-');
            return parseInt(f[0]) === añoActual && (parseInt(f[1]) - 1) === mesActual;
        });
        const ing = regMes.filter(r => r.tipo === 'ingreso').reduce((a, b) => a + Number(b.monto), 0);
        const gas = regMes.filter(r => r.tipo === 'gasto').reduce((a, b) => a + Number(b.monto), 0);
        document.getElementById('totalIngresos').innerText = `$${ing.toLocaleString()}`;
        document.getElementById('totalGastos').innerText = `$${gas.toLocaleString()}`;
        document.getElementById('totalNeto').innerText = `$${(ing - gas).toLocaleString()}`;
    }

    window.prevMonth = () => { mesActual--; if(mesActual<0){mesActual=11; añoActual--;} renderizar(); };
    window.nextMonth = () => { mesActual++; if(mesActual>11){mesActual=0; añoActual++;} renderizar(); };
    
    iniciar();
});