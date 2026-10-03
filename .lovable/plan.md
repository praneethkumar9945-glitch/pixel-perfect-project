# Complete University Manager in a Zoho-inspired theme

## Goal
Turn the current dashboard foundation into a complete working system for Super Admin, Admin, HOD, Faculty, and Student users. Use a bright, compact Zoho One-inspired workspace: neutral surfaces, blue primary actions, multicolor module accents, dense tables, clear toolbars, and restrained borders.

## What will be built

### 1. Stabilize the app and shared workspace
- Fix the current route, search-parameter, error-page, and type-safety issues.
- Replace the current visual tokens and shared controls with the Zoho-inspired design.
- Rework desktop and mobile navigation, page toolbars, statuses, tables, dialogs, empty states, and loading states.
- Keep permissions role-aware so users only see and operate on allowed records.

### 2. Administration and academic setup
- Courses: searchable list, create, edit, activate/deactivate, and details.
- Batches: create/edit batches, dates, capacity, status, course, HOD, and assigned faculty.
- Students: searchable/filterable roster, create/edit records, assign course and batch, activate/deactivate, and CSV export.
- Faculty and HODs: directory, profile editing, department/status, and role visibility.
- Users and roles: registered-user list, role assignment/removal, account status, and safe server-validated administration.
- Timetable: day-based schedule, create/edit/delete classes, batch/faculty/room assignment, and overlap validation.

### 3. Form builder and rule engine
- Form library with create/edit/activate controls.
- Field builder supporting every stored field type, ordering, required flags, options, defaults, help text, and validation limits.
- Target audience and approval-step configuration.
- Applicability rules for course, batch, faculty, and date windows.
- Form preview before activation.

### 4. End-to-end submissions and approvals
- Dynamic form filling for Faculty and Students, including contextual class/batch information.
- Draft saving, editing returned drafts, final submission, validation, and private document/image uploads.
- Role-aware submission lists with search and status filters.
- Submission detail with answers, attachments, submitter context, status, and full workflow timeline.
- HOD/Admin approval queue with approve, return, reject, and required remarks where appropriate.
- Refresh all affected lists, dashboards, badges, notifications, and audit history after actions.

### 5. Operational pages
- Notifications inbox with unread state, mark one/all read, and linked navigation.
- Reports for submissions, approvals, batches, and completion status with filters, charts, and CSV export.
- Audit log viewer with actor/module/action/date filters.
- Preserve and refine the existing role-specific dashboards using live data.

### 6. Quality, security, and verification
- Keep data access protected by existing row-level permissions and verify elevated actions on the server.
- Add only the minimal database updates needed for missing validations or safe account administration, with grants and policies included.
- Give every content page complete, unique metadata.
- Verify the central flows as real users: academic setup, timetable assignment, form publication, form submission, HOD review, Admin review, notification updates, and reporting.
- Check both desktop and mobile layouts and resolve build, console, and runtime errors.

## Technical approach
- Reuse the existing Lovable Cloud schema, workflow triggers, storage bucket, and role model rather than replacing them.
- Use the existing React/TanStack Query patterns for live reads and mutations, shared table/dialog/form components for consistency, and typed server functions only for privileged account operations.
- Break the work into focused shared modules so forms, submissions, filters, and data grids are not duplicated across pages.

## Default design choice
Because no visual option was selected, use the Zoho One direction: white and light-neutral workspace, compact navigation, blue actions, subtle multicolor module markers, small-radius controls, dense data tables, and minimal shadow.
