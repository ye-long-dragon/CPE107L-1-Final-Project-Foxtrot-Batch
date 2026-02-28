document.addEventListener('DOMContentLoaded', function () {

    const form = document.getElementById('tla-form');
    if (form) {
        form.addEventListener('submit', function (e) {
            const clickedBtn = document.activeElement;
            const action = clickedBtn?.value || '';

            if (action === 'submit') {
                if (!confirm('Submit this TLA for approval? You will not be able to edit the pre-digital section while it is pending.')) {
                    e.preventDefault();
                }
            } else if (action === 'submit-post') {
                if (!confirm('Submit the post-digital session data?')) {
                    e.preventDefault();
                }
            }
        });
    }

    document.querySelectorAll('.attach-btn:not([disabled])').forEach(function (btn) {
        btn.addEventListener('click', function () {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = 'image/*,.pdf';
            input.onchange = function (e) {
                const file = e.target.files[0];
                if (file) {
                    btn.textContent = '\uD83D\uDCCE ' + file.name;
                }
            };
            input.click();
        });
    });

});

function printTLAForm() {
    window.print();
}
