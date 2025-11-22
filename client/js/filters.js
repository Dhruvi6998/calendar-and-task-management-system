let currentFilters = {
    priority: '',
    category: '',
    status: ''
};

async function applyFilters() {
    try {
        const priority = document.getElementById('filterPriority').value;
        const category = document.getElementById('filterCategory').value;
        const status = document.getElementById('filterStatus').value;
        
        if (!priority && !category && !status) {
            showToast('Please select at least one filter', 'info');
            return;
        }
        
        currentFilters = { priority, category, status };
        
        const params = { action: 'filterTasks' };
        if (priority) params.priority = priority;
        if (category) params.category = category;
        if (status) params.status = status;
        
        const filterButton = document.querySelector('button[onclick="applyFilters()"]');
        showLoading(filterButton);
        
        const response = await apiGet('filter.php', params);
        
        if (response.success) {
            displayFilteredTasks(response.tasks || []);
            const filterCount = response.filters.active_filters.length;
            showToast(
                `Found ${response.count} task(s) matching ${filterCount} filter(s)`,
                'success'
            );
            console.log('Filter Applied:', response.filters);
        } else {
            showToast(response.message || 'Failed to filter tasks', 'error');
        }
    } catch (error) {
        console.error('Error applying filters:', error);
        showToast('An error occurred while filtering', 'error');
    } finally {
        const filterButton = document.querySelector('button[onclick="applyFilters()"]');
        hideLoading(filterButton);
    }
}

function clearFilters() {
    document.getElementById('filterPriority').value = '';
    document.getElementById('filterCategory').value = '';
    document.getElementById('filterStatus').value = '';
    
    currentFilters = {
        priority: '',
        category: '',
        status: ''
    };
    
    loadTasksForDate(selectedDate);
    showToast('Filters cleared', 'info');
}

function displayFilteredTasks(tasks) {
    const container = document.getElementById('tasksForDate');
    if (!container) return;
    
    const titleElement = document.getElementById('selectedDateTitle');
    if (titleElement) {
        const filterLabels = [];
        if (currentFilters.priority) filterLabels.push(currentFilters.priority);
        if (currentFilters.category) filterLabels.push(currentFilters.category);
        if (currentFilters.status) filterLabels.push(currentFilters.status);
        
        titleElement.innerHTML = `
            <i class="fas fa-filter text-purple-500 mr-2"></i>
            Filtered Tasks
            ${filterLabels.length > 0 ? `<span class="text-sm text-gray-500 ml-2">(${filterLabels.join(', ')})</span>` : ''}
        `;
    }
    
    if (tasks.length === 0) {
        container.innerHTML = `
            <div class="empty-state fade-in">
                <i class="fas fa-search"></i>
                <p class="text-lg font-semibold">No tasks match your filters</p>
                <p class="text-sm mt-2">Try adjusting your filter criteria</p>
                <button onclick="clearFilters()" class="mt-4 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition">
                    Clear Filters
                </button>
            </div>
        `;
        return;
    }
    
    const tasksByDate = groupTasksByDate(tasks);
    
    container.innerHTML = Object.entries(tasksByDate)
        .map(([date, dateTasks]) => `
            <div class="mb-6 fade-in">
                <h4 class="text-lg font-bold text-gray-700 mb-3 flex items-center gap-2">
                    <i class="fas fa-calendar text-blue-500"></i>
                    ${formatDateForDisplay(date)}
                    <span class="text-sm font-normal text-gray-500">(${dateTasks.length} task${dateTasks.length !== 1 ? 's' : ''})</span>
                </h4>
                <div class="space-y-3">
                    ${dateTasks.map(task => createTaskCardHTML(task)).join('')}
                </div>
            </div>
        `).join('');
}

function groupTasksByDate(tasks) {
    return tasks.reduce((groups, task) => {
        const date = task.task_date;
        if (!groups[date]) groups[date] = [];
        groups[date].push(task);
        return groups;
    }, {});
}

async function searchTasks(searchTerm) {
    if (!searchTerm || searchTerm.trim().length < 2) {
        showToast('Please enter at least 2 characters to search', 'info');
        return;
    }
    
    try {
        const params = {
            action: 'filterTasks',
            search: searchTerm.trim()
        };
        
        const response = await apiGet('filter.php', params);
        
        if (response.success) {
            displayFilteredTasks(response.tasks || []);
            showToast(`Found ${response.count} task(s) matching "${searchTerm}"`, 'success');
        } else {
            showToast(response.message || 'Search failed', 'error');
        }
    } catch (error) {
        console.error('Error searching tasks:', error);
        showToast('An error occurred during search', 'error');
    }
}

async function filterByDateRange(startDate, endDate) {
    if (!validateDateFormat(startDate) || !validateDateFormat(endDate)) {
        showToast('Invalid date format', 'error');
        return;
    }
    
    try {
        const params = {
            action: 'filterTasks',
            date_from: startDate,
            date_to: endDate
        };
        
        const response = await apiGet('filter.php', params);
        
        if (response.success) {
            displayFilteredTasks(response.tasks || []);
            showToast(
                `Found ${response.count} task(s) between ${startDate} and ${endDate}`,
                'success'
            );
        } else {
            showToast(response.message || 'Failed to filter by date range', 'error');
        }
    } catch (error) {
        console.error('Error filtering by date range:', error);
        showToast('An error occurred', 'error');
    }
}

async function showCompletedTasks() {
    document.getElementById('filterStatus').value = 'Completed';
    await applyFilters();
}

async function showPendingTasks() {
    document.getElementById('filterStatus').value = 'Pending';
    await applyFilters();
}

async function showHighPriorityTasks() {
    document.getElementById('filterPriority').value = 'High';
    await applyFilters();
}

const filterPresets = {
    today: async function() {
        const today = formatDate(new Date());
        await filterByDateRange(today, today);
    },
    
    thisWeek: async function() {
        const today = new Date();
        const startOfWeek = new Date(today);
        startOfWeek.setDate(today.getDate() - today.getDay());
        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(startOfWeek.getDate() + 6);
        
        await filterByDateRange(
            formatDate(startOfWeek),
            formatDate(endOfWeek)
        );
    },
    
    thisMonth: async function() {
        const today = new Date();
        const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
        const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
        
        await filterByDateRange(
            formatDate(startOfMonth),
            formatDate(endOfMonth)
        );
    },
    
    overdue: async function() {
        showToast('Overdue tasks feature coming soon!', 'info');
    },
    
    upcoming: async function() {
        const today = new Date();
        const nextWeek = new Date(today);
        nextWeek.setDate(today.getDate() + 7);
        
        await filterByDateRange(
            formatDate(today),
            formatDate(nextWeek)
        );
    }
};

window.applyFilters = applyFilters;
window.clearFilters = clearFilters;
window.searchTasks = searchTasks;
window.filterByDateRange = filterByDateRange;
window.showCompletedTasks = showCompletedTasks;
window.showPendingTasks = showPendingTasks;
window.showHighPriorityTasks = showHighPriorityTasks;
window.filterPresets = filterPresets;
