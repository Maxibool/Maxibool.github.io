// form-handler.js - Form submission and validation with config
let CONFIG = null;

// Load configuration from server on page load
async function loadConfig() {
    try {
        const response = await fetch('config.json.php');
        CONFIG = await response.json();
    } catch (error) {
        console.error('Failed to load config:', error);
        // Fallback to default values
        CONFIG = {
            validation: {
                name: { min_length: 2, max_length: 100, required: true },
                email: { required: true },
                message: { min_length: 10, max_length: 2000, required: true },
                phone: { pattern: /^[0-9\s\-\+\(\)\.]{10,20}$/, required: false }
            },
            messages: {
                success: 'Votre message a été envoyé avec succès!',
                error_generic: 'Erreur lors de l\'envoi du message.',
                error_validation: 'Veuillez corriger les erreurs dans le formulaire'
            }
        };
    }
}

// Form submission handler
async function handleSubmit(event) {
    event.preventDefault();
    
    const submitBtn = event.target.querySelector('.submit-btn');
    const originalText = submitBtn.textContent;
    
    // Show loading state
    submitBtn.textContent = 'Envoi en cours...';
    submitBtn.disabled = true;
    
    const formData = {
        name: document.getElementById('name').value.trim(),
        email: document.getElementById('email').value.trim(),
        phone: document.getElementById('phone').value.trim(),
        message: document.getElementById('message').value.trim()
    };
    
    // Validate before submit
    if (!validateFormBeforeSubmit(formData)) {
        showNotification(CONFIG.messages.error_validation, 'error');
        submitBtn.textContent = originalText;
        submitBtn.disabled = false;
        return;
    }
    
    try {
        const response = await fetch('contact.php', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(formData)
        });
        
        const responseText = await response.text();
        
        let result;
        try {
            result = JSON.parse(responseText);
        } catch (parseError) {
            console.error('JSON Parse Error:', parseError);
            console.error('Raw Response:', responseText);
            throw new Error('Erreur de communication avec le serveur');
        }
        
        // Check HTTP status
        if (!response.ok) {
            if (result && result.message) {
                showNotification(result.message, 'error');
            } else {
                showNotification(`Erreur serveur (${response.status})`, 'error');
            }
            return;
        }
        
        // Success
        if (result.success) {
            event.target.reset();
            clearAllFieldErrors();
            
            // Log debug info if available
            if (result.debug) {
            console.log('Debug info:', result.debug);
            console.log(`Email status - Admin: ${result.admin_email_sent}, User: ${result.user_email_sent}, Method: ${result.mail_method}`);
                // Inform when data wasn't saved (only in debug mode)
                if (result.data_saved === false) {
                    console.warn('Data not saved (data_saved=false)', result);
                    showNotification("Les données n'ont pas été enregistrées sur le serveur (data_saved=false). Voir la console pour plus de détails.", 'warning');
                }
            }
            
            // Log email status
            if (result.admin_email_sent !== undefined || result.user_email_sent !== undefined) {
                if (result.admin_email_sent === false) {
                    showNotification('L\'email à l\'administrateur n\'a pas pu être envoyé.', 'warning');
                } else if (result.user_email_sent === false) {
                    showNotification('Demande bien reçue, mais l\'email de confirmation à l\'utilisateur n\'a pas pu être envoyé.', 'info');
                } else {
                    showNotification(result.message, 'success');
                }
            }
        } else {
            showNotification(result.message || CONFIG.messages.error_generic, 'error');
        }
        
    } catch (error) {
        console.error('Network Error:', error);
        
        if (error.message.includes('JSON') || error.message.includes('communication')) {
            showNotification('Erreur de communication avec le serveur', 'error');
        } else if (error.message.includes('Network') || error.message.includes('Fetch')) {
            showNotification('Erreur de connexion. Vérifiez votre connexion internet.', 'error');
        } else {
            showNotification(CONFIG.messages.error_generic, 'error');
        }
    } finally {
        submitBtn.textContent = originalText;
        submitBtn.disabled = false;
    }
}

// Notification system
function showNotification(message, type = 'info') {
    const existingNotification = document.querySelector('.notification');
    if (existingNotification) {
        existingNotification.remove();
    }
    
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.setAttribute('role', 'alert');
    notification.setAttribute('aria-live', 'polite');
    
    notification.innerHTML = `
        <div class="notification-content">
            <span class="notification-icon">${getNotificationIcon(type)}</span>
            <span class="notification-text">${message}</span>
            <button class="notification-close" aria-label="Fermer la notification">×</button>
        </div>
    `;
    
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${getNotificationColor(type)};
        color: white;
        padding: 0;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        z-index: 10000;
        max-width: 400px;
        transform: translateX(400px);
        transition: transform 0.3s ease;
        font-family: inherit;
        cursor: pointer;
    `;
    
    document.body.appendChild(notification);
    
    function closeNotification() {
        notification.style.transform = 'translateX(400px)';
        setTimeout(() => {
            if (notification.parentNode) {
                notification.remove();
            }
        }, 300);
    }
    
    notification.querySelector('.notification-close').addEventListener('click', function(e) {
        e.stopPropagation();
        closeNotification();
    });
    
    notification.addEventListener('click', closeNotification);
    
    setTimeout(() => {
        notification.style.transform = 'translateX(0)';
    }, 100);
    
    const autoCloseTime = type === 'error' ? 8000 : type === 'success' ? 5000 : 4000;
    const autoCloseTimeout = setTimeout(closeNotification, autoCloseTime);
    
    notification.addEventListener('mouseenter', () => {
        clearTimeout(autoCloseTimeout);
    });
    
    notification.addEventListener('mouseleave', () => {
        setTimeout(closeNotification, 2000);
    });
}

function getNotificationIcon(type) {
    const icons = {
        'success': '✓',
        'error': '✗',
        'info': 'ℹ',
        'warning': '⚠'
    };
    return icons[type] || 'ℹ';
}

function getNotificationColor(type) {
    const colors = {
        'success': '#4CAF50',
        'error': '#f44336',
        'info': '#2196F3',
        'warning': '#ff9800'
    };
    return colors[type] || '#2196F3';
}

// Add CSS for notifications
if (!document.querySelector('#notification-styles')) {
    const notificationStyles = document.createElement('style');
    notificationStyles.id = 'notification-styles';
    notificationStyles.textContent = `
        .notification-content {
            padding: 15px 20px;
            display: flex;
            align-items: center;
            gap: 10px;
        }
        .notification-icon {
            font-weight: bold;
            font-size: 16px;
        }
        .notification-text {
            flex: 1;
        }
        .notification-close {
            background: none;
            border: none;
            color: white;
            font-size: 18px;
            cursor: pointer;
            padding: 0;
            width: 20px;
            height: 20px;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        .notification-close:hover {
            opacity: 0.8;
        }
        .character-counter {
            font-size: 12px;
            color: #666;
            text-align: right;
            margin-top: 5px;
        }
        .field-error {
            color: #f44336;
            font-size: 12px;
            margin-top: 5px;
        }
        .error-field {
            border-color: #f44336 !important;
        }
    `;
    document.head.appendChild(notificationStyles);
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', async function() {
    await loadConfig();
    setupFormValidation();
    setupCharacterCounters();
});

// Character counters
function setupCharacterCounters() {
    const nameInput = document.getElementById('name');
    const messageInput = document.getElementById('message');
    
    if (nameInput && CONFIG) {
        const nameCounter = document.createElement('div');
        nameCounter.className = 'character-counter';
        nameInput.parentNode.appendChild(nameCounter);
        
        nameInput.addEventListener('input', function() {
            const max = CONFIG.validation.name.max_length;
            const remaining = max - this.value.length;
            nameCounter.textContent = `${this.value.length}/${max} caractères`;
            nameCounter.style.color = remaining < 10 ? '#f44336' : '#666';
        });
        
        nameInput.dispatchEvent(new Event('input'));
    }
    
    if (messageInput && CONFIG) {
        const messageCounter = document.createElement('div');
        messageCounter.className = 'character-counter';
        messageInput.parentNode.appendChild(messageCounter);
        
        messageInput.addEventListener('input', function() {
            const max = CONFIG.validation.message.max_length;
            const remaining = max - this.value.length;
            messageCounter.textContent = `${this.value.length}/${max} caractères`;
            messageCounter.style.color = remaining < 50 ? '#f44336' : '#666';
        });
        
        messageInput.dispatchEvent(new Event('input'));
    }
}

// Form validation setup
function setupFormValidation() {
    const nameInput = document.getElementById('name');
    const emailInput = document.getElementById('email');
    const messageInput = document.getElementById('message');
    const phoneInput = document.getElementById('phone');
    const submitBtn = document.querySelector('.submit-btn');
    
    function updateSubmitButton() {
        const nameValid = validateName();
        const emailValid = validateEmail();
        const messageValid = validateMessage();
        const phoneValid = validatePhone();
        
        const isFormValid = nameValid && emailValid && messageValid && phoneValid;
        submitBtn.disabled = !isFormValid;
    }
    
    if (nameInput) {
        nameInput.addEventListener('input', () => { validateName(); updateSubmitButton(); });
        nameInput.addEventListener('blur', () => { validateName(); updateSubmitButton(); });
    }
    
    if (emailInput) {
        emailInput.addEventListener('input', () => { validateEmail(); updateSubmitButton(); });
        emailInput.addEventListener('blur', () => { validateEmail(); updateSubmitButton(); });
    }
    
    if (messageInput) {
        messageInput.addEventListener('input', () => { validateMessage(); updateSubmitButton(); });
        messageInput.addEventListener('blur', () => { validateMessage(); updateSubmitButton(); });
    }
    
    if (phoneInput) {
        phoneInput.addEventListener('input', () => { validatePhone(); updateSubmitButton(); });
        phoneInput.addEventListener('blur', () => { validatePhone(); updateSubmitButton(); });
    }
    
    updateSubmitButton();
}

// Validation functions using CONFIG
function validateName() {
    if (!CONFIG) return false;
    
    const input = document.getElementById('name');
    const value = input.value.trim();
    const rules = CONFIG.validation.name;
    
    if (value.length === 0) {
        clearFieldError(input);
        return false;
    }
    
    if (value.length < rules.min_length) {
        showFieldError(input, `Le nom doit contenir au moins ${rules.min_length} caractères`);
        return false;
    }
    
    if (value.length > rules.max_length) {
        showFieldError(input, `Le nom ne peut pas dépasser ${rules.max_length} caractères`);
        return false;
    }
    
    clearFieldError(input);
    return true;
}

// Field error display
function showFieldError(input, message) {
    clearFieldError(input);
    
    input.classList.add('error-field');
    
    const errorElement = document.createElement('div');
    errorElement.className = 'field-error';
    errorElement.textContent = message;
    
    input.parentNode.appendChild(errorElement);
}

function clearFieldError(input) {
    input.classList.remove('error-field');
    
    const existingError = input.parentNode.querySelector('.field-error');
    if (existingError) {
        existingError.remove();
    }
}

function clearAllFieldErrors() {
    const inputs = ['name', 'email', 'message', 'phone'];
    inputs.forEach(fieldName => {
        const input = document.getElementById(fieldName);
        if (input) {
            clearFieldError(input);
        }
    });
}

// Form validation before submission
function validateFormBeforeSubmit(formData) {
    if (!CONFIG) return false;
    
    let isValid = true;
    
    clearAllFieldErrors();
    
    // Name validation
    if (!formData.name) {
        showFieldError(document.getElementById('name'), 'Le nom est obligatoire');
        isValid = false;
    } else if (formData.name.length < CONFIG.validation.name.min_length || 
               formData.name.length > CONFIG.validation.name.max_length) {
        validateName();
        isValid = false;
    }
    
    // Email validation
    if (!formData.email) {
        showFieldError(document.getElementById('email'), "L'email est obligatoire");
        isValid = false;
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
        validateEmail();
        isValid = false;
    }
    
    // Message validation
    if (!formData.message) {
        showFieldError(document.getElementById('message'), 'Le message est obligatoire');
        isValid = false;
    } else if (formData.message.length < CONFIG.validation.message.min_length || 
               formData.message.length > CONFIG.validation.message.max_length) {
        validateMessage();
        isValid = false;
    }
    
    // Phone validation (optional)
    const phonePattern = new RegExp(CONFIG.validation.phone.pattern.slice(1, -1));
    if (formData.phone && !phonePattern.test(formData.phone)) {
        showFieldError(document.getElementById('phone'), 'Format de téléphone invalide');
        isValid = false;
    }
    
    return isValid;
}

function validateEmail() {
    const input = document.getElementById('email');
    const value = input.value.trim();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    
    if (value.length === 0) {
        clearFieldError(input);
        return false;
    }
    
    if (!emailRegex.test(value)) {
        showFieldError(input, 'Adresse email invalide');
        return false;
    }
    
    clearFieldError(input);
    return true;
}

function validateMessage() {
    if (!CONFIG) return false;
    
    const input = document.getElementById('message');
    const value = input.value.trim();
    const rules = CONFIG.validation.message;
    
    if (value.length === 0) {
        clearFieldError(input);
        return false;
    }
    
    if (value.length < rules.min_length) {
        showFieldError(input, `Le message doit contenir au moins ${rules.min_length} caractères`);
        return false;
    }
    
    if (value.length > rules.max_length) {
        showFieldError(input, `Le message ne peut pas dépasser ${rules.max_length} caractères`);
        return false;
    }
    
    clearFieldError(input);
    return true;
}

function validatePhone() {
    if (!CONFIG) return true;
    
    const input = document.getElementById('phone');
    const value = input.value.trim();
    const pattern = new RegExp(CONFIG.validation.phone.pattern.slice(1, -1)); // Convert string to regex
    
    if (value.length > 0 && !pattern.test(value)) {
        showFieldError(input, 'Format de téléphone invalide');
        return false;
    }
    
    clearFieldError(input);
    return true;
}