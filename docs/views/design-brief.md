# Mini Doodle — UI Design Brief

Use this document to generate UI mockups for Claude or other design tools. **Desktop-first, responsive.** Visual style: shadcn/ui aesthetic — neutral palette, clean hierarchy, ample whitespace.

**Important:** Do not use the word "Calendar" in any UI copy. Use "Schedule", "Time slots", or "Availability".

---

## Design System Tokens

| Token | Value |
|-------|-------|
| Primary action | Solid button, neutral/dark |
| Free status | Teal/green accent |
| Busy status | Gray/muted |
| Meeting booked | Blue accent |
| Destructive | Red for delete/cancel |
| Typography | Sans-serif, clear hierarchy (h1 page title, body, caption) |
| Spacing | Generous padding; 8px grid |
| Border radius | Medium (shadcn default) |

---

## V1 — App Shell / Layout

**Route:** Wrapper for authenticated pages

**Purpose:** Consistent navigation and auth-aware frame.

### Layout
- **Top bar:** Logo "Mini Doodle" (left), optional global search (center), user avatar dropdown (right) with Profile and Logout
- **Sidebar (desktop):** Vertical nav — Schedule, Meetings, Availability, Settings
- **Bottom nav (mobile):** Same four items as icons
- **Main area:** Breadcrumbs + page content
- **Toast region:** Top-right for success/error notifications

### States
- Loading: skeleton placeholders in main area
- Unauthenticated: redirect to login (no shell)

### Components
`AppHeader`, `SidebarNav`, `MobileNav`, `Breadcrumbs`, `UserMenu`, `Toaster`

---

## V2 — Login Page

**Route:** `/login`

**Purpose:** Authenticate existing users.

### Layout
- Centered card (max-width 400px) on neutral background
- App logo above card

### Elements
- Heading: "Sign in"
- Email input (label + placeholder `you@example.com`)
- Password input with show/hide toggle
- Optional "Remember me" checkbox
- Primary button: "Sign in" (full width)
- Footer link: "Don't have an account? Register"
- Error banner below heading for invalid credentials

### States
- Default, loading (button spinner), error (red banner), network error

---

## V3 — Register Page

**Route:** `/register`

**Purpose:** Create a new account.

### Layout
- Centered card (max-width 400px), same style as login

### Elements
- Heading: "Create account"
- Display name input
- Email input
- Password input with strength hint (weak/fair/strong)
- Confirm password input
- Primary button: "Create account" (full width)
- Footer link: "Already have an account? Sign in"

### States
- Validation errors inline per field
- Success: redirect to Schedule with welcome toast

---

## V4 — My Schedule (Primary Home)

**Route:** `/schedule`

**Purpose:** View and manage personal time slots.

### Layout
- Page header: "My Schedule" + subtitle "Manage your time slots"
- Primary CTA button: "+ New time slot" (top right)
- Toolbar: Week/List view toggle | Date navigator (← Today →) | Filter chips (All, Free, Busy, With meeting)

### Week View
- 7-column grid (Mon–Sun)
- Time rows (e.g. 8:00–20:00)
- Colored slot blocks positioned by time:
  - **Free:** teal/green border or fill
  - **Busy:** gray fill
  - **Meeting:** blue fill with meeting title on hover

### List View
- Chronological list grouped by day
- Each row: time range, status badge, meeting title if any, chevron

### Interactions
- Click slot → opens V5 drawer
- Empty state: illustration + "No time slots yet" + "Create your first slot" button

### States
- Loading: skeleton grid
- Empty, populated, filtered

---

## V5 — Time Slot Detail (Drawer)

**Trigger:** Click slot in V4

**Purpose:** View slot details and actions.

### Layout
- Right-side sheet/drawer (400px wide)

### Elements
- Status badge (Free / Busy)
- Start and end datetime (large, readable)
- Duration label (e.g. "60 minutes")
- If meeting linked: card with meeting title + "View meeting" link
- Action buttons:
  - Edit (secondary)
  - Toggle Free/Busy (secondary)
  - Book meeting (primary, only if Free)
  - Delete (destructive, bottom)

### States
- Free slot, busy slot, slot with meeting

---

## V6 — Create / Edit Time Slot (Modal)

**Trigger:** V4 CTA or V5 Edit

**Purpose:** Create or modify a time slot.

### Layout
- Centered dialog modal

### Elements
- Title: "New time slot" or "Edit time slot"
- Date picker (calendar popover)
- Start time selector (dropdown or time input)
- Duration selector: chips for 15, 30, 45, 60 min + custom number input
- Status toggle: Free / Busy (segmented control)
- Footer: Cancel (ghost) | Save (primary)

### States
- Validation error: overlap conflict message from API (red alert in modal)
- Loading on save

---

## V7 — Book Meeting (Modal)

**Route:** `/schedule/slots/:slotId/book` (or modal overlay on V4)

**Purpose:** Convert a free slot into a meeting.

### Layout
- Centered dialog (wider, ~500px)

### Elements
- Read-only slot summary card: date, time, duration
- Title input (required, label "Meeting title")
- Description textarea (optional)
- Participants section:
  - Search combobox for registered users
  - Email chips with remove (×) button
  - "Add external email" input
- Footer: Cancel | "Schedule meeting" (primary)

### States
- Empty participants allowed
- Loading, validation errors

---

## V8 — Meeting Detail Page

**Route:** `/meetings/:id`

**Purpose:** View and manage a scheduled meeting.

### Layout
- Page header with meeting title
- Two-column on desktop: details (left), participants (right)

### Elements
- Status badge: Scheduled / Cancelled
- Date and time (from linked slot)
- Description block
- Organizer row (avatar + name)
- Participant list: avatar, name/email, role badge
- "Add participant" combobox
- Actions: Edit details (opens inline edit or modal), Cancel meeting (destructive, confirm dialog)

---

## V9 — Meetings List Page

**Route:** `/meetings`

**Purpose:** Browse all meetings user organizes or participates in.

### Layout
- Page header: "Meetings"
- Filter tabs: Upcoming | Past | All
- Table (desktop) or card list (mobile)

### Columns / Card fields
- Meeting title
- Date and time
- Participant count
- Role badge (Organizer / Participant)
- Chevron or row click → V8

### States
- Empty: "No meetings scheduled" + link to Schedule
- Loading skeleton rows

---

## V10 — Availability Query Page

**Route:** `/availability`

**Purpose:** Aggregated free/busy view across multiple users.

### Layout
- Page header: "Availability"
- Query form (top card):
  - User picker: search input + selected user chips
  - Date range picker (from — to)
  - "Query availability" button
- Results area (below):
  - Timeline grid: one row per user, time columns
  - Busy blocks: shaded gray/red
  - Free gaps: light/white
  - Meeting blocks: blue with tooltip (title)
- Legend: Free | Busy | Meeting

### States
- Empty (prompt to select users and range)
- Loading
- Results populated
- No overlapping free time (informational message)

---

## V11 — Settings / Profile Page

**Route:** `/settings`

**Purpose:** Account management.

### Layout
- Page header: "Settings"
- Sections as cards

### Profile card
- Display name (editable input + Save)
- Email (read-only, muted)

### Security card
- Current password, new password, confirm password
- "Change password" button

### Footer
- Logout button (outline)
- App version text (muted, small)

---

## Shared Components

| Component | Description |
|-----------|-------------|
| `SlotBlock` | Colored block for week grid; shows time range + optional title |
| `StatusBadge` | Pill: Free (teal), Busy (gray), Scheduled (blue) |
| `ParticipantPicker` | Combobox + removable email chips |
| `DateRangePicker` | Calendar range selector (shadcn) |
| `ConfirmDialog` | Title, description, Cancel / Confirm (destructive variant) |
| `EmptyState` | Icon, title, description, optional CTA button |
| `PageHeader` | Title, optional subtitle, optional right-aligned action |
| `ApiErrorAlert` | Dismissible alert from API error response |

---

## Screen Flow Diagram

```
Login (V2) ←→ Register (V3)
    ↓
App Shell (V1)
    ├── Schedule (V4) ←→ Slot Detail (V5) ←→ Slot Modal (V6)
    │                      └── Book Meeting (V7)
    ├── Meetings (V9) → Meeting Detail (V8)
    ├── Availability (V10)
    └── Settings (V11)
```
