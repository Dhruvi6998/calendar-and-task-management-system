document.addEventListener('DOMContentLoaded', function() {
    const taskForm = document.getElementById('taskForm');
    if (taskForm) {
        taskForm.addEventListener('submit', handleTaskSubmit);
    }
});

async function handleTaskSubmit(e) {
    e.preventDefault();
    
    const taskData = {
        id: document.getElementById('taskId').value,
        title: document.getElementById('taskTitle').value.trim(),
        description: document.getElementById('taskDescription').value.trim(),
        task_date: document.getElementById('taskDate').value,
        due_date: document.getElementById('dueDate').value,
        priority: document.getElementById('taskPriority').value,
        category: document.getElementById('taskCategory').value.trim(),
        status: document.getElementById('taskStatus').value
    };
    
    const validation = validateTaskData(taskData);
    if (!validation.valid) {
        showToast(validation.errors.join(', '), 'error');
        return;
    }
    
    const action = taskData.id ? 'updateTask' : 'addTask';
    const actionText = taskData.id ? 'updated' : 'added';
    
    const submitButton = e.target.querySelector('button[type="submit"]');
    showLoading(submitButton);
    
    try {
        const response = await apiPost(`tasks.php?action=${action}`, taskData);
        
        if (response.success) {
            showToast(`Task ${actionText} successfully!`, 'success');
            resetForm();
            loadCalendar();
            loadTasksForDate(selectedDate);
            loadCategories();
        } else {
            showToast(response.message || `Failed to ${action.replace('Task', '')} task`, 'error');
        }
    } catch (error) {
        console.error('Error submitting task:', error);
        showToast('An error occurred. Please try again.', 'error');
    } finally {
        hideLoading(submitButton);
    }
}

function editTask(task) {
    const formTitle = document.getElementById('formTitle');
    if (formTitle) {
        formTitle.innerHTML = '<i class="fas fa-edit text-blue-500 mr-2"></i>Edit Task';
    }
    
    document.getElementById('taskId').value = task.id;
    document.getElementById('taskTitle').value = task.title;
    document.getElementById('taskDescription').value = task.description || '';
    document.getElementById('taskDate').value = task.task_date;
    document.getElementById('dueDate').value = task.due_date || '';
    document.getElementById('taskPriority').value = task.priority;
    document.getElementById('taskCategory').value = task.category || '';
    document.getElementById('taskStatus').value = task.status;
    
    document.getElementById('taskForm').scrollIntoView({ 
        behavior: 'smooth', 
        block: 'start' 
    });
    
    setTimeout(() => {
        document.getElementById('taskTitle').focus();
    }, 500);
}

async function deleteTask(id) {
    if (!confirm('Are you sure you want to delete this task? This action cannot be undone.')) {
        return;
    }
    
    try {
        const formData = new FormData();
        formData.append('action', 'deleteTask');
        formData.append('id', id);
        
        const response = await apiPost('tasks.php', formData, true);
        
        if (response.success) {
            showToast('Task deleted successfully!', 'success');
            loadCalendar();
            loadTasksForDate(selectedDate);
        } else {
            showToast(response.message || 'Failed to delete task', 'error');
        }
    } catch (error) {
        console.error('Error deleting task:', error);
        showToast('An error occurred while deleting the task', 'error');
    }
}

async function toggleComplete(id) {
    try {
        const formData = new FormData();
        formData.append('action', 'toggleComplete');
        formData.append('id', id);
        
        const response = await apiPost('tasks.php', formData, true);
        
        if (response.success) {
            loadCalendar();
            loadTasksForDate(selectedDate);
        } else {
            showToast(response.message || 'Failed to update task', 'error');
        }
    } catch (error) {
        console.error('Error toggling task:', error);
        showToast('An error occurred', 'error');
    }
}

function resetForm() {
    const formTitle = document.getElementById('formTitle');
    if (formTitle) {
        formTitle.innerHTML = '<i class="fas fa-plus-circle text-blue-500 mr-2"></i>Add New Task';
    }
    
    const taskForm = document.getElementById('taskForm');
    if (taskForm) {
        taskForm.reset();
    }
    
    document.getElementById('taskId').value = '';
    document.getElementById('taskDate').value = selectedDate;
    document.getElementById('taskPriority').value = 'Medium';
    document.getElementById('taskStatus').value = 'Pending';
}

async function loadCategories() {
    try {
        const params = {
            action: 'getTasks',
            month: currentMonth + 1,
            year: currentYear
        };
        
        const response = await apiGet('tasks.php', params);
        
        if (response.success && response.tasks) {
            const categories = [...new Set(
                response.tasks
                    .map(task => task.category)
                    .filter(cat => cat && cat.trim() !== '')
            )].sort();
            
            const filterSelect = document.getElementById('filterCategory');
            if (filterSelect) {
                const currentValue = filterSelect.value;
                filterSelect.innerHTML = '<option value="">All Categories</option>';
                
                categories.forEach(category => {
                    const option = document.createElement('option');
                    option.value = category;
                    option.textContent = category;
                    if (category === currentValue) {
                        option.selected = true;
                    }
                    filterSelect.appendChild(option);
                });
            }
        }
    } catch (error) {
        console.error('Error loading categories:', error);
    }
}

function exportTasks() {
    try {
        const exportUrl = `${CONFIG.API_BASE_URL}import-export.php?action=exportTasks`;
        window.location.href = exportUrl;
        showToast('Exporting tasks...', 'info');
        
        setTimeout(() => {
            showToast('Tasks exported successfully!', 'success');
        }, 1000);
    } catch (error) {
        console.error('Error exporting tasks:', error);
        showToast('Failed to export tasks', 'error');
    }
}

async function importTasks() {
    const fileInput = document.getElementById('importFile');
    const file = fileInput.files[0];
    
    if (!file) {
        showToast('No file selected', 'error');
        return;
    }
    
    if (!file.name.endsWith('.csv')) {
        showToast('Please select a CSV file', 'error');
        fileInput.value = '';
        return;
    }
    
    try {
        const formData = new FormData();
        formData.append('action', 'importTasks');
        formData.append('file', file);
        
        showToast('Importing tasks...', 'info');
        
        const response = await apiPost('import-export.php', formData, true);
        
        if (response.success) {
            showToast(response.message, 'success');
            
            if (response.imported > 0) {
                console.log('Import Results:', {
                    imported: response.imported,
                    skipped: response.skipped,
                    errors: response.errors
                });
            }
            
            loadCalendar();
            loadTasksForDate(selectedDate);
            loadCategories();
        } else {
            showToast(response.message || 'Failed to import tasks', 'error');
            
            if (response.errors && response.errors.length > 0) {
                console.error('Import Errors:', response.errors);
            }
        }
    } catch (error) {
        console.error('Error importing tasks:', error);
        showToast('An error occurred during import', 'error');
    } finally {
        fileInput.value = '';
    }
}

window.handleTaskSubmit = handleTaskSubmit;
window.editTask = editTask;
window.deleteTask = deleteTask;
window.toggleComplete = toggleComplete;
window.resetForm = resetForm;
window.loadCategories = loadCategories;
window.exportTasks = exportTasks;
window.importTasks = importTasks;
