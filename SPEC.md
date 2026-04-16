# Project Tracker - Specification Document

## 1. Project Overview

- **Project Name**: Project Tracker
- **Type**: Single-page React Web Application
- **Core Functionality**: A project management dashboard for tracking media projects with image/video previews, approval workflow, and status management
- **Target Users**: Creative teams, content managers, project coordinators

## 2. UI/UX Specification

### Layout Structure

- **Header**: App title with subtle branding
- **Main Content**: 
  - Add Project Form (top)
  - Search/Filter Bar
  - Projects Table (main area)
- **Responsive Breakpoints**:
  - Mobile: < 768px (stacked layout, horizontal scroll for table)
  - Desktop: >= 768px (full table view)

### Visual Design

- **Color Palette**:
  - Background: `#f8fafc` (slate-50)
  - Card Background: `#ffffff`
  - Primary: `#6366f1` (indigo-500)
  - Primary Hover: `#4f46e5` (indigo-600)
  - Text Primary: `#1e293b` (slate-800)
  - Text Secondary: `#64748b` (slate-500)
  - Border: `#e2e8f0` (slate-200)
  - Status Approved: `#22c55e` (green-500)
  - Status Declined: `#ef4444` (red-500)
  - Status Pending: `#6b7280` (gray-500)

- **Typography**:
  - Font Family: System UI / Inter (via Tailwind default)
  - Heading (App Title): 24px, font-semibold
  - Table Headers: 14px, font-medium, uppercase, letter-spacing
  - Body: 14px, font-normal
  - Badges: 12px, font-medium

- **Spacing System**:
  - Container padding: 24px
  - Card padding: 20px
  - Table cell padding: 12px 16px
  - Gap between elements: 16px
  - Border radius: 12px (cards), 8px (buttons/inputs)

- **Visual Effects**:
  - Card shadow: `0 1px 3px rgba(0,0,0,0.1), 0 1px 2px rgba(0,0,0,0.06)`
  - Hover shadow: `0 4px 6px rgba(0,0,0,0.1)`
  - Transitions: 200ms ease-in-out

### Components

1. **Add Project Form**
   - Project Name input (text)
   - Media URL input (url)
   - File Type dropdown (Image/Video)
   - Submit button
   - States: default, focus, error

2. **Search/Filter Bar**
   - Search input for project name
   - Filter dropdown (All/Pending/Approved/Declined)

3. **Projects Table**
   - Columns: Preview, Name, Type, Status, Actions
   - Scrollable container on mobile
   - Row hover effect

4. **Status Badge**
   - Approved: Green background (#dcfce7), green text (#166534)
   - Declined: Red background (#fee2e2), red text (#991b1b)
   - Pending: Gray background (#f3f4f6), gray text (#374151)

5. **Action Buttons**
   - Approve button: Green outline
   - Decline button: Red outline
   - Delete button: Gray outline with trash icon
   - Hover: fill with color

6. **Media Preview**
   - Image: img tag with object-cover
   - Video: video thumbnail placeholder (first frame or icon)
   - Container: 80x60px, rounded corners

## 3. Functionality Specification

### Core Features

1. **Add New Project**
   - Input validation (required fields)
   - Auto-generate unique ID
   - Default status: Pending
   - Clear form after submission

2. **Update Status**
   - One-click approve/decline
   - Visual feedback immediately
   - Persist to localStorage

3. **Delete Project**
   - Confirmation not required (simple delete)
   - Remove from state and localStorage

4. **Search/Filter**
   - Real-time search by project name
   - Filter by status dropdown
   - Combined search + filter

5. **Data Persistence**
   - Save to localStorage on every change
   - Load from localStorage on app mount

### User Interactions

- Form submission → Add project to list → Clear form → Scroll to table
- Click Approve → Update status → Re-render badge
- Click Decline → Update status → Re-render badge
- Click Delete → Remove project → Re-render table
- Type in search → Filter table in real-time
- Select filter → Show matching status

### Edge Cases

- Empty URL: Show placeholder image/text
- Invalid URL: Show error state or placeholder
- Empty table: Show "No projects" message
- Long project names: Truncate with ellipsis

## 4. Acceptance Criteria

1. ✅ App loads without errors
2. ✅ Form adds new project to table
3. ✅ Projects display with correct preview (image or video thumbnail)
4. ✅ Status badges show correct colors
5. ✅ Approve/Decline buttons update status correctly
6. ✅ Delete removes project
7. ✅ Search filters projects by name
8. ✅ Status filter works correctly
9. ✅ Data persists after page refresh
10. ✅ Responsive on mobile and desktop
11. ✅ Ready for Netlify deployment

## 5. Technical Stack

- React 18+ (Vite)
- Tailwind CSS
- Functional Components
- useState hook
- localStorage for persistence