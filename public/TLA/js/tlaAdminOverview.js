/* ═══════════════════════════════════════════════════════════
   TLA Admin Overview — Client-side JS
   Provides search & filter for the review queue table
   ═══════════════════════════════════════════════════════════ */

document.addEventListener('DOMContentLoaded', () => {

    const searchInput  = document.getElementById('searchInput');
    const statusFilter = document.getElementById('statusFilter');
    const table        = document.getElementById('submissionsTable');

    if (!table) return; // HR dashboard doesn't have the table

    function filterRows() {
        const query  = (searchInput?.value || '').toLowerCase();
        const status = (statusFilter?.value || '').toLowerCase();
        const rows   = table.querySelectorAll('tbody .table-row');

        rows.forEach(row => {
            const text       = row.textContent.toLowerCase();
            const rowStatus  = (row.dataset.status || '').toLowerCase();

            const matchText   = !query  || text.includes(query);
            const matchStatus = !status || rowStatus === status.toLowerCase();

            row.style.display = (matchText && matchStatus) ? '' : 'none';
        });
    }

    if (searchInput)  searchInput.addEventListener('input',  filterRows);
    if (statusFilter) statusFilter.addEventListener('change', filterRows);
});
