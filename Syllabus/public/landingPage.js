document.addEventListener('DOMContentLoaded', () => {
  function format(command) {
    document.execCommand(command, false, null);
  }

  function handleFile(input) {
    const file = input.files[0];
    if (!file) return;
    alert('File attached: ' + file.name);
  }

  function goBack() {
    window.history.back();
  }

  function postAnnouncement() {
    const editor = document.getElementById('editorInput');
    if (!editor) return;
    if (editor.innerHTML.trim() === '') {
      alert('Please write something before submitting.');
      return;
    }
    alert('Announcement Submitted!');
  }

  // DARK/LIGHT MODE
  const toggleBtn = document.getElementById('themeToggle');
  if (toggleBtn) {
    toggleBtn.addEventListener('click', () => {
      document.body.classList.toggle('dark-mode');
      toggleBtn.textContent = document.body.classList.contains('dark-mode') ? 'Light Mode' : 'Dark Mode';
    });
  }

  // TOOLBOX FUNCTIONALITY
  const editor = document.querySelector('.editor-area');

  // Generic formatting
  window.formatDoc = function (command, value = null) {
    const e = document.querySelector('.editor-area');
    if (!e) return;

    if (['justifyLeft', 'justifyCenter', 'justifyRight'].includes(command)) {
      const selection = window.getSelection();
      if (!selection.rangeCount) return;
      const range = selection.getRangeAt(0);
      let parentBlock = range.startContainer;
      while (parentBlock && !['P', 'DIV', 'H1', 'H2', 'H3', 'LI', 'TD', 'TH'].includes(parentBlock.nodeName)) {
        parentBlock = parentBlock.parentElement;
      }
      if (parentBlock) {
        if (command === 'justifyLeft') parentBlock.style.textAlign = 'left';
        if (command === 'justifyCenter') parentBlock.style.textAlign = 'center';
        if (command === 'justifyRight') parentBlock.style.textAlign = 'right';
      }
    } else {
      document.execCommand(command, false, value);
    }
    e.focus();
  };

  // Font family
  window.setFont = function (fontName) {
    document.execCommand('fontName', false, fontName);
    const e = document.querySelector('.editor-area');
    if (e) e.focus();
  };

  // Font color
  window.setColor = function (color) {
    document.execCommand('foreColor', false, color);
    const e = document.querySelector('.editor-area');
    if (e) e.focus();
  };

  // Insert link
  window.addLink = function () {
    let url = prompt('Enter the URL:');
    if (url) {
      document.execCommand('createLink', false, url);
    }
    const e = document.querySelector('.editor-area');
    if (e) e.focus();
  };

  // Attach file
  window.attachFile = function (event) {
    const file = event.target.files[0];
    if (!file) return;
    const link = URL.createObjectURL(file);
    const html = `<a href="${link}" download="${file.name}">${file.name}</a><br>`;
    document.execCommand('insertHTML', false, html);
    const e = document.querySelector('.editor-area');
    if (e) e.focus();
  };

  // Insert image
  window.insertImage = function (event) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function (e) {
      document.execCommand('insertImage', false, e.target.result);
    };
    reader.readAsDataURL(file);
    const ed = document.querySelector('.editor-area');
    if (ed) ed.focus();
  };

  // Clear formatting
  window.clearFormat = function () {
    document.execCommand('removeFormat', false, null);
    const e = document.querySelector('.editor-area');
    if (e) e.focus();
  };

  // Undo
  window.undo = function () {
    document.execCommand('undo', false, null);
    const e = document.querySelector('.editor-area');
    if (e) e.focus();
  };

  // TABLE GRID INSERT
  const tableSelector = document.getElementById('tableSelector');
  const tableSizeText = document.getElementById('tableSizeText');

  if (tableSelector && tableSizeText) {
    let selectedRows = 0;
    let selectedCols = 0;

    for (let i = 0; i < 100; i++) {
      const cell = document.createElement('div');
      cell.dataset.index = i;
      tableSelector.appendChild(cell);
    }

    tableSelector.addEventListener('mousemove', e => {
      if (!e.target.dataset.index) return;
      const index = parseInt(e.target.dataset.index);
      selectedCols = (index % 10) + 1;
      selectedRows = Math.floor(index / 10) + 1;
      tableSizeText.textContent = `${selectedRows} x ${selectedCols}`;

      Array.from(tableSelector.children).forEach((cell, i) => {
        const cellCol = (i % 10) + 1;
        const cellRow = Math.floor(i / 10) + 1;
        if (cellCol <= selectedCols && cellRow <= selectedRows) cell.classList.add('hovered');
        else cell.classList.remove('hovered');
      });
    });

    tableSelector.addEventListener('click', e => {
      if (!e.target.dataset.index) return;
      let table = "<table border='1' style='border-collapse:collapse; width:100%;'>";
      for (let i = 0; i < selectedRows; i++) {
        table += '<tr>';
        for (let j = 0; j < selectedCols; j++) {
          table += "<td>&nbsp;</td>";
        }
        table += '</tr>';
      }
      table += "</table><br>";
      document.execCommand('insertHTML', false, table);
      const eed = document.querySelector('.editor-area');
      if (eed) eed.focus();

      Array.from(tableSelector.children).forEach(cell => cell.classList.remove('hovered'));
      tableSizeText.textContent = '0 x 0';
      selectedRows = 0;
      selectedCols = 0;
    });
  }

  // Expose helpers globally
  window.handleFile = handleFile;
  window.goBack = goBack;
  window.postAnnouncement = postAnnouncement;
  window.format = format;
});

// PDF Export Function with Page Break Handling
window.exportToPDF = function () {
  const contentPanel = document.querySelector('.content-panel');
  if (!contentPanel) {
    alert('No content found to export');
    return;
  }

  const element = contentPanel.cloneNode(true);

  // Remove unwanted UI elements
  element.querySelectorAll('.editor-toolbar, .pdf-preview-btn, .home-bottom-wrapper')
    .forEach(el => el.remove());

  // Remove borders from non-section elements only
  element.style.border = 'none';
  
  // Change content-card borders to thin (1px) for PDF only
  element.querySelectorAll('.content-card').forEach(card => {
    card.style.border = '1px solid #222';
  });
  
  element.querySelectorAll('.content-label').forEach(label => {
    label.style.borderBottom = 'none';
  });
  element.querySelectorAll('.icon-select, .icon-color, .attach-btn').forEach(btn => {
    btn.style.border = 'none';
  });
  element.querySelectorAll('.editor-area').forEach(area => {
    area.style.border = 'none';
  });

  const opt = {
    margin:       0,
    filename:     'Syllabus_Preview.pdf',
    image:        { type: 'jpeg', quality: 1 },
    html2canvas:  { 
      scale: 3,            // Higher quality
      useCORS: true,
      scrollY: 0
    },
    jsPDF:        { 
      unit: 'mm', 
      format: 'a4', 
      orientation: 'portrait' 
    },
    pagebreak: { mode: ['css'] } // IMPORTANT
  };

  html2pdf().set(opt).from(element).save();
};

// Save syllabus form and go to preview (so preview can show the PDF)
window.saveSyllabusAndGoToPreview = function () {
  const cards = document.querySelectorAll('.content-card');
  const data = [];
  cards.forEach(function (card) {
    const labelEl = card.querySelector('.content-label');
    const bodyEl = card.querySelector('.content-body');
    var label = labelEl ? labelEl.innerText.trim() : '';
    var body = bodyEl ? bodyEl.innerHTML : '';
    data.push({ label: label, body: body });
  });
  sessionStorage.setItem('syllabusPreviewData', JSON.stringify(data));
  window.location.href = '/preview';
};

// Load saved syllabus into preview and display as PDF (called on preview page)
window.loadPreviewAndShowPDF = function () {
  var container = document.getElementById('previewContent');
  if (!container) return;
  var raw = sessionStorage.getItem('syllabusPreviewData');
  if (!raw) {
    container.innerHTML = '<p>No syllabus data. Go to Syllabus and click Next to see the PDF here.</p>';
    return;
  }
  var data = [];
  try {
    data = JSON.parse(raw);
  } catch (e) {
    container.innerHTML = '<p>Could not load preview data.</p>';
    return;
  }
  var html = '';
  data.forEach(function (item) {
    var label = (item.label || '').toUpperCase();
    var body = item.body || '';
    html += '<div class="content-card">' +
      '<div class="content-label">' + escapeHtml(label) + '</div>' +
      '<div class="content-body">' + body + '</div></div>';
  });
  function escapeHtml(text) {
    var div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
  container.innerHTML = html;
  // Generate PDF and show it in the preview area
  var contentPanel = document.querySelector('.content-panel');
  if (!contentPanel) return;
  var element = contentPanel.cloneNode(true);
  element.querySelectorAll('.home-bottom-wrapper').forEach(function (el) { el.remove(); });
  var opt = {
    margin: 10,
    filename: 'Syllabus_Preview.pdf',
    image: { type: 'jpeg', quality: 1 },
    html2canvas: { scale: 2, useCORS: true },
    jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
  };
  html2pdf().set(opt).from(element).outputPdf('blob').then(function (blob) {
    var url = URL.createObjectURL(blob);
    container.innerHTML = '<iframe src="' + url + '" style="width:100%;height:100%;min-height:70vh;border:none;" title="Syllabus PDF"></iframe>';
  }).catch(function (err) {
    container.innerHTML = '<p>Could not generate PDF. Try again or check the browser console.</p>';
    console.error('html2pdf error:', err);
  });
}


