// Variables globales
let selectedVehicleId = null;
let vehicles = [];
let currentWorkshop = null;
let authToken = localStorage.getItem('panelToken') || '';

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

async function initializeApp() {
    const authenticated = await ensureAuthenticated();
    if (!authenticated) {
        showMessage('No se pudo autenticar el panel. Recarga la página e intenta de nuevo.', 'error', 7000);
        return;
    }

    setupEventListeners();
    setStatusButtonsEnabled(false);
    updateSelectionState();
    await loadWorkshopInfo();
    await loadVehicles();
}

async function ensureAuthenticated() {
    if (authToken) {
        const valid = await validateToken(authToken);
        if (valid) return true;
    }

    const username = window.prompt('Usuario del panel (owner/mecanico):');
    const password = window.prompt('Contraseña del panel:');

    if (!username || !password) {
        return false;
    }

    try {
        const response = await fetch('/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });
        const result = await response.json();
        if (!response.ok || !result.token) {
            showMessage(result.message || 'Credenciales inválidas.', 'error', 5000);
            return false;
        }

        authToken = result.token;
        localStorage.setItem('panelToken', authToken);
        return true;
    } catch (error) {
        return false;
    }
}

async function validateToken(token) {
    try {
        const response = await fetch('/auth/me', {
            headers: {
                Authorization: `Bearer ${token}`
            }
        });
        return response.ok;
    } catch (error) {
        return false;
    }
}

function getAuthHeaders(extraHeaders = {}) {
    const headers = { ...extraHeaders };
    if (authToken) {
        headers.Authorization = `Bearer ${authToken}`;
    }
    return headers;
}

async function apiFetch(url, options = {}) {
    const opts = { ...options };
    opts.headers = getAuthHeaders(options.headers || {});

    const response = await fetch(url, opts);

    if (response.status === 401) {
        localStorage.removeItem('panelToken');
        authToken = '';
        throw new Error('UNAUTHORIZED');
    }

    return response;
}

async function loadWorkshopInfo() {
    try {
        const res = await apiFetch('/workshops');
        const result = await res.json();
        if (result.success && result.data && result.data.length > 0) {
            currentWorkshop = result.data[0];
            const label = document.getElementById('workshopLabel');
            if (label) {
                label.textContent = `🏭 ${currentWorkshop.name}`;
            }
        }
    } catch (e) {
        if (e && e.message === 'UNAUTHORIZED') {
            showMessage('Sesión expirada. Recarga para volver a iniciar sesión.', 'error', 6000);
        }
    }
}

function setupEventListeners() {
    vehicleForm.addEventListener('submit', handleVehicleSubmit);

    plateInput.addEventListener('input', () => {
        plateInput.value = normalizePlate(plateInput.value);
    });

    phoneInput.addEventListener('input', () => {
        phoneInput.value = formatSpanishPhoneInput(phoneInput.value);
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

function handleApiError(error, fallbackMessage) {
    if (error && error.message === 'UNAUTHORIZED') {
        showMessage('Sesión expirada. Recarga para volver a iniciar sesión.', 'error', 6000);
        return;
    }
    showMessage(fallbackMessage, 'error');
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

function formatSpanishPhoneInput(rawValue) {
    const digits = (rawValue || '').replace(/\D/g, '');
    if (!digits) return '';

    let nationalDigits = digits;
    if (digits.startsWith('34')) {
        nationalDigits = digits.slice(2);
    }

    nationalDigits = nationalDigits.slice(0, 9);

    const part1 = nationalDigits.slice(0, 3);
    const part2 = nationalDigits.slice(3, 6);
    const part3 = nationalDigits.slice(6, 9);

    let formatted = '+34';
    if (part1) formatted += ` ${part1}`;
    if (part2) formatted += ` ${part2}`;
    if (part3) formatted += ` ${part3}`;

    return formatted;
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
        const response = await apiFetch('/vehicles', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(vehicleData)
        });

        const result = await response.json();

        if (response.ok) {
            let msg = result.message;
            if (currentWorkshop && currentWorkshop.slug) {
                const trackUrl = `${window.location.origin}/${currentWorkshop.slug}/status/${plate}`;
                msg += `\n\n🔗 URL de seguimiento: ${trackUrl}`;
            }
            showMessage(msg, 'success', 6000);
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
        handleApiError(error, 'Error de conexión. Intenta nuevamente.');
    }
}

async function loadVehicles() {
    try {
        const response = await apiFetch('/vehicles?active=true');
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
        handleApiError(error, 'Error de conexión al cargar vehículos.');
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

    vehiclesTableBody.innerHTML = filtered.map((vehicle) => {
        const trackUrl = currentWorkshop && currentWorkshop.slug
            ? `${window.location.origin}/${currentWorkshop.slug}/status/${vehicle.plate}`
            : '';
        return `
        <tr data-vehicle-id="${vehicle.id}" class="vehicle-row ${vehicle.id === selectedVehicleId ? 'selected' : ''}" onclick="selectVehicle('${vehicle.id}')">
            <td><strong>${vehicle.plate}</strong></td>
            <td>${vehicle.phone}</td>
            <td>
                <span class="status-badge ${STATUS_CLASSES[vehicle.status]}">
                    ${STATUS_BADGE_MAP[vehicle.status] || vehicle.status}
                </span>
            </td>
            <td>${formatDate(vehicle.updated_at)}</td>
            <td class="actions-cell" onclick="event.stopPropagation()">
                <button class="btn-action btn-edit" onclick="openEditModal('${vehicle.id}')" title="Editar datos">✏️</button>
                ${trackUrl ? `<button class="btn-action btn-track btn-status" onclick="openTracking('${trackUrl}')" title="Ir a status del cliente">Status</button>` : ''}
            </td>
        </tr>
    `}).join('');
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

        const response = await apiFetch(`/vehicles/${selectedVehicleId}/status`, {
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
        if (error && error.message === 'UNAUTHORIZED') {
            showMessage('Sesión expirada. Recarga para volver a iniciar sesión.', 'error', 6000);
        } else {
            showMessage('Error al actualizar. Intenta nuevamente.', 'error', 3000);
        }
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

// ====== EDICIÓN DE VEHÍCULO ======

function openEditModal(vehicleId) {
    const vehicle = vehicles.find(v => v.id === vehicleId);
    if (!vehicle) return;

    document.getElementById('editVehicleId').value = vehicle.id;
    document.getElementById('editPlate').value = vehicle.plate;
    document.getElementById('editPhone').value = vehicle.phone;
    document.getElementById('editModal').style.display = 'flex';
}

function closeEditModal() {
    document.getElementById('editModal').style.display = 'none';
}

// Cerrar modal al hacer click fuera
document.addEventListener('click', (e) => {
    if (e.target.id === 'editModal') closeEditModal();
});

// Cerrar modal con Escape
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeEditModal();
});

// Submit del formulario de edición
document.getElementById('editForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    const vehicleId = document.getElementById('editVehicleId').value;
    const plate = normalizePlate(document.getElementById('editPlate').value);
    const rawPhone = document.getElementById('editPhone').value;
    const phoneResult = normalizeSpanishPhone(rawPhone);

    if (!plate && !rawPhone) {
        showMessage('Debes completar al menos un campo.', 'error');
        return;
    }

    if (plate && (plate.length < 3 || plate.length > 15)) {
        showMessage('La matrícula debe tener entre 3 y 15 caracteres.', 'error');
        return;
    }

    if (rawPhone && !phoneResult.valid) {
        showMessage('El teléfono debe ser válido en España (9 dígitos).', 'error');
        return;
    }

    const body = {};
    if (plate) body.plate = plate;
    if (rawPhone && phoneResult.valid) body.phone = phoneResult.formatted;

    try {
        const response = await apiFetch(`/vehicles/${vehicleId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });

        const result = await response.json();

        if (response.ok) {
            closeEditModal();
            showMessage('Datos actualizados correctamente.', 'success', 3000);
            await loadVehicles();
        } else {
            showMessage(result.message || 'Error al guardar cambios.', 'error');
        }
    } catch (error) {
        handleApiError(error, 'Error de conexión. Intenta nuevamente.');
    }
});

// Formateo en tiempo real en el modal de edición
document.getElementById('editPlate').addEventListener('input', (e) => {
    e.target.value = normalizePlate(e.target.value);
});

document.getElementById('editPhone').addEventListener('input', (e) => {
    e.target.value = formatSpanishPhoneInput(e.target.value);
});

// ====== SEGUIMIENTO PÚBLICO ======

function openTracking(url) {
    window.open(url, '_blank');
}

setInterval(() => {
    if (document.visibilityState === 'visible') {
        loadVehicles();
    }
}, 30000);