document.addEventListener('DOMContentLoaded', () => {
    let hoyReal = new Date();
    let mesActual = hoyReal.getMonth();
    let añoActual = hoyReal.getFullYear();
    let fechaSeleccionada = "";
    let indiceEdicion = -1;

    let registros = JSON.parse(localStorage.getItem('pelu_datos_v6')) || [];
    let config = JSON.parse(localStorage.getItem('pelu_config')) || { 
        nombre: "PELUQUERÍA ELITE",
        bannerImg: "" 
    };

    const contenedor = document.getElementById('calendar');
    const displayMes = document.getElementById('monthYear');
    const modalContent = document.querySelector('.modal-content');
    const bannerBg = document.getElementById('bannerBg');

    function iniciar() {
        aplicarConfiguracion();
        renderizar();
    }

    function aplicarConfiguracion() {
        document.getElementById('txtBannerDisplay').innerText = config.nombre;
        if (config.bannerImg) {
            bannerBg.style.backgroundImage = `url(${config.bannerImg})`;
        } else {
            bannerBg.style.backgroundImage = "none";
        }
    }

    window.copiarResumen = () => {
        const nombresMeses = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
        const regMes = registros.filter(r => {
            const f = r.fecha.split('-');
            return parseInt(f[0]) === añoActual && (parseInt(f[1]) - 1) === mesActual;
        });

        let ing = regMes.filter(r => r.tipo === 'ingreso').reduce((a, b) => a + b.monto, 0);
        let gas = regMes.filter(r => r.tipo === 'gasto').reduce((a, b) => a + b.monto, 0);

        let texto = `📊 RESUMEN ${nombresMeses[mesActual].toUpperCase()} - ${config.nombre}\n`;
        texto += `---------------------------\n`;
        texto += `✂️ Turnos: $${ing.toLocaleString()}\n`;
        texto += `💸 Gastos: $${gas.toLocaleString()}\n`;
        texto += `💰 NETO: $${(ing - gas).toLocaleString()}\n`;
        texto += `---------------------------\n`;

        navigator.clipboard.writeText(texto).then(() => alert("Resumen copiado para WhatsApp."));
    }

    window.irAHoy = () => {
        mesActual = hoyReal.getMonth();
        añoActual = hoyReal.getFullYear();
        renderizar();
    }

    window.adaptarModal = () => {
        const tipo = document.getElementById('tipoRegistro').value;
        const btnGuardar = document.getElementById('btnGuardar');
        const lblNombre = document.getElementById('lblNombre');

        if (tipo === 'gasto') {
            modalContent.classList.add('modal-gasto');
            btnGuardar.classList.add('gasto-btn');
            btnGuardar.innerText = "Guardar Gasto 💸";
            lblNombre.innerText = "Concepto del Gasto";
        } else {
            modalContent.classList.remove('modal-gasto');
            btnGuardar.classList.remove('gasto-btn');
            btnGuardar.innerText = "Guardar Turno ✂️";
            lblNombre.innerText = "Nombre del Cliente";
        }
    }

    function renderizar() {
        contenedor.innerHTML = '';
        const nombresMeses = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
        displayMes.innerText = `${nombresMeses[mesActual]} ${añoActual}`;

        const primerDia = new Date(añoActual, mesActual, 1).getDay();
        const totalDias = new Date(añoActual, mesActual + 1, 0).getDate();
        const desfase = (primerDia === 0 ? 6 : primerDia - 1);

        for (let i = 0; i < desfase; i++) {
            const vacio = document.createElement('div');
            vacio.className = 'day empty';
            contenedor.appendChild(vacio);
        }

        for (let dia = 1; dia <= totalDias; dia++) {
            const fechaKey = `${añoActual}-${mesActual + 1}-${dia}`;
            const registrosDia = registros
                .filter(r => r.fecha === fechaKey)
                .sort((a, b) => (a.hora || "99:99").localeCompare(b.hora || "99:99"));
            
            const diaDiv = document.createElement('div');
            diaDiv.className = 'day';
            
            if(dia === hoyReal.getDate() && mesActual === hoyReal.getMonth() && añoActual === hoyReal.getFullYear()) {
                diaDiv.style.border = "1px solid var(--pastel-blue)";
                diaDiv.style.background = "rgba(96, 165, 250, 0.05)";
            }

            diaDiv.innerHTML = `<span class="day-number">${dia}</span>`;
            const list = document.createElement('div');
            list.className = 'list';
            
            registrosDia.forEach(r => {
                const el = document.createElement('div');
                const esGasto = r.tipo === 'gasto';
                let colorClase = 'morning'; 
                if (esGasto) colorClase = 'danger';
                else if (r.hora) {
                    const h = parseInt(r.hora.split(':')[0]);
                    if (h >= 12 && h < 19) colorClase = 'afternoon';
                    else if (h >= 19) colorClase = 'evening';
                }
                el.className = `event ${colorClase}`;
                el.innerText = `${esGasto ? "💸" : "✂️"} ${r.hora || ''} ${r.titulo}`;
                el.onclick = (e) => { e.stopPropagation(); prepararEdicion(registros.indexOf(r)); };
                list.appendChild(el);
            });

            diaDiv.appendChild(list);
            diaDiv.onclick = () => abrirModal(fechaKey);
            contenedor.appendChild(diaDiv);
        }
        actualizarEconomia();
    }

    function abrirModal(fecha) {
        fechaSeleccionada = fecha;
        indiceEdicion = -1;
        document.getElementById('nombreCliente').value = "";
        document.getElementById('horaTurno').value = "";
        document.getElementById('montoTurno').value = "";
        document.getElementById('tipoRegistro').value = "ingreso";
        document.getElementById('btnBorrar').style.display = "none";
        adaptarModal();
        document.getElementById('modalTurno').style.display = 'flex';
    }

    function prepararEdicion(id) {
        const r = registros[id];
        indiceEdicion = id;
        fechaSeleccionada = r.fecha;
        document.getElementById('nombreCliente').value = r.titulo;
        document.getElementById('horaTurno').value = r.hora;
        document.getElementById('montoTurno').value = r.monto;
        document.getElementById('tipoRegistro').value = r.tipo;
        document.getElementById('btnBorrar').style.display = "block";
        adaptarModal();
        document.getElementById('modalTurno').style.display = 'flex';
    }

    window.cerrarModal = () => document.getElementById('modalTurno').style.display = 'none';

    document.getElementById('btnGuardar').onclick = () => {
        const titulo = document.getElementById('nombreCliente').value;
        const hora = document.getElementById('horaTurno').value;
        const monto = parseFloat(document.getElementById('montoTurno').value) || 0;
        const tipo = document.getElementById('tipoRegistro').value;

        if (!titulo) return;
        const dato = { fecha: fechaSeleccionada, titulo, hora, monto, tipo };

        if(indiceEdicion > -1) registros[indiceEdicion] = dato;
        else registros.push(dato);

        localStorage.setItem('pelu_datos_v6', JSON.stringify(registros));
        cerrarModal();
        renderizar();
    };

    document.getElementById('btnBorrar').onclick = () => {
        if(confirm("¿Eliminar registro?")) {
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
        const ing = regMes.filter(r => r.tipo === 'ingreso');
        const gas = regMes.filter(r => r.tipo === 'gasto');
        const ingT = ing.reduce((a, b) => a + b.monto, 0);
        const gasT = gas.reduce((a, b) => a + b.monto, 0);

        document.getElementById('totalIngresos').innerText = `$ ${ingT.toLocaleString()}`;
        document.getElementById('totalGastos').innerText = `$ ${gasT.toLocaleString()}`;
        document.getElementById('totalNeto').innerText = `$ ${(ingT - gasT).toLocaleString()}`;
        document.getElementById('countIngresos').innerText = ing.length;
        document.getElementById('countGastos').innerText = gas.length;
    }

    window.abrirConfig = () => {
        document.getElementById('configNombre').value = config.nombre;
        document.getElementById('modalConfig').style.display = 'flex';
    };
    window.cerrarConfig = () => document.getElementById('modalConfig').style.display = 'none';
    
    window.guardarConfig = () => {
        const fileInput = document.getElementById('configFoto');
        const nuevoNombre = document.getElementById('configNombre').value || "PELUQUERÍA ELITE";
        
        if (fileInput.files && fileInput.files[0]) {
            const reader = new FileReader();
            reader.onload = (e) => {
                config.nombre = nuevoNombre;
                config.bannerImg = e.target.result;
                localStorage.setItem('pelu_config', JSON.stringify(config));
                aplicarConfiguracion();
                cerrarConfig();
            };
            reader.readAsDataURL(fileInput.files[0]);
        } else {
            config.nombre = nuevoNombre;
            localStorage.setItem('pelu_config', JSON.stringify(config));
            aplicarConfiguracion();
            cerrarConfig();
        }
    };

    document.getElementById('prevMonth').onclick = () => { mesActual--; if(mesActual<0){mesActual=11; añoActual--;} renderizar(); };
    document.getElementById('nextMonth').onclick = () => { mesActual++; if(mesActual>11){mesActual=0; añoActual++;} renderizar(); };

    iniciar();
});