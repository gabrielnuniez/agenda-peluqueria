document.addEventListener('DOMContentLoaded', () => {
    let hoyReal = new Date();
    let mesActual = hoyReal.getMonth();
    let añoActual = hoyReal.getFullYear();
    let fechaSeleccionada = "";
    let indiceEdicion = -1;

    // Cargar datos
    let registros = JSON.parse(localStorage.getItem('pelu_datos_v6')) || [];
    let config = JSON.parse(localStorage.getItem('pelu_config')) || { nombre: "BARBERIA 41545", bannerImg: "" };

    const contenedor = document.getElementById('calendar');
    const displayMes = document.getElementById('monthYear');
    const bannerBg = document.getElementById('bannerBg');

    // --- NAVEGACIÓN (BOTONES < >) ---
    document.getElementById('prevMonth').onclick = (e) => { e.preventDefault(); prevMonth(); };
    document.getElementById('nextMonth').onclick = (e) => { e.preventDefault(); nextMonth(); };

    function iniciar() { 
        aplicamosConfig(); 
        renderizar(); 
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
            const fKey = `${añoActual}-${mesActual + 1}-${dia}`;
            const regDia = registros.filter(r => r.fecha === fKey);
            
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

    // --- FUNCIONES DEL BANNER (CORREGIDAS) ---
    window.copiarResumen = () => {
        const meses = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
        const regMes = registros.filter(r => {
            const f = r.fecha.split('-');
            return parseInt(f[0]) === añoActual && (parseInt(f[1]) - 1) === mesActual;
        });

        const ing = regMes.filter(r => r.tipo === 'ingreso').reduce((a, b) => a + Number(b.monto), 0);
        const gas = regMes.filter(r => r.tipo === 'gasto').reduce((a, b) => a + Number(b.monto), 0);

        const texto = `📊 *RESUMEN ${meses[mesActual].toUpperCase()}*\n` +
                      `💈 ${config.nombre}\n\n` +
                      `✂️ Ingresos: $${ing.toLocaleString()}\n` +
                      `💸 Gastos: $${gas.toLocaleString()}\n` +
                      `💰 *Balance Neto: $${(ing - gas).toLocaleString()}*\n\n` +
                      `Generado con Peluquería Elite PRO 🚀`;

        navigator.clipboard.writeText(texto).then(() => alert("✅ Resumen copiado para WhatsApp"));
    };

    window.irAHoy = () => {
        mesActual = hoyReal.getMonth();
        añoActual = hoyReal.getFullYear();
        renderizar();
    };

    window.abrirConfig = () => {
        document.getElementById('configNombre').value = config.nombre;
        document.getElementById('modalConfig').style.display = 'flex';
    };

    window.cerrarConfig = () => {
        document.getElementById('modalConfig').style.display = 'none';
    };

    window.guardarConfig = () => {
        const fileInput = document.getElementById('configFoto');
        config.nombre = document.getElementById('configNombre').value.trim() || "BARBERIA 41545";
        
        if (fileInput.files && fileInput.files[0]) {
            const reader = new FileReader();
            reader.onload = (e) => { 
                config.bannerImg = e.target.result; 
                localStorage.setItem('pelu_config', JSON.stringify(config)); 
                aplicamosConfig(); 
                cerrarConfig(); 
            };
            reader.readAsDataURL(fileInput.files[0]);
        } else {
            localStorage.setItem('pelu_config', JSON.stringify(config));
            aplicamosConfig(); 
            cerrarConfig();
        }
    };

    // --- MODALES DE DÍA Y REGISTRO ---
    window.abrirModalDia = (fecha) => {
        fechaSeleccionada = fecha;
        const regDia = registros.filter(r => r.fecha === fecha);
        const lista = document.getElementById('listaTurnosDia');
        const modal = document.getElementById('modalDia');
        const partes = fecha.split('-');
        document.getElementById('fechaDiaTitulo').innerText = `${partes[2]}/${partes[1]}/${partes[0]}`;
        lista.innerHTML = '';

        if (regDia.length === 0) {
            lista.innerHTML = '<p style="text-align:center; opacity:0.5; padding:40px;">Sin movimientos</p>';
        } else {
            regDia.sort((a,b) => (a.hora > b.hora) ? 1 : -1).forEach(r => {
                const item = document.createElement('div');
                item.className = 'lista-dia-item';
                const icono = r.tipo === 'gasto' ? '💸' : '✂️';
                item.innerHTML = `
                    <div style="display:flex; flex-direction:column;">
                        <span style="font-size:11px; color:var(--md-sys-color-primary); font-weight:bold;">${r.hora || 'S/H'}</span>
                        <span style="font-weight:600; font-size:15px;">${icono} ${r.titulo}</span>
                    </div>
                    <span style="font-weight:800; color:${r.tipo==='gasto'?'#F2B8B5':'#B2F2BB'}">$${Number(r.monto).toLocaleString()}</span>
                `;
                item.onclick = (e) => { e.stopPropagation(); prepararEdicion(registros.indexOf(r)); };
                lista.appendChild(item);
            });
        }
        modal.style.display = 'flex';
    };

    window.cerrarModalDia = () => document.getElementById('modalDia').style.display = 'none';

    window.abrirFormularioNuevo = () => {
        cerrarModalDia();
        indiceEdicion = -1;
        document.getElementById('modalTitle').innerText = "Nuevo Registro";
        document.getElementById('nombreCliente').value = "";
        document.getElementById('horaTurno').value = "";
        document.getElementById('montoTurno').value = "";
        document.getElementById('tipoRegistro').value = "ingreso";
        document.getElementById('btnBorrar').style.display = "none";
        document.getElementById('modalTurno').style.display = 'flex';
    };

    window.prepararEdicion = (id) => {
        const r = registros[id];
        if(!r) return;
        indiceEdicion = id;
        document.getElementById('modalTurno').style.display = 'flex';
        document.getElementById('modalTitle').innerText = "Editar Registro";
        document.getElementById('nombreCliente').value = r.titulo;
        document.getElementById('horaTurno').value = r.hora;
        document.getElementById('montoTurno').value = r.monto;
        document.getElementById('tipoRegistro').value = r.tipo;
        document.getElementById('btnBorrar').style.display = "block";
    };

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
        localStorage.setItem('pelu_datos_v6', JSON.stringify(registros));
        cerrarModal();
        renderizar();
    };

    document.getElementById('btnBorrar').onclick = () => {
        if(confirm("¿Eliminar este registro?")) {
            registros.splice(indiceEdicion, 1);
            localStorage.setItem('pelu_datos_v6', JSON.stringify(registros));
            cerrarModal();
            renderizar();
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