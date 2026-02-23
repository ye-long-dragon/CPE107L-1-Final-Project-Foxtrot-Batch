document.addEventListener('DOMContentLoaded', () => {
    const modal = document.getElementById("addCourseModal");
    const openBtn = document.getElementById("openAddModalBtn");
    const closeBtn = document.querySelector(".close-modal");
    const toggleDeleteBtn = document.getElementById("toggleDeleteBtn");
    const courseGrid = document.querySelector(".course-grid");

    // Modal Interaction
    if (modal && openBtn && closeBtn) {
        openBtn.onclick = () => modal.style.display = "flex";
        closeBtn.onclick = () => modal.style.display = "none";
        window.onclick = (e) => { if (e.target == modal) modal.style.display = "none"; };
    }

    // Toggle Delete UI
    if (toggleDeleteBtn && courseGrid) {
        toggleDeleteBtn.onclick = () => {
            courseGrid.classList.toggle("delete-mode");
            if (courseGrid.classList.contains("delete-mode")) {
                toggleDeleteBtn.style.background = "#c0392b";
                toggleDeleteBtn.innerHTML = '<i class="fas fa-times"></i> Cancel Delete';
            } else {
                toggleDeleteBtn.style.background = "#e74c3c";
                toggleDeleteBtn.innerHTML = '<i class="fas fa-trash"></i> Delete Course';
            }
        };
    }
});