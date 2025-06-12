// public/js/main.js
document.addEventListener('DOMContentLoaded', () => {
    // You can add global JavaScript functionalities here.
    // For example, interactive elements, form validations, etc.

    // Example: Simple console log
    console.log("main.js loaded and DOM is ready!");

    // Example: Auto-hide alert messages after a few seconds
    const alerts = document.querySelectorAll('.alert');
    alerts.forEach(alert => {
        setTimeout(() => {
            alert.style.opacity = '0';
            setTimeout(() => alert.remove(), 500); // Remove after fade out
        }, 5000); // Hide after 5 seconds
    });
});