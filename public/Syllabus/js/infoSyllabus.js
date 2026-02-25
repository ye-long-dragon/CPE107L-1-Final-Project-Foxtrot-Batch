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
    `;
    container.appendChild(newRow);
}

document.querySelectorAll('.course-info-container .course-editable-text').forEach(box => {
    box.addEventListener('keydown', function(e) {
        // 1. Allow control keys (Backspace, Delete, Arrows)
        if (e.key === 'Backspace' || e.key === 'Delete' || e.key.includes('Arrow')) {
            return;
        }

        // 2. Check if text is about to overflow the width
        // We use a 5px buffer to ensure it stops before touching the border
        if (this.scrollWidth > this.clientWidth - 5) {
            e.preventDefault();
        }
    });

    // 3. Prevent pasting long text that breaks the width
    box.addEventListener('paste', function(e) {
        e.preventDefault();
        const text = (e.clipboardData || window.clipboardData).getData('text');
        
        // Temporarily check if adding this text would overflow
        const tempSpan = document.createElement('span');
        tempSpan.style.visibility = 'hidden';
        tempSpan.style.whiteSpace = 'nowrap';
        tempSpan.style.font = window.getComputedStyle(this).font;
        tempSpan.innerText = this.innerText + text;
        document.body.appendChild(tempSpan);

        if (tempSpan.offsetWidth <= this.clientWidth - 15) {
            document.execCommand('insertText', false, text);
        }
        document.body.removeChild(tempSpan);
    });
});