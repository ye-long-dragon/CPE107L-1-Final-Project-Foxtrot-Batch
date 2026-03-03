document.addEventListener('DOMContentLoaded', () => {
    const userForm = document.getElementById('userConfigForm');
    const searchInput = document.querySelector('input[placeholder="Filter by Name or ID..."]');
    
    // Select rows dynamically inside the event to ensure we always have the current list
    const getRows = () => document.querySelectorAll('tbody tr');


    // For create new users:
    if (userForm) {
        userForm.addEventListener('submit', async (e) => {
            // 1. Prevent the default EJS form submission (stops page refresh)
            e.preventDefault();

            // 2. Grab inputs for validation logic
            const firstName = document.getElementById('firstName').value.trim();
            const middleName = document.getElementById('middleName').value.trim();
            const lastName = document.getElementById('lastName').value.trim();
            const email = document.getElementById('email').value.trim().toLowerCase();
            const employeeId = document.getElementById('employeeId').value.trim();
            const password = document.getElementById('password').value; 
            const role = document.getElementById('role').value;
            const employmentType = document.getElementById('employmentType').value;
            const department = document.getElementById('department-select').value;
            const program = document.getElementById('program-select').value;
            
            if (!firstName || !lastName || !email || !role || !department || !program) {
                alert("VALIDATION ERROR: Please fill in all required fields.");
                return;
            }

            const mcmRegex = /^[a-zA-Z0-9._%+-]+@mcm\.edu\.ph$/;

            if (!mcmRegex.test(email)) {
                alert("ACCESS DENIED: You must use an official @mcm.edu.ph email address.");
                document.getElementById('email').focus();
                return;
            }

            if (password.length < 6) {
                alert("SECURITY ERROR: Passwords must be at least 6 characters long.");
                document.getElementById('password').focus();
                return;
            }

            const userData = {
                firstName,
                middleName,
                lastName,
                email,
                employeeId,
                password,
                role,
                employmentType,
                department,
                program
            };

            try {
                console.log("Cleaned Data being sent:", userData);
                const response = await axios.post('/admin/users/add', userData);

                if (response.status === 201) {
                    alert(`Account for ${firstName} ${lastName} created successfully!`);
                    window.location.reload();
                }
            } catch (error) {
                console.error("DEBUG ERROR OBJECT:", error);

                if (error.response) {e
                    console.log("Server Data:", error.response.data);
                    console.log("Server Status:", error.response.status);
                    alert(`Server Error (${error.response.status}): See console for details.`);
                } else if (error.request) {
                    alert("No response from server. Is the server running?");
                } else {
                    alert("Request Error: " + error.message);
                }
            }
        });
    }

    // --- 1. SEARCH/FILTER LOGIC ---
    if (searchInput) {
        searchInput.addEventListener('keyup', (e) => {
            const term = e.target.value.toLowerCase();
            getRows().forEach(row => {
                if (row.cells.length > 1) { 
                    const text = row.innerText.toLowerCase();
                    row.style.display = text.includes(term) ? '' : 'none';
                }
            });
        });
    }

    // --- 2. DELETE CONFIRMATION ---
    // Using event delegation to ensure it works even if rows are added/removed
    document.addEventListener('submit', (e) => {
        if (e.target.matches('form[action^="/admin/users/delete/"]')) {
            const confirmed = confirm("Are you sure you want to permanently delete this user account?");
            if (!confirmed) {
                e.preventDefault();
            }
        }
    });
});

// --- 4. EDIT USER LOGIC ---
function editUser(userId) {
    const idString = String(userId);

    // 1. Locate the row
    const editBtn = document.querySelector(`button[onclick="editUser('${idString}')"]`);
    const row = editBtn.closest('tr');
    
    // 2. Extract data from hidden data-attributes (THE FIX IS HERE)
    const middleName = row.getAttribute('data-middle') || "";
    const employmentType = row.getAttribute('data-employment') || "";
    const roleValue = row.getAttribute('data-role') || ""; // CHANGED: Now pulls from attribute

    // 3. Extract data from cells
    const email = row.cells[0].querySelector('small').innerText.trim();
    const employeeId = row.cells[2].innerText.trim();
    
    // Parse Name & Department/Program
    const fullNameText = row.cells[0].querySelector('strong').innerText; 
    const [lastName, firstAndMiddle] = fullNameText.split(', ');
    const firstName = middleName ? firstAndMiddle.replace(middleName, "").trim() : firstAndMiddle.trim();
    
    const deptProgramText = row.cells[1].querySelector('small').innerText; 
    const [program, department] = deptProgramText.split(' | ');

    // 4. Fill the form fields
    document.getElementById('firstName').value = firstName;
    document.getElementById('middleName').value = middleName;
    document.getElementById('lastName').value = lastName.trim();
    document.getElementById('email').value = email;
    document.getElementById('employeeId').value = employeeId;
    
    // 5. Handle all select dropdowns
    document.getElementById('role').value = roleValue; // Now correctly matches "Program-Chair"
    document.getElementById('employmentType').value = employmentType;
    
    document.getElementById('btn-cancel').style.display = "inline-block"; 

    const deptSelect = document.getElementById('department-select');
    if (deptSelect) {
        deptSelect.value = department.trim();
        deptSelect.dispatchEvent(new Event('change'));

        setTimeout(() => {
            const progSelect = document.getElementById('program-select');
            if (progSelect) progSelect.value = program.trim();
        }, 50);
    }

    // 6. UI Updates
    const passwordInput = document.getElementById('password');
    if (passwordInput) {
        passwordInput.required = false; 
        passwordInput.placeholder = "(Leave blank to keep current)";
    }

    window.scrollTo({ top: 0, behavior: 'smooth' });

    const submitBtn = document.querySelector('.btn-submit');
    submitBtn.innerText = "Update User Profile";
    submitBtn.style.backgroundColor = "#002455";
    
    const form = document.getElementById('userConfigForm');
    form.action = `/admin/users/update/${idString}`;
    
    document.querySelector('.form-title').innerText = `Editing User: ${firstName} ${lastName}`;
}

function resetForm() {
    const form = document.getElementById('userConfigForm');
    form.reset();
    form.action = "/admin/users/add";

    document.getElementById('btn-cancel').style.display = "none";

    document.querySelector('.btn-submit').innerText = "Create Account";
    document.querySelector('.btn-submit').style.backgroundColor = "";
    document.querySelector('.form-title').innerText = "Register New Faculty/Staff";
    
    const passwordInput = document.getElementById('password');
    if (passwordInput) {
        passwordInput.required = true;
        passwordInput.placeholder = "";
    }
}