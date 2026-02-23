// Hamburger Menu Toggle
const hamburgerMenu = document.getElementById('hamburgerMenu');
const sidebar = document.getElementById('sidebar');
const sidebarOverlay = document.getElementById('sidebarOverlay');

if (hamburgerMenu && sidebar && sidebarOverlay) {
    hamburgerMenu.addEventListener('click', () => {
        hamburgerMenu.classList.toggle('active');
        sidebar.classList.toggle('active');
        sidebarOverlay.classList.toggle('active');
    });

    sidebarOverlay.addEventListener('click', () => {
        hamburgerMenu.classList.remove('active');
        sidebar.classList.remove('active');
        sidebarOverlay.classList.remove('active');
    });
}

// Back Button functionality (for dashboard back button)
const backBtn = document.querySelector('.back-button');
if (backBtn) {
    backBtn.addEventListener('click', () => {
        window.location.href = '/ata-main';
    });
}