// Variables globales
let selectedVehicleId = null;
let vehicles = [];
let currentWorkshop = null;
let authToken = localStorage.getItem('panelToken') || '';
let currentUser = null;
let selectedWorkshopSlug = localStorage.getItem('selectedWorkshopSlug') || '';
let availableWorkshops = [];
let panelInitialized = false;
let workshopUsers = [];

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
const workshopSelect = document.getElementById('workshopSelect');
const workshopSwitch = document.getElementById('workshopSwitch');
const waitingPiecePanel = document.getElementById('waitingPiecePanel');
const repairSystemButtons = document.getElementById('repairSystemButtons');
const repairPartButtons = document.getElementById('repairPartButtons');
const repairNoteInput = document.getElementById('repairNoteInput');
const applyEsperandoPiezaBtn = document.getElementById('applyEsperandoPiezaBtn');
let selectedRepairSystem = '';
let selectedRepairPart = '';

const statusButtons = {
    esperandoRevision: document.getElementById('statusEsperandoRevision'),
    enRevision: document.getElementById('statusEnRevision'),
    montandoPieza: document.getElementById('statusMontandoPieza'),
    esperandoPieza: document.getElementById('statusEsperandoPieza'),
    presupuestoPendiente: document.getElementById('statusPresupuestoPendiente'),
    listo: document.getElementById('statusListo')
};

const STATUS_MAP = {
    ESPERANDO_REVISION: 'Esperando revisión',
    EN_REVISION: 'En revisión',
    MONTANDO_PIEZA: 'Montando pieza',
    ESPERANDO_PIEZA: 'Esperando pieza',
    PRESUPUESTO_PENDIENTE: 'Presupuesto pendiente',
    LISTO: 'Listo'
};

const STATUS_BADGE_MAP = {
    ESPERANDO_REVISION: '🕒 Esperando revisión',
    EN_REVISION: '🛠 En revisión',
    MONTANDO_PIEZA: '🔩 Montando pieza',
    ESPERANDO_PIEZA: '📦 Esperando pieza',
    PRESUPUESTO_PENDIENTE: '📄 Presupuesto pendiente',
    LISTO: '✅ Listo'
};

const STATUS_CLASSES = {
    ESPERANDO_REVISION: 'status-esperando-revision',
    EN_REVISION: 'status-en-revision',
    MONTANDO_PIEZA: 'status-montando-pieza',
    ESPERANDO_PIEZA: 'status-esperando-pieza',
    PRESUPUESTO_PENDIENTE: 'status-presupuesto-pendiente',
    LISTO: 'status-listo'
};

const REPAIR_SYSTEMS = {
    Refrigeracion: ['Radiador', 'Termostato', 'Bomba de agua', 'Manguitos', 'Electroventilador'],
    Motor: ['Correa distribución', 'Bujías', 'Bobinas', 'Junta tapa balancines', 'Inyectores'],
    Frenos: ['Pastillas de freno', 'Discos de freno', 'Pinza', 'Latiguillo', 'Bomba de freno'],
    Suspension: ['Amortiguador', 'Muelle', 'Copela', 'Brazo suspensión', 'Silentblock'],
    Direccion: ['Cremallera', 'Rótula dirección', 'Bomba dirección', 'Columna dirección'],
    Electricidad: ['Batería', 'Alternador', 'Motor de arranque', 'Fusible', 'Módulo de control'],
    Transmision: ['Embrague', 'Volante motor', 'Palier', 'Caja cambios'],
    Climatizacion: ['Compresor A/C', 'Condensador', 'Evaporador', 'Filtro habitáculo']
};

document.addEventListener('DOMContentLoaded', initializeApp);

async function initializeApp() {
    // Si hay token guardado, intentar validarlo
    if (authToken) {
        const valid = await validateToken(authToken);
        if (valid) {
            showPanel();
            return;
        }
    }
    // Mostrar pantalla de login
    showLogin();
}

function showLogin() {
    document.getElementById('loginScreen').style.display = 'flex';
    document.getElementById('panelScreen').style.display = 'none';
    document.getElementById('loginUser').focus();
}

function showPanel() {
    document.getElementById('loginScreen').style.display = 'none';
    document.getElementById('panelScreen').style.display = 'block';

    if (!panelInitialized) {
        setupEventListeners();
        setStatusButtonsEnabled(false);
        updateSelectionState();
        panelInitialized = true;
    }

    const isOwner = currentUser?.role === 'owner';
    const manageWorkshopsBtn = document.getElementById('manageWorkshopsBtn');
    const manageUsersBtn = document.getElementById('manageUsersBtn');
    if (manageWorkshopsBtn) {
        manageWorkshopsBtn.style.display = isOwner ? 'inline-flex' : 'none';
    }
    if (manageUsersBtn) {
        manageUsersBtn.style.display = isOwner ? 'inline-flex' : 'none';
    }

    loadWorkshopInfo().then(async () => {
        await loadVehicles();
        if (isOwner) {
            await loadWorkshopUsers();
        }
        initializeRepairSelectors();
    });
}

function setupLoginForm() {
    const loginForm = document.getElementById('loginForm');
    const loginError = document.getElementById('loginError');

    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        loginError.style.display = 'none';

        const username = document.getElementById('loginUser').value.trim();
        const password = document.getElementById('loginPass').value;

        if (!username || !password) {
            loginError.textContent = 'Completa usuario y contraseña.';
            loginError.style.display = 'block';
            return;
        }

        const btn = document.getElementById('loginBtn');
        btn.disabled = true;
        btn.textContent = 'Entrando...';

        try {
            const response = await fetch('/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });
            const result = await response.json();

            if (!response.ok || !result.token) {
                loginError.textContent = result.message || 'Credenciales inválidas.';
                loginError.style.display = 'block';
                btn.disabled = false;
                btn.textContent = 'Entrar';
                return;
            }

            authToken = result.token;
            localStorage.setItem('panelToken', authToken);

            const tokenOk = await validateToken(authToken);
            if (!tokenOk) {
                loginError.textContent = 'Error validando sesión. Intenta de nuevo.';
                loginError.style.display = 'block';
                btn.disabled = false;
                btn.textContent = 'Entrar';
                return;
            }

            if (currentUser && currentUser.workshopSlug && currentUser.role === 'mechanic') {
                selectedWorkshopSlug = currentUser.workshopSlug;
                localStorage.setItem('selectedWorkshopSlug', selectedWorkshopSlug);
            }

            showPanel();
        } catch (error) {
            loginError.textContent = 'Error de conexión. Intenta de nuevo.';
            loginError.style.display = 'block';
        } finally {
            btn.disabled = false;
            btn.textContent = 'Entrar';
        }
    });
}

function logout() {
    authToken = '';
    currentUser = null;
    localStorage.removeItem('panelToken');
    localStorage.removeItem('selectedWorkshopSlug');
    selectedWorkshopSlug = '';
    selectedVehicleId = null;
    vehicles = [];
    showLogin();
}

// Iniciar formulario de login inmediatamente
setupLoginForm();
document.getElementById('logoutBtn').addEventListener('click', logout);

async function validateToken(token) {
    try {
        const response = await fetch('/auth/me', {
            headers: {
                Authorization: `Bearer ${token}`
            }
        });
        if (!response.ok) return false;
        const result = await response.json();
        currentUser = result.user || null;
        if (currentUser && currentUser.workshopSlug && currentUser.role === 'mechanic') {
            selectedWorkshopSlug = currentUser.workshopSlug;
            localStorage.setItem('selectedWorkshopSlug', selectedWorkshopSlug);
        }
        return true;
    } catch (error) {
        return false;
    }
}

function getAuthHeaders(extraHeaders = {}) {
    const headers = { ...extraHeaders };
    if (authToken) {
        headers.Authorization = `Bearer ${authToken}`;
    }
    if (selectedWorkshopSlug) {
        headers['x-workshop-slug'] = selectedWorkshopSlug;
    }
    return headers;
}

async function apiFetch(url, options = {}) {
    const opts = { ...options };
    opts.headers = getAuthHeaders(options.headers || {});

    const response = await fetch(url, opts);

    if (response.status === 401) {
        logout();
        return response;
    }

    return response;
}

async function loadWorkshopInfo() {
    try {
        const res = await apiFetch('/workshops');
        const result = await res.json();
        if (result.success && result.data && result.data.length > 0) {
            const workshops = result.data;
            availableWorkshops = workshops;

            if (currentUser && currentUser.role === 'mechanic') {
                if (!selectedWorkshopSlug) {
                    selectedWorkshopSlug = currentUser.workshopSlug || workshops[0].slug;
                }
                workshopSwitch.style.display = 'none';
            } else {
                workshopSwitch.style.display = 'flex';
                workshopSelect.innerHTML = workshops.map((workshop) => (
                    `<option value="${workshop.slug}">${workshop.name}</option>`
                )).join('');

                if (!selectedWorkshopSlug || !workshops.some((workshop) => workshop.slug === selectedWorkshopSlug)) {
                    selectedWorkshopSlug = workshops[0].slug;
                }

                workshopSelect.value = selectedWorkshopSlug;
            }

            localStorage.setItem('selectedWorkshopSlug', selectedWorkshopSlug);
            currentWorkshop = workshops.find((workshop) => workshop.slug === selectedWorkshopSlug) || workshops[0];
            selectedWorkshopSlug = currentWorkshop.slug;
            localStorage.setItem('selectedWorkshopSlug', selectedWorkshopSlug);

            const label = document.getElementById('workshopLabel');
            if (label && currentWorkshop) {
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

    statusButtons.esperandoRevision.addEventListener('click', () => updateVehicleStatus('ESPERANDO_REVISION'));
    statusButtons.enRevision.addEventListener('click', () => updateVehicleStatus('EN_REVISION'));
    statusButtons.montandoPieza.addEventListener('click', () => updateVehicleStatus('MONTANDO_PIEZA'));
    statusButtons.esperandoPieza.addEventListener('click', openEsperandoPiezaPanel);
    statusButtons.presupuestoPendiente.addEventListener('click', () => updateVehicleStatus('PRESUPUESTO_PENDIENTE'));
    statusButtons.listo.addEventListener('click', () => updateVehicleStatus('LISTO'));

    if (applyEsperandoPiezaBtn) {
        applyEsperandoPiezaBtn.addEventListener('click', applyEsperandoPiezaWithCatalog);
    }

    if (workshopSelect) {
        workshopSelect.addEventListener('change', async () => {
            selectedWorkshopSlug = workshopSelect.value;
            localStorage.setItem('selectedWorkshopSlug', selectedWorkshopSlug);
            selectedVehicleId = null;
            await loadWorkshopInfo();
            await loadVehicles();
            if (currentUser?.role === 'owner') {
                await loadWorkshopUsers();
                renderUsersList();
            }
        });
    }

    // Event delegation para clicks en la tabla de vehículos
    vehiclesTableBody.addEventListener('click', (e) => {
        // Click en botón editar
        const editBtn = e.target.closest('[data-edit-id]');
        if (editBtn) {
            e.stopPropagation();
            openEditModal(editBtn.dataset.editId);
            return;
        }

        // Click en botón tracking/status — reutiliza una sola pestaña
        const trackBtn = e.target.closest('[data-track-url]');
        if (trackBtn) {
            e.stopPropagation();
            window.open(trackBtn.dataset.trackUrl, 'lance-tracking');
            return;
        }

        // Click en fila para seleccionar vehículo
        const row = e.target.closest('[data-vehicle-id]');
        if (row) {
            selectVehicle(row.dataset.vehicleId);
        }
    });
}

function initializeRepairSelectors() {
    if (!repairSystemButtons || !repairPartButtons) return;
    renderRepairSystemsAsButtons();
}

function renderRepairPartsForSelectedSystem() {
    if (!repairPartButtons || !selectedRepairSystem) {
        if (repairPartButtons) repairPartButtons.innerHTML = '';
        selectedRepairPart = '';
        return;
    }

    const parts = REPAIR_SYSTEMS[selectedRepairSystem] || [];
    if (!parts.length) {
        repairPartButtons.innerHTML = '<span class="option-empty">Sin piezas para este sistema</span>';
        selectedRepairPart = '';
        return;
    }

    if (!parts.includes(selectedRepairPart)) {
        selectedRepairPart = parts[0];
    }

    repairPartButtons.innerHTML = parts.map((partName) => `
        <button type="button" class="option-chip ${partName === selectedRepairPart ? 'selected' : ''}" data-part-name="${partName}">${partName}</button>
    `).join('');

    repairPartButtons.querySelectorAll('[data-part-name]').forEach((button) => {
        button.addEventListener('click', () => {
            selectedRepairPart = button.getAttribute('data-part-name') || '';
            renderRepairPartsForSelectedSystem();
        });
    });
}

function renderRepairSystemsAsButtons() {
    const systems = Object.keys(REPAIR_SYSTEMS);
    if (!systems.length) {
        repairSystemButtons.innerHTML = '<span class="option-empty">Sin sistemas configurados</span>';
        return;
    }

    if (!selectedRepairSystem || !REPAIR_SYSTEMS[selectedRepairSystem]) {
        selectedRepairSystem = systems[0];
    }

    repairSystemButtons.innerHTML = systems.map((systemName) => `
        <button type="button" class="option-chip ${systemName === selectedRepairSystem ? 'selected' : ''}" data-system-name="${systemName}">${systemName}</button>
    `).join('');

    repairSystemButtons.querySelectorAll('[data-system-name]').forEach((button) => {
        button.addEventListener('click', () => {
            selectedRepairSystem = button.getAttribute('data-system-name') || '';
            selectedRepairPart = '';
            renderRepairSystemsAsButtons();
            renderRepairPartsForSelectedSystem();
        });
    });

    renderRepairPartsForSelectedSystem();
}

function openEsperandoPiezaPanel() {
    if (!selectedVehicleId) {
        showMessage('Selecciona un vehículo para cambiar el estado.', 'error');
        return;
    }
    initializeRepairSelectors();
    if (repairNoteInput) repairNoteInput.value = '';
    waitingPiecePanel.style.display = 'block';
}

async function applyEsperandoPiezaWithCatalog() {
    const systemName = selectedRepairSystem || '';
    const partName = selectedRepairPart || '';
    const note = (repairNoteInput?.value || '').trim();

    if (!systemName || !partName) {
        showMessage('Selecciona sistema y pieza para marcar Esperando Pieza.', 'error');
        return;
    }

    const catalogNote = note
        ? `Esperando pieza · Sistema: ${systemName} · Pieza: ${partName} · Nota: ${note}`
        : `Esperando pieza · Sistema: ${systemName} · Pieza: ${partName}`;

    await updateVehicleStatus('ESPERANDO_PIEZA', catalogNote);
    waitingPiecePanel.style.display = 'none';
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
        if (!selectedWorkshopSlug) {
            vehicles = [];
            renderVehiclesTable();
            updateSelectionState();
            return;
        }

        const response = await apiFetch('/vehicles?active=true');
        const result = await response.json();

        if (!response.ok) {
            showMessage('Error al cargar vehículos.', 'error');
            return;
        }

        vehicles = (result.data || []).sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at));

        if (vehicles.length === 0 && currentUser && currentUser.role === 'owner' && availableWorkshops.length > 1) {
            noVehiclesMessage.innerHTML = `<p>No hay vehículos en <strong>${currentWorkshop?.name || 'este taller'}</strong>. Cambia el "Taller activo" arriba.</p>`;
        } else {
            noVehiclesMessage.innerHTML = '<p>No hay vehículos registrados</p>';
        }

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
        const createdBy = vehicle.created_by_name || vehicle.created_by_username || '—';
        const lastStatusBy = vehicle.last_status_by_name || vehicle.last_status_by_username || '—';
        return `
        <tr data-vehicle-id="${vehicle.id}" class="vehicle-row ${vehicle.id === selectedVehicleId ? 'selected' : ''}">
            <td><strong>${vehicle.plate}</strong></td>
            <td>${vehicle.phone}</td>
            <td>${createdBy}</td>
            <td>
                <span class="status-badge ${STATUS_CLASSES[vehicle.status]}">
                    ${STATUS_BADGE_MAP[vehicle.status] || vehicle.status}
                </span>
            </td>
            <td>${lastStatusBy}</td>
            <td>${formatDate(vehicle.updated_at)}</td>
            <td>
                <div class="actions-cell">
                    <button class="btn-action btn-edit" data-edit-id="${vehicle.id}" title="Editar datos">✏️</button>
                    ${trackUrl ? `<button class="btn-action btn-track btn-track-link" data-track-url="${trackUrl}" title="Ir a status del cliente">Status</button>` : ''}
                </div>
            </td>
        </tr>
    `}).join('');
}

function selectVehicle(vehicleId) {
    selectedVehicleId = vehicleId;
    if (waitingPiecePanel) waitingPiecePanel.style.display = 'none';
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

async function updateVehicleStatus(newStatus, customLastEvent = null) {
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

        const payload = {
            status: newStatus
        };
        if (customLastEvent) {
            payload.last_event = customLastEvent;
        }

        const response = await apiFetch(`/vehicles/${selectedVehicleId}/status`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        if (response.ok) {
            showMessage('Estado actualizado correctamente.', 'success', 3000);
            if (waitingPiecePanel) waitingPiecePanel.style.display = 'none';
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
    if (status === 'ESPERANDO_REVISION') return statusButtons.esperandoRevision;
    if (status === 'EN_REVISION') return statusButtons.enRevision;
    if (status === 'MONTANDO_PIEZA') return statusButtons.montandoPieza;
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

// Botones cerrar/cancelar del modal
document.getElementById('closeEditModalBtn').addEventListener('click', closeEditModal);
document.getElementById('cancelEditModalBtn').addEventListener('click', closeEditModal);

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

// ====== GESTIÓN DE TALLERES (Owner) ======

function openWorkshopModal() {
    document.getElementById('workshopModal').style.display = 'flex';
    renderWorkshopList();
}

function closeWorkshopModal() {
    document.getElementById('workshopModal').style.display = 'none';
    document.getElementById('newWorkshopName').value = '';
}

function renderWorkshopList() {
    const container = document.getElementById('workshopListManage');
    if (!availableWorkshops || availableWorkshops.length === 0) {
        container.innerHTML = '<p style="color: #64748b; text-align: center;">No hay talleres registrados</p>';
        return;
    }

    container.innerHTML = availableWorkshops.map((ws) => `
        <div class="workshop-item">
            <div class="workshop-item-info">
                <span class="workshop-item-name">${ws.name}</span>
                <span class="workshop-item-slug">${ws.slug}</span>
            </div>
            <button class="btn-delete-workshop" data-delete-slug="${ws.slug}" data-delete-name="${ws.name}">🗑 Eliminar</button>
        </div>
    `).join('');
}

function slugify(text) {
    return (text || '')
        .toLowerCase()
        .trim()
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '');
}

async function addWorkshop() {
    const nameInput = document.getElementById('newWorkshopName');
    const name = (nameInput.value || '').trim();

    if (!name || name.length < 2) {
        showMessage('Escribe un nombre de taller (mínimo 2 caracteres).', 'error');
        return;
    }

    const slug = slugify(name);
    if (!slug || slug.length < 2) {
        showMessage('El nombre no genera un identificador válido. Usa letras y números.', 'error');
        return;
    }

    try {
        const response = await apiFetch('/workshops', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, slug })
        });

        const result = await response.json();

        if (response.ok) {
            showMessage(`Taller "${name}" creado correctamente.`, 'success', 3000);
            nameInput.value = '';
            await loadWorkshopInfo();
            renderWorkshopList();
        } else {
            showMessage(result.message || 'Error al crear taller.', 'error');
        }
    } catch (error) {
        showMessage('Error de conexión al crear taller.', 'error');
    }
}

async function deleteWorkshop(slug, name) {
    const confirmed = window.confirm(`¿Seguro que quieres eliminar el taller "${name}"?\n\nLos vehículos asociados no se borran, pero el taller dejará de aparecer.`);
    if (!confirmed) return;

    try {
        const response = await apiFetch(`/workshops/${encodeURIComponent(slug)}`, {
            method: 'DELETE'
        });

        const result = await response.json();

        if (response.ok) {
            showMessage(result.message || `Taller "${name}" eliminado.`, 'success', 3000);

            if (selectedWorkshopSlug === slug) {
                selectedWorkshopSlug = '';
                localStorage.removeItem('selectedWorkshopSlug');
            }

            await loadWorkshopInfo();
            renderWorkshopList();
            await loadVehicles();
        } else {
            showMessage(result.message || 'Error al eliminar taller.', 'error');
        }
    } catch (error) {
        showMessage('Error de conexión al eliminar taller.', 'error');
    }
}

async function loadWorkshopUsers() {
    if (currentUser?.role !== 'owner') {
        workshopUsers = [];
        return;
    }

    try {
        const response = await apiFetch('/users');
        const result = await response.json();
        workshopUsers = response.ok && result.success ? (result.data || []) : [];
    } catch (error) {
        workshopUsers = [];
    }
}

function openUsersModal() {
    if (currentUser?.role !== 'owner') return;
    document.getElementById('usersModal').style.display = 'flex';
    renderUsersList();
}

function closeUsersModal() {
    document.getElementById('usersModal').style.display = 'none';
    document.getElementById('newMechanicName').value = '';
    document.getElementById('newMechanicUsername').value = '';
    document.getElementById('newMechanicPassword').value = '';
}

function renderUsersList() {
    const container = document.getElementById('usersListManage');
    if (!container) return;

    if (!workshopUsers.length) {
        container.innerHTML = '<p style="color: var(--gray-500); text-align: center;">No hay usuarios mecánicos en este taller.</p>';
        return;
    }

    container.innerHTML = workshopUsers.map((user) => `
        <div class="workshop-item">
            <div class="workshop-item-info">
                <span class="workshop-item-name">${user.name}</span>
                <span class="workshop-item-slug">@${user.username}</span>
            </div>
            <span class="user-role-chip">${user.role === 'mechanic' ? 'Mecánico' : user.role}</span>
        </div>
    `).join('');
}

async function addMechanicUser() {
    const name = (document.getElementById('newMechanicName').value || '').trim();
    const username = (document.getElementById('newMechanicUsername').value || '').trim().toLowerCase();
    const password = document.getElementById('newMechanicPassword').value || '';

    if (!name || !username || !password) {
        showMessage('Completa nombre, usuario y contraseña del mecánico.', 'error');
        return;
    }

    try {
        const response = await apiFetch('/users', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, username, password })
        });

        const result = await response.json();

        if (!response.ok) {
            showMessage(result.message || 'No se pudo crear el usuario mecánico.', 'error');
            return;
        }

        showMessage('Usuario mecánico creado correctamente.', 'success', 2500);
        document.getElementById('newMechanicName').value = '';
        document.getElementById('newMechanicUsername').value = '';
        document.getElementById('newMechanicPassword').value = '';
        await loadWorkshopUsers();
        renderUsersList();
    } catch (error) {
        showMessage('Error de conexión creando usuario mecánico.', 'error');
    }
}

// Event listeners para gestión de talleres
document.getElementById('manageWorkshopsBtn').addEventListener('click', openWorkshopModal);
document.getElementById('manageUsersBtn').addEventListener('click', async () => {
    await loadWorkshopUsers();
    openUsersModal();
});
document.getElementById('closeWorkshopModalBtn').addEventListener('click', closeWorkshopModal);
document.getElementById('closeUsersModalBtn').addEventListener('click', closeUsersModal);
document.getElementById('addWorkshopBtn').addEventListener('click', addWorkshop);
document.getElementById('addMechanicBtn').addEventListener('click', addMechanicUser);

// Cerrar modal talleres con click fuera o Escape
document.addEventListener('click', (e) => {
    if (e.target.id === 'workshopModal') closeWorkshopModal();
    if (e.target.id === 'usersModal') closeUsersModal();
});
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        closeWorkshopModal();
        closeUsersModal();
    }
});

// Enter en input de nombre de taller → agregar
document.getElementById('newWorkshopName').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
        e.preventDefault();
        addWorkshop();
    }
});

// Event delegation para botón eliminar taller
document.getElementById('workshopListManage').addEventListener('click', (e) => {
    const deleteBtn = e.target.closest('[data-delete-slug]');
    if (deleteBtn) {
        deleteWorkshop(deleteBtn.dataset.deleteSlug, deleteBtn.dataset.deleteName);
    }
});

setInterval(() => {
    if (document.visibilityState === 'visible') {
        loadVehicles();
    }
}, 30000);