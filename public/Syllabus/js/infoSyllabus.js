/* ── Renumber all CO rows after add/delete ── */
function renumberCoRows() {
  const container = document.getElementById('outcomes-container');
  const rows = container.getElementsByClassName('outcomes-row');
  Array.from(rows).forEach((row, i) => {
    row.querySelector('.outcomes-number').textContent = `CO${i + 1}.`;
  });
}

function addCoRow() {
  const container = document.getElementById('outcomes-container');
  const rowCount = container.getElementsByClassName('outcomes-row').length + 1;

  const newRow = document.createElement('div');
  newRow.className = 'outcomes-row';
  newRow.innerHTML = `
    <div class="outcomes-statement">
      <span class="outcomes-number">CO${rowCount}.</span>
      <div class="outcomes-editable-text" contenteditable="true" data-placeholder="Edit text"></div>
    </div>
    <div class="outcomes-skills-side">
      <div class="outcomes-editable-text" contenteditable="true" data-placeholder="e.g. Creating"></div>
    </div>
    <button class="btn-delete-row" onclick="deleteCoRow(this)" title="Delete row">
      <span class="material-symbols-outlined">remove</span>
    </button>
  `;
  container.appendChild(newRow);
  syncMappingRows();
}

function deleteCoRow(btn) {
  btn.closest('.outcomes-row').remove();
  renumberCoRows();
  syncMappingRows();
}

document.querySelectorAll('.course-info-container .course-editable-text').forEach(box => {
  // Prevent Enter key (stay single-line) only if NOT multiline
  box.addEventListener('keydown', function (e) {
    if (this.classList.contains('multiline')) return;

    if (e.key === 'Enter') {
      e.preventDefault();
      return;
    }
    // Allow control/navigation keys
    if (e.key === 'Backspace' || e.key === 'Delete' || e.key.startsWith('Arrow') || e.ctrlKey || e.metaKey) {
      return;
    }
    // Measure if adding one more character would overflow
    const testSpan = document.createElement('span');
    testSpan.style.cssText = 'visibility:hidden;position:absolute;white-space:nowrap;font:' + window.getComputedStyle(this).font;
    testSpan.textContent = (this.innerText || '') + e.key;
    document.body.appendChild(testSpan);
    const wouldOverflow = testSpan.offsetWidth > this.clientWidth - 15;
    document.body.removeChild(testSpan);
    if (wouldOverflow) e.preventDefault();
  });

  // Prevent pasting text that would overflow only if NOT multiline
  box.addEventListener('paste', function (e) {
    if (this.classList.contains('multiline')) return;

    e.preventDefault();
    const text = (e.clipboardData || window.clipboardData).getData('text').replace(/[\r\n]+/g, ' ');
    const testSpan = document.createElement('span');
    testSpan.style.cssText = 'visibility:hidden;position:absolute;white-space:nowrap;font:' + window.getComputedStyle(this).font;
    testSpan.textContent = (this.innerText || '') + text;
    document.body.appendChild(testSpan);
    if (testSpan.offsetWidth <= this.clientWidth - 15) {
      document.execCommand('insertText', false, text);
    }
    document.body.removeChild(testSpan);
  });
});

/* Course Mapping */
const tableBody = document.getElementById('mapping-body');

const dropdownOptions = [
  { value: 'none', label: 'None' },
  { value: 'I', label: 'I - Introductory' },
  { value: 'E', label: 'E - Enabling' },
  { value: 'D', label: 'D - Demonstrative' },
];


function createCustomDropdown() {
  const wrapper = document.createElement('div');
  wrapper.className = 'custom-dropdown';

  const trigger = document.createElement('div');
  trigger.className = 'custom-dropdown-trigger';
  trigger.setAttribute('tabindex', '0');
  trigger.dataset.value = '';

  const panel = document.createElement('div');
  panel.className = 'custom-dropdown-panel';

  dropdownOptions.forEach(opt => {
    if (opt.value === '') return; // skip blank placeholder in panel
    const item = document.createElement('div');
    item.className = 'custom-dropdown-item';
    item.dataset.value = opt.value;
    item.textContent = opt.label;

    item.addEventListener('click', function (e) {
      e.stopPropagation();
      // 'none' clears the cell display
      trigger.textContent = opt.value === 'none' ? '' : opt.value;
      trigger.dataset.value = opt.value === 'none' ? '' : opt.value;
      closeDropdown(wrapper);
    });

    panel.appendChild(item);
  });

  trigger.addEventListener('click', function (e) {
    e.stopPropagation();
    const isOpen = wrapper.classList.contains('open');
    // Close all other dropdowns first
    document.querySelectorAll('.custom-dropdown.open').forEach(d => closeDropdown(d));
    if (!isOpen) openDropdown(wrapper);
  });

  trigger.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      trigger.click();
    } else if (e.key === 'Escape') {
      closeDropdown(wrapper);
    }
  });

  wrapper.appendChild(trigger);
  wrapper.appendChild(panel);
  return wrapper;
}

function openDropdown(wrapper) {
  wrapper.classList.add('open');
  const panel = wrapper.querySelector('.custom-dropdown-panel');
  panel.style.display = 'block';
  // Force reflow for animation
  panel.getBoundingClientRect();
  panel.classList.add('visible');
}

function closeDropdown(wrapper) {
  wrapper.classList.remove('open');
  const panel = wrapper.querySelector('.custom-dropdown-panel');
  panel.classList.remove('visible');
  // Wait for transition to finish before hiding
  panel.addEventListener('transitionend', function handler() {
    if (!wrapper.classList.contains('open')) {
      panel.style.display = 'none';
    }
    panel.removeEventListener('transitionend', handler);
  });
}

// Close dropdowns when clicking outside
document.addEventListener('click', function () {
  document.querySelectorAll('.custom-dropdown.open').forEach(d => closeDropdown(d));
});

/* ── Auto-generate mapping rows based on CO outcomes ── */
function buildMappingRow(index, totalRows) {
  const row = document.createElement('tr');
  row.dataset.coIndex = index;

  const coTd = document.createElement('td');
  coTd.textContent = `CO${index}`;
  row.appendChild(coTd);

  if (index === 1) {
    const progTd = document.createElement('td');
    progTd.rowSpan = totalRows;
    progTd.id = 'mapping-program-cell';
    progTd.textContent = 'Engineering Program';
    row.appendChild(progTd);
  }

  for (let j = 0; j < 12; j++) {
    const td = document.createElement('td');
    td.style.position = 'relative';
    td.appendChild(createCustomDropdown());
    row.appendChild(td);
  }

  return row;
}

function syncMappingRows() {
  const editorBody = document.getElementById('outcomes-editor-body');
  if (!editorBody) return;
  const total = editorBody.querySelectorAll('tr').length;

  // Clear existing mapping rows
  tableBody.innerHTML = '';

  for (let i = 1; i <= total; i++) {
    tableBody.appendChild(buildMappingRow(i, total));
  }

  // Update the program cell rowspan if it exists
  const progCell = document.getElementById('mapping-program-cell');
  if (progCell) progCell.rowSpan = total;
}

// Initial render — based on existing CO rows in the DOM
syncMappingRows();

/* ── Persistent placeholder for all contenteditable fields ── */
function initPersistentPlaceholder(el) {
  function update() {
    if (el.innerText.trim() === '') {
      el.classList.add('show-placeholder');
    } else {
      el.classList.remove('show-placeholder');
    }
  }
  // Hide CSS :empty::before so our class takes over
  el.addEventListener('input', update);
  update(); // run once on page load
}

document.querySelectorAll('[contenteditable][data-placeholder]').forEach(initPersistentPlaceholder);

// Re-init for dynamically added rows
const outcomesMutationObserver = new MutationObserver(() => {
  document.querySelectorAll('[contenteditable][data-placeholder]').forEach(el => {
    if (!el.dataset.placeholderInit) {
      el.dataset.placeholderInit = '1';
      initPersistentPlaceholder(el);
    }
  });
});
outcomesMutationObserver.observe(document.getElementById('outcomes-container'), { childList: true, subtree: true });

/* ── Concept Map image preview ── */
function previewConceptMap(input) {
  const file = input.files[0];
  if (!file) return;
  const wrapper = document.getElementById('concept-map-wrapper');
  const preview = document.getElementById('concept-map-preview');
  preview.src = URL.createObjectURL(file);
  wrapper.style.display = 'block';
}

function deleteConceptMap() {
  const wrapper = document.getElementById('concept-map-wrapper');
  const preview = document.getElementById('concept-map-preview');
  const input = document.getElementById('concept-map-input');
  preview.src = '';
  input.value = '';
  wrapper.style.display = 'none';
}

/* ── Course Outcomes Editor Table Logic ── */

let isSelecting = false;
let startCell = null;
let currentRange = { minR: -1, maxR: -1, minC: -1, maxC: -1 };

function execCmd(command) {
  // Focus the first cell in selection if exists
  const body = document.getElementById('outcomes-editor-body');
  if (body) {
    const first = body.querySelector('tr td.highlighted-cell .editable-cell');
    if (first) first.focus();
  }
  document.execCommand(command, false, null);
}

function renumberEditorRows() {
  const body = document.getElementById('outcomes-editor-body');
  if (!body) return;
  const rows = body.querySelectorAll('tr');
  rows.forEach((tr, i) => {
    tr.dataset.rowIndex = i.toString();
    const indexCell = tr.querySelector('.index-cell');
    if (indexCell) indexCell.textContent = (i + 1).toString();

    const tds = tr.querySelectorAll('td:not(.index-cell)');
    tds.forEach((td, j) => {
      td.dataset.colIndex = j.toString();
    });
  });
}

function addEditorRow() {
  const body = document.getElementById('outcomes-editor-body');
  if (!body) return;
  const tr = document.createElement('tr');

  // Index Column
  const tdIndex = document.createElement('td');
  tdIndex.className = 'index-cell no-pdf';
  tr.appendChild(tdIndex);

  for (let i = 0; i < 3; i++) {
    const td = document.createElement('td');
    const div = document.createElement('div');
    div.className = 'editable-cell';
    div.contentEditable = 'true';
    if (i === 0) {
      div.classList.add('co-cell');
      div.dataset.placeholder = 'e.g. CO1';
      initPersistentPlaceholder(div);
    }
    td.appendChild(div);
    tr.appendChild(td);

    td.addEventListener('mousedown', (e) => {
      isSelecting = true;
      const box = document.getElementById('table-selection-box');
      if (box) box.classList.add('dragging');
      updateRange(td, td);
    });
    td.addEventListener('mouseenter', (e) => {
      if (isSelecting) extendSelection(td);
    });
  }

  body.appendChild(tr);
  renumberEditorRows();
  syncMappingRows();
}

// Ensure dragging class is removed
document.addEventListener('mouseup', () => {
  isSelecting = false;
  const box = document.getElementById('table-selection-box');
  if (box) box.classList.remove('dragging');
});

function deleteEditorRow() {
  // Deletes rows intersecting with the current selection range
  if (currentRange.minR === -1) return;
  const body = document.getElementById('outcomes-editor-body');
  const rows = Array.from(body.querySelectorAll('tr'));

  // Rows to remove
  for (let i = currentRange.maxR; i >= currentRange.minR; i--) {
    if (rows[i]) rows[i].remove();
  }

  hideSelectionBox();
  renumberEditorRows();
  syncMappingRows();
}

function startSelection(td) {
  isSelecting = true;
  startCell = td;
  updateRange(td, td);
}

function extendSelection(td) {
  if (!isSelecting) return;
  updateRange(startCell, td);
}

function updateRange(c1, c2) {
  if (!c1 || !c2) return;
  startCell = c1;
  const r1 = parseInt(c1.closest('tr').dataset.rowIndex);
  const r2 = parseInt(c2.closest('tr').dataset.rowIndex);
  const col1 = parseInt(c1.dataset.colIndex);
  const col2 = parseInt(c2.dataset.colIndex);

  currentRange = {
    minR: Math.min(r1, r2),
    maxR: Math.max(r1, r2),
    minC: Math.min(col1, col2),
    maxC: Math.max(col1, col2)
  };

  renderSelection();
}

function renderSelection() {
  const body = document.getElementById('outcomes-editor-body');
  const container = document.querySelector('.outcomes-table-container');
  if (!body || !container || currentRange.minR === -1) return;

  const rows = body.querySelectorAll('tr');

  // Clear old highlights
  body.querySelectorAll('td.highlighted-cell').forEach(td => td.classList.remove('highlighted-cell'));
  document.querySelectorAll('.index-cell.selected').forEach(cell => cell.classList.remove('selected'));

  let minTop = Infinity, minLeft = Infinity, maxBottom = 0, maxRight = 0;
  let found = false;

  rows.forEach((tr, r) => {
    if (r >= currentRange.minR && r <= currentRange.maxR) {
      const indexCell = tr.querySelector('.index-cell');
      if (indexCell) indexCell.classList.add('selected');

      const tds = tr.querySelectorAll('td:not(.index-cell)');
      tds.forEach((td, c) => {
        if (c >= currentRange.minC && c <= currentRange.maxC) {
          if (td.style.display === 'none') return;

          td.classList.add('highlighted-cell');
          found = true;

          const t = td.offsetTop;
          const l = td.offsetLeft;
          const w = td.offsetWidth;
          const h = td.offsetHeight;

          minTop = Math.min(minTop, t);
          minLeft = Math.min(minLeft, l);
          maxBottom = Math.max(maxBottom, t + h);
          maxRight = Math.max(maxRight, l + w);
        }
      });
    }
  });

  const box = document.getElementById('table-selection-box');
  if (found) {
    box.style.display = 'block';
    box.style.top = (minTop - 1) + 'px'; // Sub-pixel nudge for alignment
    box.style.left = (minLeft - 1) + 'px';
    box.style.width = (maxRight - minLeft + 2) + 'px';
    box.style.height = (maxBottom - minTop + 2) + 'px';
  } else {
    box.style.display = 'none';
  }
}

function hideSelectionBox() {
  document.getElementById('table-selection-box').style.display = 'none';
  currentRange = { minR: -1, maxR: -1, minC: -1, maxC: -1 };
}

document.addEventListener('mouseup', () => {
  isSelecting = false;
});

// Initial Rows
document.addEventListener('DOMContentLoaded', () => {
  const body = document.getElementById('outcomes-editor-body');
  if (body) {
    addEditorRow();
    addEditorRow();
    addEditorRow();
  }
});

function toggleMerge() {
  if (currentRange.minR === -1 || currentRange.maxR === -1) {
    alert('Please select a range of cells to merge.');
    return;
  }

  const body = document.getElementById('outcomes-editor-body');
  const rows = body.querySelectorAll('tr');

  // Check if we are UNMERGING
  let isUnmerging = false;
  let targetCell = null;

  // Search the range for a cell that is already merged
  for (let r = currentRange.minR; r <= currentRange.maxR; r++) {
    const tr = rows[r];
    if (!tr) continue;
    const tds = tr.querySelectorAll('td:not(.index-cell)');
    for (let c = currentRange.minC; c <= currentRange.maxC; c++) {
      const td = tds[c];
      if (td && (td.rowSpan > 1 || td.colSpan > 1)) {
        isUnmerging = true;
        targetCell = td;
        break;
      }
    }
    if (isUnmerging) break;
  }

  if (isUnmerging && targetCell) {
    // --- UNMERGE LOGIC ---
    const firstR = parseInt(targetCell.closest('tr').dataset.rowIndex);
    const firstC = parseInt(targetCell.dataset.colIndex);
    const rs = targetCell.rowSpan;
    const cs = targetCell.colSpan;

    for (let r = firstR; r < firstR + rs; r++) {
      const tr = rows[r];
      const tds = tr.querySelectorAll('td:not(.index-cell)');
      for (let c = firstC; c < firstC + cs; c++) {
        const td = tds[c];
        if (td) {
          td.style.display = ''; // Restore visibility
          td.rowSpan = 1;
          td.colSpan = 1;
        }
      }
    }
  } else {
    // --- MERGE LOGIC ---
    let combinedHTML = '';
    const colSpan = currentRange.maxC - currentRange.minC + 1;
    const rowSpan = currentRange.maxR - currentRange.minR + 1;

    rows.forEach((tr, r) => {
      const rowIndex = parseInt(tr.dataset.rowIndex);
      if (rowIndex >= currentRange.minR && rowIndex <= currentRange.maxR) {
        const tds = tr.querySelectorAll('td:not(.index-cell)');
        tds.forEach(td => {
          const colIndex = parseInt(td.dataset.colIndex);
          if (colIndex >= currentRange.minC && colIndex <= currentRange.maxC) {
            if (td.style.display === 'none') return;

            const div = td.querySelector('.editable-cell');
            if (rowIndex === currentRange.minR && colIndex === currentRange.minC) {
              targetCell = td;
              combinedHTML = div.innerHTML;
            } else {
              if (div.innerText.trim() !== '') {
                combinedHTML += '<br>' + div.innerHTML;
              }
              td.style.display = 'none';
            }
          }
        });
      }
    });

    if (targetCell) {
      targetCell.rowSpan = rowSpan;
      targetCell.colSpan = colSpan;
      targetCell.querySelector('.editable-cell').innerHTML = combinedHTML;
      targetCell.style.display = '';
    }
  }

  hideSelectionBox();
  renumberEditorRows(); // Re-sync coordinates
}

function toggleWrap() {
  const body = document.getElementById('outcomes-editor-body');
  const highlighted = body.querySelectorAll('td.highlighted-cell .editable-cell');
  highlighted.forEach(div => {
    const isWrapped = div.style.whiteSpace === 'normal';
    div.style.whiteSpace = isWrapped ? 'nowrap' : 'normal';
  });
}
