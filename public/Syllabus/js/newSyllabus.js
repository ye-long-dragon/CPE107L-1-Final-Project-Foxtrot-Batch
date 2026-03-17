function autoSaveNewSyllabus() {
    const draftData = {
        peos: Array.from(document.querySelectorAll('#peo-container .peo-row')).map(row => ({
            text: row.querySelector('.peo-editable-text')?.innerText || "",
            checks: Array.from(row.querySelectorAll('input[type="checkbox"]')).map(cb => cb.checked)
        })),
        sos: Array.from(document.querySelectorAll('#so-container .peo-row')).map(row => ({
            text: row.querySelector('.peo-editable-text')?.innerText || "",
            checks: Array.from(row.querySelectorAll('input[type="checkbox"]')).map(cb => cb.checked)
        }))
    };
    sessionStorage.setItem('syllabus_draft_new', JSON.stringify(draftData));
}

function format(command) {
    document.execCommand(command, false, null);
}

function handleFile(input) {
    const file = input.files[0];
    if (!file) return;
    alert("File attached: " + file.name);
}

/* ── SO: Renumber + Add + Delete ── */
function renumberSoRows() {
    const container = document.getElementById('so-container');
    const rows = container.getElementsByClassName('peo-row');
    Array.from(rows).forEach((row, i) => {
        row.querySelector('.peo-number').textContent = `${String.fromCharCode(97 + i)}.`;
    });
}

function addSoRow() {
    const container = document.getElementById('so-container');
    const rows = container.getElementsByClassName('peo-row');
    const letter = String.fromCharCode(97 + rows.length);

    const rowDiv = document.createElement('div');
    rowDiv.className = 'peo-row';
    rowDiv.innerHTML = `
        <div class="peo-text-side">
            <span class="peo-number">${letter}.</span>
            <div class="peo-editable-text" contenteditable="true" data-placeholder="Edit text"></div>
        </div>
        <div class="peo-checkbox-side">
            <input type="checkbox"><input type="checkbox"><input type="checkbox">
        </div>
        <button class="btn-delete-row" onclick="deleteSoRow(this)" title="Delete row">
            <span class="material-symbols-outlined">remove</span>
        </button>
    `;
    container.appendChild(rowDiv);
}

function deleteSoRow(btn) {
    btn.closest('.peo-row').remove();
    renumberSoRows();
}

/* ── PEO: Renumber + Add + Delete ── */
function renumberPeoRows() {
    const container = document.getElementById('peo-container');
    const rows = container.getElementsByClassName('peo-row');
    Array.from(rows).forEach((row, i) => {
        row.querySelector('.peo-number').textContent = `${i + 1}.`;
    });
}

function addPeoRow() {
    const container = document.getElementById('peo-container');
    const nextNum = container.getElementsByClassName('peo-row').length + 1;

    const rowDiv = document.createElement('div');
    rowDiv.className = 'peo-row';
    rowDiv.innerHTML = `
        <div class="peo-text-side">
            <span class="peo-number">${nextNum}.</span>
            <div class="peo-editable-text" contenteditable="true" data-placeholder="Edit text"></div>
        </div>
        <div class="peo-checkbox-side">
            <input type="checkbox"><input type="checkbox"><input type="checkbox">
        </div>
        <button class="btn-delete-row" onclick="deletePeoRow(this)" title="Delete row">
            <span class="material-symbols-outlined">remove</span>
        </button>
    `;
    container.appendChild(rowDiv);
}

function deletePeoRow(btn) {
    btn.closest('.peo-row').remove();
    renumberPeoRows();
}

/* ── Persistent placeholder for all contenteditable fields ── */
function initPersistentPlaceholder(el) {
    function update() {
        if (el.innerText.trim() === '') {
            el.classList.add('show-placeholder');
        } else {
            el.classList.remove('show-placeholder');
        }
    }
    el.addEventListener('input', update);
    update();
}

function handleBackAction() {
    // 1. Check if the user wants to save
    const confirmSave = confirm("Would you like to save your progress as a draft before leaving?");

    if (confirmSave) {
        saveToSession();
        alert("Progress saved to session!");
    }
    
    // 2. Proceed with going back
    window.history.back();
}

function saveToSession() {
    const draftData = {
        // Collect PEO data from the container [cite: 113]
        peos: Array.from(document.querySelectorAll('#peo-container .peo-row')).map(row => ({
            text: row.querySelector('.peo-editable-text').innerText,
            checks: Array.from(row.querySelectorAll('input[type="checkbox"]')).map(cb => cb.checked)
        })),
        // Collect SO data from the container [cite: 126]
        sos: Array.from(document.querySelectorAll('#so-container .peo-row')).map(row => ({
            text: row.querySelector('.peo-editable-text').innerText,
            checks: Array.from(row.querySelectorAll('input[type="checkbox"]')).map(cb => cb.checked)
        }))
    };

    // Save as a JSON string in session storage
    sessionStorage.setItem('syllabus_draft_new', JSON.stringify(draftData));
}

function loadFromSession() {
    const savedData = sessionStorage.getItem('syllabus_draft_new');
    if (!savedData) return;

    const data = JSON.parse(savedData);

    // FIX: Instead of .innerHTML = '', only remove existing .peo-row elements
    document.querySelectorAll('#peo-container .peo-row').forEach(row => row.remove());
    document.querySelectorAll('#so-container .peo-row').forEach(row => row.remove());

    // Reconstruct PEOs
    data.peos.forEach(item => {
        addPeoRow(); 
        const lastRow = document.querySelector('#peo-container .peo-row:last-child');
        if (lastRow) {
            lastRow.querySelector('.peo-editable-text').innerText = item.text;
            const checkboxes = lastRow.querySelectorAll('input[type="checkbox"]');
            item.checks.forEach((checked, i) => { if(checkboxes[i]) checkboxes[i].checked = checked; });
        }
    });

    // Reconstruct SOs
    data.sos.forEach(item => {
        addSoRow();
        const lastRow = document.querySelector('#so-container .peo-row:last-child');
        if (lastRow) {
            lastRow.querySelector('.peo-editable-text').innerText = item.text;
            const checkboxes = lastRow.querySelectorAll('input[type="checkbox"]');
            item.checks.forEach((checked, i) => { if(checkboxes[i]) checkboxes[i].checked = checked; });
        }
    });
}

// 1. ADD THIS: Auto-trigger save whenever something changes
document.addEventListener('input', (e) => {
    if (e.target.getAttribute('contenteditable') === 'true' || e.target.type === 'checkbox') {
        autoSaveNewSyllabus();
    }
});

// 2. FIX: Consolidate your load logic so it only runs once and clears defaults first
window.addEventListener('load', () => {
    const savedData = sessionStorage.getItem('syllabus_draft_new');
    if (!savedData) return;

    const data = JSON.parse(savedData);

    // Clear the default rows that are in the EJS [cite: 118, 131]
    document.querySelectorAll('#peo-container .peo-row').forEach(row => row.remove());
    document.querySelectorAll('#so-container .peo-row').forEach(row => row.remove());

    // Restore PEOs [cite: 113]
    data.peos.forEach(item => {
        addPeoRow(); 
        const lastRow = document.querySelector('#peo-container .peo-row:last-child');
        if (lastRow) {
            lastRow.querySelector('.peo-editable-text').innerText = item.text;
            const checks = lastRow.querySelectorAll('input[type="checkbox"]');
            item.checks.forEach((c, i) => { if(checks[i]) checks[i].checked = c; });
        }
    });

    // Restore SOs [cite: 126]
    data.sos.forEach(item => {
        addSoRow();
        const lastRow = document.querySelector('#so-container .peo-row:last-child');
        if (lastRow) {
            lastRow.querySelector('.peo-editable-text').innerText = item.text;
            const checks = lastRow.querySelectorAll('input[type="checkbox"]');
            item.checks.forEach((c, i) => { if(checks[i]) checks[i].checked = c; });
        }
    });
});

document.querySelectorAll('[contenteditable][data-placeholder]').forEach(initPersistentPlaceholder);

// Re-init for dynamically added PEO/SO rows
const peoSoObserver = new MutationObserver(() => {
    document.querySelectorAll('[contenteditable][data-placeholder]').forEach(el => {
        if (!el.dataset.placeholderInit) {
            el.dataset.placeholderInit = '1';
            initPersistentPlaceholder(el);
        }
    });
});
['peo-container', 'so-container'].forEach(id => {
    const container = document.getElementById(id);
    if (container) peoSoObserver.observe(container, { childList: true, subtree: true });
});
