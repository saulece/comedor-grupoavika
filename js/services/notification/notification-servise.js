// Notification Service - Handles in-app notifications and alerts

/**
 * NotificationService - Simple notification system for the application
 */
class NotificationService {
    constructor() {
        this.container = null;
        this.initialize();
    }
    
    /**
     * Initialize notification container
     */
    initialize() {
        // Check if container already exists
        if (document.getElementById('notification-container')) {
            this.container = document.getElementById('notification-container');
            return;
        }
        
        // Create notification container
        this.container = document.createElement('div');
        this.container.id = 'notification-container';
        this.container.className = 'notification-container';
        document.body.appendChild(this.container);
        
        // Add styles
        if (!document.getElementById('notification-styles')) {
            const style = document.createElement('style');
            style.id = 'notification-styles';
            style.textContent = `
                .notification-container {
                    position: fixed;
                    top: 20px;
                    right: 20px;
                    z-index: 9999;
                    display: flex;
                    flex-direction: column;
                    gap: 10px;
                    max-width: 350px;
                }
                
                .notification {
                    padding: 15px;
                    border-radius: 4px;
                    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
                    display: flex;
                    align-items: flex-start;
                    transition: all 0.3s ease;
                    animation: notification-in 0.3s ease;
                    background-color: white;
                }
                
                .notification-icon {
                    margin-right: 10px;
                    font-size: 20px;
                }
                
                .notification-content {
                    flex: 1;
                }
                
                .notification-title {
                    font-weight: 500;
                    margin-bottom: 5px;
                }
                
                .notification-message {
                    font-size: 14px;
                }
                
                .notification-close {
                    cursor: pointer;
                    margin-left: 10px;
                    color: #999;
                }
                
                .notification-success {
                    border-left: 4px solid #4caf50;
                }
                
                .notification-success .notification-icon {
                    color: #4caf50;
                }
                
                .notification-error {
                    border-left: 4px solid #f44336;
                }
                
                .notification-error .notification-icon {
                    color: #f44336;
                }
                
                .notification-warning {
                    border-left: 4px solid #ff9800;
                }
                
                .notification-warning .notification-icon {
                    color: #ff9800;
                }
                
                .notification-info {
                    border-left: 4px solid #2196f3;
                }
                
                .notification-info .notification-icon {
                    color: #2196f3;
                }
                
                @keyframes notification-in {
                    from {
                        transform: translateX(100%);
                        opacity: 0;
                    }
                    to {
                        transform: translateX(0);
                        opacity: 1;
                    }
                }
                
                @keyframes notification-out {
                    from {
                        transform: translateX(0);
                        opacity: 1;
                    }
                    to {
                        transform: translateX(100%);
                        opacity: 0;
                    }
                }
            `;
            document.head.appendChild(style);
        }
    }
    
    /**
     * Show a notification
     * @param {string} message - Notification message
     * @param {Object} options - Notification options
     * @param {string} options.type - Notification type (success, error, warning, info)
     * @param {string} options.title - Notification title
     * @param {number} options.duration - Duration in milliseconds (0 for no auto-close)
     * @returns {string} Notification ID
     */
    show(message, options = {}) {
        const id = 'notification-' + Date.now();
        const type = options.type || 'info';
        const title = options.title || this.getDefaultTitle(type);
        const duration = options.duration !== undefined ? options.duration : 5000;
        
        // Create notification element
        const notification = document.createElement('div');
        notification.id = id;
        notification.className = `notification notification-${type}`;
        
        // Icon for notification
        const icon = document.createElement('div');
        icon.className = 'notification-icon';
        icon.innerHTML = this.getIconForType(type);
        notification.appendChild(icon);
        
        // Content
        const content = document.createElement('div');
        content.className = 'notification-content';
        
        const titleElement = document.createElement('div');
        titleElement.className = 'notification-title';
        titleElement.textContent = title;
        content.appendChild(titleElement);
        
        const messageElement = document.createElement('div');
        messageElement.className = 'notification-message';
        messageElement.textContent = message;
        content.appendChild(messageElement);
        
        notification.appendChild(content);
        
        // Close button
        const closeButton = document.createElement('div');
        closeButton.className = 'notification-close';
        closeButton.innerHTML = '&times;';
        closeButton.addEventListener('click', () => this.close(id));
        notification.appendChild(closeButton);
        
        // Add to container
        this.container.appendChild(notification);
        
        // Auto-close if duration is set
        if (duration > 0) {
            setTimeout(() => {
                this.close(id);
            }, duration);
        }
        
        return id;
    }
    
    /**
     * Close a notification
     * @param {string} id - Notification ID
     */
    close(id) {
        const notification = document.getElementById(id);
        
        if (notification) {
            // Animate out
            notification.style.animation = 'notification-out 0.3s ease forwards';
            
            // Remove after animation
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }
    }
    
    /**
     * Close all notifications
     */
    closeAll() {
        const notifications = this.container.querySelectorAll('.notification');
        
        notifications.forEach(notification => {
            this.close(notification.id);
        });
    }
    
    /**
     * Show success notification
     * @param {string} message - Notification message
     * @param {Object} options - Notification options
     * @returns {string} Notification ID
     */
    success(message, options = {}) {
        return this.show(message, { ...options, type: 'success' });
    }
    
    /**
     * Show error notification
     * @param {string} message - Notification message
     * @param {Object} options - Notification options
     * @returns {string} Notification ID
     */
    error(message, options = {}) {
        return this.show(message, { ...options, type: 'error' });
    }
    
    /**
     * Show warning notification
     * @param {string} message - Notification message
     * @param {Object} options - Notification options
     * @returns {string} Notification ID
     */
    warning(message, options = {}) {
        return this.show(message, { ...options, type: 'warning' });
    }
    
    /**
     * Show info notification
     * @param {string} message - Notification message
     * @param {Object} options - Notification options
     * @returns {string} Notification ID
     */
    info(message, options = {}) {
        return this.show(message, { ...options, type: 'info' });
    }
    
    /**
     * Get default title based on notification type
     * @param {string} type - Notification type
     * @returns {string} Default title
     */
    getDefaultTitle(type) {
        switch (type) {
            case 'success':
                return 'Éxito';
            case 'error':
                return 'Error';
            case 'warning':
                return 'Advertencia';
            case 'info':
                return 'Información';
            default:
                return 'Notificación';
        }
    }
    
    /**
     * Get icon HTML based on notification type
     * @param {string} type - Notification type
     * @returns {string} Icon HTML
     */
    getIconForType(type) {
        switch (type) {
            case 'success':
                return '<i class="material-icons">check_circle</i>';
            case 'error':
                return '<i class="material-icons">error</i>';
            case 'warning':
                return '<i class="material-icons">warning</i>';
            case 'info':
                return '<i class="material-icons">info</i>';
            default:
                return '<i class="material-icons">notifications</i>';
        }
    }
}

// Create global notification service instance
const notificationService = new NotificationService();

// Helper functions to access notification service
function showNotification(message, options) {
    return notificationService.show(message, options);
}

function showSuccess(message, options) {
    return notificationService.success(message, options);
}

function showError(message, options) {
    return notificationService.error(message, options);
}

function showWarning(message, options) {
    return notificationService.warning(message, options);
}

function showInfo(message, options) {
    return notificationService.info(message, options);
}

function closeNotification(id) {
    notificationService.close(id);
}

function closeAllNotifications() {
    notificationService.closeAll();
}