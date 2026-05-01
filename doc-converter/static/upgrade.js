document.addEventListener('DOMContentLoaded', function () {

    // ── Load Stripe publishable key from server ──────────────────────────────
    let stripeInstance = null;

    fetch('/stripe-key')
        .then(r => r.json())
        .then(data => {
            if (data.publishable_key && data.publishable_key.startsWith('pk_')) {
                stripeInstance = Stripe(data.publishable_key);
            }
        })
        .catch(() => {});   // Stripe not configured — buttons still work, just redirect

    // ── Handle all upgrade buttons ───────────────────────────────────────────
    const allUpgradeBtns = document.querySelectorAll('.upgrade-btn, .cta-btn, #final-upgrade-btn');

    allUpgradeBtns.forEach(btn => {
        btn.addEventListener('click', function () {
            const plan = this.dataset.plan || 'yearly';
            openCheckout(plan);
        });
    });

    // ── Checkout flow ────────────────────────────────────────────────────────
    function openCheckout(plan) {
        const btn = document.querySelector(`[data-plan="${plan}"]`) || document.querySelector('.cta-btn');

        // Show loading state
        const original = btn ? btn.innerHTML : '';
        if (btn) {
            btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Redirecting...';
            btn.disabled  = true;
        }

        const email = document.getElementById('checkoutEmail')?.value || '';

        fetch('/create-checkout-session', {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify({ plan, email })
        })
        .then(r => r.json())
        .then(data => {
            if (data.error) {
                showToast('error', data.error);
                resetBtn(btn, original);
                return;
            }
            // Redirect to Stripe Checkout
            window.location.href = data.url;
        })
        .catch(err => {
            showToast('error', 'Could not connect to payment server. Please try again.');
            resetBtn(btn, original);
        });
    }

    function resetBtn(btn, original) {
        if (btn) {
            btn.innerHTML = original;
            btn.disabled  = false;
        }
    }

    // ── FAQ accordion ────────────────────────────────────────────────────────
    document.querySelectorAll('.faq-question').forEach(q => {
        q.addEventListener('click', function () {
            const answer = this.nextElementSibling;
            const icon   = this.querySelector('i');
            const isOpen = answer.classList.contains('active');

            // Close all
            document.querySelectorAll('.faq-answer').forEach(a => a.classList.remove('active'));
            document.querySelectorAll('.faq-question i').forEach(i => i.style.transform = '');

            if (!isOpen) {
                answer.classList.add('active');
                icon.style.transform = 'rotate(180deg)';
            }
        });
    });

    // ── Toast notification ───────────────────────────────────────────────────
    function showToast(type, message) {
        const existing = document.querySelector('.toast');
        if (existing) existing.remove();

        const toast = document.createElement('div');
        toast.className = 'toast';
        toast.style.cssText = `
            position: fixed; bottom: 32px; left: 50%; transform: translateX(-50%);
            background: ${type === 'error' ? '#ff6b6b' : '#43d9ad'};
            color: ${type === 'error' ? 'white' : '#0f1117'};
            padding: 13px 24px; border-radius: 50px; font-weight: 600;
            font-size: 0.875rem; z-index: 9999; box-shadow: 0 8px 24px rgba(0,0,0,0.3);
            animation: slideUp 0.3s ease;
        `;
        toast.textContent = message;
        document.body.appendChild(toast);
        setTimeout(() => toast.remove(), 4000);
    }

    // ── Highlight selected plan card ─────────────────────────────────────────
    document.querySelectorAll('.pricing-card').forEach(card => {
        card.addEventListener('click', function () {
            document.querySelectorAll('.pricing-card').forEach(c => {
                c.style.transform = '';
            });
            this.style.transform = 'translateY(-8px)';
            const plan = this.id?.replace('-plan', '') || 'monthly';
            openCheckout(plan);
        });
    });

});
