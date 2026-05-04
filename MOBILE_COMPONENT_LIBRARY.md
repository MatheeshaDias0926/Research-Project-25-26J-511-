# Mobile App UI Component Library

## Overview
Complete component library for the Smart Bus Safety System mobile application (React Native + Expo).

---

## Button Component
**File:** `mobile-app/src/components/ui/Button.tsx`

### Variants
- **primary** - Main action button
- **outline** - Bordered button
- **ghost** - Text-only button
- **danger** - Destructive action

### Sizes
- **sm** - Small padding
- **md** - Medium padding (default)
- **lg** - Large padding

### Features
- Flexible, row-based layout
- Icon support
- Loading state
- Disabled state
- Touch feedback

### Usage
```tsx
<Button 
  variant="primary" 
  size="lg"
  onPress={handlePress}
>
  <Ionicons name="checkmark" size={18} />
  <Text>Confirm</Text>
</Button>
```

---

## Card Component
**File:** `mobile-app/src/components/ui/Card.tsx`

### Props
- `style` - Custom styles
- `onPress` - Touch handler
- `children` - Card content

### Features
- Rounded corners
- Shadow elevation
- TouchableOpacity wrapping
- Responsive padding
- Flexible layout

### Usage
```tsx
<Card style={styles.card} onPress={handlePress}>
  <Text style={styles.title}>Bus Status</Text>
  <Text style={styles.subtitle}>Online</Text>
</Card>
```

---

## Input Component
**File:** `mobile-app/src/components/ui/Input.tsx`

### Props
- `label` - Field label
- `placeholder` - Placeholder text
- `value` - Current value
- `onChangeText` - Change handler
- `error` - Error message
- `editable` - Enable/disable input
- `keyboardType` - Keyboard type

### Types
- 'default'
- 'email-address'
- 'numeric'
- 'phone-pad'
- 'decimal-pad'

### Usage
```tsx
<Input
  label="Bus License"
  placeholder="NP-1234"
  value={license}
  onChangeText={setLicense}
  error={licenseError}
  keyboardType="default"
/>
```

---

## Modal Component
**File:** `mobile-app/src/components/ui/Modal.tsx`

### Props
- `visible` - Show/hide modal
- `onClose` - Close handler
- `title` - Modal title
- `children` - Modal content
- `footer` - Footer actions

### Features
- Native modal with fade animation
- Click outside to close (tap overlay)
- Scrollable content
- Header with close button
- Optional footer

### Usage
```tsx
<MobileModal
  visible={isOpen}
  onClose={handleClose}
  title="Bus Details"
  footer={<Button onPress={handleConfirm}>Confirm</Button>}
>
  <Text>Modal content here</Text>
</MobileModal>
```

---

## Dropdown Component
**File:** `mobile-app/src/components/ui/Dropdown.tsx`

### Props
- `label` - Field label
- `items` - Array of {value, label}
- `value` - Selected value
- `onChange` - Change handler
- `placeholder` - Placeholder text

### Item Structure
```tsx
{
  value: 'r1',
  label: 'Route 1'
}
```

### Features
- Expandable options
- Smooth animations
- Icon rotation
- Scrollable if many items
- Selected highlighting

### Usage
```tsx
<MobileDropdown
  label="Select Route"
  items={routes}
  value={selected}
  onChange={setSelected}
/>
```

---

## LoadingSpinner Component
**File:** `mobile-app/src/components/ui/LoadingSpinner.tsx`

### Sizes
- **small** - Small spinner
- **medium** - Medium spinner (default)
- **large** - Large spinner

### Props
- `size` - Spinner size
- `color` - Spinner color

### Usage
```tsx
<MobileLoadingSpinner size="large" color={Colors.primary} />
```

---

## Table Component
**File:** `mobile-app/src/components/ui/Table.tsx`

### Props
- `columns` - Column definitions
- `data` - Table rows
- `loading` - Loading state
- `empty` - Empty message

### Column Definition
```tsx
{
  key: 'license',
  label: 'License Plate',
  render?: (value, row) => JSX.Element
}
```

### Features
- Horizontal scrolling
- Striped rows
- Custom cell rendering
- Responsive columns
- Header styling

### Usage
```tsx
<MobileTable
  columns={[
    { key: 'license', label: 'Bus' },
    { key: 'status', label: 'Status' }
  ]}
  data={buses}
  loading={isLoading}
/>
```

---

## Alert Component
**File:** `mobile-app/src/components/ui/Alert.tsx`

### Types
- **success** - Green alert
- **error** - Red alert
- **warning** - Amber alert
- **info** - Blue alert

### Props
- `type` - Alert type
- `title` - Alert title
- `message` - Alert message
- `onClose` - Close handler
- `closable` - Show close button

### Features
- Color-coded by type
- Icon support
- Close button
- Rounded corners
- Flexible sizing

### Usage
```tsx
<MobileAlert
  type="success"
  title="Saved"
  message="Changes saved successfully"
  onClose={handleClose}
/>
```

---

## Mobile Theme Colors

### Core Colors
```tsx
const Colors = {
  // Primary
  primary: '#2563eb',        // Blue
  primaryLight: '#3b82f6',
  primaryDark: '#1e40af',
  
  // Status
  success: '#16a34a',        // Green
  error: '#dc2626',          // Red
  warning: '#ea8417',        // Orange
  info: '#0284c7',           // Cyan
  
  // Background
  background: '#f9fafb',     // Light gray
  surface: '#ffffff',        // White
  
  // Text
  text: '#1f2937',           // Dark gray
  textSecondary: '#6b7280',  // Medium gray
  textTertiary: '#9ca3af',   // Light gray
};
```

---

## Common Patterns

### Loading State
```tsx
const [loading, setLoading] = useState(true);

if (loading) {
  return <MobileLoadingSpinner size="large" />;
}
```

### Pull-to-Refresh
```tsx
const [refreshing, setRefreshing] = useState(false);

const onRefresh = async () => {
  setRefreshing(true);
  await fetchData();
  setRefreshing(false);
};

<ScrollView
  refreshControl={
    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
  }
>
  {/* Content */}
</ScrollView>
```

### Error Handling
```tsx
const [error, setError] = useState<string | null>(null);

try {
  await fetchData();
} catch (err) {
  setError(err.message);
}

{error && (
  <MobileAlert
    type="error"
    title="Error"
    message={error}
    onClose={() => setError(null)}
  />
)}
```

### Empty State
```tsx
{data.length === 0 ? (
  <View style={styles.emptyState}>
    <Ionicons name="inbox-outline" size={48} />
    <Text style={styles.emptyText}>No items found</Text>
  </View>
) : (
  <FlatList data={data} renderItem={renderItem} />
)}
```

---

## Responsive Design

### Breakpoints
- **Small**: Width < 400px
- **Medium**: Width 400-600px
- **Large**: Width > 600px

### Orientation
- Portrait (default)
- Landscape

### Safe Area
Uses `react-native-safe-area-context` for proper padding:
```tsx
import { SafeAreaView } from 'react-native-safe-area-context';

<SafeAreaView style={styles.container}>
  {/* Content */}
</SafeAreaView>
```

---

## Accessibility

### Features
- Touch targets minimum 44x44 points
- Color contrast ratio 4.5:1
- Descriptive labels
- Alt text for images
- Keyboard navigation ready

### Implementation
```tsx
<TouchableOpacity
  accessible={true}
  accessibilityLabel="Save changes"
  accessibilityRole="button"
  accessibilityHint="Tap to save your changes"
>
  <Text>Save</Text>
</TouchableOpacity>
```

---

## Icons (Ionicons)

### Common Icons
- `bus` - Bus icon
- `warning` - Warning alert
- `checkmark-circle` - Success
- `alert-circle` - Error
- `information-circle` - Info
- `people` - Users/team
- `settings` - Settings
- `map` - Location/map
- `document-text` - Documents
- `build` - Maintenance/tools
- `call` - Phone/call
- `chevron-forward` - Next/arrow

### Usage
```tsx
<Ionicons name="bus" size={24} color={Colors.primary} />
```

---

## Performance Considerations

### Optimization
- Memoize heavy components with `React.memo`
- Use `FlatList` with `keyExtractor`
- Implement image caching
- Debounce API calls
- Minimize re-renders

### Example
```tsx
const BusCard = React.memo(({ bus, onPress }) => (
  <Card onPress={onPress}>
    {/* Content */}
  </Card>
));
```

---

## Platform-Specific Code

### iOS vs Android
```tsx
import { Platform } from 'react-native';

const styles = {
  container: {
    paddingTop: Platform.OS === 'ios' ? 20 : 10,
  }
};
```

---

## Storage (expo-secure-store)

### Save Data
```tsx
import * as SecureStore from 'expo-secure-store';

await SecureStore.setItemAsync('token', loginToken);
```

### Retrieve Data
```tsx
const token = await SecureStore.getItemAsync('token');
```

---

## Navigation (Expo Router)

### Basic Navigation
```tsx
import { useRouter } from 'expo-router';

const router = useRouter();
router.push('/(passenger)/home');
router.replace('/(auth)/login');
```

---

## Best Practices

1. **Naming**
   - Use Mobile prefix for mobile components
   - Component names in PascalCase
   - Prop names in camelCase

2. **Structure**
   - One component per file
   - Keep component files in ui/ folder
   - Export default at end of file

3. **Styling**
   - Use StyleSheet.create() for optimization
   - Define styles outside component
   - Use theme colors from Colors constant

4. **Performance**
   - Use FlatList for long lists
   - Memoize expensive calculations
   - Avoid anonymous functions in render

5. **Accessibility**
   - Add accessibility labels
   - Use semantic colors
   - Ensure touch targets are adequate

---

## Migration from Web

### Button
```tsx
// Web
<Button variant="primary">Click</Button>

// Mobile
<Button variant="primary">
  <Text>Click</Text>
</Button>
```

### Input
```tsx
// Web
<Input onChange={handleChange} />

// Mobile
<Input onChangeText={handleChange} />
```

### Container
```tsx
// Web
<div style={{ padding: 16 }}>

// Mobile
<View style={{ padding: 16 }}>
```

---

## Resources

- [React Native Docs](https://reactnative.dev)
- [Expo Documentation](https://docs.expo.dev)
- [Ionicons Library](https://ionic.io/ionicons)
- [React Native SafeAreaContext](https://github.com/react-native-community/react-native-safe-area-context)
