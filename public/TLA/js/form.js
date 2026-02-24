// form.js - TLA Form functionality

document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('tla-form');
    
    if (form) {
        form.addEventListener('submit', function(e) {
            e.preventDefault();
            
            // Basic validation
            const requiredFields = form.querySelectorAll('[required]');
            let isValid = true;
            
            requiredFields.forEach(field => {
                if (!field.value.trim()) {
                    isValid = false;
                    field.style.borderColor = 'red';
                } else {
                    field.style.borderColor = '';
                }
            });
            
            if (isValid) {
                // Submit form data
                const formData = new FormData(form);
                const data = Object.fromEntries(formData.entries());
                
                console.log('Form submitted:', data);
                alert('TLA Form submitted successfully!');
                
                // Reset form
                form.reset();
            } else {
                alert('Please fill in all required fields');
            }
        });
    }
    
    // Attachment buttons
    const attachButtons = document.querySelectorAll('.attach-btn');
    attachButtons.forEach(button => {
        button.addEventListener('click', function() {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = '*/*';
            input.onchange = function(e) {
                const file = e.target.files[0];
                if (file) {
                    alert(`File selected: ${file.name}`);
                    button.textContent = `📎 ${file.name}`;
                }
            };
            input.click();
        });
    });
});
