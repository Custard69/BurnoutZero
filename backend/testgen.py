import csv

test_plan = [
    {"Section_ID": "TP001", "Area": "Authentication", "Objective": "Verify login, logout, and signup workflows function correctly.", "Test_Cases": "TC001-TC005"},
    {"Section_ID": "TP002", "Area": "Check-in", "Objective": "Ensure check-in form submission works with valid/invalid data and stores burnout probability.", "Test_Cases": "TC006-TC007"},
    {"Section_ID": "TP003", "Area": "Dashboard", "Objective": "Validate correct display of burnout probability and historical charts.", "Test_Cases": "TC008"},
    {"Section_ID": "TP004", "Area": "Focus Timer", "Objective": "Verify start, stop, pause/resume of focus sessions and session history logging.", "Test_Cases": "TC009-TC011"},
    {"Section_ID": "TP005", "Area": "Calendar Integration", "Objective": "Test Google Calendar authentication, event fetching, adding, and deleting.", "Test_Cases": "TC012-TC015"},
    {"Section_ID": "TP006", "Area": "RescueTime Integration", "Objective": "Validate retrieval and storage of productivity/screen time data.", "Test_Cases": "TC016"},
    {"Section_ID": "TP007", "Area": "Data Persistence", "Objective": "Check Firestore collections (Users, CheckIns, FocusTimer, SessionHistory) update correctly.", "Test_Cases": "TC017"},
    {"Section_ID": "TP008", "Area": "API Endpoints", "Objective": "Ensure Flask API endpoints return correct responses for check-in, prediction, and calendar events.", "Test_Cases": "TC018-TC020"},
    {"Section_ID": "TP009", "Area": "Frontend UI/UX", "Objective": "Validate navigation, popups, sliders, and error messages on all pages.", "Test_Cases": "TC021-TC022"},
]

with open("test_plan.csv", "w", newline="") as f:
    writer = csv.DictWriter(f, fieldnames=["Section_ID", "Area", "Objective", "Test_Cases"])
    writer.writeheader()
    writer.writerows(test_plan)

print("✅ test_plan.csv created successfully.")
