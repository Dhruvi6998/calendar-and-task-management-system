<?php

require_once '../config/database.php';
header('Content-Type: application/json');

$conn = getDBConnection();

try {
    filterTasks($conn);
} catch(Exception $e) {
    error_log("Filter API Error: " . $e->getMessage());
    sendResponse(false, 'An error occurred while filtering tasks');
}

function filterTasks($conn) {
    $priority = $_GET['priority'] ?? '';
    $category = $_GET['category'] ?? '';
    $status = $_GET['status'] ?? '';
    $search = $_GET['search'] ?? '';
    $dateFrom = $_GET['date_from'] ?? '';
    $dateTo = $_GET['date_to'] ?? '';
    
    $sql = "SELECT 
                id,
                title,
                description,
                task_date,
                due_date,
                priority,
                category,
                status,
                is_completed,
                created_at,
                updated_at
            FROM tasks 
            WHERE 1=1";
    
    $params = [];
    
    if (!empty($priority)) {
        $validPriorities = ['Low', 'Medium', 'High'];
        if (in_array($priority, $validPriorities)) {
            $sql .= " AND priority = :priority";
            $params['priority'] = $priority;
        }
    }
    
    if (!empty($category)) {
        $sql .= " AND category = :category";
        $params['category'] = $category;
    }
    
    if (!empty($status)) {
        $validStatuses = ['Pending', 'In Progress', 'Completed'];
        if (in_array($status, $validStatuses)) {
            $sql .= " AND status = :status";
            $params['status'] = $status;
        }
    }
    
    if (!empty($search)) {
        $sql .= " AND (title LIKE :search OR description LIKE :search)";
        $params['search'] = '%' . $search . '%';
    }
    
    if (!empty($dateFrom) && validateDate($dateFrom)) {
        $sql .= " AND task_date >= :date_from";
        $params['date_from'] = $dateFrom;
    }
    
    if (!empty($dateTo) && validateDate($dateTo)) {
        $sql .= " AND task_date <= :date_to";
        $params['date_to'] = $dateTo;
    }

    $sql .= " ORDER BY 
                task_date DESC, 
                FIELD(priority, 'High', 'Medium', 'Low'),
                created_at DESC";
    
    try {
        $stmt = $conn->prepare($sql);
        $stmt->execute($params);
        
        $tasks = $stmt->fetchAll();
        
        $filterSummary = buildFilterSummary($priority, $category, $status, $search, $dateFrom, $dateTo);
        
        sendResponse(true, 'Tasks filtered successfully', [
            'tasks' => $tasks,
            'count' => count($tasks),
            'filters' => $filterSummary
        ]);
        
    } catch(PDOException $e) {
        error_log("filterTasks Error: " . $e->getMessage());
        sendResponse(false, 'Failed to filter tasks');
    }
}

function getCategories($conn) {
    $sql = "SELECT DISTINCT category 
            FROM tasks 
            WHERE category IS NOT NULL 
            AND category != '' 
            ORDER BY category";
    
    try {
        $stmt = $conn->query($sql);
        $categories = $stmt->fetchAll(PDO::FETCH_COLUMN);
        
        sendResponse(true, 'Categories retrieved successfully', [
            'categories' => $categories,
            'count' => count($categories)
        ]);
        
    } catch(PDOException $e) {
        error_log("getCategories Error: " . $e->getMessage());
        sendResponse(false, 'Failed to retrieve categories');
    }
}

function getTaskStats($conn) {
    $sql = "SELECT 
                COUNT(*) as total_tasks,
                SUM(CASE WHEN is_completed = 1 THEN 1 ELSE 0 END) as completed_tasks,
                SUM(CASE WHEN is_completed = 0 THEN 1 ELSE 0 END) as pending_tasks,
                SUM(CASE WHEN priority = 'High' THEN 1 ELSE 0 END) as high_priority,
                SUM(CASE WHEN priority = 'Medium' THEN 1 ELSE 0 END) as medium_priority,
                SUM(CASE WHEN priority = 'Low' THEN 1 ELSE 0 END) as low_priority,
                SUM(CASE WHEN status = 'Pending' THEN 1 ELSE 0 END) as status_pending,
                SUM(CASE WHEN status = 'In Progress' THEN 1 ELSE 0 END) as status_in_progress,
                SUM(CASE WHEN status = 'Completed' THEN 1 ELSE 0 END) as status_completed
            FROM tasks";
    
    try {
        $stmt = $conn->query($sql);
        $stats = $stmt->fetch();
        
        sendResponse(true, 'Statistics retrieved successfully', [
            'statistics' => $stats
        ]);
        
    } catch(PDOException $e) {
        error_log("getTaskStats Error: " . $e->getMessage());
        sendResponse(false, 'Failed to retrieve statistics');
    }
}

function getOverdueTasks($conn) {
    $sql = "SELECT 
                id,
                title,
                description,
                task_date,
                due_date,
                priority,
                category,
                status,
                is_completed,
                DATEDIFF(CURDATE(), due_date) as days_overdue
            FROM tasks 
            WHERE due_date < CURDATE() 
            AND is_completed = 0
            ORDER BY due_date ASC";
    
    try {
        $stmt = $conn->query($sql);
        $tasks = $stmt->fetchAll();
        
        sendResponse(true, 'Overdue tasks retrieved successfully', [
            'tasks' => $tasks,
            'count' => count($tasks)
        ]);
        
    } catch(PDOException $e) {
        error_log("getOverdueTasks Error: " . $e->getMessage());
        sendResponse(false, 'Failed to retrieve overdue tasks');
    }
}

function getUpcomingTasks($conn) {
    $sql = "SELECT 
                id,
                title,
                description,
                task_date,
                due_date,
                priority,
                category,
                status,
                is_completed,
                DATEDIFF(task_date, CURDATE()) as days_until
            FROM tasks 
            WHERE task_date BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 7 DAY)
            AND is_completed = 0
            ORDER BY task_date ASC, priority DESC";
    
    try {
        $stmt = $conn->query($sql);
        $tasks = $stmt->fetchAll();
        
        sendResponse(true, 'Upcoming tasks retrieved successfully', [
            'tasks' => $tasks,
            'count' => count($tasks)
        ]);
        
    } catch(PDOException $e) {
        error_log("getUpcomingTasks Error: " . $e->getMessage());
        sendResponse(false, 'Failed to retrieve upcoming tasks');
    }
}

function buildFilterSummary($priority, $category, $status, $search, $dateFrom, $dateTo) {
    $filters = [];
    
    if (!empty($priority)) $filters[] = "Priority: $priority";
    if (!empty($category)) $filters[] = "Category: $category";
    if (!empty($status)) $filters[] = "Status: $status";
    if (!empty($search)) $filters[] = "Search: $search";
    if (!empty($dateFrom)) $filters[] = "From: $dateFrom";
    if (!empty($dateTo)) $filters[] = "To: $dateTo";
    
    return [
        'active_filters' => $filters,
        'filter_count' => count($filters),
        'priority' => $priority,
        'category' => $category,
        'status' => $status,
        'search' => $search,
        'date_from' => $dateFrom,
        'date_to' => $dateTo
    ];
}

function sendResponse($success, $message, $data = []) {
    $response = [
        'success' => $success,
        'message' => $message,
        'timestamp' => date('Y-m-d H:i:s')
    ];
    
    if (!empty($data)) {
        $response = array_merge($response, $data);
    }
    
    echo json_encode($response, JSON_PRETTY_PRINT);
    exit;
}

?>
