// Variables globales
let selectedVehicleId = null;
let vehicles = [];

// Elementos del DOM
const vehicleForm = document.getElementById('vehicleForm');
const vehiclesTableBody = document.getElementById('vehiclesTableBody');
const noVehiclesMessage = document.getElementById('noVehiclesMessage');
const messageContainer = document.getElementById('messageContainer');
const messageContent = document.getElementById('messageContent');
const statusButtons = {
    enRevision: document.getElementById('statusEnRevision'),
    esperandoPieza: document.getElementById('statusEsperandoPieza'),
    presupuestoPendiente: document.getElementById('statusPresupuestoPendiente'),
    listo: document.getElementById('statusListo')
};
const selectedVehicleInfo = document.getElementById('selectedVehicleInfo');
const selectedPlate = document.getElementById('selectedPlate');

// Mapeo de estados
const STATUS_MAP = {
    'EN_REVISION': 'En Revisión',
    'ESPERANDO_PIEZA': 'Esperando Pieza',
    'PRESUPUESTO_PENDIENTE': 'Presupuesto Pendiente',
    'LISTO': 'Listo'
};

const STATUS_CLASSES = {
    'EN_REVISION': 'status-en-revision',
    'ESPERANDO_PIEZA': 'status-esperando-pieza',
    'PRESUPUESTO_PENDIENTE': 'status-presupuesto-pendiente',
    'LISTO': 'status-listo'
};

// Inicializar aplicación
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
});

function initializeApp() {
    setupEventListeners();
    loadVehicles();
    
    // Deshabilitar botones de estado inicialmente
    Object.values(statusButtons).forEach(btn => {
        btn.disabled = true;
        btn.dataset.originalText = btn.textContent;
    });
}

function setupEventListeners() {
    // Formulario de registro
    vehicleForm.addEventListener('submit', handleVehicleSubmit);
    
    // Botones de estado
    statusButtons.enRevision.addEventListener('click', () => updateVehicleStatus('EN_REVISION'));
    statusButtons.esperandoPieza.addEventListener('click', () => updateVehicleStatus('ESPERANDO_PIEZA'));
    statusButtons.presupuestoPendiente.addEventListener('click', () => updateVehicleStatus('PRESUPUESTO_PENDIENTE'));
    statusButtons.listo.addEventListener('click', () => updateVehicleStatus('LISTO'));
}

// Manejar envío del formulario
async function handleVehicleSubmit(event) {
    event.preventDefault();
    
    const formData = new FormData(vehicleForm);
    let plate = formData.get('plate').trim();
    const phone = formData.get('phone').trim();
    
    // Normalización automática de matrícula
    plate = plate.toUpperCase().replace(/\s+/g, '');
    
    // Validación básica mejorada
    if (!plate || !phone) {
        showMessage('Por favor completa todos los campos', 'error');
        return;
    }
    
    if (plate.length < 3 || plate.length > 15) {
        showMessage('La matrícula debe tener entre 3 y 15 caracteres', 'error');
        return;
    }
    
    // Mostrar en el campo la versión normalizada
    document.getElementById('plate').value = plate;
    
    const vehicleData = { plate, phone };
    
    try {
        const response = await fetch('/vehicles', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(vehicleData)
        });
        
        const result = await response.json();
        
        if (response.ok) {
            showMessage(result.message, 'success');
            vehicleForm.reset();
            loadVehicles(); // Recargar tabla
        } else {
            // Manejar diferentes tipos de error
            if (result.error === 'VEHICLE_ALREADY_ACTIVE') {
                showMessage(`Ya existe un vehículo activo con la matrícula ${plate}. Verifica la tabla de vehículos.`, 'error', 6000);
            } else {
                showMessage(result.message || 'Error al registrar vehículo', 'error');
            }
        }
        
    } catch (error) {
        console.error('Error:', error);
        showMessage('Error de conexión. Intenta nuevamente.', 'error');
    }
}

// Cargar vehículos
async function loadVehicles() {
    try {
        const response = await fetch('/vehicles?active=true');
        const result = await response.json();
        
        if (response.ok) {
            vehicles = result.data;
            renderVehiclesTable();
        } else {
            showMessage('Error al cargar vehículos', 'error');
        }
        
    } catch (error) {
        console.error('Error:', error);
        showMessage('Error de conexión al cargar vehículos', 'error');
    }
}

// Renderizar tabla de vehículos
function renderVehiclesTable() {
    if (vehicles.length === 0) {
        vehiclesTableBody.innerHTML = '';
        noVehiclesMessage.style.display = 'block';
        return;
    }
    
    noVehiclesMessage.style.display = 'none';
    
    vehiclesTableBody.innerHTML = vehicles.map(vehicle => `
        <tr data-vehicle-id="${vehicle.id}" onclick="selectVehicle('${vehicle.id}')" class="vehicle-row">
            <td><strong>${vehicle.plate}</strong></td>
            <td>${vehicle.phone}</td>
            <td>
                <span class="status-badge ${STATUS_CLASSES[vehicle.status]}">
                    ${STATUS_MAP[vehicle.status]}
                </span>
            </td>
            <td>${formatDate(vehicle.updated_at)}</td>
            <td>
                <button class="btn btn-primary" onclick="event.stopPropagation(); selectVehicle('${vehicle.id}')">
                    Seleccionar
                </button>
            </td>
        </tr>
    `).join('');
}

// Seleccionar vehículo
function selectVehicle(vehicleId) {
    selectedVehicleId = vehicleId;
    const vehicle = vehicles.find(v => v.id === vehicleId);
    
    if (!vehicle) return;
    
    // Actualizar UI
    document.querySelectorAll('.vehicle-row').forEach(row => {
        row.classList.remove('selected');
    });
    
    const selectedRow = document.querySelector(`[data-vehicle-id="${vehicleId}"]`);
    if (selectedRow) {
        selectedRow.classList.add('selected');
    }
    
    // Habilitar botones de estado
    Object.values(statusButtons).forEach(btn => {
        btn.disabled = false;
    });
    
    // Mostrar información del vehículo seleccionado
    selectedPlate.textContent = vehicle.plate;
    selectedVehicleInfo.style.display = 'block';
    
    showMessage(`Vehículo ${vehicle.plate} seleccionado. Puedes cambiar su estado usando los botones.`, 'info');
}

// Actualizar estado del vehículo
async function updateVehicleStatus(newStatus) {
    if (!selectedVehicleId) {
        showMessage('Selecciona un vehículo primero', 'error');
        return;
    }
    
    try {
        // Deshabilitar todos los botones temporalmente
        Object.values(statusButtons).forEach(btn => {
            btn.disabled = true;
        });
        
        // Encontrar y actualizar el botón activo
        const activeButton = Object.values(statusButtons).find(btn => 
            btn.textContent.replace(/\s+/g, '_').toUpperCase() === newStatus
        );
        
        if (activeButton) {
            activeButton.innerHTML = '<span class="loading"></span> Actualizando...';
        }
        
        const response = await fetch(`/vehicles/${selectedVehicleId}/status`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                status: newStatus,
                last_event: `Estado cambiado a ${STATUS_MAP[newStatus]}`
            })
        });
        
        const result = await response.json();
        
        if (response.ok) {
            // Mostrar mensaje de éxito que desaparece automáticamente
            showMessage('Estado actualizado correctamente', 'success', 3000);
            loadVehicles(); // Recargar tabla
            
            // Mantener selección después de actualizar
            setTimeout(() => {
                const updatedRow = document.querySelector(`[data-vehicle-id="${selectedVehicleId}"]`);
                if (updatedRow) {
                    updatedRow.classList.add('selected');
                }
            }, 100);
            
        } else {
            showMessage('Error al actualizar. Intenta nuevamente.', 'error');
        }
        
    } catch (error) {
        console.error('Error:', error);
        showMessage('Error de conexión al actualizar estado', 'error');
    } finally {
        // Restaurar botones
        setTimeout(() => {
            Object.values(statusButtons).forEach(btn => {
                btn.disabled = selectedVehicleId === null;
                const originalText = btn.dataset.originalText || btn.textContent;
                btn.innerHTML = originalText;
            });
        }, 500);
    }
}

// Mostrar mensaje
function showMessage(message, type = 'info', duration = 5000) {
    messageContent.textContent = message;
    messageContent.className = `message ${type}`;
    messageContainer.style.display = 'block';
    messageContainer.classList.add('fade-in');
    
    // Auto-ocultar después del tiempo especificado
    if (duration > 0) {
        setTimeout(() => {
            messageContainer.style.display = 'none';
            messageContainer.classList.remove('fade-in');
        }, duration);
    }
}

// Formatear fecha
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleString('es-ES', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
    });
}

// Guardar texto original de botones
document.addEventListener('DOMContentLoaded', function() {
    Object.values(statusButtons).forEach(btn => {
        btn.dataset.originalText = btn.textContent;
    });
});

// Actualizar automáticamente cada 30 segundos
setInterval(() => {
    if (document.visibilityState === 'visible') {
        loadVehicles();
    }
}, 30000);

// Funciones auxiliares para debugging (solo en desarrollo)
if (window.location.hostname === 'localhost') {
    window.debugApp = {
        vehicles,
        selectedVehicleId,
        loadVehicles,
        selectVehicle,
        updateVehicleStatus
    };
}