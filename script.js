document.addEventListener('DOMContentLoaded', () => {
    let hoyReal = new Date();
    let mesActual = hoyReal.getMonth();
    let añoActual = hoyReal.getFullYear();
    let fechaSeleccionada = "";
    let indiceEdicion = -1;

    const SUPABASE_URL = 'https://neyvklveqledlurvpcmr.supabase.co';
    const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5leXZrbHZlcWxlZGx1cnZwY21yIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM1MzQ3NjYsImV4cCI6MjA4OTExMDc2Nn0.JVlEPagEGj-Tz7jY5OvrozXvjXA41CPkb0wxgJVrWRE';
    const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

    let registros = JSON.parse(localStorage.getItem('pelu_datos_v6')) || [];

    const contenedor = document.getElementById('calendar');
    const displayMes = document.getElementById('monthYear');

    async function sincronizarDesdeNube() {
        try {
            const { data, error } = await supabaseClient.from('turnos').select('*').eq('barberia_id', 'barberia_41545');
            if (!error && data) {
                const registrosNube = data.map(t => ({
                    fecha: t.fecha, titulo: t.titulo, hora: t.hora, monto: t.monto || 0, tipo: 'ingreso', esNube: true
                }));
                const localesLimpios = registros.filter(r => !r.esNube);
                registros = [...localesLimpios, ...registrosNube];
                renderizar();
            }
        } catch (err) { console.error(err); }
    }

    window.renderizar = () => {
        contenedor.innerHTML = '';
        const meses = ["ENERO", "FEBRERO", "MARZO", "ABRIL", "MAYO", "JUNIO", "JULIO", "AGOSTO", "SEPTIEMBRE", "OCTUBRE", "NOVIEMBRE", "DICIEMBRE"];
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
            const fKey = `${añoActual}-${String(mesActual + 1).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
            const regDia = registros.filter(r => r.fecha === fKey);
            
            const diaDiv = document.createElement('div');
            diaDiv.className = 'day';
            if(dia === hoyReal.getDate() && mesActual === hoyReal.getMonth() && añoActual === hoyReal.getFullYear()) diaDiv.classList.add('today');

            diaDiv.innerHTML = `<span class="day-number">${dia}</span>`;
            const list = document.createElement('div');
            
            regDia.slice(0, 3).forEach(r => {
                const dot = document.createElement('div');
                dot.className = `event ${r.tipo === 'gasto' ? 'danger' : 'morning'}`;
                list.appendChild(dot);
            });

            diaDiv.appendChild(list);
            diaDiv.onclick = () => window.abrirModalDia(fKey);
            contenedor.appendChild(diaDiv);
        }
        actualizarEconomia();
    };

    window.abrirModalDia = (fecha) => {
        fechaSeleccionada = fecha;
        const regDia = registros.filter(r => r.fecha === fecha);
        document.getElementById('fechaDiaTitulo').innerText = fecha.split('-').reverse().join('/');
        const lista = document.getElementById('listaTurnosDia');
        lista.innerHTML = regDia.length ? '' : '<p style="text-align:center; opacity:0.3; padding:20px;">Sin registros</p>';
        
        regDia.forEach((r, idx) => {
            const item = document.createElement('div');
            item.className = 'lista-dia-item';
            item.innerHTML = `<div><small>${r.hora}</small><br><b>${r.esNube ? '🤖' : '✂️'} ${r.titulo}</b></div><span>$${r.monto}</span>`;
            if(!r.esNube) item.onclick = (e) => { e.stopPropagation(); prepararEdicion(registros.indexOf(r)); };
            lista.appendChild(item);
        });
        document.getElementById('modalDia').style.display = 'flex';
    };

    window.abrirFormularioNuevo = () => {
        window.cerrarModalDia();
        indiceEdicion = -1;
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
        localStorage.setItem('pelu_datos_v6', JSON.stringify(registros.filter(r => !r.esNube)));
        window.cerrarModal();
        renderizar();
    };

    function actualizarEconomia() {
        const mesStr = `${añoActual}-${String(mesActual+1).padStart(2,'0')}`;
        const regMes = registros.filter(r => r.fecha.startsWith(mesStr));
        const ing = regMes.filter(r => r.tipo === 'ingreso').reduce((a, b) => a + Number(b.monto), 0);
        const gas = regMes.filter(r => r.tipo === 'gasto').reduce((a, b) => a + Number(b.monto), 0);
        document.getElementById('totalIngresos').innerText = `$${ing}`;
        document.getElementById('totalGastos').innerText = `$${gas}`;
        document.getElementById('totalNeto').innerText = `$${ing - gas}`;
    }

    document.getElementById('prevMonth').onclick = () => { mesActual--; if(mesActual<0){mesActual=11; añoActual--;} renderizar(); };
    document.getElementById('nextMonth').onclick = () => { mesActual++; if(mesActual>11){mesActual=0; añoActual++;} renderizar(); };
    window.cerrarModalDia = () => document.getElementById('modalDia').style.display = 'none';
    window.cerrarModal = () => document.getElementById('modalTurno').style.display = 'none';
    window.irAHoy = () => { mesActual = hoyReal.getMonth(); añoActual = hoyReal.getFullYear(); renderizar(); };
    
    renderizar();
    sincronizarDesdeNube();
});