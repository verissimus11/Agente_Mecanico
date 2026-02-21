// Base path para todas las llamadas API (inyectado por config.js)
const BASE_PATH = window.__BASE_PATH || '';

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
const addExtraRepairBtn = document.getElementById('addExtraRepairBtn');
const extraRepairList = document.getElementById('extraRepairList');
const toggleWaitingPieceDetailsBtn = document.getElementById('toggleWaitingPieceDetailsBtn');
const waitingPieceDetails = document.getElementById('waitingPieceDetails');
const budgetPdfFileInput = document.getElementById('budgetPdfFile');
const uploadBudgetPdfBtn = document.getElementById('uploadBudgetPdfBtn');
const viewBudgetPdfBtn = document.getElementById('viewBudgetPdfBtn');
const budgetPdfInfo = document.getElementById('budgetPdfInfo');
const statusFilter = document.getElementById('statusFilter');
const mechanicFilter = document.getElementById('mechanicFilter');
const performanceBtn = document.getElementById('performanceBtn');
const roleSelectGroup = document.getElementById('roleSelectGroup');
const newUserRoleSelect = document.getElementById('newUserRole');
let selectedRepairSystem = '';
let selectedRepairPart = '';
let extraRepairItems = [];

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

    const role = currentUser?.role || '';
    const isOwner = role === 'owner';
    const isDueno = role === 'dueño';
    const isMechanic = role === 'mechanic';
    const manageWorkshopsBtn = document.getElementById('manageWorkshopsBtn');
    const manageUsersBtn = document.getElementById('manageUsersBtn');

    // Workshop management: solo owner
    if (manageWorkshopsBtn) {
        manageWorkshopsBtn.style.display = isOwner ? 'inline-flex' : 'none';
    }
    // User management: owner y dueño
    if (manageUsersBtn) {
        manageUsersBtn.style.display = (isOwner || isDueno) ? 'inline-flex' : 'none';
    }
    // Performance: owner y dueño
    if (performanceBtn) {
        performanceBtn.style.display = (isOwner || isDueno) ? 'inline-flex' : 'none';
    }
    // Role selector: solo owner puede crear dueños
    if (roleSelectGroup) {
        roleSelectGroup.style.display = isOwner ? 'block' : 'none';
    }

    loadWorkshopInfo().then(async () => {
        await loadVehicles();
        if (isOwner || isDueno) {
            await loadWorkshopUsers();
        }
        initializeRepairSelectors();
        populateMechanicFilter();
    });
}

function setupLoginForm() {
    const loginForm = document.getElementById('loginForm');
    const loginError = document.getElementById('loginError');

    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        loginError.style.display = 'none';

        const username = document.getElementById('loginUser').value.trim().toLowerCase();
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
            const response = await fetch(BASE_PATH + '/auth/login', {
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

            if (currentUser && currentUser.workshopSlug && (currentUser.role === 'mechanic' || currentUser.role === 'dueño')) {
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
        const response = await fetch(BASE_PATH + '/auth/me', {
            headers: {
                Authorization: `Bearer ${token}`
            }
        });
        if (!response.ok) return false;
        const result = await response.json();
        currentUser = result.user || null;
        if (currentUser && currentUser.workshopSlug && (currentUser.role === 'mechanic' || currentUser.role === 'dueño')) {
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

    const response = await fetch(BASE_PATH + url, opts);

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

            if (currentUser && (currentUser.role === 'mechanic' || currentUser.role === 'dueño')) {
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

    if (statusFilter) {
        statusFilter.addEventListener('change', () => renderVehiclesTable());
    }
    if (mechanicFilter) {
        mechanicFilter.addEventListener('change', () => renderVehiclesTable());
    }

    statusButtons.esperandoRevision.addEventListener('click', () => confirmAndUpdateStatus('ESPERANDO_REVISION'));
    statusButtons.enRevision.addEventListener('click', () => confirmAndUpdateStatus('EN_REVISION'));
    statusButtons.montandoPieza.addEventListener('click', () => confirmAndUpdateStatus('MONTANDO_PIEZA'));
    statusButtons.esperandoPieza.addEventListener('click', openEsperandoPiezaPanel);
    statusButtons.presupuestoPendiente.addEventListener('click', () => confirmAndUpdateStatus('PRESUPUESTO_PENDIENTE'));
    statusButtons.listo.addEventListener('click', () => confirmAndUpdateStatus('LISTO'));

    if (applyEsperandoPiezaBtn) {
        applyEsperandoPiezaBtn.addEventListener('click', applyEsperandoPiezaWithCatalog);
    }
    if (addExtraRepairBtn) {
        addExtraRepairBtn.addEventListener('click', addCurrentSelectionAsExtraRepair);
    }
    if (toggleWaitingPieceDetailsBtn) {
        toggleWaitingPieceDetailsBtn.addEventListener('click', toggleWaitingPieceDetails);
    }
    if (uploadBudgetPdfBtn) {
        uploadBudgetPdfBtn.addEventListener('click', uploadBudgetPdfForSelectedVehicle);
    }
    if (viewBudgetPdfBtn) {
        viewBudgetPdfBtn.addEventListener('click', openBudgetPdfForSelectedVehicle);
    }

    if (workshopSelect) {
        workshopSelect.addEventListener('change', async () => {
            selectedWorkshopSlug = workshopSelect.value;
            localStorage.setItem('selectedWorkshopSlug', selectedWorkshopSlug);
            selectedVehicleId = null;
            await loadWorkshopInfo();
            await loadVehicles();
            if (currentUser?.role === 'owner' || currentUser?.role === 'dueño') {
                await loadWorkshopUsers();
                renderUsersList();
            }
            populateMechanicFilter();
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
    extraRepairItems = [];
    renderExtraRepairList();
    if (repairNoteInput) repairNoteInput.value = '';
    waitingPiecePanel.style.display = 'block';
    // Mostrar detalles colapsados por defecto
    if (waitingPieceDetails) waitingPieceDetails.style.display = 'none';
    if (toggleWaitingPieceDetailsBtn) toggleWaitingPieceDetailsBtn.textContent = 'Detalles';
}

function toggleWaitingPieceDetails() {
    if (!waitingPieceDetails) return;
    const isHidden = waitingPieceDetails.style.display === 'none';
    waitingPieceDetails.style.display = isHidden ? 'block' : 'none';
    if (toggleWaitingPieceDetailsBtn) {
        toggleWaitingPieceDetailsBtn.textContent = isHidden ? 'Ocultar' : 'Detalles';
    }
}

function addCurrentSelectionAsExtraRepair() {
    const systemName = selectedRepairSystem || '';
    const partName = selectedRepairPart || '';

    if (!systemName || !partName) {
        showMessage('Selecciona sistema y pieza antes de añadir pieza.', 'error');
        return;
    }

    const duplicate = extraRepairItems.some((item) => item.system === systemName && item.part === partName);
    if (duplicate) {
        showMessage('Esa pieza ya está añadida.', 'error');
        return;
    }

    extraRepairItems.push({ system: systemName, part: partName });
    renderExtraRepairList();
    showMessage('Pieza extra añadida.', 'success', 1800);
}

function removeExtraRepair(index) {
    if (index < 0 || index >= extraRepairItems.length) return;
    extraRepairItems.splice(index, 1);
    renderExtraRepairList();
}

function renderExtraRepairList() {
    if (!extraRepairList) return;

    if (!extraRepairItems.length) {
        extraRepairList.style.display = 'none';
        extraRepairList.innerHTML = '';
        return;
    }

    extraRepairList.style.display = 'flex';
    extraRepairList.innerHTML = extraRepairItems.map((item, index) => `
        <div class="extra-repair-item">
            <span class="extra-repair-text">${item.system} · ${item.part}</span>
            <button type="button" class="btn-remove-x" data-extra-remove="${index}" title="Eliminar pieza">✕</button>
        </div>
    `).join('');

    extraRepairList.querySelectorAll('[data-extra-remove]').forEach((button) => {
        button.addEventListener('click', () => {
            const index = Number(button.getAttribute('data-extra-remove'));
            removeExtraRepair(index);
        });
    });
}

async function applyEsperandoPiezaWithCatalog() {
    const systemName = selectedRepairSystem || '';
    const partName = selectedRepairPart || '';
    const note = (repairNoteInput?.value || '').trim();

    if (!systemName || !partName) {
        showMessage('Selecciona sistema y pieza para marcar Esperando Pieza.', 'error');
        return;
    }

    const allRepairs = [{ system: systemName, part: partName }, ...extraRepairItems];
    const uniqueRepairs = [];
    const seen = new Set();

    allRepairs.forEach((item) => {
        const key = `${item.system}::${item.part}`;
        if (!seen.has(key)) {
            seen.add(key);
            uniqueRepairs.push(item);
        }
    });

    const repairsText = uniqueRepairs
        .map((item, index) => `Pieza ${index + 1}: ${item.system} - ${item.part}`)
        .join(' · ');

    const catalogNote = note
        ? `Esperando pieza · ${repairsText} · Nota: ${note}`
        : `Esperando pieza · ${repairsText}`;

    const selectedVehicle = vehicles.find((v) => v.id === selectedVehicleId);
    const plateName = selectedVehicle ? selectedVehicle.plate : '';

    const modal = document.getElementById('confirmStatusModal');
    const plateEl = document.getElementById('confirmStatusPlate');
    const labelEl = document.getElementById('confirmStatusLabel');
    const whatsappEl = document.getElementById('confirmStatusWhatsappNote');
    const confirmBtn = document.getElementById('confirmStatusChangeBtn');
    const cancelBtn = document.getElementById('cancelStatusChangeBtn');
    const closeBtn = document.getElementById('closeConfirmStatusModalBtn');

    plateEl.textContent = plateName;
    labelEl.textContent = `Esperando Pieza - ${repairsText}`;
    whatsappEl.textContent = '📱 Se enviará notificación WhatsApp al cliente.';
    whatsappEl.style.display = 'block';
    modal.style.display = 'flex';

    const handleConfirm = async () => {
        cleanup();
        await updateVehicleStatus('ESPERANDO_PIEZA', catalogNote);
        extraRepairItems = [];
        renderExtraRepairList();
        waitingPiecePanel.style.display = 'none';
    };

    const handleCancel = () => {
        cleanup();
    };

    const cleanup = () => {
        modal.style.display = 'none';
        confirmBtn.removeEventListener('click', handleConfirm);
        cancelBtn.removeEventListener('click', handleCancel);
        closeBtn.removeEventListener('click', handleCancel);
    };

    confirmBtn.addEventListener('click', handleConfirm);
    cancelBtn.addEventListener('click', handleCancel);
    closeBtn.addEventListener('click', handleCancel);
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
            const createdVehicle = result.data || null;
            if (currentWorkshop && currentWorkshop.slug && createdVehicle?.tracking_hash) {
                const trackUrl = `${window.location.origin}${BASE_PATH}/${currentWorkshop.slug}/status/${plate}/${createdVehicle.tracking_hash}`;
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
        populateMechanicFilter();
        updateSelectionState();
    } catch (error) {
        handleApiError(error, 'Error de conexión al cargar vehículos.');
    }
}

function getFilteredVehicles() {
    const query = normalizePlate(plateSearchInput.value || '');
    const statusVal = statusFilter ? statusFilter.value : '';
    const mechanicVal = mechanicFilter ? mechanicFilter.value : '';

    let filtered = vehicles;

    if (query) {
        filtered = filtered.filter((vehicle) => normalizePlate(vehicle.plate).includes(query));
    }
    if (statusVal) {
        filtered = filtered.filter((vehicle) => vehicle.status === statusVal);
    }
    if (mechanicVal) {
        filtered = filtered.filter((vehicle) =>
            (vehicle.last_status_by_username || '') === mechanicVal
        );
    }

    return filtered;
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
        const trackUrl = currentWorkshop && currentWorkshop.slug && vehicle.tracking_hash
            ? `${window.location.origin}${BASE_PATH}/${currentWorkshop.slug}/status/${vehicle.plate}/${vehicle.tracking_hash}`
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
        renderBudgetPdfInfo(selectedVehicle);
        return;
    }

    selectedPlate.textContent = 'Ninguno';
    statusSectionInstruction.textContent = 'Selecciona un vehículo para cambiar el estado.';
    setStatusButtonsEnabled(false);
    renderBudgetPdfInfo(null);
}

function renderBudgetPdfInfo(vehicle) {
    if (!budgetPdfInfo || !uploadBudgetPdfBtn || !viewBudgetPdfBtn) return;

    if (!vehicle) {
        uploadBudgetPdfBtn.disabled = true;
        viewBudgetPdfBtn.disabled = true;
        budgetPdfInfo.textContent = 'Selecciona un vehículo para gestionar presupuesto.';
        return;
    }

    uploadBudgetPdfBtn.disabled = false;
    viewBudgetPdfBtn.disabled = !vehicle.quote_pdf_path;

    if (vehicle.quote_pdf_uploaded_at) {
        budgetPdfInfo.textContent = `PDF cargado: ${formatDate(vehicle.quote_pdf_uploaded_at)}`;
    } else {
        budgetPdfInfo.textContent = 'Aún no hay PDF de presupuesto cargado para este vehículo.';
    }
}

async function uploadBudgetPdfForSelectedVehicle() {
    if (!selectedVehicleId) {
        showMessage('Selecciona un vehículo antes de subir el presupuesto.', 'error');
        return;
    }

    const selectedVehicle = vehicles.find((vehicle) => vehicle.id === selectedVehicleId);
    if (!selectedVehicle) {
        showMessage('Vehículo seleccionado no válido.', 'error');
        return;
    }

    const file = budgetPdfFileInput?.files?.[0];
    if (!file) {
        showMessage('Selecciona un PDF antes de subir.', 'error');
        return;
    }

    if (file.type !== 'application/pdf') {
        showMessage('Solo se permiten archivos PDF.', 'error');
        return;
    }

    if (selectedVehicle.status !== 'PRESUPUESTO_PENDIENTE') {
        showMessage('El vehículo debe estar en Presupuesto pendiente para subir el PDF.', 'error');
        return;
    }

    const formData = new FormData();
    formData.append('quote_pdf', file);

    uploadBudgetPdfBtn.disabled = true;
    const originalLabel = uploadBudgetPdfBtn.textContent;
    uploadBudgetPdfBtn.textContent = 'Subiendo...';

    try {
        const response = await apiFetch(`/vehicles/${selectedVehicleId}/quote-pdf`, {
            method: 'POST',
            body: formData
        });

        const result = await response.json();
        if (!response.ok) {
            showMessage(result.message || 'No se pudo subir el PDF.', 'error');
            return;
        }

        if (budgetPdfFileInput) {
            budgetPdfFileInput.value = '';
        }

        const whatsappNote = result.whatsappPdfSent ? ' 📱 PDF enviado por WhatsApp al cliente.' : '';
        showMessage(`Presupuesto PDF subido correctamente.${whatsappNote}`, 'success', 4000);
        await loadVehicles();
        updateSelectionState();
    } catch (error) {
        handleApiError(error, 'Error subiendo el PDF de presupuesto.');
    } finally {
        uploadBudgetPdfBtn.disabled = false;
        uploadBudgetPdfBtn.textContent = originalLabel;
    }
}

async function openBudgetPdfForSelectedVehicle() {
    if (!selectedVehicleId) {
        showMessage('Selecciona un vehículo primero.', 'error');
        return;
    }

    try {
        const response = await apiFetch(`/vehicles/${selectedVehicleId}/quote-pdf`, {
            method: 'GET'
        });

        if (!response.ok) {
            const result = await response.json();
            showMessage(result.message || 'No se pudo abrir el PDF.', 'error');
            return;
        }

        const blob = await response.blob();
        const blobUrl = URL.createObjectURL(blob);
        window.open(blobUrl, '_blank');
        setTimeout(() => URL.revokeObjectURL(blobUrl), 10000);
    } catch (error) {
        handleApiError(error, 'Error abriendo el PDF de presupuesto.');
    }
}

function setStatusButtonsEnabled(enabled) {
    Object.values(statusButtons).forEach((button) => {
        button.disabled = !enabled;
    });
}

function confirmAndUpdateStatus(newStatus) {
    if (!selectedVehicleId) {
        showMessage('Selecciona un vehículo para cambiar el estado.', 'error');
        return;
    }
    const selectedVehicle = vehicles.find((v) => v.id === selectedVehicleId);
    const plateName = selectedVehicle ? selectedVehicle.plate : '';
    const statusLabel = STATUS_MAP[newStatus] || newStatus;
    const whatsappNote = ['EN_REVISION', 'PRESUPUESTO_PENDIENTE', 'ESPERANDO_PIEZA', 'LISTO'].includes(newStatus)
        ? '📱 Se enviará notificación WhatsApp al cliente.' : '';

    const modal = document.getElementById('confirmStatusModal');
    const plateEl = document.getElementById('confirmStatusPlate');
    const labelEl = document.getElementById('confirmStatusLabel');
    const whatsappEl = document.getElementById('confirmStatusWhatsappNote');
    const confirmBtn = document.getElementById('confirmStatusChangeBtn');
    const cancelBtn = document.getElementById('cancelStatusChangeBtn');
    const closeBtn = document.getElementById('closeConfirmStatusModalBtn');

    plateEl.textContent = plateName;
    labelEl.textContent = statusLabel;
    whatsappEl.textContent = whatsappNote;
    whatsappEl.style.display = whatsappNote ? 'block' : 'none';
    modal.style.display = 'flex';

    const handleConfirm = () => {
        cleanup();
        updateVehicleStatus(newStatus);
    };

    const handleCancel = () => {
        cleanup();
    };

    const cleanup = () => {
        modal.style.display = 'none';
        confirmBtn.removeEventListener('click', handleConfirm);
        cancelBtn.removeEventListener('click', handleCancel);
        closeBtn.removeEventListener('click', handleCancel);
    };

    confirmBtn.addEventListener('click', handleConfirm);
    cancelBtn.addEventListener('click', handleCancel);
    closeBtn.addEventListener('click', handleCancel);
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
            const whatsappNote = result.whatsappSent ? ' 📱 WhatsApp enviado.' : '';
            showMessage(`Estado actualizado correctamente.${whatsappNote}`, 'success', 3000);
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
    const phoneInput = document.getElementById('newWorkshopPhone');
    if (phoneInput) phoneInput.value = '';
}

function renderWorkshopList() {
    const container = document.getElementById('workshopListManage');
    if (!availableWorkshops || availableWorkshops.length === 0) {
        container.innerHTML = '<p style="color: #64748b; text-align: center;">No hay talleres registrados</p>';
        return;
    }

    container.innerHTML = availableWorkshops.map((ws) => {
        const enabled = ws.enabled !== false;
        const statusBadge = enabled
            ? '<span class="workshop-status-badge enabled">Activo</span>'
            : '<span class="workshop-status-badge disabled">Deshabilitado</span>';
        const phoneDisplay = ws.phone
            ? `<span class="workshop-item-phone">📞 ${ws.phone}</span>`
            : '<span class="workshop-item-phone workshop-no-phone">Sin teléfono</span>';
        return `
        <div class="workshop-item${enabled ? '' : ' workshop-disabled'}">
            <div class="workshop-item-info">
                <span class="workshop-item-name">${ws.name} ${statusBadge}</span>
                <span class="workshop-item-slug">${ws.slug}</span>
                ${phoneDisplay}
            </div>
            <div class="workshop-item-actions">
                <button class="btn-edit-phone" data-phone-slug="${ws.slug}" data-phone-name="${ws.name}" data-phone-current="${ws.phone || ''}">📞 Teléfono</button>
                <button class="btn-toggle-enabled" data-toggle-slug="${ws.slug}" data-toggle-name="${ws.name}">${enabled ? '⏸ Deshabilitar' : '▶ Habilitar'}</button>
                <button class="btn-delete-workshop" data-delete-slug="${ws.slug}" data-delete-name="${ws.name}">🗑 Eliminar</button>
            </div>
        </div>`;
    }).join('');
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
    const phoneInput = document.getElementById('newWorkshopPhone');
    const name = (nameInput.value || '').trim();
    const phone = (phoneInput.value || '').trim();

    if (!name || name.length < 2) {
        showMessage('Escribe un nombre de taller (mínimo 2 caracteres).', 'error');
        return;
    }

    const slug = slugify(name);
    if (!slug || slug.length < 2) {
        showMessage('El nombre no genera un identificador válido. Usa letras y números.', 'error');
        return;
    }

    const payload = { name, slug };
    if (phone) payload.phone = phone;

    try {
        const response = await apiFetch('/workshops', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const result = await response.json();

        if (response.ok) {
            showMessage(`Taller "${name}" creado correctamente.`, 'success', 3000);
            nameInput.value = '';
            phoneInput.value = '';
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
    const role = currentUser?.role || '';
    if (role !== 'owner' && role !== 'dueño') {
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
    const role = currentUser?.role || '';
    if (role !== 'owner' && role !== 'dueño') return;
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

    const callerRole = currentUser?.role || '';
    const canDelete = callerRole === 'owner' || callerRole === 'dueño';

    if (!workshopUsers.length) {
        container.innerHTML = '<p style="color: var(--gray-500); text-align: center;">No hay usuarios en este taller.</p>';
        return;
    }

    const roleLabels = { 'mechanic': 'Mecánico', 'dueño': 'Dueño' };

    container.innerHTML = workshopUsers.map((user) => {
        const roleLabel = roleLabels[user.role] || user.role;
        const canDeleteThis = canDelete && !(callerRole === 'dueño' && user.role !== 'mechanic');
        const deleteBtn = canDeleteThis
            ? `<button class="btn-delete-workshop" data-delete-user-id="${user.id}" data-delete-user-name="${user.name}">🗑 Quitar</button>`
            : '';
        return `
        <div class="workshop-item">
            <div class="workshop-item-info">
                <span class="workshop-item-name">${user.name}</span>
                <span class="workshop-item-slug">@${user.username}</span>
            </div>
            <div class="user-actions-row">
                <span class="user-role-chip">${roleLabel}</span>
                ${deleteBtn}
            </div>
        </div>`;
    }).join('');
}

async function addMechanicUser() {
    const name = (document.getElementById('newMechanicName').value || '').trim();
    const username = (document.getElementById('newMechanicUsername').value || '').trim().toLowerCase();
    const password = document.getElementById('newMechanicPassword').value || '';
    const role = (newUserRoleSelect && currentUser?.role === 'owner') ? newUserRoleSelect.value : 'mechanic';

    if (!name || !username || !password) {
        showMessage('Completa nombre, usuario y contraseña.', 'error');
        return;
    }

    try {
        const response = await apiFetch('/users', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, username, password, role })
        });

        const result = await response.json();

        if (!response.ok) {
            showMessage(result.message || 'No se pudo crear el usuario.', 'error');
            return;
        }

        showMessage(result.message || 'Usuario creado correctamente.', 'success', 2500);
        document.getElementById('newMechanicName').value = '';
        document.getElementById('newMechanicUsername').value = '';
        document.getElementById('newMechanicPassword').value = '';
        if (newUserRoleSelect) newUserRoleSelect.value = 'mechanic';
        await loadWorkshopUsers();
        renderUsersList();
    } catch (error) {
        showMessage('Error de conexión creando usuario.', 'error');
    }
}

// Event listeners para gestión de talleres
document.getElementById('manageWorkshopsBtn').addEventListener('click', openWorkshopModal);
document.getElementById('manageUsersBtn').addEventListener('click', async () => {
    await loadWorkshopUsers();
    openUsersModal();
});
if (performanceBtn) {
    performanceBtn.addEventListener('click', openPerformanceModal);
}
document.getElementById('closeWorkshopModalBtn').addEventListener('click', closeWorkshopModal);
document.getElementById('closeUsersModalBtn').addEventListener('click', closeUsersModal);
document.getElementById('closePerformanceModalBtn')?.addEventListener('click', closePerformanceModal);
document.getElementById('addWorkshopBtn').addEventListener('click', addWorkshop);
document.getElementById('addMechanicBtn').addEventListener('click', addMechanicUser);

// Cerrar modal talleres con click fuera o Escape
document.addEventListener('click', (e) => {
    if (e.target.id === 'workshopModal') closeWorkshopModal();
    if (e.target.id === 'usersModal') closeUsersModal();
    if (e.target.id === 'performanceModal') closePerformanceModal();
    if (e.target.id === 'editPhoneModal') {
        const modal = document.getElementById('editPhoneModal');
        modal.style.display = 'none';
    }
    if (e.target.id === 'confirmStatusModal') {
        const modal = document.getElementById('confirmStatusModal');
        modal.style.display = 'none';
    }
});
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        closeWorkshopModal();
        closeUsersModal();
        closePerformanceModal();
        const editPhoneModal = document.getElementById('editPhoneModal');
        const confirmStatusModal = document.getElementById('confirmStatusModal');
        if (editPhoneModal) editPhoneModal.style.display = 'none';
        if (confirmStatusModal) confirmStatusModal.style.display = 'none';
    }
});

// Enter en input de nombre de taller → agregar
document.getElementById('newWorkshopName').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
        e.preventDefault();
        addWorkshop();
    }
});

// Event delegation para botón eliminar/habilitar/teléfono taller
document.getElementById('workshopListManage').addEventListener('click', (e) => {
    const deleteBtn = e.target.closest('[data-delete-slug]');
    if (deleteBtn) {
        deleteWorkshop(deleteBtn.dataset.deleteSlug, deleteBtn.dataset.deleteName);
        return;
    }
    const toggleBtn = e.target.closest('[data-toggle-slug]');
    if (toggleBtn) {
        toggleWorkshopEnabled(toggleBtn.dataset.toggleSlug, toggleBtn.dataset.toggleName);
        return;
    }
    const phoneBtn = e.target.closest('[data-phone-slug]');
    if (phoneBtn) {
        editWorkshopPhone(phoneBtn.dataset.phoneSlug, phoneBtn.dataset.phoneName, phoneBtn.dataset.phoneCurrent);
    }
});

// Event delegation para eliminar usuario
document.getElementById('usersListManage').addEventListener('click', (e) => {
    const deleteBtn = e.target.closest('[data-delete-user-id]');
    if (deleteBtn) {
        deleteUser(deleteBtn.dataset.deleteUserId, deleteBtn.dataset.deleteUserName);
    }
});

// ====== FUNCIONES NUEVAS ======

function populateMechanicFilter() {
    if (!mechanicFilter) return;
    const mechanics = new Map();
    vehicles.forEach((v) => {
        if (v.last_status_by_username) {
            mechanics.set(v.last_status_by_username, v.last_status_by_name || v.last_status_by_username);
        }
    });
    const currentVal = mechanicFilter.value;
    mechanicFilter.innerHTML = '<option value="">Todos</option>' +
        Array.from(mechanics.entries()).map(([username, name]) =>
            `<option value="${username}">${name}</option>`
        ).join('');
    mechanicFilter.value = currentVal;
}

async function toggleWorkshopEnabled(slug, name) {
    try {
        const response = await apiFetch(`/workshops/${encodeURIComponent(slug)}/toggle-enabled`, {
            method: 'PATCH'
        });
        const result = await response.json();
        if (response.ok) {
            showMessage(result.message, 'success', 3000);
            await loadWorkshopInfo();
            renderWorkshopList();
        } else {
            showMessage(result.message || 'Error al cambiar estado del taller.', 'error');
        }
    } catch (error) {
        showMessage('Error de conexión al cambiar estado del taller.', 'error');
    }
}

async function editWorkshopPhone(slug, name, currentPhone) {
    const modal = document.getElementById('editPhoneModal');
    const workshopNameEl = document.getElementById('editPhoneWorkshopName');
    const phoneInput = document.getElementById('editPhoneInput');
    const confirmBtn = document.getElementById('confirmEditPhoneBtn');
    const cancelBtn = document.getElementById('cancelEditPhoneBtn');
    const closeBtn = document.getElementById('closeEditPhoneModalBtn');

    workshopNameEl.textContent = `Taller: ${name}`;
    phoneInput.value = currentPhone || '';
    modal.style.display = 'flex';
    phoneInput.focus();

    return new Promise((resolve) => {
        const handleConfirm = async () => {
            cleanup();
            const newPhone = phoneInput.value.trim();
            try {
                const response = await apiFetch(`/workshops/${encodeURIComponent(slug)}/phone`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ phone: newPhone || null })
                });
                const result = await response.json();
                if (response.ok) {
                    showMessage(result.message, 'success', 3000);
                    await loadWorkshopInfo();
                    renderWorkshopList();
                } else {
                    showMessage(result.message || 'Error al actualizar teléfono.', 'error');
                }
            } catch (error) {
                showMessage('Error de conexión al actualizar teléfono.', 'error');
            }
            resolve();
        };

        const handleCancel = () => {
            cleanup();
            resolve();
        };

        const cleanup = () => {
            modal.style.display = 'none';
            confirmBtn.removeEventListener('click', handleConfirm);
            cancelBtn.removeEventListener('click', handleCancel);
            closeBtn.removeEventListener('click', handleCancel);
        };

        confirmBtn.addEventListener('click', handleConfirm);
        cancelBtn.addEventListener('click', handleCancel);
        closeBtn.addEventListener('click', handleCancel);
    });
}

async function deleteUser(userId, userName) {
    const confirmed = window.confirm(`¿Seguro que quieres eliminar al usuario "${userName}"?`);
    if (!confirmed) return;

    try {
        const response = await apiFetch(`/users/${encodeURIComponent(userId)}`, {
            method: 'DELETE'
        });
        const result = await response.json();
        if (response.ok) {
            showMessage(result.message || 'Usuario eliminado.', 'success', 2500);
            await loadWorkshopUsers();
            renderUsersList();
        } else {
            showMessage(result.message || 'No se pudo eliminar el usuario.', 'error');
        }
    } catch (error) {
        showMessage('Error de conexión eliminando usuario.', 'error');
    }
}

function openPerformanceModal() {
    document.getElementById('performanceModal').style.display = 'flex';
    loadPerformanceData();
}

function closePerformanceModal() {
    document.getElementById('performanceModal').style.display = 'none';
}

async function loadPerformanceData() {
    const container = document.getElementById('performanceContent');
    if (!container) return;
    container.innerHTML = '<p style="color: #64748b; text-align: center;">Cargando estadísticas...</p>';

    try {
        const response = await apiFetch('/vehicles/stats/mechanics');
        const result = await response.json();

        if (!response.ok || !result.success) {
            container.innerHTML = '<p style="color: #C52A2A; text-align: center;">No se pudieron cargar las estadísticas.</p>';
            return;
        }

        const mechanics = result.data || [];
        if (!mechanics.length) {
            container.innerHTML = '<p style="color: #64748b; text-align: center;">Sin datos de mecánicos aún.</p>';
            return;
        }

        const statusLabels = {
            ESPERANDO_REVISION: '🕒 Esp. revisión',
            EN_REVISION: '🛠 En revisión',
            PRESUPUESTO_PENDIENTE: '📄 Presupuesto',
            ESPERANDO_PIEZA: '📦 Esp. pieza',
            MONTANDO_PIEZA: '🔩 Montando',
            LISTO: '✅ Listo'
        };

        const statusOrder = ['ESPERANDO_REVISION', 'EN_REVISION', 'PRESUPUESTO_PENDIENTE', 'ESPERANDO_PIEZA', 'MONTANDO_PIEZA', 'LISTO'];

        container.innerHTML = mechanics.map((m) => {
            const statusRows = statusOrder
                .filter((s) => m.statuses[s])
                .map((s) => `<div class="perf-status-row"><span class="perf-status-label">${statusLabels[s] || s}</span><span class="perf-status-count">${m.statuses[s]}</span></div>`)
                .join('');
            return `
            <div class="perf-mechanic-card">
                <div class="perf-mechanic-header">
                    <span class="perf-mechanic-name">${m.name}</span>
                    <span class="perf-mechanic-username">@${m.username}</span>
                </div>
                <div class="perf-stats-grid">
                    <div class="perf-stat-box perf-active"><span class="perf-stat-number">${m.active_total}</span><span class="perf-stat-label">Activos</span></div>
                    <div class="perf-stat-box perf-done"><span class="perf-stat-number">${m.finalized}</span><span class="perf-stat-label">Finalizados</span></div>
                </div>
                ${statusRows ? `<div class="perf-status-detail">${statusRows}</div>` : ''}
            </div>`;
        }).join('');
    } catch (error) {
        container.innerHTML = '<p style="color: #C52A2A; text-align: center;">Error de conexión.</p>';
    }
}

setInterval(() => {
    if (document.visibilityState === 'visible') {
        loadVehicles();
    }
}, 30000);