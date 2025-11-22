const CONFIG = {
    API_BASE_URL: '../server/api/',
    TOAST_DURATION: 3000,
    ANIMATION_DURATION: 300
};

async function apiGet(endpoint, params = {}) {
    try {
        const queryString = new URLSearchParams(params).toString();
        const url = `${CONFIG.API_BASE_URL}${endpoint}${queryString ? '?' + queryString : ''}`;
        
        const response = await fetch(url, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' }
        });
        
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        
        return await response.json();
    } catch (error) {
        console.error('API GET Error:', error);
        showToast('Failed to fetch data. Please try again.', 'error');
        throw error;
    }
}

async function apiPost(endpoint, data = {}, isFormData = false) {
    try {
        const url = `${CONFIG.API_BASE_URL}${endpoint}`;
        
        const options = { method: 'POST' };
        
        if (isFormData) {
            options.body = data;
        } else {
            options.headers = { 'Content-Type': 'application/json' };
            options.body = JSON.stringify(data);
        }
        
        const response = await fetch(url, options);
        
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        
        return await response.json();
    } catch (error) {
        console.error('API POST Error:', error);
        showToast('Failed to send data. Please try again.', 'error');
        throw error;
    }
}

function formatDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function getMonthName(month) {
    const monthNames = [
        "January","February","March","April","May","June","July","August",
        "September","October","November","December"
    ];
    return monthNames[month];
}

function getDayName(day) {
    const dayNames = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
    return dayNames[day];
}

function formatDateForDisplay(dateString) {
    const date = new Date(dateString + 'T00:00:00');
    const dayName = getDayName(date.getDay());
    const monthName = getMonthName(date.getMonth());
    const day = date.getDate();
    const year = date.getFullYear();
    return `${dayName}, ${monthName} ${day}, ${year}`;
}

function getCurrentDateTime() {
    const now = new Date();
    const options = { 
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
        hour: '2-digit', minute: '2-digit'
    };
    return now.toLocaleDateString('en-US', options);
}

function isToday(dateString) {
    const today = formatDate(new Date());
    return dateString === today;
}

function isPast(dateString) {
    const date = new Date(dateString);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return date < today;
}

function showToast(message, type = 'success') {
    const toast = document.getElementById('toast');
    const toastMessage = document.getElementById('toastMessage');
    const toastIcon = document.getElementById('toastIcon');
    
    toastMessage.textContent = message;
    
    toast.classList.remove('hidden', 'bg-green-600', 'bg-red-600', 'bg-blue-600', 'bg-gray-800');
    toastIcon.classList.remove('fa-check-circle', 'fa-exclamation-circle', 'fa-info-circle');
    
    if (type === 'success') {
        toast.classList.add('bg-green-600');
        toastIcon.classList.add('fa-check-circle');
    } else if (type === 'error') {
        toast.classList.add('bg-red-600');
        toastIcon.classList.add('fa-exclamation-circle');
    } else if (type === 'info') {
        toast.classList.add('bg-blue-600');
        toastIcon.classList.add('fa-info-circle');
    } else {
        toast.classList.add('bg-gray-800');
        toastIcon.classList.add('fa-info-circle');
    }
    
    toast.classList.add('show', 'text-white');
    
    setTimeout(() => {
        toast.classList.add('hide');
        setTimeout(() => {
            toast.classList.remove('show', 'hide');
            toast.classList.add('hidden');
        }, CONFIG.ANIMATION_DURATION);
    }, CONFIG.TOAST_DURATION);
}

function validateDateFormat(dateString) {
    const regex = /^\d{4}-\d{2}-\d{2}$/;
    if (!regex.test(dateString)) return false;
    
    const date = new Date(dateString);
    return date instanceof Date && !isNaN(date);
}

function sanitizeInput(input) {
    const div = document.createElement('div');
    div.textContent = input;
    return div.innerHTML;
}

function validateTaskData(data) {
    const errors = [];
    
    if (!data.title || data.title.trim() === '') errors.push('Title is required');
    if (!data.task_date || !validateDateFormat(data.task_date)) errors.push('Valid task date is required');
    if (data.due_date && !validateDateFormat(data.due_date)) errors.push('Due date format is invalid');
    
    const validPriorities = ['Low','Medium','High'];
    if (data.priority && !validPriorities.includes(data.priority)) errors.push('Invalid priority value');
    
    const validStatuses = ['Pending','In Progress','Completed'];
    if (data.status && !validStatuses.includes(data.status)) errors.push('Invalid status value');
    
    return { valid: errors.length === 0, errors };
}

function getPriorityBadgeHTML(priority) {
    const classes = {
        'High': 'bg-red-100 text-red-700 border-red-300',
        'Medium': 'bg-yellow-100 text-yellow-700 border-yellow-300',
        'Low': 'bg-green-100 text-green-700 border-green-300'
    };
    const icons = {
        'High': 'fa-exclamation-circle',
        'Medium': 'fa-minus-circle',
        'Low': 'fa-check-circle'
    };
    
    const className = classes[priority] || 'bg-gray-100 text-gray-700 border-gray-300';
    const icon = icons[priority] || 'fa-circle';
    
    return `<span class="px-3 py-1 text-xs font-semibold rounded-full border ${className}">
        <i class="fas ${icon} mr-1"></i>${priority}
    </span>`;
}

function getStatusBadgeHTML(status) {
    const classes = {
        'Pending': 'bg-gray-100 text-gray-700 border-gray-300',
        'In Progress': 'bg-blue-100 text-blue-700 border-blue-300',
        'Completed': 'bg-green-100 text-green-700 border-green-300'
    };
    const icons = {
        'Pending': 'fa-clock',
        'In Progress': 'fa-spinner',
        'Completed': 'fa-check'
    };
    
    const className = classes[status] || 'bg-gray-100 text-gray-700 border-gray-300';
    const icon = icons[status] || 'fa-circle';
    
    return `<span class="px-3 py-1 text-xs font-semibold rounded-full border ${className}">
        <i class="fas ${icon} mr-1"></i>${status}
    </span>`;
}

function showLoading(element) {
    element.classList.add('loading');
    element.style.pointerEvents = 'none';
}

function hideLoading(element) {
    element.classList.remove('loading');
    element.style.pointerEvents = '';
}

function debounce(func, wait = 300) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

function updateCurrentDateTime() {
    const element = document.getElementById('currentDateTime');
    if (element) element.textContent = getCurrentDateTime();
}

setInterval(updateCurrentDateTime, 60000);

document.addEventListener('DOMContentLoaded', function() {
    updateCurrentDateTime();
    console.log('Calendar Task Management System initialized');
});
