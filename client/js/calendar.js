let currentMonth = new Date().getMonth();
let currentYear = new Date().getFullYear();
let selectedDate = formatDate(new Date());
let allTasks = [];

document.addEventListener('DOMContentLoaded', function() {
    initializeCalendar();
});

function initializeCalendar() {
    setDefaultDate();
    loadCalendar();
    loadTasksForDate(selectedDate);
}

function setDefaultDate() {
    const taskDateInput = document.getElementById('taskDate');
    if (taskDateInput) {
        taskDateInput.value = selectedDate;
    }
}

async function loadCalendar() {
    try {
        const monthTitle = document.getElementById('currentMonth');
        if (monthTitle) {
            monthTitle.textContent = `${getMonthName(currentMonth)} ${currentYear}`;
        }
        
        const params = {
            action: 'getTasks',
            month: currentMonth + 1,
            year: currentYear
        };
        
        const response = await apiGet('tasks.php', params);
        
        if (response.success) {
            allTasks = response.tasks || [];
            renderCalendar();
        } else {
            console.error('Failed to load tasks:', response.message);
            showToast('Failed to load calendar data', 'error');
        }
    } catch (error) {
        console.error('Error loading calendar:', error);
        showToast('Error loading calendar', 'error');
    }
}

function renderCalendar() {
    const calendarGrid = document.getElementById('calendarGrid');
    if (!calendarGrid) return;
    
    calendarGrid.innerHTML = '';
    
    const firstDay = new Date(currentYear, currentMonth, 1).getDay();
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const today = formatDate(new Date());
    
    for (let i = 0; i < firstDay; i++) {
        const emptyCell = createEmptyDayCell();
        calendarGrid.appendChild(emptyCell);
    }
    
    for (let day = 1; day <= daysInMonth; day++) {
        const date = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const dayCell = createDayCell(day, date, today);
        calendarGrid.appendChild(dayCell);
    }
}

function createEmptyDayCell() {
    const cell = document.createElement('div');
    cell.className = 'calendar-day border border-gray-100 rounded-lg p-2 bg-gray-50 other-month';
    return cell;
}

function createDayCell(day, date, today) {
    const cell = document.createElement('div');
    cell.className = 'calendar-day border border-gray-200 rounded-lg p-2 bg-white';
    cell.onclick = () => selectDate(date);
    
    if (date === selectedDate) {
        cell.classList.add('selected');
    }
    
    if (date === today) {
        cell.classList.add('today', 'ring-2', 'ring-blue-400');
    }
    
    const dayTasks = allTasks.filter(task => task.task_date === date);
    
    cell.innerHTML = `
        <div class="day-number ${date === selectedDate ? 'text-white' : 'text-gray-800'}">
            ${day}
        </div>
        ${renderTaskDots(dayTasks, date === selectedDate)}
    `;
    
    return cell;
}

function renderTaskDots(tasks, isSelected) {
    if (tasks.length === 0) {
        return '<div class="task-dots-container"></div>';
    }
    
    const maxDots = 3;
    const visibleTasks = tasks.slice(0, maxDots);
    const remainingCount = tasks.length - maxDots;
    
    const dots = visibleTasks.map(task => {
        const priorityClass = `priority-${task.priority.toLowerCase()}`;
        return `<div class="task-dot ${priorityClass}" title="${sanitizeInput(task.title)}"></div>`;
    }).join('');
    
    const countBadge = remainingCount > 0 
        ? `<span class="text-xs ${isSelected ? 'text-white' : 'text-gray-500'} font-semibold">+${remainingCount}</span>`
        : '';
    
    return `<div class="task-dots-container">${dots}${countBadge}</div>`;
}

function changeMonth(delta) {
    currentMonth += delta;
    
    if (currentMonth > 11) {
        currentMonth = 0;
        currentYear++;
    } else if (currentMonth < 0) {
        currentMonth = 11;
        currentYear--;
    }
    
    loadCalendar();
}

function goToToday() {
    const today = new Date();
    currentMonth = today.getMonth();
    currentYear = today.getFullYear();
    selectedDate = formatDate(today);
    
    setDefaultDate();
    loadCalendar();
    loadTasksForDate(selectedDate);
}

function selectDate(date) {
    selectedDate = date;
    
    const taskDateInput = document.getElementById('taskDate');
    if (taskDateInput) {
        taskDateInput.value = date;
    }
    
    renderCalendar();
    loadTasksForDate(date);
}

async function loadTasksForDate(date) {
    try {
        const titleElement = document.getElementById('selectedDateTitle');
        if (titleElement) {
            titleElement.textContent = `Tasks for ${formatDateForDisplay(date)}`;
        }
        
        const params = {
            action: 'getTasksByDate',
            date: date
        };
        
        const response = await apiGet('tasks.php', params);
        
        if (response.success) {
            renderTasksForDate(response.tasks || []);
        } else {
            console.error('Failed to load tasks:', response.message);
            showToast('Failed to load tasks for this date', 'error');
        }
    } catch (error) {
        console.error('Error loading tasks for date:', error);
        showToast('Error loading tasks', 'error');
    }
}

function renderTasksForDate(tasks) {
    const container = document.getElementById('tasksForDate');
    if (!container) return;
    
    if (tasks.length === 0) {
        container.innerHTML = `
            <div class="empty-state fade-in">
                <i class="fas fa-calendar-check"></i>
                <p class="text-lg font-semibold">No tasks for this date</p>
                <p class="text-sm mt-2">Click "Add New Task" to create one</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = tasks.map(task => createTaskCardHTML(task)).join('');
}

function createTaskCardHTML(task) {
    const completedClass = task.is_completed ? 'completed' : '';
    const titleClass = task.is_completed ? 'line-through text-gray-500' : 'text-gray-800';
    
    return `
        <div class="task-card priority-${task.priority.toLowerCase()} ${completedClass} border border-gray-200 rounded-lg p-4 hover:shadow-lg transition-all slide-up">
            <div class="flex items-start gap-3">
                <input type="checkbox" 
                    ${task.is_completed ? 'checked' : ''} 
                    onchange="toggleComplete(${task.id})"
                    class="mt-1 cursor-pointer">
                
                <div class="flex-1">
                    <h4 class="font-bold text-lg ${titleClass} mb-1">
                        ${sanitizeInput(task.title)}
                    </h4>
                    
                    ${task.description ? `
                        <p class="text-sm text-gray-600 mb-3 truncate-2-lines">
                            ${sanitizeInput(task.description)}
                        </p>
                    ` : ''}
                    
                    <div class="flex flex-wrap gap-2 mt-3">
                        ${getPriorityBadgeHTML(task.priority)}
                        ${getStatusBadgeHTML(task.status)}
                        
                        ${task.category ? `
                            <span class="px-3 py-1 text-xs font-semibold rounded-full bg-purple-100 text-purple-700 border border-purple-300">
                                <i class="fas fa-tag mr-1"></i>${sanitizeInput(task.category)}
                            </span>
                        ` : ''}
                        
                        ${task.due_date ? `
                            <span class="px-3 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-700 border border-gray-300">
                                <i class="fas fa-clock mr-1"></i>Due: ${task.due_date}
                            </span>
                        ` : ''}
                    </div>
                </div>
                
                <div class="flex gap-2">
                    <button onclick='editTask(${JSON.stringify(task).replace(/'/g, "&#39;")})' 
                            class="text-blue-600 hover:text-blue-800 hover:scale-110 transition-transform p-2">
                        <i class="fas fa-edit text-lg"></i>
                    </button>
                    <button onclick="deleteTask(${task.id})" 
                            class="text-red-600 hover:text-red-800 hover:scale-110 transition-transform p-2">
                        <i class="fas fa-trash text-lg"></i>
                    </button>
                </div>
            </div>
        </div>
    `;
}

window.loadCalendar = loadCalendar;
window.changeMonth = changeMonth;
window.selectDate = selectDate;
window.goToToday = goToToday;
window.loadTasksForDate = loadTasksForDate;
