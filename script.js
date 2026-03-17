document.addEventListener('DOMContentLoaded', () => {
    let hoyReal = new Date();
    let mesActual = hoyReal.getMonth();
    let añoActual = hoyReal.getFullYear();
    let fechaSeleccionada = "";
    let indiceEdicion = -1;
    let chartInstance = null; // Para el gráfico de estadísticas

    // --- VARIABLES PARA SWIPE ---
    let touchStartX = 0;
    let touchEndX = 0;

    let configBanner = JSON.parse(localStorage.getItem('pelu_config_v2')) || {
        titulo: "BARBERÍA 4154",
        fondo: "https://images.unsplash.com/photo-1585747860715-2ba37e788b70?q=80"
    };
    
    // Variable temporal para la imagen subida
    let tempImageBase64 = configBanner.fondo; 

    // Mantenemos la misma llave de almacenamiento para no perder tus datos actuales
    let registros = JSON.parse(localStorage.getItem('pelu_datos_v6')) || [];
    
    const contenedor = document.getElementById('calendar');
    const displayMes = document.getElementById('monthYear');

    // --- 1. CONFIGURACIÓN VISUAL Y BANNER ---
    function aplicarConfigVisual() {
        document.getElementById('txtBannerDisplay').innerText = configBanner.titulo;
        document.getElementById('bannerBg').style.backgroundImage = `url('${configBanner.fondo}')`;
    }

    // Lector de imagen desde galería local
    const inputFondo = document.getElementById('cfgFondoFile');
    inputFondo.addEventListener('change', function(e) {
        const file = this.files[0];
        if (file) {
            document.getElementById('nombreArchivoFondo').innerText = file.name;
            const reader = new FileReader();
            reader.onload = function(evento) {
                tempImageBase64 = evento.target.result; // Guarda la imagen en base64
            };
            reader.readAsDataURL(file);
        }
    });

    // --- 2. RENDERIZADO DEL CALENDARIO (M3) ---
    window.renderizar = () => {
        contenedor.style.opacity = '0';
        contenedor.style.transform = 'translateY(10px)';

        setTimeout(() => {
            contenedor.innerHTML = '';
            const meses = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
            displayMes.innerText = `${meses[mesActual]} ${añoActual}`;

            const primerDia = new Date(añoActual, mesActual, 1).getDay();
            const totalDias = new Date(añoActual, mesActual + 1, 0).getDate();
            
            // Adaptar para que la semana empiece en Domingo (0)
            for (let i = 0; i < primerDia; i++) {
                contenedor.appendChild(Object.assign(document.createElement('div'), {className: 'day empty'}));
            }

            for (let dia = 1; dia <= totalDias; dia++) {
                const fKey = `${añoActual}-${String(mesActual + 1).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
                const regDia = registros.filter(r => r.fecha === fKey);
                
                const diaDiv = document.createElement('div');
                diaDiv.className = 'day';
                if(dia === hoyReal.getDate() && mesActual === hoyReal.getMonth() && añoActual === hoyReal.getFullYear()) {
                    diaDiv.classList.add('today');
                }

                diaDiv.innerHTML = `<span class="day-number">${dia}</span>`;
                const list = document.createElement('div');
                list.className = 'day-events'; 
                list.style.width = '100%';
                
                // Mostrar todos los turnos del día
                regDia.sort((a,b) => (a.hora > b.hora ? 1 : -1)).forEach(r => {
                    const dot = document.createElement('div');
                    dot.className = `event-indicator ${r.tipo === 'gasto' ? 'event-gasto' : 'event-ingreso'}`;
                    list.appendChild(dot);
                });

                diaDiv.appendChild(list);
                diaDiv.onclick = () => window.abrirModalDia(fKey);
                contenedor.appendChild(diaDiv);
            }
            
            aplicarConfigVisual();
            actualizarEconomia();
            
            contenedor.style.opacity = '1';
            contenedor.style.transform = 'translateY(0)';
        }, 200);
    };

    // --- 3. NAVEGACIÓN Y SWIPE ---
    contenedor.addEventListener('touchstart', e => { touchStartX = e.changedTouches[0].screenX; }, false);
    contenedor.addEventListener('touchend', e => {
        touchEndX = e.changedTouches[0].screenX;
        if (touchEndX < touchStartX - 50) cambiarMes(1);
        if (touchEndX > touchStartX + 50) cambiarMes(-1);
    }, false);

    function cambiarMes(delta) {
        mesActual += delta;
        if (mesActual > 11) { mesActual = 0; añoActual++; }
        if (mesActual < 0) { mesActual = 11; añoActual--; }
        renderizar();
    }

    document.getElementById('prevMonth').onclick = () => cambiarMes(-1);
    document.getElementById('nextMonth').onclick = () => cambiarMes(1);
    
    window.irAHoy = () => { 
        mesActual = hoyReal.getMonth(); 
        añoActual = hoyReal.getFullYear(); 
        window.cambiarVista('calendario'); 
        renderizar(); 
    };

    // --- 4. CONTROL DE VISTAS (SPA) ---
    window.cambiarVista = (vistaId) => {
        document.querySelectorAll('.vista').forEach(v => v.classList.remove('activa'));
        document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
        
        document.getElementById(`vista-${vistaId}`).classList.add('activa');
        event.currentTarget.classList.add('active');

        if (vistaId === 'reportes') {
            window.filtrarGrafico('mensual');
        }
    };

    // --- 5. LÓGICA DE MODALES (M3) Y WHATSAPP ---
    window.abrirModalDia = (fecha) => {
        fechaSeleccionada = fecha;
        const regDia = registros.filter(r => r.fecha === fecha);
        const fechaFormateada = fecha.split('-').reverse().join('/');
        document.getElementById('fechaDiaTitulo').innerText = fechaFormateada;
        
        const lista = document.getElementById('listaTurnosDia');
        lista.innerHTML = regDia.length ? '' : '<p style="text-align:center; opacity:0.5; padding:20px;">Sin registros hoy</p>';
        
        regDia.forEach(r => {
            const item = document.createElement('div');
            item.className = 'md-card'; 
            item.style.margin = '0 0 8px 0';
            item.style.padding = '12px';
            item.style.display = 'flex';
            item.style.justifyContent = 'space-between';
            item.style.alignItems = 'center';
            
            // Lógica Botón WhatsApp
            let btnWsp = '';
            if (r.tipo === 'ingreso' && r.telefono) {
                const telLimpio = r.telefono.replace(/\D/g, ''); 
                const mensaje = encodeURIComponent(`Hola ${r.titulo}, te escribimos de ${configBanner.titulo} para recordarte tu turno el día ${fechaFormateada} a las ${r.hora}. ¡Te esperamos!`);
                btnWsp = `<a href="https://wa.me/${telLimpio}?text=${mensaje}" target="_blank" class="wsp-btn" onclick="event.stopPropagation()"><span class="material-symbols-rounded" style="color: white;">chat</span></a>`;
            }

            item.innerHTML = `
                <div style="flex-grow: 1;">
                    <span style="font-size:12px; opacity:0.7;">${r.hora || '--:--'}</span><br>
                    <b style="font-size:16px;">${r.titulo}</b>
                </div>
                <div style="display:flex; align-items:center; gap: 12px;">
                    ${btnWsp}
                    <span style="font-weight:800; font-size:18px; color:${r.tipo==='gasto'?'#FFB4AB':'#81C784'}">$${r.monto}</span>
                </div>
            `;
            item.onclick = (e) => { e.stopPropagation(); window.prepararEdicion(registros.indexOf(r)); };
            lista.appendChild(item);
        });
        document.getElementById('modalDia').classList.add('show');
    };

    window.abrirFormularioNuevo = (desdeModalDia = false) => {
        if (!desdeModalDia) {
            window.cerrarModalDia();
            fechaSeleccionada = `${hoyReal.getFullYear()}-${String(hoyReal.getMonth() + 1).padStart(2, '0')}-${String(hoyReal.getDate()).padStart(2, '0')}`;
        }
        
        indiceEdicion = -1;
        document.getElementById('modalTitle').innerText = "Nuevo Registro";
        document.getElementById('nombreCliente').value = "";
        document.getElementById('telefonoCliente').value = "";
        document.getElementById('montoTurno').value = "";
        
        const ahora = new Date();
        document.getElementById('horaTurno').value = `${String(ahora.getHours()).padStart(2, '0')}:${String(ahora.getMinutes()).padStart(2, '0')}`;
        
        document.querySelector('input[name="tipoRegistro"][value="ingreso"]').checked = true;
        document.getElementById('btnBorrar').style.display = "none";
        document.getElementById('modalTurno').classList.add('show');
    };

    window.prepararEdicion = (idx) => {
        window.cerrarModalDia();
        const r = registros[idx];
        indiceEdicion = idx;
        document.getElementById('modalTitle').innerText = "Editar Registro";
        document.getElementById('nombreCliente').value = r.titulo;
        document.getElementById('telefonoCliente').value = r.telefono || "";
        document.getElementById('horaTurno').value = r.hora || "";
        document.getElementById('montoTurno').value = r.monto;
        document.querySelector(`input[name="tipoRegistro"][value="${r.tipo}"]`).checked = true;
        document.getElementById('btnBorrar').style.display = "block";
        document.getElementById('modalTurno').classList.add('show');
    };

    window.cerrarModalDia = () => document.getElementById('modalDia').classList.remove('show');
    window.cerrarModal = () => document.getElementById('modalTurno').classList.remove('show');
    
    // Configuración
    window.abrirConfig = () => {
        document.getElementById('cfgTitulo').value = configBanner.titulo;
        document.getElementById('nombreArchivoFondo').innerText = "Sin imagen nueva seleccionada";
        document.getElementById('modalConfig').classList.add('show');
    };
    window.cerrarConfig = () => document.getElementById('modalConfig').classList.remove('show');

    window.guardarConfig = () => {
        configBanner.titulo = document.getElementById('cfgTitulo').value || "BARBERÍA 4154";
        configBanner.fondo = tempImageBase64; 
        localStorage.setItem('pelu_config_v2', JSON.stringify(configBanner));
        aplicarConfigVisual();
        window.cerrarConfig();
    };

    // --- 6. GUARDAR Y BORRAR DATOS ---
    document.getElementById('btnGuardar').onclick = () => {
        const titulo = document.getElementById('nombreCliente').value;
        const monto = document.getElementById('montoTurno').value;
        if(!titulo || !monto) return alert("Completá concepto y monto");

        const dato = {
            fecha: fechaSeleccionada,
            titulo: titulo,
            telefono: document.getElementById('telefonoCliente').value,
            hora: document.getElementById('horaTurno').value,
            monto: Number(monto),
            tipo: document.querySelector('input[name="tipoRegistro"]:checked').value
        };

        if(indiceEdicion > -1) registros[indiceEdicion] = dato; 
        else registros.push(dato);
        
        localStorage.setItem('pelu_datos_v6', JSON.stringify(registros));
        window.cerrarModal();
        renderizar();
    };

    document.getElementById('btnBorrar').onclick = () => {
        if(confirm("¿Eliminar definitivamente este registro?")) {
            registros.splice(indiceEdicion, 1);
            localStorage.setItem('pelu_datos_v6', JSON.stringify(registros));
            window.cerrarModal();
            renderizar();
        }
    };

    // --- 7. ESTADÍSTICAS INTELIGENTES (CHART.JS) ---
    function actualizarEconomia() {
        const mesStr = `${añoActual}-${String(mesActual+1).padStart(2,'0')}`;
        const regMes = registros.filter(r => r.fecha.startsWith(mesStr));
        const ing = regMes.filter(r => r.tipo === 'ingreso').reduce((a, b) => a + Number(b.monto), 0);
        const gas = regMes.filter(r => r.tipo === 'gasto').reduce((a, b) => a + Number(b.monto), 0);
        document.getElementById('totalIngresos').innerText = `$${ing.toLocaleString()}`;
        document.getElementById('totalGastos').innerText = `$${gas.toLocaleString()}`;
        document.getElementById('totalNeto').innerText = `$${(ing - gas).toLocaleString()}`;
    }

    window.filtrarGrafico = (periodo) => {
        document.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
        if(event && event.target) event.target.classList.add('active');

        let etiquetas = [];
        let datosIngresos = [];
        let datosGastos = [];

        if (periodo === 'mensual') {
            for (let i = 5; i >= 0; i--) {
                let d = new Date(hoyReal.getFullYear(), hoyReal.getMonth() - i, 1);
                let mesStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2,'0')}`;
                let nombreMes = d.toLocaleString('es', { month: 'short' });
                etiquetas.push(nombreMes.toUpperCase());

                let reg = registros.filter(r => r.fecha.startsWith(mesStr));
                datosIngresos.push(reg.filter(r => r.tipo === 'ingreso').reduce((sum, r) => sum + r.monto, 0));
                datosGastos.push(reg.filter(r => r.tipo === 'gasto').reduce((sum, r) => sum + r.monto, 0));
            }
        } else if (periodo === 'diario') {
            for (let i = 6; i >= 0; i--) {
                let d = new Date();
                d.setDate(d.getDate() - i);
                let diaStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
                etiquetas.push(`${d.getDate()}/${d.getMonth()+1}`);

                let reg = registros.filter(r => r.fecha === diaStr);
                datosIngresos.push(reg.filter(r => r.tipo === 'ingreso').reduce((sum, r) => sum + r.monto, 0));
                datosGastos.push(reg.filter(r => r.tipo === 'gasto').reduce((sum, r) => sum + r.monto, 0));
            }
        } else if (periodo === 'anual') {
            for (let i = 2; i >= 0; i--) {
                let y = hoyReal.getFullYear() - i;
                etiquetas.push(y);
                let reg = registros.filter(r => r.fecha.startsWith(y.toString()));
                datosIngresos.push(reg.filter(r => r.tipo === 'ingreso').reduce((sum, r) => sum + r.monto, 0));
                datosGastos.push(reg.filter(r => r.tipo === 'gasto').reduce((sum, r) => sum + r.monto, 0));
            }
        }

        renderizarGrafico(etiquetas, datosIngresos, datosGastos);
    };

    function renderizarGrafico(etiquetas, ingresos, gastos) {
        const ctx = document.getElementById('graficoBalance').getContext('2d');
        
        if(chartInstance) chartInstance.destroy();

        chartInstance = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: etiquetas,
                datasets: [
                    { label: 'Ingresos', data: ingresos, backgroundColor: '#81C784', borderRadius: 4 },
                    { label: 'Gastos', data: gastos, backgroundColor: '#FFB4AB', borderRadius: 4 }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { labels: { color: '#E6E1E5' } }
                },
                scales: {
                    y: { ticks: { color: '#938F99' }, grid: { color: 'rgba(255,255,255,0.05)' } },
                    x: { ticks: { color: '#938F99' }, grid: { display: false } }
                }
            }
        });
    }

    // --- INICIALIZACIÓN ---
    renderizar();
});