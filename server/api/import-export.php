<?php

require_once '../config/database.php';

$action = $_GET['action'] ?? $_POST['action'] ?? '';

$conn = getDBConnection();

try {
    switch($action) {
        case 'exportTasks':
            exportTasks($conn);
            break;
        case 'importTasks':
            importTasks($conn);
            break;
        case 'exportFiltered':
            exportFiltered($conn);
            break;
        default:
            header('Content-Type: application/json');
            sendResponse(false, 'Invalid action specified');
    }
} catch(Exception $e) {
    error_log("Import/Export API Error: " . $e->getMessage());
    header('Content-Type: application/json');
    sendResponse(false, 'An error occurred: ' . $e->getMessage());
}

function exportTasks($conn) {
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
            ORDER BY task_date DESC, created_at DESC";
    
    try {
        $stmt = $conn->query($sql);
        $tasks = $stmt->fetchAll();
        
        header('Content-Type: text/csv; charset=utf-8');
        header('Content-Disposition: attachment; filename="tasks_export_' . date('Y-m-d_His') . '.csv"');
        header('Pragma: no-cache');
        header('Expires: 0');
        
        $output = fopen('php://output', 'w');
        fprintf($output, chr(0xEF).chr(0xBB).chr(0xBF));

        fputcsv($output, [
            'ID','Title','Description','Task Date','Due Date',
            'Priority','Category','Status','Completed','Created At','Updated At'
        ]);
        
        foreach($tasks as $task) {
            fputcsv($output, [
                $task['id'],
                $task['title'],
                $task['description'],
                $task['task_date'],
                $task['due_date'] ?? '',
                $task['priority'],
                $task['category'] ?? '',
                $task['status'],
                $task['is_completed'] ? 'Yes' : 'No',
                $task['created_at'],
                $task['updated_at']
            ]);
        }
        
        fclose($output);
        exit;
        
    } catch(PDOException $e) {
        error_log("exportTasks Error: " . $e->getMessage());
        header('Content-Type: application/json');
        sendResponse(false, 'Failed to export tasks');
    }
}

function exportFiltered($conn) {
    $priority = $_GET['priority'] ?? '';
    $category = $_GET['category'] ?? '';
    $status = $_GET['status'] ?? '';
    
    $sql = "SELECT 
                id,
                title,
                description,
                task_date,
                due_date,
                priority,
                category,
                status,
                is_completed
            FROM tasks WHERE 1=1";
    
    $params = [];
    
    if (!empty($priority)) {
        $sql .= " AND priority = :priority";
        $params['priority'] = $priority;
    }
    
    if (!empty($category)) {
        $sql .= " AND category = :category";
        $params['category'] = $category;
    }
    
    if (!empty($status)) {
        $sql .= " AND status = :status";
        $params['status'] = $status;
    }
    
    $sql .= " ORDER BY task_date DESC";
    
    try {
        $stmt = $conn->prepare($sql);
        $stmt->execute($params);
        $tasks = $stmt->fetchAll();
        
        header('Content-Type: text/csv; charset=utf-8');
        header('Content-Disposition: attachment; filename="filtered_tasks_' . date('Y-m-d_His') . '.csv"');
        
        $output = fopen('php://output', 'w');
        fprintf($output, chr(0xEF).chr(0xBB).chr(0xBF));
        
        fputcsv($output, [
            'ID','Title','Description','Task Date','Due Date',
            'Priority','Category','Status','Completed'
        ]);
        
        foreach($tasks as $task) {
            fputcsv($output, [
                $task['id'],
                $task['title'],
                $task['description'],
                $task['task_date'],
                $task['due_date'] ?? '',
                $task['priority'],
                $task['category'] ?? '',
                $task['status'],
                $task['is_completed'] ? 'Yes' : 'No'
            ]);
        }
        
        fclose($output);
        exit;
        
    } catch(PDOException $e) {
        error_log("exportFiltered Error: " . $e->getMessage());
        header('Content-Type: application/json');
        sendResponse(false, 'Failed to export filtered tasks');
    }
}

function importTasks($conn) {
    header('Content-Type: application/json');
    
    if (!isset($_FILES['file']) || $_FILES['file']['error'] !== UPLOAD_ERR_OK) {
        sendResponse(false, 'No file uploaded or upload error occurred');
        return;
    }
    
    $file = $_FILES['file']['tmp_name'];
    
    $fileInfo = finfo_open(FILEINFO_MIME_TYPE);
    $mimeType = finfo_file($fileInfo, $file);
    finfo_close($fileInfo);
    
    if (!in_array($mimeType, ['text/plain', 'text/csv', 'application/csv', 'application/vnd.ms-excel'])) {
        sendResponse(false, 'Invalid file type. Please upload a CSV file.');
        return;
    }
    
    $handle = fopen($file, 'r');
    if ($handle === false) {
        sendResponse(false, 'Failed to open uploaded file');
        return;
    }
    
    $header = fgetcsv($handle);
    if ($header === false) {
        fclose($handle);
        sendResponse(false, 'Empty CSV file');
        return;
    }
    
    $imported = 0;
    $skipped = 0;
    $errors = [];
    $lineNumber = 1;
    
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
    
    $stmt = $conn->prepare($sql);
    
    while (($data = fgetcsv($handle)) !== false) {
        $lineNumber++;
        
        if (count(array_filter($data)) === 0) {
            continue;
        }
        
        if (count($data) < 4) {
            $skipped++;
            $errors[] = "Line $lineNumber: Insufficient data";
            continue;
        }
        
        $title = trim($data[1] ?? $data[0]);
        $description = trim($data[2] ?? $data[1] ?? '');
        $taskDate = trim($data[3] ?? $data[2]);
        $dueDate = trim($data[4] ?? $data[3] ?? '');
        $priority = trim($data[5] ?? $data[4] ?? 'Medium');
        $category = trim($data[6] ?? $data[5] ?? '');
        $status = trim($data[7] ?? $data[6] ?? 'Pending');
        $completed = trim($data[8] ?? $data[7] ?? 'No');
        
        if (empty($title)) {
            $skipped++;
            $errors[] = "Line $lineNumber: Missing title";
            continue;
        }
        
        if (empty($taskDate)) {
            $skipped++;
            $errors[] = "Line $lineNumber: Missing task date";
            continue;
        }
        
        if (!validateDate($taskDate)) {
            $skipped++;
            $errors[] = "Line $lineNumber: Invalid task date format";
            continue;
        }
        
        if (!empty($dueDate) && !validateDate($dueDate)) {
            $dueDate = null;
        }
        
        $validPriorities = ['Low','Medium','High'];
        if (!in_array($priority, $validPriorities)) {
            $priority = 'Medium';
        }
        
        $validStatuses = ['Pending','In Progress','Completed'];
        if (!in_array($status, $validStatuses)) {
            $status = 'Pending';
        }
        
        $isCompleted = in_array(strtolower($completed), ['yes','true','1','completed']) ? 1 : 0;
        
        try {
            $result = $stmt->execute([
                'title' => $title,
                'description' => $description,
                'task_date' => $taskDate,
                'due_date' => empty($dueDate) ? null : $dueDate,
                'priority' => $priority,
                'category' => $category,
                'status' => $status,
                'is_completed' => $isCompleted
            ]);
            
            if ($result) {
                $imported++;
            } else {
                $skipped++;
                $errors[] = "Line $lineNumber: Failed to insert";
            }
            
        } catch(PDOException $e) {
            $skipped++;
            $errors[] = "Line $lineNumber: " . $e->getMessage();
            error_log("Import error on line $lineNumber: " . $e->getMessage());
        }
    }
    
    fclose($handle);
    
    $message = "$imported task(s) imported successfully";
    if ($skipped > 0) {
        $message .= ", $skipped skipped";
    }
    
    sendResponse(true, $message, [
        'imported' => $imported,
        'skipped' => $skipped,
        'total_lines' => $lineNumber - 1,
        'errors' => array_slice($errors, 0, 10)
    ]);
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
