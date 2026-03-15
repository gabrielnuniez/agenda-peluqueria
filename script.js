document.addEventListener('DOMContentLoaded', () => {
    let hoyReal = new Date();
    let mesActual = hoyReal.getMonth();
    let añoActual = hoyReal.getFullYear();
    let fechaSeleccionada = "";
    let indiceEdicion = -1;

    // --- VARIABLES PARA SWIPE ---
    let touchStartX = 0;
    let touchEndX = 0;

    let configBanner = JSON.parse(localStorage.getItem('pelu_config_v1')) || {
        titulo: "BARBERIA 4154",
        fondo: "https://images.unsplash.com/photo-1585747860715-2ba37e788b70?q=80"
    };

    let registros = JSON.parse(localStorage.getItem('pelu_datos_v6')) || [];
    const contenedor = document.getElementById('calendar');
    const displayMes = document.getElementById('monthYear');

    function aplicarConfigVisual() {
        document.getElementById('txtBannerDisplay').innerText = configBanner.titulo;
        document.getElementById('bannerBg').style.backgroundImage = `url('${configBanner.fondo}')`;
    }

    // Lógica de colores por horario
    function obtenerClaseColor(hora, tipo) {
        if (tipo === 'gasto') return 'danger-bg';
        if (!hora) return 'morning-bg';
        const h = parseInt(hora.split(':')[0]);
        if (h >= 6 && h < 13) return 'morning-bg';
        if (h >= 13 && h < 19) return 'afternoon-bg';
        return 'evening-bg';
    }

    // --- RENDERIZADO CON ANIMACIÓN SUAVE ---
    window.renderizar = () => {
        // Efecto de salida
        contenedor.classList.add('fade-out');

        setTimeout(() => {
            contenedor.innerHTML = '';
            const meses = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
            displayMes.innerText = `${meses[mesActual]} ${añoActual}`;

            const primerDia = new Date(añoActual, mesActual, 1).getDay();
            const totalDias = new Date(añoActual, mesActual + 1, 0).getDate();
            const desfase = (primerDia === 0 ? 6 : primerDia - 1);

            for (let i = 0; i < desfase; i++) {
                contenedor.appendChild(Object.assign(document.createElement('div'), {className: 'day empty'}));
            }

            for (let dia = 1; dia <= totalDias; dia++) {
                const fKey = `${añoActual}-${String(mesActual + 1).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
                const regDia = registros.filter(r => r.fecha === fKey);
                
                const diaDiv = document.createElement('div');
                diaDiv.className = 'day';
                if(dia === hoyReal.getDate() && mesActual === hoyReal.getMonth() && añoActual === hoyReal.getFullYear()) diaDiv.classList.add('today');

                diaDiv.innerHTML = `<span class="day-number">${dia}</span>`;
                const list = document.createElement('div');
                
                regDia.sort((a,b) => (a.hora > b.hora ? 1 : -1)).slice(0, 4).forEach(r => {
                    const dot = document.createElement('div');
                    dot.className = `event ${obtenerClaseColor(r.hora, r.tipo)}`;
                    list.appendChild(dot);
                });

                diaDiv.appendChild(list);
                diaDiv.onclick = () => window.abrirModalDia(fKey);
                contenedor.appendChild(diaDiv);
            }
            
            aplicarConfigVisual();
            actualizarEconomia();
            
            // Efecto de entrada
            contenedor.classList.remove('fade-out');
        }, 150); // Tiempo que dura la desaparición antes de cambiar los datos
    };

    // --- DETECCIÓN DE GESTOS (SWIPE) ---
    contenedor.addEventListener('touchstart', e => {
        touchStartX = e.changedTouches[0].screenX;
    }, false);

    contenedor.addEventListener('touchend', e => {
        touchEndX = e.changedTouches[0].screenX;
        handleGesture();
    }, false);

    function handleGesture() {
        const threshold = 50; // Sensibilidad del arrastre
        if (touchEndX < touchStartX - threshold) {
            // Deslizó a la izquierda -> Mes Siguiente
            cambiarMes(1);
        }
        if (touchEndX > touchStartX + threshold) {
            // Deslizó a la derecha -> Mes Anterior
            cambiarMes(-1);
        }
    }

    function cambiarMes(delta) {
        mesActual += delta;
        if (mesActual > 11) { mesActual = 0; añoActual++; }
        if (mesActual < 0) { mesActual = 11; añoActual--; }
        renderizar();
    }

    // Botones de navegación
    document.getElementById('prevMonth').onclick = () => cambiarMes(-1);
    document.getElementById('nextMonth').onclick = () => cambiarMes(1);

    // --- LÓGICA DE MODALES (Igual que antes) ---
    window.abrirConfig = () => {
        document.getElementById('cfgTitulo').value = configBanner.titulo;
        document.getElementById('cfgFondo').value = configBanner.fondo;
        document.getElementById('modalConfig').style.display = 'flex';
    };

    window.guardarConfig = () => {
        configBanner.titulo = document.getElementById('cfgTitulo').value || "BARBERIA 4154";
        configBanner.fondo = document.getElementById('cfgFondo').value;
        localStorage.setItem('pelu_config_v1', JSON.stringify(configBanner));
        aplicarConfigVisual();
        document.getElementById('modalConfig').style.display = 'none';
    };

    window.abrirModalDia = (fecha) => {
        fechaSeleccionada = fecha;
        const regDia = registros.filter(r => r.fecha === fecha);
        document.getElementById('fechaDiaTitulo').innerText = fecha.split('-').reverse().join('/');
        const lista = document.getElementById('listaTurnosDia');
        lista.innerHTML = regDia.length ? '' : '<p style="text-align:center; opacity:0.3; padding:20px;">Sin registros</p>';
        
        regDia.forEach(r => {
            const item = document.createElement('div');
            item.className = 'lista-dia-item';
            item.innerHTML = `<div><small>${r.hora}</small><br><b>✂️ ${r.titulo}</b></div>
                             <span style="font-weight:800; color:${r.tipo==='gasto'?'#F2B8B5':'#B2F2BB'}">$${r.monto}</span>`;
            item.onclick = (e) => { e.stopPropagation(); window.prepararEdicion(registros.indexOf(r)); };
            lista.appendChild(item);
        });
        document.getElementById('modalDia').style.display = 'flex';
    };

    window.abrirFormularioNuevo = () => {
        window.cerrarModalDia();
        indiceEdicion = -1;
        document.getElementById('modalTitle').innerText = "Nuevo Registro";
        document.getElementById('nombreCliente').value = "";
        document.getElementById('montoTurno').value = "";
        document.getElementById('btnBorrar').style.display = "none";
        document.getElementById('modalTurno').style.display = 'flex';
    };

    window.prepararEdicion = (idx) => {
        window.cerrarModalDia();
        const r = registros[idx];
        indiceEdicion = idx;
        document.getElementById('modalTitle').innerText = "Editar Registro";
        document.getElementById('nombreCliente').value = r.titulo;
        document.getElementById('horaTurno').value = r.hora;
        document.getElementById('montoTurno').value = r.monto;
        document.getElementById('tipoRegistro').value = r.tipo;
        document.getElementById('btnBorrar').style.display = "block";
        document.getElementById('modalTurno').style.display = 'flex';
    };

    document.getElementById('btnGuardar').onclick = () => {
        const dato = {
            fecha: fechaSeleccionada,
            titulo: document.getElementById('nombreCliente').value,
            hora: document.getElementById('horaTurno').value,
            monto: document.getElementById('montoTurno').value,
            tipo: document.getElementById('tipoRegistro').value
        };
        if(indiceEdicion > -1) registros[indiceEdicion] = dato; else registros.push(dato);
        localStorage.setItem('pelu_datos_v6', JSON.stringify(registros));
        document.getElementById('modalTurno').style.display = 'none';
        renderizar();
    };

    document.getElementById('btnBorrar').onclick = () => {
        if(confirm("¿Eliminar este registro?")) {
            registros.splice(indiceEdicion, 1);
            localStorage.setItem('pelu_datos_v6', JSON.stringify(registros));
            document.getElementById('modalTurno').style.display = 'none';
            renderizar();
        }
    };

    function actualizarEconomia() {
        const mesStr = `${añoActual}-${String(mesActual+1).padStart(2,'0')}`;
        const regMes = registros.filter(r => r.fecha.startsWith(mesStr));
        const ing = regMes.filter(r => r.tipo === 'ingreso').reduce((a, b) => a + Number(b.monto), 0);
        const gas = regMes.filter(r => r.tipo === 'gasto').reduce((a, b) => a + Number(b.monto), 0);
        document.getElementById('totalIngresos').innerText = `$${ing.toLocaleString()}`;
        document.getElementById('totalGastos').innerText = `$${gas.toLocaleString()}`;
        document.getElementById('totalNeto').innerText = `$${(ing - gas).toLocaleString()}`;
    }

    window.cerrarModalDia = () => document.getElementById('modalDia').style.display = 'none';
    window.cerrarModal = () => document.getElementById('modalTurno').style.display = 'none';
    window.cerrarConfig = () => document.getElementById('modalConfig').style.display = 'none';
    window.irAHoy = () => { mesActual = hoyReal.getMonth(); añoActual = hoyReal.getFullYear(); renderizar(); };
    
    renderizar();
});