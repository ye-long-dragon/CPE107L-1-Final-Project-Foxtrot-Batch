function format(command) {
  document.execCommand(command, false, null);
}

function handleFile(input) {
  const file = input.files[0];
  if (!file) return;

  alert("File attached: " + file.name);
}

/* Dynamic Alphabetical Numbering for Student Outcomes */
function addSoRow() {
    const container = document.getElementById('so-container');
    const rows = container.getElementsByClassName('peo-row');
    const nextIndex = rows.length; 
    
    // 97 is 'a' in ASCII. 0=a, 1=b, etc.
    const letter = String.fromCharCode(97 + nextIndex); 

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
    `;
    container.appendChild(rowDiv);
}

/* Dynamic Numeric Numbering for PEO */
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
    `;
    container.appendChild(rowDiv);
}