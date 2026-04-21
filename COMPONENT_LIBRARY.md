# Frontend UI Component Library

## Overview
Complete component library for the Smart Bus Safety System frontend application.

---

## Button Component
**File:** `frontend/src/components/ui/Button.jsx`

### Variants
- **primary** - Main action button (blue gradient)
- **secondary** - Secondary actions (light background)
- **danger** - Destructive actions (red)
- **ghost** - Transparent button
- **outline** - Bordered button

### Sizes
- **sm** - Small (6px 14px)
- **md** - Medium (8px 18px) - Default
- **lg** - Large (12px 24px)

### States
- Normal
- Hover (elevated shadow)
- Focus (outline)
- Disabled (opacity 0.5)

### Usage
```jsx
<Button variant="primary" size="lg" onClick={handleClick}>
  Save Changes
</Button>
```

---

## Card Component
**File:** `frontend/src/components/ui/Card.jsx`

### Subcomponents
- **Card** - Container with border and shadow
- **CardHeader** - Header section
- **CardTitle** - Title text
- **CardContent** - Main content area

### Features
- Rounded corners (16px)
- Hover effect (optional)
- Shadow elevation
- Responsive padding

### Usage
```jsx
<Card hover>
  <CardHeader>
    <CardTitle>Bus Status</CardTitle>
  </CardHeader>
  <CardContent>
    <p>Real-time bus information</p>
  </CardContent>
</Card>
```

---

## Modal Component
**File:** `frontend/src/components/ui/Modal.jsx`

### Props
- `isOpen` - Boolean to show/hide
- `onClose` - Callback when closing
- `title` - Modal title
- `children` - Modal content
- `size` - sm, md, lg, xl (default: md)
- `footer` - Footer actions

### Features
- Centered on screen
- Overlay backdrop
- Click-outside to close
- Smooth animations
- Scrollable content

### Usage
```jsx
<Modal isOpen={open} onClose={handleClose} title="Confirm">
  <p>Are you sure?</p>
  <button onClick={confirm}>Yes</button>
</Modal>
```

---

## Dropdown Component
**File:** `frontend/src/components/ui/Dropdown.jsx`

### Props
- `label` - Field label
- `items` - Array of {value, label}
- `value` - Selected value
- `onChange` - Change handler
- `placeholder` - Placeholder text
- `disabled` - Disable dropdown

### Features
- Click outside to close
- Keyboard navigation ready
- Smooth animations
- Custom styling

### Usage
```jsx
<Dropdown
  label="Select Route"
  items={routes}
  value={selected}
  onChange={setSelected}
/>
```

---

## Table Component
**File:** `frontend/src/components/ui/Table.jsx`

### Props
- `columns` - Array of column definitions
- `data` - Array of row data
- `loading` - Show loading state
- `empty` - Empty message
- `striped` - Alternate row colors

### Column Definition
```jsx
{
  key: 'name',
  label: 'Driver Name',
  width: '200px',
  align: 'left',
  render: (value, row) => <span>{value}</span>
}
```

### Usage
```jsx
<Table
  columns={columns}
  data={buses}
  loading={loading}
  striped={true}
/>
```

---

## Alert Component
**File:** `frontend/src/components/ui/Alert.jsx`

### Types
- **success** - Green background
- **error** - Red background
- **warning** - Amber background
- **info** - Blue background

### Props
- `type` - Alert type
- `title` - Alert title
- `message` - Alert message
- `onClose` - Close handler
- `closable` - Show close button

### Usage
```jsx
<Alert
  type="success"
  title="Saved"
  message="Changes saved successfully"
  onClose={handleClose}
/>
```

---

## Tabs Component
**File:** `frontend/src/components/ui/Tabs.jsx`

### Props
- `tabs` - Array of tab definitions
- `defaultTab` - Default active tab (0-indexed)

### Tab Definition
```jsx
{
  label: 'Overview',
  icon: <SomeIcon />,
  content: <TabContent />
}
```

### Features
- Icon support
- Smooth transitions
- Touch-friendly
- Active indicator

### Usage
```jsx
<Tabs tabs={[
  { label: 'Buses', content: <BusList /> },
  { label: 'Violations', content: <ViolationsFeed /> }
]} />
```

---

## LoadingSpinner Component
**File:** `frontend/src/components/ui/LoadingSpinner.jsx`

### Sizes
- **sm** - 24px diameter
- **md** - 40px diameter
- **lg** - 56px diameter

### Props
- `size` - Spinner size
- `color` - Spinner color (CSS color)

### Usage
```jsx
<LoadingSpinner size="lg" color="var(--color-primary-500)" />
```

---

## Stat Component
**File:** `frontend/src/components/ui/Stat.jsx`

### Props
- `label` - Label text
- `value` - Main value
- `icon` - Icon (Lucide)
- `trend` - Trend object {positive, value}
- `color` - Color variant
- `size` - Card size (sm, md, lg)

### Colors
- primary (blue)
- success (green)
- danger (red)
- warning (amber)
- info (blue)

### Usage
```jsx
<Stat
  label="Active Buses"
  value={42}
  icon={<Bus />}
  color="primary"
  size="md"
  trend={{ positive: true, value: '+5%' }}
/>
```

---

## Input Component
**File:** `frontend/src/components/ui/Input.jsx`

### Props
- `type` - HTML input type
- `label` - Field label
- `placeholder` - Placeholder text
- `value` - Current value
- `onChange` - Change handler
- `error` - Error message
- `disabled` - Disable field

### Usage
```jsx
<Input
  type="email"
  label="Email"
  placeholder="user@example.com"
  value={email}
  onChange={(e) => setEmail(e.target.value)}
  error={emailError}
/>
```

---

## Badge Component
**File:** `frontend/src/components/ui/Badge.jsx`

### Variants
- **primary** - Primary color
- **success** - Green
- **danger** - Red
- **warning** - Amber
- **secondary** - Gray

### Usage
```jsx
<Badge variant="success">Active</Badge>
<Badge variant="danger">Offline</Badge>
```

---

## BusLocationMap Component
**File:** `frontend/src/components/ui/BusLocationMap.jsx`

### Props
- `role` - User role (passenger, conductor, authority)
- `height` - Map height (px or %)
- `refreshInterval` - Data refresh interval (ms)
- `busId` - Optional specific bus ID

### Features
- Real-time bus markers
- Interactive markers
- Auto-center on bus
- Responsive height
- Click to view details

### Usage
```jsx
<BusLocationMap
  role="passenger"
  height="400px"
  refreshInterval={15000}
/>
```

---

## Color System

### Primary Colors
- `--color-primary-50`: #eff6ff (lightest)
- `--color-primary-500`: #2563eb (main)
- `--color-primary-600`: #1d4ed8 (darker)
- `--color-primary-700`: #1e40af (darkest)

### Status Colors
- **Success**: #16a34a (green)
- **Danger**: #dc2626 (red)
- **Warning**: #ea8417 (amber)
- **Info**: #0284c7 (cyan)

### Neutral Colors
- **Text Primary**: #1f2937
- **Text Muted**: #6b7280
- **Border Light**: #e5e7eb
- **Background**: #f9fafb
- **Surface**: #ffffff

---

## Typography

### Font Sizes
- `--text-xs`: 0.75rem (12px)
- `--text-sm`: 0.875rem (14px)
- `--text-base`: 1rem (16px)
- `--text-lg`: 1.125rem (18px)
- `--text-xl`: 1.25rem (20px)
- `--text-2xl`: 1.5rem (24px)

### Font Weights
- Regular: 400
- Medium: 500
- Semibold: 600
- Bold: 700

---

## Spacing Scale
- `--space-2`: 0.5rem (8px)
- `--space-3`: 0.75rem (12px)
- `--space-4`: 1rem (16px)
- `--space-5`: 1.25rem (20px)
- `--space-6`: 1.5rem (24px)
- `--space-8`: 2rem (32px)

---

## Border Radius
- `--radius-sm`: 0.25rem (4px)
- `--radius-md`: 0.5rem (8px)
- `--radius-lg`: 1rem (16px)
- `--radius-xl`: 1.25rem (20px)
- `--radius-full`: 9999px (circular)

---

## Shadow System
- `--shadow-xs`: 0 1px 2px rgba(0,0,0,0.05)
- `--shadow-sm`: 0 1px 3px rgba(0,0,0,0.1)
- `--shadow-md`: 0 4px 6px rgba(0,0,0,0.1)
- `--shadow-lg`: 0 10px 15px rgba(0,0,0,0.1)
- `--shadow-xl`: 0 20px 25px rgba(0,0,0,0.1)

---

## Transitions
- `--transition-base`: all 0.3s ease-in-out
- `--transition-fast`: all 0.15s ease-in-out
- `--transition-slow`: all 0.6s ease-in-out

---

## Notes
- All components use CSS variables for theming
- Components are responsive and mobile-compatible
- Accessibility features included (focus states, ARIA labels)
- Dark mode support ready (CSS variable override)
- Lucide-react icons used throughout
