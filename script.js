document.addEventListener('DOMContentLoaded', () => {
    let hoyReal = new Date();
    let mesActual = hoyReal.getMonth();
    let añoActual = hoyReal.getFullYear();
    let fechaSeleccionada = "";
    let indiceEdicion = -1;
    let chartInstance = null; 

    // --- VARIABLES PARA SWIPE ---
    let touchStartX = 0;
    let touchEndX = 0;

    let configBanner = JSON.parse(localStorage.getItem('pelu_config_v2')) || {
        titulo: "BARBERÍA 4154",
        fondo: "https://images.unsplash.com/photo-1585747860715-2ba37e788b70?q=80",
        logo: "" // Guardamos el logo acá
    };
    
    let tempImageBase64 = configBanner.fondo; 
    let tempLogoBase64 = configBanner.logo; // Variable temporal para el logo
    let registros = JSON.parse(localStorage.getItem('pelu_datos_v6')) || [];
    
    const contenedor = document.getElementById('calendar');
    const displayMes = document.getElementById('monthYear');

    // --- 1. CONFIGURACIÓN VISUAL, BANNER E INFO INTELIGENTE ---
    function aplicarConfigVisual() {
        document.getElementById('txtBannerDisplay').innerText = configBanner.titulo;
        document.getElementById('bannerBg').style.backgroundImage = `url('${configBanner.fondo}')`;
        
        const perfilDisplay = document.getElementById('perfilDisplay');
        if (configBanner.logo) {
            perfilDisplay.innerHTML = `<img src="${configBanner.logo}" alt="Perfil">`;
        } else {
            perfilDisplay.innerHTML = `<span class="material-symbols-rounded">storefront</span>`;
        }
    }

    function actualizarBannerInfo() {
        const ahora = new Date();
        const hora = ahora.getHours();
        
        let saludo = "¡Buenas noches!";
        if (hora >= 5 && hora < 12) saludo = "¡Buenos días!";
        else if (hora >= 12 && hora < 19) saludo = "¡Buenas tardes!";
        document.getElementById('saludoText').innerText = saludo;

        const opcionesFecha = { weekday: 'long', day: 'numeric', month: 'long' };
        let fechaStr = ahora.toLocaleDateString('es-ES', opcionesFecha);
        fechaStr = fechaStr.charAt(0).toUpperCase() + fechaStr.slice(1);
        document.getElementById('fechaBannerDisplay').innerText = fechaStr;

        const strHoy = `${hoyReal.getFullYear()}-${String(hoyReal.getMonth() + 1).padStart(2, '0')}-${String(hoyReal.getDate()).padStart(2, '0')}`;
        const turnosHoy = registros.filter(r => r.fecha === strHoy && r.tipo === 'ingreso').length;
        
        let textoTurnos = turnosHoy === 1 ? '1 turno hoy' : `${turnosHoy} turnos hoy`;
        if (turnosHoy === 0) textoTurnos = 'Sin turnos hoy';

        document.getElementById('contadorTurnos').innerHTML = `
            <span class="material-symbols-rounded">event</span>
            <span>${textoTurnos}</span>
        `;
    }

    // Lector de imagen de Fondo
    const inputFondo = document.getElementById('cfgFondoFile');
    inputFondo.addEventListener('change', function(e) {
        const file = this.files[0];
        if (file) {
            document.getElementById('nombreArchivoFondo').innerText = file.name;
            const reader = new FileReader();
            reader.onload = function(evento) {
                tempImageBase64 = evento.target.result; 
            };
            reader.readAsDataURL(file);
        }
    });

    // Lector de imagen de Logo
    const inputLogo = document.getElementById('cfgLogoFile');
    inputLogo.addEventListener('change', function(e) {
        const file = this.files[0];
        if (file) {
            document.getElementById('nombreArchivoLogo').innerText = file.name;
            const reader = new FileReader();
            reader.onload = function(evento) {
                tempLogoBase64 = evento.target.result; 
            };
            reader.readAsDataURL(file);
        }
    });

    // --- 2. RENDERIZADO DEL CALENDARIO ---
    window.renderizar = () => {
        contenedor.style.opacity = '0';
        contenedor.style.transform = 'translateY(10px)';

        setTimeout(() => {
            contenedor.innerHTML = '';
            const meses = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
            displayMes.innerText = `${meses[mesActual]} ${añoActual}`;

            const primerDia = new Date(añoActual, mesActual, 1).getDay();
            const totalDias = new Date(añoActual, mesActual + 1, 0).getDate();
            
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
            actualizarBannerInfo(); 
            actualizarEconomia();
            
            contenedor.style.opacity = '1';
            contenedor.style.transform = 'translateY(0)';
        }, 200);
    };

    // --- 3. NAVEGACIÓN Y SWIPE ---
    let touchStartY = 0;
    
    contenedor.addEventListener('touchstart', e => { 
        touchStartX = e.changedTouches[0].screenX; 
        touchStartY = e.changedTouches[0].screenY;
    }, {passive: true});

    contenedor.addEventListener('touchend', e => {
        touchEndX = e.changedTouches[0].screenX;
        let touchEndY = e.changedTouches[0].screenY;
        
        // Calculamos cuánto se movió el dedo en cada dirección
        let diffX = Math.abs(touchEndX - touchStartX);
        let diffY = Math.abs(touchEndY - touchStartY);

        // Solo cambiamos de mes si el movimiento fue más horizontal que vertical, y mayor a 50px
        if (diffX > diffY && diffX > 50) {
            if (touchEndX < touchStartX) cambiarMes(1);
            if (touchEndX > touchStartX) cambiarMes(-1);
        }
    }, {passive: true});

    function cambiarMes(delta) {
        mesActual += delta;
        if (mesActual > 11) { mesActual = 0; añoActual++; }
        if (mesActual < 0) { mesActual = 11; añoActual--; }
        renderizar();
    }

    document.getElementById('prevMonth').onclick = () => cambiarMes(-1);
    document.getElementById('nextMonth').onclick = () => cambiarMes(1);

    // --- 4. CONTROL DE VISTAS (SPA) ---
    window.cambiarVista = (vistaId) => {
        document.querySelectorAll('.vista').forEach(v => v.classList.remove('activa'));
        document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
        
        document.getElementById(`vista-${vistaId}`).classList.add('activa');
        event.currentTarget.classList.add('active');

        if (vistaId === 'hoy') {
            renderizarVistaHoy();
        } else if (vistaId === 'reportes') {
            window.filtrarGrafico('mensual');
        } else {
            renderizar();
        }
    };

    // --- 4.1. LÓGICA VISTA "HOY" ---
    function renderizarVistaHoy() {
        const strHoy = `${hoyReal.getFullYear()}-${String(hoyReal.getMonth() + 1).padStart(2, '0')}-${String(hoyReal.getDate()).padStart(2, '0')}`;
        fechaSeleccionada = strHoy; 
        
        const regHoy = registros.filter(r => r.fecha === strHoy);
        document.getElementById('fechaHoyDisplay').innerText = strHoy.split('-').reverse().join('/');
        
        const ing = regHoy.filter(r => r.tipo === 'ingreso').reduce((a, b) => a + Number(b.monto), 0);
        const gas = regHoy.filter(r => r.tipo === 'gasto').reduce((a, b) => a + Number(b.monto), 0);
        document.getElementById('brutoHoyDisplay').innerText = `$${ing.toLocaleString()}`;
        document.getElementById('gastosHoyDisplay').innerText = `$${gas.toLocaleString()}`;

        const lista = document.getElementById('listaTurnosHoyVista');
        lista.innerHTML = regHoy.length ? '' : '<p style="text-align:center; opacity:0.5; padding:40px 20px;">No hay actividad registrada para hoy.</p>';
        
        regHoy.sort((a,b) => (a.hora > b.hora ? 1 : -1)).forEach(r => {
            const item = document.createElement('div');
            item.className = 'md-card'; 
            item.style.margin = '0 0 12px 0';
            item.style.padding = '16px';
            item.style.display = 'flex';
            item.style.justifyContent = 'space-between';
            item.style.alignItems = 'center';
            item.style.borderLeft = `4px solid ${r.tipo === 'gasto' ? '#FFB4AB' : '#81C784'}`;
            
            let btnWsp = '';
            if (r.tipo === 'ingreso' && r.telefono) {
                const telLimpio = r.telefono.replace(/\D/g, ''); 
                const mensaje = encodeURIComponent(`Hola ${r.titulo}, te escribimos de ${configBanner.titulo} para recordarte tu turno hoy a las ${r.hora}. ¡Te esperamos!`);
                btnWsp = `<a href="https://wa.me/${telLimpio}?text=${mensaje}" target="_blank" class="wsp-btn" onclick="event.stopPropagation()"><span class="material-symbols-rounded" style="color: white; font-size: 18px;">chat</span></a>`;
            }

            const displayHora = r.tipo === 'gasto' ? '' : `<span style="font-size:12px; opacity:0.7;">${r.hora || '--:--'}</span><br>`;

            item.innerHTML = `
                <div style="flex-grow: 1;">
                    ${displayHora}
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
    }

    // --- 5. LÓGICA DE MODALES ---
    document.querySelectorAll('input[name="tipoRegistro"]').forEach(radio => {
        radio.addEventListener('change', (e) => {
            const campoTel = document.getElementById('campoTelefono');
            const campoHora = document.getElementById('campoHora');
            if (e.target.value === 'gasto') {
                campoTel.style.display = 'none';
                campoHora.style.display = 'none';
            } else {
                campoTel.style.display = 'block';
                campoHora.style.display = 'block';
            }
        });
    });

    window.abrirModalDia = (fecha) => {
        fechaSeleccionada = fecha;
        const regDia = registros.filter(r => r.fecha === fecha);
        const fechaFormateada = fecha.split('-').reverse().join('/');
        document.getElementById('fechaDiaTitulo').innerText = fechaFormateada;
        
        const lista = document.getElementById('listaTurnosDia');
        lista.innerHTML = regDia.length ? '' : '<p style="text-align:center; opacity:0.5; padding:20px;">Sin registros</p>';
        
        regDia.sort((a,b) => (a.hora > b.hora ? 1 : -1)).forEach(r => {
            const item = document.createElement('div');
            item.className = 'md-card'; 
            item.style.margin = '0 0 8px 0';
            item.style.padding = '12px';
            item.style.display = 'flex';
            item.style.justifyContent = 'space-between';
            item.style.alignItems = 'center';
            
            let btnWsp = '';
            if (r.tipo === 'ingreso' && r.telefono) {
                const telLimpio = r.telefono.replace(/\D/g, ''); 
                const mensaje = encodeURIComponent(`Hola ${r.titulo}, te escribimos de ${configBanner.titulo} para recordarte tu turno el día ${fechaFormateada} a las ${r.hora}. ¡Te esperamos!`);
                btnWsp = `<a href="https://wa.me/${telLimpio}?text=${mensaje}" target="_blank" class="wsp-btn" onclick="event.stopPropagation()"><span class="material-symbols-rounded" style="color: white; font-size: 18px;">chat</span></a>`;
            }

            const displayHora = r.tipo === 'gasto' ? '' : `<span style="font-size:12px; opacity:0.7;">${r.hora || '--:--'}</span><br>`;

            item.innerHTML = `
                <div style="flex-grow: 1;">
                    ${displayHora}
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
            if(document.getElementById('vista-calendario').classList.contains('activa') || fechaSeleccionada === "") {
                fechaSeleccionada = `${hoyReal.getFullYear()}-${String(hoyReal.getMonth() + 1).padStart(2, '0')}-${String(hoyReal.getDate()).padStart(2, '0')}`;
            }
        }
        
        indiceEdicion = -1;
        document.getElementById('modalTitle').innerText = "Nuevo Registro";
        document.getElementById('nombreCliente').value = "";
        document.getElementById('telefonoCliente').value = "";
        document.getElementById('montoTurno').value = "";
        
        const ahora = new Date();
        document.getElementById('horaTurno').value = `${String(ahora.getHours()).padStart(2, '0')}:${String(ahora.getMinutes()).padStart(2, '0')}`;
        
        document.querySelector('input[name="tipoRegistro"][value="ingreso"]').checked = true;
        document.getElementById('campoTelefono').style.display = 'block';
        document.getElementById('campoHora').style.display = 'block';
        
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
        
        if (r.tipo === 'gasto') {
            document.getElementById('campoTelefono').style.display = 'none';
            document.getElementById('campoHora').style.display = 'none';
        } else {
            document.getElementById('campoTelefono').style.display = 'block';
            document.getElementById('campoHora').style.display = 'block';
        }

        document.getElementById('btnBorrar').style.display = "block";
        document.getElementById('modalTurno').classList.add('show');
    };

    window.cerrarModalDia = () => document.getElementById('modalDia').classList.remove('show');
    window.cerrarModal = () => document.getElementById('modalTurno').classList.remove('show');
    
    // Configuración
    window.abrirConfig = () => {
        document.getElementById('cfgTitulo').value = configBanner.titulo;
        document.getElementById('nombreArchivoFondo').innerText = "Sin imagen nueva seleccionada";
        document.getElementById('nombreArchivoLogo').innerText = "Sin foto nueva seleccionada";
        document.getElementById('modalConfig').classList.add('show');
    };
    window.cerrarConfig = () => document.getElementById('modalConfig').classList.remove('show');

    window.guardarConfig = () => {
        configBanner.titulo = document.getElementById('cfgTitulo').value || "BARBERÍA 4154";
        configBanner.fondo = tempImageBase64; 
        configBanner.logo = tempLogoBase64; // Guardamos el logo modificado
        localStorage.setItem('pelu_config_v2', JSON.stringify(configBanner));
        aplicarConfigVisual();
        window.cerrarConfig();
    };

    // --- 6. GUARDAR Y BORRAR DATOS ---
    document.getElementById('btnGuardar').onclick = () => {
        const titulo = document.getElementById('nombreCliente').value;
        const monto = document.getElementById('montoTurno').value;
        const tipoReg = document.querySelector('input[name="tipoRegistro"]:checked').value;
        
        if(!titulo || !monto) return alert("Completá concepto y monto");

        const dato = {
            fecha: fechaSeleccionada,
            titulo: titulo,
            telefono: tipoReg === 'ingreso' ? document.getElementById('telefonoCliente').value : '',
            hora: tipoReg === 'ingreso' ? document.getElementById('horaTurno').value : '',
            monto: Number(monto),
            tipo: tipoReg
        };

        if(indiceEdicion > -1) registros[indiceEdicion] = dato; 
        else registros.push(dato);
        
        localStorage.setItem('pelu_datos_v6', JSON.stringify(registros));
        window.cerrarModal();
        
        if(document.getElementById('vista-hoy').classList.contains('activa')) {
            renderizarVistaHoy();
        } 
        renderizar(); 
    };

    document.getElementById('btnBorrar').onclick = () => {
        if(confirm("¿Eliminar definitivamente este registro?")) {
            registros.splice(indiceEdicion, 1);
            localStorage.setItem('pelu_datos_v6', JSON.stringify(registros));
            window.cerrarModal();
            
            if(document.getElementById('vista-hoy').classList.contains('activa')) {
                renderizarVistaHoy();
            } 
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
                datosIngresos.push(reg.filter(r => r.tipo === 'ingreso').reduce((sum, r) => sum + Number(r.monto), 0));
                datosGastos.push(reg.filter(r => r.tipo === 'gasto').reduce((sum, r) => sum + Number(r.monto), 0));
            }
        } else if (periodo === 'diario') {
            for (let i = 6; i >= 0; i--) {
                let d = new Date();
                d.setDate(d.getDate() - i);
                let diaStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
                etiquetas.push(`${d.getDate()}/${d.getMonth()+1}`);

                let reg = registros.filter(r => r.fecha === diaStr);
                datosIngresos.push(reg.filter(r => r.tipo === 'ingreso').reduce((sum, r) => sum + Number(r.monto), 0));
                datosGastos.push(reg.filter(r => r.tipo === 'gasto').reduce((sum, r) => sum + Number(r.monto), 0));
            }
        } else if (periodo === 'anual') {
            for (let i = 2; i >= 0; i--) {
                let y = hoyReal.getFullYear() - i;
                etiquetas.push(y);
                let reg = registros.filter(r => r.fecha.startsWith(y.toString()));
                datosIngresos.push(reg.filter(r => r.tipo === 'ingreso').reduce((sum, r) => sum + Number(r.monto), 0));
                datosGastos.push(reg.filter(r => r.tipo === 'gasto').reduce((sum, r) => sum + Number(r.monto), 0));
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
                    { label: 'Bruto', data: ingresos, backgroundColor: '#81C784', borderRadius: 4 },
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