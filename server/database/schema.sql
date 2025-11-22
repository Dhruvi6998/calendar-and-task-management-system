CREATE DATABASE IF NOT EXISTS calendar_tasks
CHARACTER SET utf8mb4
COLLATE utf8mb4_unicode_ci;

USE calendar_tasks;

DROP TABLE IF EXISTS tasks;

CREATE TABLE tasks (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    task_date DATE NOT NULL,
    due_date DATE,
    priority ENUM('Low', 'Medium', 'High') DEFAULT 'Medium',
    category VARCHAR(100),
    status ENUM('Pending', 'In Progress', 'Completed') DEFAULT 'Pending',
    is_completed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_task_date (task_date),
    INDEX idx_due_date (due_date),
    INDEX idx_priority (priority),
    INDEX idx_category (category),
    INDEX idx_status (status),
    INDEX idx_completed (is_completed),
    INDEX idx_date_priority (task_date, priority)
) ENGINE=InnoDB 
DEFAULT CHARSET=utf8mb4 
COLLATE=utf8mb4_unicode_ci;

INSERT INTO tasks (
    title, 
    description, 
    task_date, 
    due_date, 
    priority, 
    category, 
    status,
    is_completed
) VALUES
(
    'Client Presentation - Q4 Results',
    'Present quarterly results to major client. Prepare slides covering revenue growth, project deliverables, and next quarter projections.',
    '2025-11-25',
    '2025-11-25',
    'High',
    'Work',
    'Pending',
    FALSE
),
(
    'Production Database Migration',
    'Migrate production database to new server. Backup all data, test rollback procedures, coordinate with DevOps team.',
    '2025-11-27',
    '2025-11-28',
    'High',
    'Development',
    'In Progress',
    FALSE
),
(
    'Critical Bug Fix - Payment Gateway',
    'Fix reported issue with payment processing on checkout page. Priority: HIGH - affecting customer transactions.',
    '2025-11-23',
    '2025-11-23',
    'High',
    'Development',
    'Completed',
    TRUE
),
(
    'Code Review - Authentication Module',
    'Review pull requests for new authentication system. Check security implementations, test edge cases, verify documentation.',
    '2025-11-22',
    '2025-11-24',
    'Medium',
    'Development',
    'In Progress',
    FALSE
),
(
    'Weekly Team Standup',
    'Regular Monday morning team sync. Discuss weekly goals, blockers, and project updates.',
    '2025-11-25',
    '2025-11-25',
    'Medium',
    'Work',
    'Pending',
    FALSE
),
(
    'Update API Documentation',
    'Update REST API docs with new endpoints. Include request/response examples, authentication details, and error codes.',
    '2025-11-26',
    '2025-11-28',
    'Medium',
    'Work',
    'Pending',
    FALSE
),
(
    'Performance Testing',
    'Run load tests on new features. Test with 1000+ concurrent users, monitor response times, identify bottlenecks.',
    '2025-11-28',
    '2025-11-29',
    'Medium',
    'Development',
    'Pending',
    FALSE
),
(
    'Dentist Appointment',
    'Annual dental checkup and cleaning. Remember to bring insurance card.',
    '2025-11-26',
    '2025-11-26',
    'Low',
    'Personal',
    'Pending',
    FALSE
),
(
    'Gym - Leg Day',
    'Workout routine: Squats, lunges, leg press, calf raises. 45 minutes cardio cooldown.',
    '2025-11-22',
    '2025-11-22',
    'Low',
    'Health',
    'Completed',
    TRUE
),
(
    'Team Lunch',
    'Monthly team building lunch at Italian restaurant. Book table for 8 people.',
    '2025-11-29',
    '2025-11-29',
    'Low',
    'Personal',
    'Pending',
    FALSE
),
(
    'Setup CI/CD Pipeline',
    'Configure automated testing and deployment pipeline using GitHub Actions. Include unit tests, integration tests, and staging deployment.',
    '2025-11-24',
    '2025-11-26',
    'High',
    'Development',
    'In Progress',
    FALSE
),
(
    'Security Audit Review',
    'Review findings from security audit. Address critical vulnerabilities, update dependencies, implement recommendations.',
    '2025-11-27',
    '2025-11-30',
    'High',
    'Work',
    'Pending',
    FALSE
),
(
    'React Training Course',
    'Complete module 4 of React advanced patterns course. Focus on custom hooks and performance optimization.',
    '2025-11-23',
    '2025-11-23',
    'Medium',
    'Learning',
    'Completed',
    TRUE
),
(
    'AWS Certification Study',
    'Study for AWS Solutions Architect certification. Chapter 6: Database services and migration strategies.',
    '2025-11-28',
    '2025-11-28',
    'Medium',
    'Learning',
    'Pending',
    FALSE
),
(
    'Sprint Planning Meeting',
    'Plan next 2-week sprint. Estimate story points, assign tasks, discuss technical approach for new features.',
    '2025-11-22',
    '2025-11-22',
    'Medium',
    'Work',
    'Completed',
    TRUE
),
(
    'One-on-One with Manager',
    'Monthly career development discussion. Prepare update on current projects and professional development goals.',
    '2025-11-24',
    '2025-11-24',
    'Work',
    'Medium',
    'Pending',
    FALSE
);
