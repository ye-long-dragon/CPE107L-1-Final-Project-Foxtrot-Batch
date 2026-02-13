
function format(command) {
  document.execCommand(command, false, null);
}

function handleFile(input) {
  const file = input.files[0];
  if (!file) return;

  alert("File attached: " + file.name);
}

function goBack() {
  window.history.back();
}

function postAnnouncement() {
  const editor = document.getElementById("editorInput");

  if (editor.innerHTML.trim() === "") {
    alert("Please write something before submitting.");
    return;
  }

  alert("Announcement Submitted!");
}




// DARK/LIGHT MODE

const toggleBtn = document.getElementById("themeToggle");

toggleBtn.addEventListener("click", () => {
  document.body.classList.toggle("dark-mode");

  if (document.body.classList.contains("dark-mode")) {
    toggleBtn.textContent = "Light Mode";
  } else {
    toggleBtn.textContent = "Dark Mode";
  }
});



// TOOL BOX
// ====================
// TOOLBOX FUNCTIONALITY
// ====================

const editor = document.querySelector('.editor-area');

// Generic formatting
function formatDoc(command, value = null) {
  if (!editor) return;

  // Special handling for alignment
  if (['justifyLeft', 'justifyCenter', 'justifyRight'].includes(command)) {
    const selection = window.getSelection();
    if (!selection.rangeCount) return;

    const range = selection.getRangeAt(0);
    let parentBlock = range.startContainer;

    // climb up to nearest block element
    while (parentBlock && !['P', 'DIV', 'H1', 'H2', 'H3', 'LI', 'TD', 'TH'].includes(parentBlock.nodeName)) {
      parentBlock = parentBlock.parentElement;
    }

    if (parentBlock) {
      if (command === 'justifyLeft') parentBlock.style.textAlign = 'left';
      if (command === 'justifyCenter') parentBlock.style.textAlign = 'center';
      if (command === 'justifyRight') parentBlock.style.textAlign = 'right';
    }
  } 
  else {
    document.execCommand(command, false, value);
  }

  editor.focus(); // keep cursor inside editor
}

// Font family
function setFont(fontName) {
  document.execCommand("fontName", false, fontName);
  editor.focus();
}

// Font color
function setColor(color) {
  document.execCommand("foreColor", false, color);
  editor.focus();
}

// Insert link
function addLink() {
  let url = prompt("Enter the URL:");
  if (url) {
    document.execCommand("createLink", false, url);
  }
  editor.focus();
}

// Attach file
function attachFile(event) {
  const file = event.target.files[0];
  if (!file) return;

  const link = URL.createObjectURL(file);
  const html = `<a href="${link}" download="${file.name}">${file.name}</a><br>`;
  document.execCommand("insertHTML", false, html);
  editor.focus();
}

// Insert image
function insertImage(event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function(e) {
    document.execCommand("insertImage", false, e.target.result);
  };
  reader.readAsDataURL(file);
  editor.focus();
}

// Clear formatting
function clearFormat() {
  document.execCommand('removeFormat', false, null);
  editor.focus();
}

// Undo
function undo() {
  document.execCommand('undo', false, null);
  editor.focus();
}

// ====================
// TABLE GRID INSERT (Dropdown Version)
// ====================

const tableSelector = document.getElementById('tableSelector');
const tableSizeText = document.getElementById('tableSizeText');

if (tableSelector && tableSizeText) {
  let selectedRows = 0;
  let selectedCols = 0;

  // Create 10x10 grid
  for (let i = 0; i < 100; i++) {
    const cell = document.createElement('div');
    cell.dataset.index = i;
    tableSelector.appendChild(cell);
  }

  // Highlight cells on hover
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

  // Insert table on click
  tableSelector.addEventListener('click', e => {
    if (!e.target.dataset.index) return;

    let table = "<table border='1' style='border-collapse:collapse; width:100%;'>";
    for (let i = 0; i < selectedRows; i++) {
      table += "<tr>";
      for (let j = 0; j < selectedCols; j++) {
        table += "<td>&nbsp;</td>";
      }
      table += "</tr>";
    }
    table += "</table><br>";

    document.execCommand('insertHTML', false, table);
    editor.focus();

    // Reset hover
    Array.from(tableSelector.children).forEach(cell => cell.classList.remove('hovered'));
    tableSizeText.textContent = '0 x 0';
    selectedRows = 0;
    selectedCols = 0;
  });
}
