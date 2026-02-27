// ==========================================
// 1. HAMBURGER MENU & UI UTILITIES
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
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
    
    // Run visibility check on load!
    window.handleInnerSectionVisibility();
});

// Back Button
const backButton = document.querySelector('.back-button');
if (backButton) {
    backButton.addEventListener('click', () => {
        window.location.href = '/ata-main';
    });
}

// ==========================================
// 2. SIMULATION STATE (With Memory!)
// ==========================================
// Check if we have a saved role, otherwise default to Professor
const savedUser = localStorage.getItem('ata_sim_user');
window.currentUser = savedUser ? JSON.parse(savedUser) : {
    role: "Professor",           
    employmentType: "Full-Time", 
    employmentFromOutside: false
};

// Apply saved settings on page load
document.addEventListener('DOMContentLoaded', () => {
    // Update the dropdowns to match current state
    const roleSelect = document.getElementById('simRole');
    const typeSelect = document.getElementById('simType');
    
    if(roleSelect && typeSelect) {
        roleSelect.value = window.currentUser.role;
        typeSelect.value = window.currentUser.employmentType;
    }

    // Run visibility check immediately
    if(window.handleInnerSectionVisibility) window.handleInnerSectionVisibility();
});

// ==========================================
// 3. VISIBILITY LOGIC (The Rules)
// ==========================================

// Rule: Can I visit this step page?
window.isStepVisible = function(stepNumber) {
    const isPartTime = (window.currentUser.employmentType === "Part-Time");
    const isAdmin = (window.currentUser.role === "Program-Chair" || window.currentUser.role === "Dean");

    switch(stepNumber) {
        case 1: return true; 
        case 2: return true; 
        case 3: return true; 
        
        case 4: // Section F: Outside Employment
            return isPartTime; // HIDDEN unless Part-Time

        case 5: return true; 
        case 6: return true; 
        
        case 7: // Section H: Approval
            return isAdmin; // HIDDEN unless Admin

        default: return false;
    }
};

// Rule: Hide specific boxes INSIDE a page (Section A & D)
window.handleInnerSectionVisibility = function() {
    const isAdmin = (window.currentUser.role === "Program-Chair" || window.currentUser.role === "Dean");

    // Existing section hiding logic...
    const sectionA = document.getElementById('sectionA_Container'); 
    if (sectionA) sectionA.style.display = isAdmin ? 'block' : 'none';

    const sectionD = document.getElementById('sectionD_Container');
    if (sectionD) sectionD.style.display = isAdmin ? 'block' : 'none';

    // 👇 NEW: Dashboard Button Logic 👇
    const dashboardBtn = document.getElementById('adminCourseBtn');
    if (dashboardBtn) {
        // We use 'inline-block' or 'block' to make it visible
        dashboardBtn.style.display = isAdmin ? 'block' : 'none';
    }
};
// ==========================================
// 4. SIMULATION APPLIER
// ==========================================
window.applySimulation = function() {
    const roleSelect = document.getElementById('simRole').value;
    const typeSelect = document.getElementById('simType').value;

    // 1. Update Global User
    window.currentUser.role = roleSelect;
    window.currentUser.employmentType = typeSelect;
    window.currentUser.employmentFromOutside = (typeSelect === "Part-Time");

    // 2. SAVE TO STORAGE (Persistence)
    localStorage.setItem('ata_sim_user', JSON.stringify(window.currentUser));

    // 3. Reset UI (If on Form Page)
    if(window.updateFormDisplay) {
        window.currentStep = 1; 
        window.updateFormDisplay();
    }
    
    // 4. Force re-check of hidden sections (Dashboard & Form)
    if(window.handleInnerSectionVisibility) window.handleInnerSectionVisibility(); 

    alert(`✅ Role switched to: ${roleSelect}`);
};

// ==========================================
// 5. NEXT BUTTON LOGIC
// ==========================================
const nextBtn = document.getElementById('nextBtn');

if (nextBtn) {
    nextBtn.addEventListener('click', async function() {
        
        // A. SUBMIT
        if (this.textContent === 'Finish' || this.textContent === 'Submit') {
            alert("Submitting form... (Logic placeholder)");
            // ... (Your existing fetch/submit code goes here) ...
            return;
        }

        // B. NAVIGATION (Smart Skip)
        let nextStepCandidate = window.currentStep + 1;

        // Keep adding +1 until we find a allowed step
        while (nextStepCandidate <= 7 && !window.isStepVisible(nextStepCandidate)) {
            console.log(`Skipping Step ${nextStepCandidate} (Not allowed)`);
            nextStepCandidate++;
        }

        if (nextStepCandidate <= 7) {
            window.currentStep = nextStepCandidate;
            if(window.updateFormDisplay) window.updateFormDisplay();
            window.handleInnerSectionVisibility();
        } else {
            alert("End of form.");
        }
    });
}