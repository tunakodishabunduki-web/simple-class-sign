

# Attendance Signing App — Plan

## Overview
A simple mobile-friendly attendance app where a teacher creates timed attendance sessions with a unique code, and students enter the code to mark their presence. All data is stored locally in the browser.

---

## 1. Local Authentication (Fake Login)
- A registration/login screen where users enter a **name** and **password** and select their **role** (Teacher or Student)
- Credentials stored in local storage — no backend needed
- Users stay logged in until they explicitly log out

## 2. Teacher Dashboard
- **Start Attendance Session**: Teacher taps a button to open a new session
  - A random 6-digit attendance code is generated and displayed prominently
  - Teacher sets a time limit (e.g., 1, 3, or 5 minutes)
  - A visible countdown timer shows remaining time
  - Code expires automatically when time runs out
- **Session History**: A list of past sessions showing date, time, and how many students signed in
- **Attendance Details**: Tap a session to see the list of students who signed in with timestamps

## 3. Student Dashboard
- **Enter Code**: A simple input field to type the 6-digit attendance code and submit
  - If the code is valid and not expired → attendance is recorded with a success message
  - If the code is expired or wrong → an error message is shown
  - A student cannot sign the same session twice
- **My Attendance**: A history list showing all sessions the student has attended, with dates and times

## 4. Design & UX
- Mobile-first layout optimized for phone screens
- Clean, minimal interface with large tap targets
- Color-coded feedback (green for success, red for errors)
- Simple navigation with a bottom tab bar or top header

## 5. Data Storage
- All users, sessions, and attendance records stored in **browser local storage**
- Data structured so it can be migrated to a cloud database later

