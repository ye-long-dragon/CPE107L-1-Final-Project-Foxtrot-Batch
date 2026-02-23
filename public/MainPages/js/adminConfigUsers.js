document.addEventListener('DOMContentLoaded', () => {
    const userForm = document.getElementById('userConfigForm');
    const searchInput = document.querySelector('input[placeholder="Filter by Name or ID..."]');
    const tableRows = document.querySelectorAll('tbody tr');

    // --- 1. SEARCH/FILTER LOGIC ---
    if (searchInput) {
        searchInput.addEventListener('keyup', (e) => {
            const term = e.target.value.toLowerCase();
            
            tableRows.forEach(row => {
                const text = row.innerText.toLowerCase();
                row.style.display = text.includes(term) ? '' : 'none';
            });
        });
    }

    // --- 2. DELETE CONFIRMATION ---
    // We attach listeners to the forms to prevent accidental deletions
    const deleteForms = document.querySelectorAll('form[action^="/admin/users/delete/"]');
    deleteForms.forEach(form => {
        form.addEventListener('submit', (e) => {
            const confirmed = confirm("Are you sure you want to permanently delete this user account?");
            if (!confirmed) {
                e.preventDefault();
            }
        });
    });
});

// --- 3. EDIT USER LOGIC ---
/**
 * Populates the registration form with existing user data for editing
 * @param {String} userId - The MongoDB ID of the user
 */
function editUser(userId) {
    // In a real production app, you might fetch fresh data from an API:
    // fetch(`/admin/users/api/${userId}`).then(res => res.json())...
    
    const row = document.querySelector(`button[onclick="editUser('${userId}')"]`).closest('tr');
    
    const nameText = row.cells[0].querySelector('strong').innerText;
    const email = row.cells[0].querySelector('small').innerText;
    const employeeId = row.cells[2].innerText;
    
    const [lastName, firstName] = nameText.split(', ');

    document.querySelector('input[name="firstName"]').value = firstName;
    document.querySelector('input[name="lastName"]').value = lastName;
    document.querySelector('input[name="email"]').value = email;
    document.querySelector('input[name="employeeId"]').value = employeeId;

    window.scrollTo({ top: 0, behavior: 'smooth' });

    const submitBtn = document.querySelector('.btn-submit');
    submitBtn.innerText = "Update User Profile";
    submitBtn.style.backgroundColor = "#002455";
    
    const form = document.getElementById('userConfigForm');
    form.action = `/admin/users/update/${userId}`;
    
}