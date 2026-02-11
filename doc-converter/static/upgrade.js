document.addEventListener('DOMContentLoaded', function() {
    const upgradeBtns = document.querySelectorAll('.upgrade-btn');
    const finalUpgradeBtn = document.getElementById('final-upgrade-btn');
    const modal = document.getElementById('paymentModal');
    const closeModal = document.querySelector('.close-modal');
    const payNowBtn = document.getElementById('payNowBtn');
    const paymentMethods = document.querySelectorAll('input[name="paymentMethod"]');
    const cardDetails = document.getElementById('cardDetails');
    const faqQuestions = document.querySelectorAll('.faq-question');
    
    let selectedPlan = 'monthly';
    
    // Handle plan selection
    upgradeBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            selectedPlan = this.dataset.plan;
            openPaymentModal(selectedPlan);
        });
    });
    
    // Final CTA button
    finalUpgradeBtn.addEventListener('click', function() {
        selectedPlan = 'monthly';
        openPaymentModal(selectedPlan);
    });
    
    // Open payment modal
    function openPaymentModal(plan) {
        const planNames = {
            'monthly': 'Monthly Plan',
            'yearly': 'Yearly Plan',
            'lifetime': 'Lifetime Plan'
        };
        
        const planPrices = {
            'monthly': '$4.99/month',
            'yearly': '$49.99/year',
            'lifetime': '$99.99/once'
        };
        
        document.getElementById('selectedPlanName').textContent = planNames[plan];
        document.querySelector('.plan-price').textContent = planPrices[plan];
        
        modal.style.display = 'flex';
        document.body.style.overflow = 'hidden';
    }
    
    // Close modal
    closeModal.addEventListener('click', closePaymentModal);
    
    modal.addEventListener('click', function(e) {
        if (e.target === modal) {
            closePaymentModal();
        }
    });
    
    function closePaymentModal() {
        modal.style.display = 'none';
        document.body.style.overflow = 'auto';
    }
    
    // Handle payment method selection
    paymentMethods.forEach(method => {
        method.addEventListener('change', function() {
            const methodValue = this.value;
            
            // Show/hide card details
            if (methodValue === 'card') {
                cardDetails.style.display = 'block';
            } else {
                cardDetails.style.display = 'none';
            }
            
            // Update active class on labels
            document.querySelectorAll('.method-option').forEach(label => {
                label.classList.remove('active');
            });
            
            this.parentElement.classList.add('active');
        });
    });
    
    // Handle payment submission (simulated)
    payNowBtn.addEventListener('click', async function() {
        const email = document.getElementById('paymentEmail').value;
        const paymentMethod = document.querySelector('input[name="paymentMethod"]:checked').value;
        
        if (!email) {
            alert('Please enter your email address');
            return;
        }
        
        // Show loading state
        this.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';
        this.disabled = true;
        
        try {
            // Simulate API call
            const response = await fetch('/api/create-checkout-session', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    plan: selectedPlan,
                    email: email,
                    paymentMethod: paymentMethod
                })
            });
            
            const data = await response.json();
            
            if (data.success) {
                // For demo purposes, redirect to success page
                // In production, you would redirect to Stripe/PayPal checkout
                setTimeout(() => {
                    window.location.href = '/payment-success';
                }, 1000);
            } else {
                throw new Error(data.message || 'Payment failed');
            }
            
        } catch (error) {
            alert(`Payment Error: ${error.message}`);
            
            // Reset button
            this.innerHTML = '<i class="fas fa-lock"></i> Pay Securely';
            this.disabled = false;
        }
    });
    
    // FAQ accordion
    faqQuestions.forEach(question => {
        question.addEventListener('click', function() {
            const answer = this.nextElementSibling;
            const icon = this.querySelector('i');
            
            // Toggle active class
            answer.classList.toggle('active');
            
            // Rotate icon
            if (answer.classList.contains('active')) {
                icon.style.transform = 'rotate(180deg)';
            } else {
                icon.style.transform = 'rotate(0deg)';
            }
        });
    });
    
    // Highlight best value plan on load
    document.getElementById('yearly-plan').classList.add('highlight');
    
    // Add scroll animation
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };
    
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.opacity = '1';
                entry.target.style.transform = 'translateY(0)';
            }
        });
    }, observerOptions);
    
    // Observe sections for animation
    document.querySelectorAll('.comparison-section, .pricing-section, .testimonials-section, .faq-section, .cta-section').forEach(section => {
        section.style.opacity = '0';
        section.style.transform = 'translateY(20px)';
        section.style.transition = 'all 0.6s ease';
        observer.observe(section);
    });
});