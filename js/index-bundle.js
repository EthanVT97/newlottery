// Add login button directly
document.addEventListener('DOMContentLoaded', () => {
    // Add login button to navbar
    const authButtons = document.getElementById('authButtons');
    if (authButtons) {
        authButtons.innerHTML = `
            <a href="login.html" class="btn btn-outline-light">
                <i class="bi bi-box-arrow-in-right"></i> ဝင်ရောက်ရန်
            </a>
        `;
    }

    // Add login button to hero section
    const heroButtons = document.getElementById('heroButtons');
    if (heroButtons) {
        heroButtons.innerHTML = `
            <a href="login.html" class="btn btn-primary btn-lg">
                <i class="bi bi-play-circle"></i> စတင်ထိုးရန်
            </a>
        `;
    }

    // Add click handlers to game cards
    document.querySelectorAll('.game-card').forEach(card => {
        card.addEventListener('click', () => {
            window.location.href = 'login.html';
        });

        // Add hover effect
        card.style.cursor = 'pointer';
        card.style.transition = 'transform 0.2s';
        card.addEventListener('mouseenter', () => card.style.transform = 'translateY(-5px)');
        card.addEventListener('mouseleave', () => card.style.transform = 'translateY(0)');
    });
});
