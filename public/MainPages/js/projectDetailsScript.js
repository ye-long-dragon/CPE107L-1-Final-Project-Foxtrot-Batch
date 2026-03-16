(function () {
    /* ============================================================
       EDITOR CORE
    ============================================================ */
    const editor     = document.getElementById('rteContent');
    const hiddenArea = document.getElementById('messageDetailField');
    const wordCount  = document.getElementById('wordCount');

    // Keep cursor save/restore for operations that blur
    let savedRange = null;

    function saveSelection() {
        const sel = window.getSelection();
        if (sel && sel.rangeCount > 0) savedRange = sel.getRangeAt(0).cloneRange();
    }

    function restoreSelection() {
        if (!savedRange) { editor.focus(); return; }
        const sel = window.getSelection();
        sel.removeAllRanges();
        sel.addRange(savedRange);
    }

    editor.addEventListener('keyup', updateWordCount);
    editor.addEventListener('input', updateWordCount);

    function updateWordCount() {
        const text = editor.innerText.trim();
        const words = text ? text.split(/\s+/).filter(Boolean).length : 0;
        wordCount.textContent = words;
    }

    /* ============================================================
       DROPDOWN TOGGLE LOGIC
    ============================================================ */
    const allDropdowns = document.querySelectorAll('.rte-dropdown');

    function closeAllDropdowns(except) {
        allDropdowns.forEach(dd => {
            const menu = dd.querySelector('.rte-dropdown-menu');
            if (menu && dd !== except) menu.classList.remove('open');
        });
    }

    allDropdowns.forEach(dd => {
        const btn  = dd.querySelector('.rte-btn');
        const menu = dd.querySelector('.rte-dropdown-menu');
        if (!btn || !menu) return;
        btn.addEventListener('mousedown', e => {
            e.preventDefault();
            saveSelection();
            const wasOpen = menu.classList.contains('open');
            closeAllDropdowns();
            if (!wasOpen) menu.classList.add('open');
        });
    });

    document.addEventListener('mousedown', e => {
        if (!e.target.closest('.rte-dropdown')) closeAllDropdowns();
    });

    /* ============================================================
       EXEC COMMAND HELPER
    ============================================================ */
    function exec(cmd, val = null) {
        editor.focus();
        restoreSelection();
        document.execCommand(cmd, false, val);
        editor.focus();
        updateWordCount();
    }

    /* ============================================================
       DROPDOWN ITEMS — execCommand
    ============================================================ */
    document.querySelectorAll('.rte-dropdown-item[data-cmd]').forEach(item => {
        item.addEventListener('mousedown', e => {
            e.preventDefault();
            const cmd = item.dataset.cmd;
            const val = item.dataset.val || null;

            if (cmd === 'lineHeight') {
                // Apply line-height via style on selection
                document.querySelectorAll(`[data-cmd="lineHeight"]`).forEach(i => i.classList.remove('active'));
                item.classList.add('active');
                restoreSelection();
                const sel = window.getSelection();
                if (sel && sel.rangeCount > 0) {
                    const range = sel.getRangeAt(0);
                    const span = document.createElement('span');
                    span.style.lineHeight = val;
                    try {
                        range.surroundContents(span);
                    } catch {
                        // partial selection fallback
                        exec('formatBlock', 'p');
                        const block = sel.anchorNode.parentElement.closest('p, h2, h3, h4');
                        if (block) block.style.lineHeight = val;
                    }
                }
            } else if (cmd === 'formatBlock') {
                exec(cmd, '<' + val + '>');
            } else {
                exec(cmd, val);
            }
            closeAllDropdowns();
        });
    });

    /* ============================================================
       SIMPLE TOOLBAR BUTTONS (bold, italic, underline, undo, etc.)
    ============================================================ */
    document.querySelectorAll('.rte-btn[data-cmd]').forEach(btn => {
        btn.addEventListener('mousedown', e => {
            e.preventDefault();
            exec(btn.dataset.cmd);
        });
    });

    /* ============================================================
       MORE (...) TOGGLE
    ============================================================ */
    const btnMore    = document.getElementById('btnMore');
    const extraRow   = document.getElementById('rteExtraRow');

    btnMore.addEventListener('click', e => {
        e.preventDefault();
        extraRow.classList.toggle('visible');
        btnMore.classList.toggle('active');
    });

    /* ============================================================
       CODE SNIPPET
    ============================================================ */
    document.getElementById('btnCode').addEventListener('mousedown', e => {
        e.preventDefault();
        restoreSelection();
        const sel = window.getSelection();
        if (sel && sel.rangeCount > 0 && !sel.isCollapsed) {
            const range = sel.getRangeAt(0);
            const code = document.createElement('code');
            code.textContent = range.toString();
            range.deleteContents();
            range.insertNode(code);
        } else {
            const code = document.createElement('code');
            code.textContent = 'code here';
            const range = savedRange || document.createRange();
            range.collapse(false);
            range.insertNode(code);
        }
    });

    /* ============================================================
       TABLE GRID PICKER
    ============================================================ */
    const gridCells    = document.getElementById('tableGridCells');
    const gridLabel    = document.getElementById('tableGridLabel');
    const tableInsBtn  = document.getElementById('tableInsertBtn');
    const ROWS = 9, COLS = 10;
    let selectedRows = 1, selectedCols = 1;

    // Build grid
    for (let r = 1; r <= ROWS; r++) {
        for (let c = 1; c <= COLS; c++) {
            const cell = document.createElement('div');
            cell.className = 'table-cell';
            cell.dataset.r = r;
            cell.dataset.c = c;
            gridCells.appendChild(cell);
        }
    }

    gridCells.addEventListener('mouseover', e => {
        const cell = e.target.closest('.table-cell');
        if (!cell) return;
        selectedRows = +cell.dataset.r;
        selectedCols = +cell.dataset.c;
        gridLabel.textContent = `${selectedRows} × ${selectedCols} Table`;
        document.querySelectorAll('.table-cell').forEach(c => {
            c.classList.toggle('highlight', +c.dataset.r <= selectedRows && +c.dataset.c <= selectedCols);
        });
    });

    tableInsBtn.addEventListener('mousedown', e => {
        e.preventDefault();
        insertTable(selectedRows, selectedCols);
        closeAllDropdowns();
    });

    function insertTable(rows, cols) {
        restoreSelection();
        const table = document.createElement('table');
        for (let r = 0; r < rows; r++) {
            const tr = document.createElement('tr');
            for (let c = 0; c < cols; c++) {
                const td = document.createElement('td');
                td.innerHTML = '&nbsp;';
                tr.appendChild(td);
            }
            table.appendChild(tr);
        }
        const sel = window.getSelection();
        if (sel && sel.rangeCount > 0) {
            const range = sel.getRangeAt(0);
            range.deleteContents();
            range.insertNode(table);
            // Move cursor after table
            const after = document.createElement('p');
            after.innerHTML = '<br>';
            table.after(after);
            const newRange = document.createRange();
            newRange.setStart(after, 0);
            sel.removeAllRanges();
            sel.addRange(newRange);
        } else {
            editor.appendChild(table);
        }
        updateWordCount();
    }

    /* ============================================================
       LINK MODAL
    ============================================================ */
    const linkModal  = document.getElementById('linkModal');
    const linkText   = document.getElementById('linkText');
    const linkUrl    = document.getElementById('linkUrl');

    document.getElementById('btnLink').addEventListener('mousedown', e => {
        e.preventDefault();
        saveSelection();
        closeAllDropdowns();
        const sel = window.getSelection();
        if (sel && !sel.isCollapsed) linkText.value = sel.toString();
        linkModal.classList.add('open');
        linkUrl.focus();
    });

    document.getElementById('linkCancel').addEventListener('click', () => {
        linkModal.classList.remove('open');
    });

    document.getElementById('linkInsert').addEventListener('click', () => {
        const url  = linkUrl.value.trim();
        const text = linkText.value.trim() || url;
        if (!url) return;
        restoreSelection();
        const a = document.createElement('a');
        a.href = url;
        a.target = '_blank';
        a.textContent = text;
        const sel = window.getSelection();
        if (sel && sel.rangeCount > 0) {
            const range = sel.getRangeAt(0);
            range.deleteContents();
            range.insertNode(a);
        } else {
            editor.appendChild(a);
        }
        linkModal.classList.remove('open');
        linkText.value = '';
        linkUrl.value = '';
    });

    linkModal.addEventListener('click', e => {
        if (e.target === linkModal) linkModal.classList.remove('open');
    });

    /* ============================================================
       FILE ATTACHMENT
    ============================================================ */
    const fileInput         = document.getElementById('fileInput');
    const attachPreview     = document.getElementById('attachmentPreview');
    const attachedFiles     = [];

    document.getElementById('btnAttach').addEventListener('click', () => fileInput.click());

    fileInput.addEventListener('change', () => {
        Array.from(fileInput.files).forEach(file => {
            attachedFiles.push(file);
            const chip = document.createElement('div');
            chip.className = 'attachment-chip';
            chip.innerHTML = `
                <svg viewBox="0 0 14 16" fill="none" stroke="currentColor" stroke-width="1.4" width="12" height="12"><rect x="1" y="1" width="12" height="14" rx="2"/><line x1="4" y1="5" x2="10" y2="5"/><line x1="4" y1="8" x2="10" y2="8"/><line x1="4" y1="11" x2="7" y2="11"/></svg>
                <span>${file.name}</span>
                <button type="button" title="Remove">✕</button>`;
            chip.querySelector('button').addEventListener('click', () => {
                const idx = attachedFiles.indexOf(file);
                if (idx > -1) attachedFiles.splice(idx, 1);
                chip.remove();
            });
            attachPreview.appendChild(chip);
        });
        fileInput.value = '';
    });

    /* ============================================================
       IMAGE INSERT
    ============================================================ */
    const imageInput = document.getElementById('imageInput');

    document.getElementById('btnImage').addEventListener('click', () => imageInput.click());

    imageInput.addEventListener('change', () => {
        Array.from(imageInput.files).forEach(file => {
            const reader = new FileReader();
            reader.onload = ev => {
                restoreSelection();
                const img = document.createElement('img');
                img.src = ev.target.result;
                img.style.maxWidth = '100%';
                img.style.borderRadius = '6px';
                img.style.margin = '4px 0';
                const sel = window.getSelection();
                if (sel && sel.rangeCount > 0) {
                    const range = sel.getRangeAt(0);
                    range.insertNode(img);
                } else {
                    editor.appendChild(img);
                }
                updateWordCount();
            };
            reader.readAsDataURL(file);
        });
        imageInput.value = '';
    });

    /* ============================================================
       TOAST HELPER
    ============================================================ */
    const toast = document.getElementById('rteToast');
    function showToast(msg, type = '') {
        toast.textContent = msg;
        toast.className = 'rte-toast show ' + type;
        setTimeout(() => toast.className = 'rte-toast', 3000);
    }

    /* ============================================================
       FORM SUBMIT — encode HTML as base64 → hidden textarea
    ============================================================ */
    document.getElementById('adminAnnouncementForm').addEventListener('submit', async e => {
        e.preventDefault();

        const html = editor.innerHTML.trim();
        if (!html || html === '<br>') {
            showToast('Message Detail cannot be empty.', 'error');
            return;
        }

        // Encode to base64
        const encoded = btoa(unescape(encodeURIComponent(html)));
        hiddenArea.value = encoded;

        const form = e.target;
        const payload = {
            department:    form.department.value.trim(),
            category:      form.category.value,
            headline:      form.headline.value.trim(),
            messageDetail: encoded
        };

        try {
            const res  = await fetch('/api/announcement', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const data = await res.json();
            if (data.success) {
                showToast('Announcement posted!', 'success');
                form.reset();
                editor.innerHTML = '';
                attachPreview.innerHTML = '';
                attachedFiles.length = 0;
                updateWordCount();
                setTimeout(() => location.reload(), 1200);
            } else {
                showToast('Error: ' + (data.error || 'Unknown error'), 'error');
            }
        } catch (err) {
            showToast('Network error. Please try again.', 'error');
        }
    });

    /* ============================================================
       DELETE ANNOUNCEMENT
    ============================================================ */
    document.querySelectorAll('.btn-delete').forEach(btn => {
        btn.addEventListener('click', async () => {
            const item = btn.closest('.announcement-item');
            const id   = item?.dataset?.id;
            if (!id) return;
            if (!confirm('Delete this announcement?')) return;
            try {
                const res = await fetch(`/api/announcement/${id}`, { method: 'DELETE' });
                const data = await res.json();
                if (data.success) {
                    item.remove();
                    showToast('Announcement deleted.', 'success');
                } else {
                    showToast('Delete failed.', 'error');
                }
            } catch {
                showToast('Network error.', 'error');
            }
        });
    });

    /* ============================================================
       PROJECT DETAILS MODAL (existing)
    ============================================================ */
    const modal     = document.getElementById('projectModal');
    const projBtn   = document.querySelector('.btn-proj-overview');
    const closeSpan = document.querySelector('.close-btn');

    if (projBtn && modal) {
        projBtn.addEventListener('click', e => { e.preventDefault(); modal.style.display = 'block'; });
    }
    if (closeSpan) closeSpan.addEventListener('click', () => modal.style.display = 'none');
    window.addEventListener('click', ev => { if (ev.target === modal) modal.style.display = 'none'; });

})();