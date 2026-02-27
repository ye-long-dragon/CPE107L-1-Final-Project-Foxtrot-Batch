document.addEventListener('DOMContentLoaded', () => {
    const modal = document.getElementById("addCourseModal");
    const openBtn = document.getElementById("openAddModalBtn");
    const closeBtn = document.getElementById("closeModalBtn");
    const cancelBtn = document.getElementById("cancelModalBtn");
    const toggleDeleteBtn = document.getElementById("toggleDeleteBtn");
    const courseGrid = document.querySelector(".course-grid");
    const instructorSelect = document.getElementById("assignedInstructor");
    const instructorHint = document.getElementById("instructorHint");
    const addCourseForm = document.getElementById("addCourseForm");

    // Image upload elements
    const uploadZone = document.getElementById("imageUploadZone");
    const uploadPlaceholder = document.getElementById("uploadPlaceholder");
    const uploadPreview = document.getElementById("uploadPreview");
    const previewImage = document.getElementById("previewImage");
    const removeImageBtn = document.getElementById("removeImageBtn");
    const courseImageInput = document.getElementById("courseImageInput");

    // =========================================
    // Modal Open — fetch users & display panel
    // =========================================
    if (modal && openBtn) {
        openBtn.onclick = () => {
            // Reset form fields when opening
            if (addCourseForm) addCourseForm.reset();
            resetImageUpload();
            clearFormError();

            // Show modal with unfocused background
            modal.style.display = "flex";

            // Fetch instructor list from database
            fetchInstructors();
        };
    }

    // =========================================
    // Modal Close — multiple close methods
    // =========================================
    function closeModal() {
        modal.style.display = "none";
        clearFormError();
    }

    if (closeBtn) closeBtn.onclick = closeModal;
    if (cancelBtn) cancelBtn.onclick = closeModal;

    // Close on overlay click (outside the panel)
    window.onclick = (e) => {
        if (e.target === modal) closeModal();
    };

    // Close on Escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && modal && modal.style.display === 'flex') {
            closeModal();
        }
    });

    // =========================================
    // Fetch Instructors from Database
    // =========================================
    async function fetchInstructors() {
        if (!instructorSelect || !instructorHint) return;

        // Show loading state
        instructorHint.textContent = "Loading instructors from database...";
        instructorHint.className = "form-hint";

        try {
            const response = await fetch('/courses/api/users');
            const users = await response.json();

            // Clear existing options (keep the default)
            instructorSelect.innerHTML = '<option value="">— Select an Instructor —</option>';

            if (users.length > 0) {
                users.forEach(user => {
                    const option = document.createElement('option');
                    option.value = user._id;
                    option.textContent = `${user.firstName} ${user.lastName}`;

                    // Show role as additional context if available
                    if (user.role) {
                        option.textContent += ` (${user.role})`;
                    }

                    instructorSelect.appendChild(option);
                });

                instructorHint.textContent = `${users.length} instructor(s) available`;
                instructorHint.className = "form-hint loaded";
            } else {
                instructorHint.textContent = "No instructors found in database — field is optional";
                instructorHint.className = "form-hint empty";
            }
        } catch (error) {
            console.error("Error fetching instructors:", error);
            instructorHint.textContent = "Could not load instructors — field is optional";
            instructorHint.className = "form-hint error";
        }
    }

    // =========================================
    // Form Submit — AJAX with duplicate check
    // =========================================
    const formError = document.getElementById('formError');
    const formErrorText = document.getElementById('formErrorText');
    const courseTitleInput = document.getElementById('courseTitle');
    const courseCodeInput = document.getElementById('courseCode');

    if (addCourseForm) {
        addCourseForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            clearFormError();

            const formData = new FormData(addCourseForm);

            try {
                const response = await fetch(addCourseForm.action, {
                    method: 'POST',
                    body: formData
                });

                const result = await response.json();

                if (response.ok && result.success) {
                    // Success — redirect to the courses page
                    window.location.href = result.redirect;
                } else if (result.error === 'duplicate') {
                    // Show duplicate error in modal
                    showFormError(result.message, result.field);
                } else {
                    showFormError(result.message || 'An error occurred while adding the course.');
                }
            } catch (error) {
                console.error('Form submission error:', error);
                showFormError('An unexpected error occurred. Please try again.');
            }
        });
    }

    function showFormError(message, field) {
        if (formError && formErrorText) {
            formErrorText.textContent = message;
            formError.style.display = 'flex';

            // Re-trigger shake animation
            formError.style.animation = 'none';
            formError.offsetHeight; // force reflow
            formError.style.animation = '';

            // Highlight the offending input field
            if (field === 'courseCode' && courseCodeInput) {
                courseCodeInput.classList.add('input-error');
                courseCodeInput.focus();
            } else if (field === 'courseTitle' && courseTitleInput) {
                courseTitleInput.classList.add('input-error');
                courseTitleInput.focus();
            }
        }
    }

    function clearFormError() {
        if (formError) formError.style.display = 'none';
        if (courseTitleInput) courseTitleInput.classList.remove('input-error');
        if (courseCodeInput) courseCodeInput.classList.remove('input-error');
    }

    // Clear error highlight when user starts typing in the errored field
    if (courseTitleInput) {
        courseTitleInput.addEventListener('input', () => {
            courseTitleInput.classList.remove('input-error');
            if (formError && formError.style.display !== 'none') clearFormError();
        });
    }
    if (courseCodeInput) {
        courseCodeInput.addEventListener('input', () => {
            courseCodeInput.classList.remove('input-error');
            if (formError && formError.style.display !== 'none') clearFormError();
        });
    }

    // =========================================
    // Image Upload — Click, Drag & Drop, Preview
    // =========================================
    if (uploadZone && courseImageInput) {

        // Click to browse
        uploadZone.addEventListener('click', (e) => {
            // Don't trigger file picker if clicking the remove button
            if (e.target.closest('.remove-image-btn')) return;
            courseImageInput.click();
        });

        // File selected via picker
        courseImageInput.addEventListener('change', () => {
            if (courseImageInput.files && courseImageInput.files[0]) {
                handleImageFile(courseImageInput.files[0]);
            }
        });

        // Drag-and-drop events
        uploadZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            uploadZone.classList.add('drag-over');
        });

        uploadZone.addEventListener('dragleave', (e) => {
            e.preventDefault();
            uploadZone.classList.remove('drag-over');
        });

        uploadZone.addEventListener('drop', (e) => {
            e.preventDefault();
            uploadZone.classList.remove('drag-over');
            const file = e.dataTransfer.files[0];
            if (file) {
                handleImageFile(file);
            }
        });

        // Remove image button
        if (removeImageBtn) {
            removeImageBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                resetImageUpload();
            });
        }
    }

    /**
     * Validate and preview the selected image file
     */
    function handleImageFile(file) {
        // Validate file type
        const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
        if (!allowedTypes.includes(file.type)) {
            alert('Please select a valid image file (JPG, PNG, GIF, or WEBP)');
            return;
        }

        // Validate file size (5MB max)
        if (file.size > 5 * 1024 * 1024) {
            alert('Image must be smaller than 5MB');
            return;
        }

        // Set the file to the input (for drag-and-drop files)
        const dataTransfer = new DataTransfer();
        dataTransfer.items.add(file);
        courseImageInput.files = dataTransfer.files;

        // Show preview
        const reader = new FileReader();
        reader.onload = (e) => {
            if (previewImage) previewImage.src = e.target.result;
            if (uploadPlaceholder) uploadPlaceholder.style.display = 'none';
            if (uploadPreview) uploadPreview.style.display = 'block';
        };
        reader.readAsDataURL(file);
    }

    /**
     * Reset the image upload to its default state
     */
    function resetImageUpload() {
        if (courseImageInput) courseImageInput.value = '';
        if (previewImage) previewImage.src = '';
        if (uploadPlaceholder) uploadPlaceholder.style.display = 'flex';
        if (uploadPreview) uploadPreview.style.display = 'none';
    }

    // =========================================
    // Toggle Delete UI
    // =========================================
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

    // =========================================
    // Delete Confirmation Dialog
    // =========================================
    function attachDeleteConfirmation() {
        const deleteForms = document.querySelectorAll('.delete-form');
        deleteForms.forEach(form => {
            form.addEventListener('submit', (e) => {
                const confirmed = confirm('Are you sure you want to delete this course? This action cannot be undone.');
                if (!confirmed) {
                    e.preventDefault();
                }
            });
        });
    }

    // Attach to initial cards
    attachDeleteConfirmation();
    

    // =========================================
    // Live Search — keystroke by keystroke
    // =========================================
    const searchInput = document.getElementById('searchInput');
    const searchContainer = document.querySelector('.search-container');
    const resultCount = document.getElementById('resultCount');
    const userId = searchContainer ? searchContainer.dataset.userid : '';

    let searchTimeout = null;

    if (searchInput && courseGrid) {
        searchInput.addEventListener('input', () => {
            const query = searchInput.value.trim();

            // Debounce — wait 200ms after last keystroke
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
                fetchCourses(query);
            }, 200);
        });
    }

    async function fetchCourses(query) {
        try {
            const response = await fetch(`/courses/api/search?q=${encodeURIComponent(query)}&userId=${encodeURIComponent(userId)}`);
            const courses = await response.json();

            // Update result count
            if (resultCount) {
                resultCount.textContent = `${courses.length} Results`;
            }

            // Rebuild course grid
            renderCourseGrid(courses);
        } catch (error) {
            console.error('Search error:', error);
        }
    }

    function renderCourseGrid(courses) {
        if (!courseGrid) return;

        // Check if currently in delete mode
        const isDeleteMode = courseGrid.classList.contains('delete-mode');

        if (courses.length > 0) {
            // CHANGED: Search results now trigger openDraftModal() and inject dynamic status
            courseGrid.innerHTML = courses.map(course => `
                <div class="course-card">
                    <form action="/courses/${userId}/delete/${course.id}" method="POST" class="delete-form">
                        <button type="submit" class="delete-btn" title="Delete Course"><i class="fas fa-trash"></i></button>
                    </form>
                    <div class="card-image" onclick="openDraftModal('${course.id}', ${course.hasDraft})">
                        <img src="${course.img}" alt="Course Image">
                    </div>
                    <div class="card-content" onclick="openDraftModal('${course.id}', ${course.hasDraft})">
                        <span class="course-code">${course.code}</span>
                        <h3 class="course-title">${course.title}</h3>
                        <p class="course-status">${course.status || 'No Syllabus Draft'}</p>
                    </div>
                    <div class="card-footer">
                        <span class="instructor">${course.instructor}</span>
                    </div>
                </div>
            `).join('');
        } else {
            courseGrid.innerHTML = '<p style="text-align: center; color: #777; grid-column: 1 / -1; padding: 40px 0;">No courses found.</p>';
        }

        // Preserve delete mode if it was active
        if (isDeleteMode) {
            courseGrid.classList.add('delete-mode');
        }

        // Re-attach delete confirmation to new cards
        attachDeleteConfirmation();
    }
});

/* =====================================================================
   DRAFT STATUS MODAL LOGIC (GLOBAL SCOPE)
   Placed outside DOMContentLoaded so the HTML onclick tags can access it
===================================================================== */
window.openDraftModal = function(syllabusId, hasDraft) {
    const modal = document.getElementById('draftModal');
    const msg = document.getElementById('draftMessage');
    const btn = document.getElementById('draftActionBtn');
    
    if (hasDraft) {
        msg.innerText = "A syllabus draft already exists for this course.";
        btn.innerText = "Edit Syllabus Draft";
        btn.onclick = () => window.location.href = `/syllabus/edit/${syllabusId}`; 
    } else {
        msg.innerText = "There's no syllabus draft at the moment.";
        btn.innerText = "+ Add Syllabus Draft";
        btn.onclick = () => window.location.href = `/syllabus/create/${syllabusId}`; 
    }
    
    if(modal) modal.style.display = 'flex';
};

window.closeDraftModal = function() {
    const modal = document.getElementById('draftModal');
    if(modal) modal.style.display = 'none';
};

// Close modal if user clicks anywhere outside of the white content box
window.addEventListener('click', function(event) {
    const draftModal = document.getElementById('draftModal');
    if (event.target === draftModal) {
        draftModal.style.display = "none";
    }
});