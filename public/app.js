// Variables globales
let selectedVehicleId = null;
let vehicles = [];

// Elementos del DOM
const vehicleForm = document.getElementById('vehicleForm');
const plateInput = document.getElementById('plate');
const phoneInput = document.getElementById('phone');
const plateSearchInput = document.getElementById('plateSearch');
const vehiclesTableBody = document.getElementById('vehiclesTableBody');
const noVehiclesMessage = document.getElementById('noVehiclesMessage');
const noSearchResultsMessage = document.getElementById('noSearchResultsMessage');
const messageContainer = document.getElementById('messageContainer');
const messageContent = document.getElementById('messageContent');
const statusSectionInstruction = document.getElementById('statusSectionInstruction');
const selectedPlate = document.getElementById('selectedPlate');

const statusButtons = {
    enRevision: document.getElementById('statusEnRevision'),
    esperandoPieza: document.getElementById('statusEsperandoPieza'),
    presupuestoPendiente: document.getElementById('statusPresupuestoPendiente'),
    listo: document.getElementById('statusListo')
};

const STATUS_MAP = {
    EN_REVISION: 'En revisión',
    ESPERANDO_PIEZA: 'Esperando pieza',
    PRESUPUESTO_PENDIENTE: 'Presupuesto pendiente',
    LISTO: 'Listo'
};

const STATUS_BADGE_MAP = {
    EN_REVISION: '🛠 En revisión',
    ESPERANDO_PIEZA: '📦 Esperando pieza',
    PRESUPUESTO_PENDIENTE: '📄 Presupuesto pendiente',
    LISTO: '✅ Listo'
};

const STATUS_CLASSES = {
    EN_REVISION: 'status-en-revision',
    ESPERANDO_PIEZA: 'status-esperando-pieza',
    PRESUPUESTO_PENDIENTE: 'status-presupuesto-pendiente',
    LISTO: 'status-listo'
};

document.addEventListener('DOMContentLoaded', initializeApp);

function initializeApp() {
    setupEventListeners();
    setStatusButtonsEnabled(false);
    updateSelectionState();
    loadVehicles();
}

function setupEventListeners() {
    vehicleForm.addEventListener('submit', handleVehicleSubmit);

    plateInput.addEventListener('input', () => {
        plateInput.value = normalizePlate(plateInput.value);
    });

    phoneInput.addEventListener('blur', () => {
        const normalizedPhone = normalizeSpanishPhone(phoneInput.value);
        if (normalizedPhone.valid) {
            phoneInput.value = normalizedPhone.formatted;
        }
    });

    plateSearchInput.addEventListener('input', () => {
        renderVehiclesTable();
    });

    statusButtons.enRevision.addEventListener('click', () => updateVehicleStatus('EN_REVISION'));
    statusButtons.esperandoPieza.addEventListener('click', () => updateVehicleStatus('ESPERANDO_PIEZA'));
    statusButtons.presupuestoPendiente.addEventListener('click', () => updateVehicleStatus('PRESUPUESTO_PENDIENTE'));
    statusButtons.listo.addEventListener('click', () => updateVehicleStatus('LISTO'));
}

function normalizePlate(plate) {
    return (plate || '').toUpperCase().replace(/\s+/g, '').trim();
}

function normalizeSpanishPhone(phone) {
    const digits = (phone || '').replace(/\D/g, '');
    let normalized = digits;

    if (digits.length === 9) {
        normalized = `34${digits}`;
    }

    if (normalized.length !== 11 || !normalized.startsWith('34')) {
        return { valid: false, formatted: '' };
    }

    const nationalNumber = normalized.slice(2);
    if (!/^[6789]\d{8}$/.test(nationalNumber)) {
        return { valid: false, formatted: '' };
    }

    const formatted = `+34 ${nationalNumber.slice(0, 3)} ${nationalNumber.slice(3, 6)} ${nationalNumber.slice(6)}`;
    return { valid: true, formatted };
}

async function handleVehicleSubmit(event) {
    event.preventDefault();

    const formData = new FormData(vehicleForm);
    const plate = normalizePlate(formData.get('plate'));
    const phoneResult = normalizeSpanishPhone(formData.get('phone'));

    if (!plate || !formData.get('phone')) {
        showMessage('Por favor completa todos los campos.', 'error');
        return;
    }

    if (plate.length < 3 || plate.length > 15) {
        showMessage('La matrícula debe tener entre 3 y 15 caracteres.', 'error');
        return;
    }

    if (!phoneResult.valid) {
        showMessage('El teléfono debe ser válido en España (9 dígitos).', 'error');
        return;
    }

    plateInput.value = plate;
    phoneInput.value = phoneResult.formatted;

    const vehicleData = {
        plate,
        phone: phoneResult.formatted
    };

    try {
        const response = await fetch('/vehicles', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(vehicleData)
        });

        const result = await response.json();

        if (response.ok) {
            showMessage(result.message, 'success');
            vehicleForm.reset();
            await loadVehicles();
            return;
        }

        if (result.error === 'VEHICLE_ALREADY_ACTIVE') {
            showMessage('Ya existe una matrícula activa. Revisa la tabla.', 'error');
            return;
        }

        showMessage(result.message || 'Error al registrar vehículo.', 'error');
    } catch (error) {
        showMessage('Error de conexión. Intenta nuevamente.', 'error');
    }
}

async function loadVehicles() {
    try {
        const response = await fetch('/vehicles?active=true');
        const result = await response.json();

        if (!response.ok) {
            showMessage('Error al cargar vehículos.', 'error');
            return;
        }

        vehicles = (result.data || []).sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at));

        if (selectedVehicleId && !vehicles.some((vehicle) => vehicle.id === selectedVehicleId)) {
            selectedVehicleId = null;
        }

        renderVehiclesTable();
        updateSelectionState();
    } catch (error) {
        showMessage('Error de conexión al cargar vehículos.', 'error');
    }
}

function getFilteredVehicles() {
    const query = normalizePlate(plateSearchInput.value || '');
    if (!query) {
        return vehicles;
    }

    return vehicles.filter((vehicle) => normalizePlate(vehicle.plate).includes(query));
}

function renderVehiclesTable() {
    const filtered = getFilteredVehicles();
    const hasVehicles = vehicles.length > 0;
    const hasFilteredResults = filtered.length > 0;

    noVehiclesMessage.style.display = hasVehicles ? 'none' : 'block';
    noSearchResultsMessage.style.display = hasVehicles && !hasFilteredResults ? 'block' : 'none';

    if (!hasFilteredResults) {
        vehiclesTableBody.innerHTML = '';
        return;
    }

    vehiclesTableBody.innerHTML = filtered.map((vehicle) => `
        <tr data-vehicle-id="${vehicle.id}" class="vehicle-row ${vehicle.id === selectedVehicleId ? 'selected' : ''}" onclick="selectVehicle('${vehicle.id}')">
            <td><strong>${vehicle.plate}</strong></td>
            <td>${vehicle.phone}</td>
            <td>
                <span class="status-badge ${STATUS_CLASSES[vehicle.status]}">
                    ${STATUS_BADGE_MAP[vehicle.status] || vehicle.status}
                </span>
            </td>
            <td>${formatDate(vehicle.updated_at)}</td>
        </tr>
    `).join('');
}

function selectVehicle(vehicleId) {
    selectedVehicleId = vehicleId;
    renderVehiclesTable();
    updateSelectionState();
}

function updateSelectionState() {
    const selectedVehicle = vehicles.find((vehicle) => vehicle.id === selectedVehicleId);

    if (selectedVehicle) {
        selectedPlate.textContent = selectedVehicle.plate;
        statusSectionInstruction.textContent = `Vehículo seleccionado: ${selectedVehicle.plate}`;
        setStatusButtonsEnabled(true);
        return;
    }

    selectedPlate.textContent = 'Ninguno';
    statusSectionInstruction.textContent = 'Selecciona un vehículo para cambiar el estado.';
    setStatusButtonsEnabled(false);
}

function setStatusButtonsEnabled(enabled) {
    Object.values(statusButtons).forEach((button) => {
        button.disabled = !enabled;
    });
}

async function updateVehicleStatus(newStatus) {
    if (!selectedVehicleId) {
        showMessage('Selecciona un vehículo para cambiar el estado.', 'error');
        return;
    }

    const originalHtmlByButton = new Map();

    try {
        Object.values(statusButtons).forEach((button) => {
            originalHtmlByButton.set(button, button.innerHTML);
            button.disabled = true;
        });

        const activeButton = getButtonForStatus(newStatus);
        if (activeButton) {
            activeButton.innerHTML = '<span class="loading"></span> Actualizando...';
        }

        const response = await fetch(`/vehicles/${selectedVehicleId}/status`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                status: newStatus,
                last_event: `Estado cambiado a ${STATUS_MAP[newStatus]}`
            })
        });

        if (response.ok) {
            showMessage('Estado actualizado correctamente.', 'success', 3000);
            await loadVehicles();
        } else {
            showMessage('Error al actualizar. Intenta nuevamente.', 'error', 3000);
        }
    } catch (error) {
        showMessage('Error al actualizar. Intenta nuevamente.', 'error', 3000);
    } finally {
        Object.values(statusButtons).forEach((button) => {
            const originalHtml = originalHtmlByButton.get(button);
            if (originalHtml !== undefined) {
                button.innerHTML = originalHtml;
            }
        });
        updateSelectionState();
    }
}

function getButtonForStatus(status) {
    if (status === 'EN_REVISION') return statusButtons.enRevision;
    if (status === 'ESPERANDO_PIEZA') return statusButtons.esperandoPieza;
    if (status === 'PRESUPUESTO_PENDIENTE') return statusButtons.presupuestoPendiente;
    if (status === 'LISTO') return statusButtons.listo;
    return null;
}

function showMessage(message, type = 'info', duration = 3000) {
    messageContent.textContent = message;
    messageContent.className = `message ${type}`;
    messageContainer.style.display = 'block';
    messageContainer.classList.add('fade-in');

    if (duration > 0) {
        setTimeout(() => {
            messageContainer.style.display = 'none';
            messageContainer.classList.remove('fade-in');
        }, duration);
    }
}

function formatDate(dateString) {
    return new Date(dateString).toLocaleString('es-ES', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

setInterval(() => {
    if (document.visibilityState === 'visible') {
        loadVehicles();
    }
}, 30000);