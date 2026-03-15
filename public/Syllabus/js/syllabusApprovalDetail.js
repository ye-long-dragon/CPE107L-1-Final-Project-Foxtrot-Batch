/* ═══════════════════════════════════════════════════════════
   Syllabus Approval Detail — Client-side JS
   Shared across TA Review, PC Endorsement, and Dean Approval
   ═══════════════════════════════════════════════════════════ */

document.addEventListener('DOMContentLoaded', () => {

    // ─── Status indicator color sync ───────────────────────
    const statusSelect = document.getElementById('approval-status');
    const statusDot = document.getElementById('status-indicator');
    // ─── E-Signature Validation Logic ───────────────────────
    const sigBox = document.getElementById('signature-box');
    const sigInput = document.getElementById('signature-upload');
    const sigRemove = document.getElementById('signature-remove');
    const sigSection = document.getElementById('signature-section');
    const btnSubmit = document.getElementById('btn-submit');
    const workflowStep = typeof SYLLABUS_APPROVAL_DATA !== 'undefined' ? SYLLABUS_APPROVAL_DATA.workflowStep : '';

    function syncStatusColor() {
        if (!statusSelect || !statusDot) return;
        const val = statusSelect.value;
        statusDot.className = 'ad-status-indicator'; // reset
        
        if (val === 'Approved' || val === 'PC_Approved') {
            statusDot.classList.add('indicator-approved');
        } else if (val === 'Endorsed') {
            statusDot.classList.add('indicator-endorsed');
        } else if (val === 'Reject' || val === 'Returned') {
            statusDot.classList.add('indicator-returned');
        } else {
            statusDot.classList.add('indicator-pending');
        }

        // Conditional Logic for Program Chair Approval
        if (workflowStep === 'approval' && btnSubmit) {
            if (val === 'PC_Approved') {
                // Show sig section, disable submit unless file exists
                if (sigSection) sigSection.style.display = 'block';
                const hasFile = sigInput && sigInput.files && sigInput.files.length > 0;
                btnSubmit.disabled = !hasFile;
                btnSubmit.style.opacity = hasFile ? '1' : '0.5';
                btnSubmit.style.cursor = hasFile ? 'pointer' : 'not-allowed';
            } else if (val === 'Reject' || val === 'Returned') {
                // Hide sig section, enable submit immediately
                if (sigSection) sigSection.style.display = 'none';
                btnSubmit.disabled = false;
                btnSubmit.style.opacity = '1';
                btnSubmit.style.cursor = 'pointer';
            } else {
                // 'Select Status' or empty - hide sig, disable submit
                if (sigSection) sigSection.style.display = 'none';
                btnSubmit.disabled = true;
                btnSubmit.style.opacity = '0.5';
                btnSubmit.style.cursor = 'not-allowed';
            }
        }
    }

    if (statusSelect) {
        statusSelect.addEventListener('change', syncStatusColor);
        syncStatusColor(); // set initial
    }



    if (sigBox && sigInput) {
        sigBox.addEventListener('click', () => sigInput.click());

        sigInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (!file) {
                 if (workflowStep === 'approval' && btnSubmit && statusSelect.value === 'PC_Approved') {
                     btnSubmit.disabled = true;
                     btnSubmit.style.opacity = '0.5';
                     btnSubmit.style.cursor = 'not-allowed';
                 }
                 return;
            }

            const reader = new FileReader();
            reader.onload = (ev) => {
                sigBox.innerHTML = `<img src="${ev.target.result}" alt="Signature" class="ad-signature-img">`;
                sigBox.appendChild(sigInput); // keep the hidden input in the DOM
                if (sigRemove) sigRemove.style.display = 'flex';
                
                if (workflowStep === 'approval' && btnSubmit && statusSelect.value === 'PC_Approved') {
                    btnSubmit.disabled = false;
                    btnSubmit.style.opacity = '1';
                    btnSubmit.style.cursor = 'pointer';
                }
            };
            reader.readAsDataURL(file);
        });
    }

    // ─── Signature remove ──────────────────────────────────────────
    if (sigRemove) {
        sigRemove.addEventListener('click', () => {
            sigBox.innerHTML = '<span class="ad-signature-placeholder">Click to upload signature</span>';
            sigBox.appendChild(sigInput); // keep the hidden input in the DOM
            sigInput.value = ''; // clear file selection
            sigRemove.style.display = 'none';
            
            if (workflowStep === 'approval' && btnSubmit && statusSelect.value === 'PC_Approved') {
                btnSubmit.disabled = true;
                btnSubmit.style.opacity = '0.5';
                btnSubmit.style.cursor = 'not-allowed';
            }
        });
    }

    // ─── Save as PDF ───────────────────────────────────────
    const btnPdf = document.getElementById('btn-save-pdf');
    if (btnPdf) {
        btnPdf.addEventListener('click', () => {
            window.print();
        });
    }

    // ─── Save Draft ──────────────────────────────────────────
    const btnDraft = document.getElementById('btn-save-draft');
    if (btnDraft) {
        btnDraft.addEventListener('click', async () => {
            const syllabusId = SYLLABUS_APPROVAL_DATA.syllabusId;
            if (!syllabusId) {
                alert('No Syllabus loaded to save.');
                return;
            }

            const payload = {
                syllabusId,
                comment: document.getElementById('approval-comments')?.value || '',
                status: statusSelect?.value || 'Pending',
                action: 'draft'
            };

            try {
                const res = await fetch(SYLLABUS_APPROVAL_DATA.postUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });

                if (res.ok) {
                    alert('Draft saved.');
                } else {
                    const text = await res.text();
                    alert('Draft save failed: ' + text);
                }
            } catch (err) {
                console.error('Draft error:', err);
                alert('An error occurred.');
            }
        });
    }

    // ─── Submit ────────────────────────────────────────────
    if (btnSubmit) {
        btnSubmit.addEventListener('click', async () => {
            const syllabusId = SYLLABUS_APPROVAL_DATA.syllabusId;
            if (!syllabusId) {
                alert('No Syllabus loaded to submit.');
                return;
            }

            const status = statusSelect?.value || 'Pending';
            const comment = document.getElementById('approval-comments')?.value || '';
            const actionLabel = SYLLABUS_APPROVAL_DATA.actionLabel || 'submission';

            // ─── Submission Confirmation ────────────────────────
            if (!confirm(`Are you sure you want to submit this ${actionLabel} as "${status}"?`)) return;

            const payload = {
                syllabusId,
                comment,
                status,
                action: 'submit'
            };

            try {
                const res = await fetch(SYLLABUS_APPROVAL_DATA.postUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });

                if (res.ok) {
                    alert('Submitted successfully.');
                    window.location.href = SYLLABUS_APPROVAL_DATA.backUrl || '/syllabus';
                } else {
                    const text = await res.text();
                    alert('Submission failed: ' + text);
                }
            } catch (err) {
                console.error('Submit error:', err);
                alert('An error occurred while submitting.');
            }
        });
    }

});
