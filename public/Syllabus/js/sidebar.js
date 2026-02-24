// sidebar.js - Load sidebar partial into all pages

document.addEventListener('DOMContentLoaded', function() {
    const sidebarContainer = document.getElementById('sidebar-container');
    
    if (sidebarContainer) {
        fetch('/views/partials/sidebar.html')
            .then(response => response.text())
            .then(html => {
                sidebarContainer.innerHTML = html;
            })
            .catch(error => {
                console.error('Error loading sidebar:', error);
            });
    }
});
