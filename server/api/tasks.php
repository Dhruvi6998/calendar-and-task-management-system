<?php

require_once '../config/database.php';

header('Content-Type: application/json');

$action = $_POST['action'] ?? $_GET['action'] ?? '';

$conn = getDBConnection();

try {
    switch($action) {
        case 'getTasks':
            getTasks($conn);
            break;
        case 'getTasksByDate':
            getTasksByDate($conn);
            break;
        case 'addTask':
            addTask($conn);
            break;
        case 'updateTask':
            updateTask($conn);
            break;
        case 'deleteTask':
            deleteTask($conn);
            break;
        case 'toggleComplete':
            toggleComplete($conn);
            break;
        default:
            sendResponse(false, 'Invalid action specified');
    }
} catch(Exception $e) {
    error_log("API Error: " . $e->getMessage());
    sendResponse(false, 'An error occurred: ' . $e->getMessage());
}

function getTasks($conn) {
    $month = $_GET['month'] ?? date('m');
    $year = $_GET['year'] ?? date('Y');

    if (!is_numeric($month) || $month < 1 || $month > 12) {
        sendResponse(false, 'Invalid month');
        return;
    }
    
    if (!is_numeric($year) || $year < 2000 || $year > 2100) {
        sendResponse(false, 'Invalid year');
        return;
    }
    
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
            WHERE MONTH(task_date) = :month 
            AND YEAR(task_date) = :year
            ORDER BY task_date ASC, priority DESC, created_at DESC";
    
    try {
        $stmt = $conn->prepare($sql);
        $stmt->execute(['month' => $month, 'year' => $year]);
        $tasks = $stmt->fetchAll();
        sendResponse(true, 'Tasks retrieved successfully', [
            'tasks' => $tasks,
            'count' => count($tasks),
            'month' => (int)$month,
            'year' => (int)$year
        ]);
    } catch(PDOException $e) {
        error_log("getTasks Error: " . $e->getMessage());
        sendResponse(false, 'Failed to retrieve tasks');
    }
}

function getTasksByDate($conn) {
    $date = $_GET['date'] ?? date('Y-m-d');

    if (!validateDate($date)) {
        sendResponse(false, 'Invalid date format. Use Y-m-d format.');
        return;
    }
    
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
            WHERE task_date = :date 
            ORDER BY 
                FIELD(priority, 'High', 'Medium', 'Low'),
                created_at DESC";
    
    try {
        $stmt = $conn->prepare($sql);
        $stmt->execute(['date' => $date]);
        $tasks = $stmt->fetchAll();
        sendResponse(true, 'Tasks retrieved successfully', [
            'tasks' => $tasks,
            'count' => count($tasks),
            'date' => $date
        ]);
    } catch(PDOException $e) {
        error_log("getTasksByDate Error: " . $e->getMessage());
        sendResponse(false, 'Failed to retrieve tasks');
    }
}

function addTask($conn) {
    $input = file_get_contents('php://input');
    $data = json_decode($input, true);
    
    if (empty($data['title'])) {
        sendResponse(false, 'Task title is required');
        return;
    }
    
    if (empty($data['task_date'])) {
        sendResponse(false, 'Task date is required');
        return;
    }
    
    if (!validateDate($data['task_date'])) {
        sendResponse(false, 'Invalid task date format');
        return;
    }
    
    if (!empty($data['due_date']) && !validateDate($data['due_date'])) {
        sendResponse(false, 'Invalid due date format');
        return;
    }
    
    $validPriorities = ['Low', 'Medium', 'High'];
    $priority = $data['priority'] ?? 'Medium';
    if (!in_array($priority, $validPriorities)) {
        $priority = 'Medium';
    }
    
    $validStatuses = ['Pending', 'In Progress', 'Completed'];
    $status = $data['status'] ?? 'Pending';
    if (!in_array($status, $validStatuses)) {
        $status = 'Pending';
    }
    
    $sql = "INSERT INTO tasks (
                title, 
                description, 
                task_date, 
                due_date, 
                priority, 
                category, 
                status,
                is_completed
            ) VALUES (
                :title, 
                :description, 
                :task_date, 
                :due_date, 
                :priority, 
                :category, 
                :status,
                :is_completed
            )";
    
    try {
        $stmt = $conn->prepare($sql);
        $result = $stmt->execute([
            'title' => sanitizeInput($data['title']),
            'description' => sanitizeInput($data['description'] ?? ''),
            'task_date' => $data['task_date'],
            'due_date' => $data['due_date'] ?? null,
            'priority' => $priority,
            'category' => sanitizeInput($data['category'] ?? ''),
            'status' => $status,
            'is_completed' => $status === 'Completed' ? 1 : 0
        ]);
        
        if ($result) {
            sendResponse(true, 'Task added successfully', [
                'id' => $conn->lastInsertId()
            ]);
        } else {
            sendResponse(false, 'Failed to add task');
        }
    } catch(PDOException $e) {
        error_log("addTask Error: " . $e->getMessage());
        sendResponse(false, 'Failed to add task');
    }
}

function updateTask($conn) {
    $input = file_get_contents('php://input');
    $data = json_decode($input, true);
    
    if (empty($data['id'])) {
        sendResponse(false, 'Task ID is required');
        return;
    }
    
    if (empty($data['title'])) {
        sendResponse(false, 'Task title is required');
        return;
    }
    
    if (empty($data['task_date'])) {
        sendResponse(false, 'Task date is required');
        return;
    }
    
    if (!validateDate($data['task_date'])) {
        sendResponse(false, 'Invalid task date format');
        return;
    }
    
    if (!empty($data['due_date']) && !validateDate($data['due_date'])) {
        sendResponse(false, 'Invalid due date format');
        return;
    }
    
    $validPriorities = ['Low', 'Medium', 'High'];
    $priority = $data['priority'] ?? 'Medium';
    if (!in_array($priority, $validPriorities)) {
        $priority = 'Medium';
    }
    
    $validStatuses = ['Pending', 'In Progress', 'Completed'];
    $status = $data['status'] ?? 'Pending';
    if (!in_array($status, $validStatuses)) {
        $status = 'Pending';
    }
    
    $sql = "UPDATE tasks SET 
                title = :title,
                description = :description,
                task_date = :task_date,
                due_date = :due_date,
                priority = :priority,
                category = :category,
                status = :status,
                is_completed = :is_completed
            WHERE id = :id";
    
    try {
        $stmt = $conn->prepare($sql);
        $result = $stmt->execute([
            'id' => $data['id'],
            'title' => sanitizeInput($data['title']),
            'description' => sanitizeInput($data['description'] ?? ''),
            'task_date' => $data['task_date'],
            'due_date' => $data['due_date'] ?? null,
            'priority' => $priority,
            'category' => sanitizeInput($data['category'] ?? ''),
            'status' => $status,
            'is_completed' => $status === 'Completed' ? 1 : 0
        ]);
        
        if ($result) {
            sendResponse(true, 'Task updated successfully');
        } else {
            sendResponse(false, 'Failed to update task');
        }
    } catch(PDOException $e) {
        error_log("updateTask Error: " . $e->getMessage());
        sendResponse(false, 'Failed to update task');
    }
}

function deleteTask($conn) {
    $id = $_POST['id'] ?? null;
    
    if (empty($id) || !is_numeric($id)) {
        sendResponse(false, 'Valid task ID is required');
        return;
    }
    
    $sql = "DELETE FROM tasks WHERE id = :id";
    
    try {
        $stmt = $conn->prepare($sql);
        $result = $stmt->execute(['id' => $id]);
        
        if ($result && $stmt->rowCount() > 0) {
            sendResponse(true, 'Task deleted successfully');
        } else {
            sendResponse(false, 'Task not found or already deleted');
        }
    } catch(PDOException $e) {
        error_log("deleteTask Error: " . $e->getMessage());
        sendResponse(false, 'Failed to delete task');
    }
}

function toggleComplete($conn) {
    $id = $_POST['id'] ?? null;
    
    if (empty($id) || !is_numeric($id)) {
        sendResponse(false, 'Valid task ID is required');
        return;
    }
    
    $sql = "UPDATE tasks SET 
                is_completed = NOT is_completed,
                status = CASE 
                    WHEN is_completed = 0 THEN 'Completed' 
                    ELSE 'Pending' 
                END
            WHERE id = :id";
    
    try {
        $stmt = $conn->prepare($sql);
        $result = $stmt->execute(['id' => $id]);
        
        if ($result && $stmt->rowCount() > 0) {
            sendResponse(true, 'Task status updated successfully');
        } else {
            sendResponse(false, 'Task not found');
        }
        
    } catch(PDOException $e) {
        error_log("toggleComplete Error: " . $e->getMessage());
        sendResponse(false, 'Failed to update task status');
    }
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
