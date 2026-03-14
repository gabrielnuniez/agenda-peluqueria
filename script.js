document.addEventListener('DOMContentLoaded', () => {
    let hoyReal = new Date();
    let mesActual = hoyReal.getMonth();
    let añoActual = hoyReal.getFullYear();
    let fechaSeleccionada = "";
    let indiceEdicion = -1;

    let registros = JSON.parse(localStorage.getItem('pelu_datos_v6')) || [];
    let config = JSON.parse(localStorage.getItem('pelu_config')) || { nombre: "PELUQUERÍA ELITE", bannerImg: "" };

    const contenedor = document.getElementById('calendar');
    const displayMes = document.getElementById('monthYear');
    const bannerBg = document.getElementById('bannerBg');

    // --- LÓGICA DE SWIPE (DESLIZAR) ---
    let touchstartX = 0;
    let touchendX = 0;

    contenedor.addEventListener('touchstart', e => { touchstartX = e.changedTouches[0].screenX; }, false);
    contenedor.addEventListener('touchend', e => { 
        touchendX = e.changedTouches[0].screenX;
        if (touchendX < touchstartX - 70) nextMonth();
        if (touchendX > touchstartX + 70) prevMonth();
    }, false);

    function iniciar() { aplicamosConfig(); renderizar(); }

    function aplicamosConfig() {
        document.getElementById('txtBannerDisplay').innerText = config.nombre;
        if (config.bannerImg) bannerBg.style.backgroundImage = `url(${config.bannerImg})`;
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
                diaDiv.style.border = "1px solid var(--pastel-blue)";
            }

            diaDiv.innerHTML = `<span class="day-number">${dia}</span>`;
            const list = document.createElement('div');
            list.className = 'list';
            
            regDia.forEach(r => {
                const dot = document.createElement('div');
                dot.className = `event ${r.tipo === 'gasto' ? 'danger' : (parseInt(r.hora) >= 18 ? 'evening' : 'morning')}`;
                list.appendChild(dot);
            });

            diaDiv.appendChild(list);
            diaDiv.onclick = () => abrirModalDia(fKey);
            contenedor.appendChild(diaDiv);
        }
        actualizarEconomia();
    }

    // --- FLUJO DE MODALES ---
    window.abrirModalDia = (fecha) => {
        fechaSeleccionada = fecha;
        const regDia = registros.filter(r => r.fecha === fecha);
        const lista = document.getElementById('listaTurnosDia');
        document.getElementById('fechaDiaTitulo').innerText = "Día " + fecha.split('-').reverse().join('/');
        lista.innerHTML = '';

        if (regDia.length === 0) {
            lista.innerHTML = '<p style="text-align:center; opacity:0.5; padding:20px;">Sin registros</p>';
        } else {
            regDia.forEach(r => {
                const item = document.createElement('div');
                item.className = 'lista-dia-item';
                item.innerHTML = `<div><small>${r.hora || '--:--'}</small><div>${r.titulo}</div></div><b>$${r.monto}</b>`;
                item.onclick = () => prepararEdicion(registros.indexOf(r));
                lista.appendChild(item);
            });
        }
        document.getElementById('modalDia').style.display = 'flex';
    }

    window.cerrarModalDia = () => document.getElementById('modalDia').style.display = 'none';

    window.abrirFormularioNuevo = () => {
        cerrarModalDia();
        indiceEdicion = -1;
        document.getElementById('nombreCliente').value = "";
        document.getElementById('horaTurno').value = "";
        document.getElementById('montoTurno').value = "";
        document.getElementById('tipoRegistro').value = "ingreso";
        document.getElementById('btnBorrar').style.display = "none";
        document.getElementById('modalTurno').style.display = 'flex';
    }

    window.prepararEdicion = (id) => {
        cerrarModalDia();
        const r = registros[id];
        indiceEdicion = id;
        document.getElementById('nombreCliente').value = r.titulo;
        document.getElementById('horaTurno').value = r.hora;
        document.getElementById('montoTurno').value = r.monto;
        document.getElementById('tipoRegistro').value = r.tipo;
        document.getElementById('btnBorrar').style.display = "block";
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
        if(confirm("¿Eliminar?")) {
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
        const ing = regMes.filter(r => r.tipo === 'ingreso').reduce((a, b) => a + b.monto, 0);
        const gas = regMes.filter(r => r.tipo === 'gasto').reduce((a, b) => a + b.monto, 0);
        document.getElementById('totalIngresos').innerText = `$ ${ing.toLocaleString()}`;
        document.getElementById('totalGastos').innerText = `$ ${gas.toLocaleString()}`;
        document.getElementById('totalNeto').innerText = `$ ${(ing - gas).toLocaleString()}`;
    }

    window.prevMonth = () => { mesActual--; if(mesActual<0){mesActual=11; añoActual--;} renderizar(); };
    window.nextMonth = () => { mesActual++; if(mesActual>11){mesActual=0; añoActual++;} renderizar(); };
    window.irAHoy = () => { mesActual = hoyReal.getMonth(); añoActual = hoyReal.getFullYear(); renderizar(); };
    window.abrirConfig = () => { document.getElementById('configNombre').value = config.nombre; document.getElementById('modalConfig').style.display = 'flex'; };
    window.cerrarConfig = () => document.getElementById('modalConfig').style.display = 'none';
    window.guardarConfig = () => {
        const file = document.getElementById('configFoto').files[0];
        config.nombre = document.getElementById('configNombre').value || "PELUQUERÍA ELITE";
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => { config.bannerImg = e.target.result; localStorage.setItem('pelu_config', JSON.stringify(config)); aplicamosConfig(); cerrarConfig(); };
            reader.readAsDataURL(file);
        } else {
            localStorage.setItem('pelu_config', JSON.stringify(config));
            aplicamosConfig(); cerrarConfig();
        }
    };

    iniciar();
});