# CSS Organization Guide

## Overview

Each page and component in the Smart Bus Safety System frontend has its own dedicated CSS file for better organization, maintainability, and scalability.

## File Structure

```
frontend/src/
├── index.css                                    # Global styles and utilities
├── components/
│   ├── LoadingSpinner.css                       # Loading component styles
│   ├── LoadingSpinner.jsx
│   ├── Navbar.css                               # Navigation bar styles
│   ├── Navbar.jsx
│   └── ProtectedRoute.jsx
├── pages/
│   ├── Login.css                                # Login page styles
│   ├── Login.jsx
│   ├── Register.css                             # Register page styles
│   ├── Register.jsx
│   ├── passenger/
│   │   ├── PassengerDashboard.css              # Passenger dashboard styles
│   │   └── PassengerDashboard.jsx
│   ├── conductor/
│   │   ├── ConductorDashboard.css              # Conductor dashboard styles
│   │   └── ConductorDashboard.jsx
│   └── authority/
│       ├── AuthorityDashboard.css               # Authority dashboard styles
│       └── AuthorityDashboard.jsx
```

## CSS Files Description

### 1. **index.css** (Global Styles)

**Purpose:** Global styles, CSS variables, and utility classes used across the application

**Key Features:**

- Inter font import from Google Fonts
- CSS custom properties (color palette, shadows, gradients)
- Gradient system (5 variants)
- Component utility classes (buttons, cards, badges)
- Custom animations (fadeIn, slideIn, pulse, bounce)
- Custom scrollbar styling
- Responsive utilities

**Import Location:** `main.jsx`

**Classes Provided:**

- `.btn-primary`, `.btn-secondary`
- `.card`, `.glass-effect`
- `.badge`, `.badge-success`, `.badge-warning`, `.badge-danger`
- `.stats-card`, `.stats-card-blue`, `.stats-card-purple`
- `.gradient-primary`, `.gradient-secondary`, `.gradient-success`
- Animation classes: `.animate-fadeIn`, `.animate-slideIn`, `.animate-pulse-custom`

---

### 2. **Login.css**

**Purpose:** Styles specific to the Login page

**Theme:** Purple gradient theme (#667eea to #764ba2)

**Key Components:**

- `.login-container` - Full page container with gradient background
- `.login-bg-orb-1` - Animated background orbs
- `.login-logo` - Animated logo with hover effects
- `.login-form` - Glass morphism form card
- `.login-input` - Styled input fields with hover/focus states
- `.login-submit` - Primary action button with loading state
- `.login-spinner` - Loading spinner animation

**Animations:**

- Background orbs with pulse effect (3s infinite)
- Form fade-in animation (0.5s with stagger)
- Hover transformations on logo (scale 1.1)

**Import Location:** `pages/Login.jsx`

---

### 3. **Register.css**

**Purpose:** Styles specific to the Register page

**Theme:** Pink to red gradient theme (#f093fb to #f5576c)

**Key Components:**

- `.register-container` - Full page wrapper with gradient
- `.register-bg-orb` - Multiple animated background orbs (3 orbs)
- `.register-logo` - Logo with purple accent (#9333ea)
- `.register-form` - Glass effect form with backdrop blur
- `.register-select` - Custom styled dropdown for role selection
- `.register-submit` - Action button with gradient

**Animations:**

- Three staggered background orbs (pulse animation)
- Form elements fade-in with 0.1s-0.2s delays
- Hover effects on all interactive elements

**Import Location:** `pages/Register.jsx`

---

### 4. **Navbar.css**

**Purpose:** Styles for the navigation bar component

**Theme:** Clean white with blue accents and role-specific colors

**Key Components:**

- `.navbar` - Sticky header with backdrop blur
- `.navbar-logo` - Gradient logo (blue-500 to blue-600)
- `.navbar-user-card` - Glass effect user info card
- `.navbar-user-role-passenger` - Blue badge (#dbeafe background)
- `.navbar-user-role-conductor` - Green badge (#d1fae5 background)
- `.navbar-user-role-authority` - Purple badge (#e9d5ff background)
- `.navbar-logout-btn` - Red accent logout button

**Features:**

- Sticky positioning (top: 0, z-index: 50)
- Responsive design (hides elements on mobile)
- Color-coded role badges
- Hover animations (logo scale, button transform)

**Import Location:** `components/Navbar.jsx`

---

### 5. **LoadingSpinner.css**

**Purpose:** Styles for the loading spinner component

**Theme:** Blue/Indigo gradient with animated elements

**Key Components:**

- `.loading-container` - Full-screen centered layout
- `.loading-bg-orb` - Animated background orbs with blur
- `.loading-spinner-wrapper` - Spinner container (5rem × 5rem)
- `.loading-spinner` - Rotating spinner animation
- `.loading-dots` - Three bouncing dots with stagger
- `.loading-message` - Pulsing text message

**Animations:**

- Spinner rotation (0.8s linear infinite)
- Background pulse (3s ease-in-out infinite)
- Dots bounce (1s with 0.1s, 0.2s delays)

**Import Location:** `components/LoadingSpinner.jsx`

---

### 6. **PassengerDashboard.css**

**Purpose:** Styles for the Passenger role dashboard

**Theme:** Blue/Indigo gradient with modern card layouts

**Key Components:**

- `.passenger-dashboard` - Page wrapper with blue gradient
- `.passenger-bus-card` - Interactive bus selection cards
  - Hover: scale 1.02, translateY(-4px)
  - Selected: ring-4 with blue border, scale 1.05
  - Animated gradient background blob
- `.passenger-status-card` - Status information cards with blue border-left
- `.passenger-progress-bar` - Animated occupancy progress bar
  - Green: <70% capacity
  - Yellow: 70-90% capacity
  - Red: >90% capacity
- `.passenger-prediction-card` - AI prediction display with purple theme
- `.passenger-prediction-display` - Large gradient result card

**Features:**

- Bus cards with staggered fade-in animation
- Color-coded occupancy indicators
- Pulse animation on selected bus badge
- Responsive grid layouts

**Import Location:** `pages/passenger/PassengerDashboard.jsx`

---

### 7. **ConductorDashboard.css**

**Purpose:** Styles for the Conductor role dashboard

**Theme:** Orange/Amber gradient theme (maintenance-focused colors)

**Key Components:**

- `.conductor-dashboard` - Yellow gradient background (#fef3c7 to #fed7aa)
- `.conductor-form-card` - Maintenance report form with orange border-left
- `.conductor-form-input` - Custom inputs with amber borders
- `.conductor-severity-badge` - Color-coded severity indicators:
  - Critical: Red (#fee2e2)
  - High: Orange (#fed7aa)
  - Medium: Yellow (#fef3c7)
  - Low: Blue (#dbeafe)
- `.conductor-log-list` - Scrollable maintenance history
- `.conductor-bus-card` - Fleet overview cards

**Features:**

- Orange gradient submit button
- Custom scrollbar with amber theme
- Hover animations on log items (translateX)
- Timeline-style maintenance history
- Severity progression color system

**Import Location:** `pages/conductor/ConductorDashboard.jsx`

---

### 8. **AuthorityDashboard.css**

**Purpose:** Styles for the Transport Authority dashboard

**Theme:** Deep blue/indigo gradient (administrative colors)

**Key Components:**

- `.authority-dashboard` - Blue gradient background (#dbeafe to #ede9fe)
- `.authority-stat-card` - Stats cards with color-coded borders:
  - Card 1: Red border (#ef4444)
  - Card 2: Orange border (#f59e0b)
  - Card 3: Dark red border (#dc2626)
  - Card 4: Orange border (#f97316)
- `.authority-violations-card` - Violations list with filtering
- `.authority-violation-badge` - Type-based badges:
  - Overcrowding: Red (#fee2e2)
  - Footboard: Yellow (#fef3c7)
- `.authority-maintenance-card` - Maintenance overview
- `.authority-fleet-card` - Fleet status with progress bar
- `.authority-analytics-card` - Analytics summary with gradients

**Features:**

- Staggered fade-in for stat cards (0s, 0.1s, 0.2s, 0.3s)
- Custom scrollbar for violations list
- Severity dots for maintenance items
- Progress bar for fleet utilization
- Three-column analytics grid

**Import Location:** `pages/authority/AuthorityDashboard.jsx`

---

## Design System

### Color Palette

#### Primary Colors

- **Blue:** #2563eb (primary actions, accents)
- **Indigo:** #4f46e5 (secondary accents)
- **Purple:** #9333ea (emphasis)
- **Orange:** #f59e0b (warnings, maintenance)

#### Status Colors

- **Success:** #10b981 (green)
- **Warning:** #f59e0b (orange/yellow)
- **Danger:** #ef4444 (red)
- **Info:** #3b82f6 (blue)

#### Neutral Colors

- **Gray Scale:** #f9fafb, #f3f4f6, #e5e7eb, #d1d5db, #9ca3af, #6b7280, #4b5563, #374151, #111827

### Gradients

1. **Primary (Purple):** `linear-gradient(135deg, #667eea 0%, #764ba2 100%)`
2. **Secondary (Pink):** `linear-gradient(135deg, #f093fb 0%, #f5576c 100%)`
3. **Success (Green):** `linear-gradient(90deg, #10b981 0%, #059669 100%)`
4. **Warning (Yellow):** `linear-gradient(135deg, #fef3c7 0%, #fed7aa 100%)`
5. **Info (Blue):** `linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)`

### Typography

**Font Family:** Inter (Google Fonts)

- Weights: 300, 400, 500, 600, 700, 800, 900

**Font Sizes:**

- Small: 0.75rem (12px)
- Base: 0.875rem (14px)
- Medium: 1rem (16px)
- Large: 1.125rem (18px)
- XL: 1.25rem (20px)
- 2XL: 1.5rem (24px)
- 3XL: 1.875rem (30px)
- 4XL: 2.25rem (36px)
- 5XL: 3rem (48px)

### Spacing Scale

- 0.25rem (4px)
- 0.5rem (8px)
- 0.75rem (12px)
- 1rem (16px)
- 1.25rem (20px)
- 1.5rem (24px)
- 2rem (32px)
- 3rem (48px)

### Border Radius

- Small: 0.5rem (8px)
- Medium: 0.75rem (12px)
- Large: 1rem (16px)
- XL: 1.5rem (24px)
- Full: 9999px (pill shape)

### Shadows

1. **sm:** `0 1px 2px 0 rgba(0, 0, 0, 0.05)`
2. **md:** `0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)`
3. **lg:** `0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)`
4. **xl:** `0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)`
5. **2xl:** `0 25px 50px -12px rgba(0, 0, 0, 0.25)`

### Animations

#### 1. fadeIn

```css
@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
```

**Duration:** 0.5s
**Usage:** Page elements, cards, modals

#### 2. spin

```css
@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
```

**Duration:** 0.6s-0.8s
**Usage:** Loading spinners

#### 3. pulse-custom

```css
@keyframes pulse-custom {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
}
```

**Duration:** 2s-3s
**Usage:** Background orbs, badges

#### 4. bounce

```css
@keyframes bounce {
  0%,
  100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-10px);
  }
}
```

**Duration:** 1s
**Usage:** Loading dots

---

## Responsive Design

### Breakpoints

- **Mobile:** max-width: 640px
- **Tablet:** max-width: 768px
- **Desktop:** max-width: 1024px
- **Large Desktop:** max-width: 1280px

### Responsive Patterns

#### Mobile (<640px)

- Single column layouts
- Reduced font sizes
- Hidden non-essential elements
- Full-width buttons
- Compact spacing

#### Tablet (640px-1024px)

- Two-column grids where appropriate
- Adjusted spacing
- Visible essential elements
- Responsive navigation

#### Desktop (>1024px)

- Multi-column grids
- Full spacing
- All elements visible
- Hover effects active

---

## Best Practices

### 1. **Naming Conventions**

- Use BEM-inspired naming: `.component-element-modifier`
- Prefix with page/component name for clarity
- Examples:
  - `.passenger-bus-card`
  - `.conductor-form-input`
  - `.authority-stat-card`

### 2. **Organization**

Each CSS file follows this structure:

1. Container/wrapper styles
2. Header/title styles
3. Main content styles
4. Interactive elements (buttons, forms)
5. Loading/empty states
6. Animations
7. Responsive media queries

### 3. **Performance**

- Use `will-change` sparingly
- Prefer `transform` and `opacity` for animations
- Avoid animating `width`, `height`, `top`, `left`
- Use `content-visibility` for long lists

### 4. **Maintainability**

- One CSS file per component/page
- Clear section comments
- Consistent spacing and indentation
- Group related styles together

### 5. **Accessibility**

- Sufficient color contrast (WCAG AA minimum)
- Visible focus states
- Reduced motion support (consider `prefers-reduced-motion`)
- Semantic HTML with appropriate CSS

---

## Browser Support

All CSS files support:

- Chrome/Edge 90+
- Firefox 88+
- Safari 14+
- Mobile browsers (iOS Safari 14+, Chrome Android 90+)

### Modern Features Used

- CSS Grid
- Flexbox
- CSS Custom Properties (variables)
- `backdrop-filter` (with fallbacks)
- CSS Gradients
- CSS Animations/Transitions

---

## Usage Examples

### Importing CSS in Components

```jsx
// In component file
import "./ComponentName.css";
```

### Using Global Utility Classes

```jsx
// From index.css
<div className="card glass-effect">
  <button className="btn-primary">Click Me</button>
  <span className="badge badge-success">Active</span>
</div>
```

### Using Component-Specific Classes

```jsx
// From Login.css
<div className="login-container">
  <form className="login-form">
    <input className="login-input" />
    <button className="login-submit">Login</button>
  </form>
</div>
```

### Combining Global and Component Classes

```jsx
<div className="passenger-bus-card animate-fadeIn">
  <span className="badge badge-success">Selected</span>
</div>
```

---

## Maintenance Notes

### Adding New Styles

1. Determine if style is global or component-specific
2. Add to appropriate CSS file
3. Follow naming conventions
4. Test responsiveness
5. Verify accessibility

### Modifying Existing Styles

1. Check for usage across files
2. Consider creating a variant instead of modifying
3. Test all affected components
4. Verify no regressions

### Removing Styles

1. Search for class usage across all files
2. Ensure no dependencies
3. Remove from CSS file
4. Clean up any related utility classes

---

## Performance Optimization

### File Sizes

- index.css: ~350 lines (~8KB)
- Login.css: ~320 lines (~7KB)
- Register.css: ~350 lines (~8KB)
- Navbar.css: ~200 lines (~5KB)
- LoadingSpinner.css: ~100 lines (~2KB)
- PassengerDashboard.css: ~850 lines (~18KB)
- ConductorDashboard.css: ~620 lines (~14KB)
- AuthorityDashboard.css: ~850 lines (~18KB)

**Total CSS:** ~80KB uncompressed (~20KB gzipped)

### Optimization Tips

1. Remove unused styles during production build
2. Consider CSS modules for larger applications
3. Use PurgeCSS with TailwindCSS configuration
4. Minify CSS in production
5. Enable gzip compression on server

---

## Troubleshooting

### Common Issues

**1. Styles Not Applying**

- Verify CSS file is imported in component
- Check class name spelling
- Inspect browser DevTools for specificity issues
- Clear browser cache

**2. Animation Not Working**

- Verify animation name matches keyframes
- Check animation-duration is set
- Ensure element has proper display property
- Test in different browsers

**3. Responsive Issues**

- Verify media query breakpoints
- Test in actual devices or browser DevTools
- Check viewport meta tag in HTML
- Validate flex/grid properties

**4. Color/Gradient Issues**

- Check browser support for gradients
- Verify color values (hex, rgb, rgba)
- Test fallback colors
- Validate gradient syntax

---

## Future Enhancements

### Planned Improvements

1. **Dark Mode:** Add theme toggle with CSS variables
2. **Print Styles:** Add @media print rules for reports
3. **High Contrast Mode:** Support for accessibility
4. **RTL Support:** Right-to-left language support
5. **CSS Variables:** Expand theme customization
6. **Component Variants:** Additional style options
7. **Animation Library:** More reusable animations
8. **Loading Skeletons:** Content placeholders

---

## Resources

### Documentation

- [TailwindCSS Docs](https://tailwindcss.com/docs)
- [MDN CSS Reference](https://developer.mozilla.org/en-US/docs/Web/CSS)
- [Can I Use](https://caniuse.com/) - Browser support

### Tools

- [CSS Gradient Generator](https://cssgradient.io/)
- [Box Shadow Generator](https://box-shadow.dev/)
- [Color Contrast Checker](https://webaim.org/resources/contrastchecker/)

### Design Inspiration

- [Dribbble](https://dribbble.com/) - Design inspiration
- [UI Design Daily](https://www.uidesigndaily.com/) - Free UI resources

---

## Version History

**v1.0.0** - Initial CSS organization

- Separated all component/page styles
- Created comprehensive design system
- Added responsive breakpoints
- Implemented animation library
- Documented all CSS files

---

## Support

For questions or issues regarding CSS styling:

1. Check this documentation
2. Review component-specific CSS file
3. Inspect element in browser DevTools
4. Reference global styles in index.css
5. Consult design system documentation

---

**Last Updated:** November 21, 2025
