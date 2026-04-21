# UI Components - Quick Start Guide

## For Frontend Developers

### Getting Started

1. **Import Components**
```jsx
import { Button, Card, Modal, Table, Dropdown, Alert } from './components/ui';
import { Stat, Tabs, LoadingSpinner } from './components/ui';
```

2. **Use in Your Page**
```jsx
import { useState } from 'react';
import { Card, CardContent, Button } from '../components/ui';

export default function MyPage() {
  const [isOpen, setIsOpen] = useState(false);
  
  return (
    <div>
      <Card>
        <CardContent>
          <h2>Hello World</h2>
          <Button onClick={() => setIsOpen(true)}>
            Open
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
```

3. **Add Styling**
```jsx
// Use CSS variables defined in index.css
<div style={{
  padding: 'var(--space-6)',
  color: 'var(--text-primary)',
  borderRadius: 'var(--radius-lg)',
  background: 'var(--bg-surface)'
}}>
```

### Common Tasks

#### Create a Data Table
```jsx
<Table
  columns={[
    { key: 'name', label: 'Name' },
    { key: 'status', label: 'Status', render: (s) => <Badge>{s}</Badge> }
  ]}
  data={buses}
  loading={isLoading}
/>
```

#### Show a Modal
```jsx
const [open, setOpen] = useState(false);

<Modal
  isOpen={open}
  onClose={() => setOpen(false)}
  title="Confirm Delete"
  footer={
    <>
      <Button onClick={() => setOpen(false)}>Cancel</Button>
      <Button variant="danger" onClick={handleDelete}>Delete</Button>
    </>
  }
>
  <p>Are you sure you want to delete this item?</p>
</Modal>
```

#### Create a Form
```jsx
<Card>
  <CardContent>
    <Dropdown
      label="Route"
      items={routes}
      value={selected}
      onChange={setSelected}
    />
    <Input
      label="License Plate"
      placeholder="NP-XXXX"
      value={license}
      onChange={(e) => setLicense(e.target.value)}
    />
    <Button onClick={handleSubmit}>Save</Button>
  </CardContent>
</Card>
```

#### Display Metrics
```jsx
<Stat
  label="Active Buses"
  value={42}
  icon={<Bus />}
  color="primary"
  size="lg"
  trend={{ positive: true, value: '+5%' }}
/>
```

---

## For Mobile Developers

### Getting Started

1. **Import Components**
```tsx
import { Button, Card, Input } from '../src/components/ui';
import { MobileModal, MobileDropdown } from '../src/components/ui/Modal';
```

2. **Use in Your Screen**
```tsx
import { View, Text, ScrollView, RefreshControl } from 'react-native';
import { Card } from '../../src/components/ui';
import { Colors } from '../../constants/Colors';

export default function MyScreen() {
  const [refreshing, setRefreshing] = useState(false);
  
  const onRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  };
  
  return (
    <ScrollView
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      <View style={{ padding: 16 }}>
        <Card style={{ marginBottom: 16 }}>
          <Text style={{ fontSize: 18, fontWeight: '700' }}>Hello</Text>
        </Card>
      </View>
    </ScrollView>
  );
}
```

### Common Tasks

#### Create a List Item
```tsx
<Card style={styles.card}>
  <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
    <View>
      <Text style={styles.title}>Bus NP-1234</Text>
      <Text style={styles.subtitle}>Route 1</Text>
    </View>
    <View style={{ alignItems: 'flex-end' }}>
      <Text style={{ fontSize: 16, fontWeight: '700' }}>45</Text>
      <Text style={styles.subtitle}>Passengers</Text>
    </View>
  </View>
</Card>
```

#### Show a Modal
```tsx
const [visible, setVisible] = useState(false);

<MobileModal
  visible={visible}
  onClose={() => setVisible(false)}
  title="Bus Details"
>
  <Text>Details here</Text>
</MobileModal>
```

#### Create a Form
```tsx
<View style={{ gap: 16 }}>
  <Input
    label="Bus License"
    placeholder="NP-XXXX"
    value={license}
    onChangeText={setLicense}
  />
  <MobileDropdown
    label="Route"
    items={routes}
    value={route}
    onChange={setRoute}
  />
  <Button onPress={handleSubmit}>
    <Text>Submit</Text>
  </Button>
</View>
```

#### Display Metrics
```tsx
<Card style={styles.statCard}>
  <View style={{ gap: 4 }}>
    <Text style={styles.label}>Active Buses</Text>
    <Text style={styles.value}>42</Text>
    <Text style={{ color: Colors.success }}>↑ +5%</Text>
  </View>
</Card>
```

#### Handle Loading
```tsx
import { MobileLoadingSpinner } from '../src/components/ui';

{loading ? (
  <MobileLoadingSpinner size="large" />
) : (
  <FlatList data={data} renderItem={renderItem} />
)}
```

---

## Design Guidelines

### Colors to Use
```jsx
// Web
const colors = {
  primary: 'var(--color-primary-500)',
  success: 'var(--color-success-500)',
  danger: 'var(--color-danger-500)',
  warning: 'var(--color-warning-600)',
  muted: 'var(--text-muted)'
};

// Mobile
import { Colors } from '../../constants/Colors';
// Use: Colors.primary, Colors.success, Colors.error, etc.
```

### Spacing Rules
```jsx
// Web - Use CSS variables
padding: 'var(--space-4)' // 16px
gap: 'var(--space-6)'     // 24px

// Mobile - Use numeric values
paddingHorizontal: 16
gap: 24
```

### Typography
```jsx
// Web
fontSize: 'var(--text-lg)'        // 18px
fontWeight: 600                   // Semibold
letterSpacing: '0.01em'

// Mobile
fontSize: 16
fontWeight: '600'
```

---

## Common Patterns

### Loading with Error
```jsx
if (loading) return <LoadingSpinner />;
if (error) return <Alert type="error" message={error.message} />;
return <Component data={data} />;
```

### Form with Validation
```jsx
const [errors, setErrors] = useState({});

const validate = () => {
  const newErrors = {};
  if (!name) newErrors.name = 'Name is required';
  if (!email) newErrors.email = 'Email is required';
  return newErrors;
};

const handleSubmit = (e) => {
  const newErrors = validate();
  if (Object.keys(newErrors).length > 0) {
    setErrors(newErrors);
    return;
  }
  // Submit
};

<Input
  label="Name"
  value={name}
  onChange={(e) => setName(e.target.value)}
  error={errors.name}
/>
```

### Data Refresh
```tsx
const [refreshing, setRefreshing] = useState(false);

const onRefresh = useCallback(async () => {
  setRefreshing(true);
  try {
    await api.get('/data');
  } catch (error) {
    console.error(error);
  } finally {
    setRefreshing(false);
  }
}, []);

useEffect(() => {
  onRefresh();
  const interval = setInterval(onRefresh, 30000); // Every 30s
  return () => clearInterval(interval);
}, []);
```

---

## Troubleshooting

### Web Issues

**Modal not showing**
```jsx
// Make sure state is toggled
const [open, setOpen] = useState(false);
<Modal isOpen={open} onClose={() => setOpen(false)}>...</Modal>
```

**Styles not applying**
```jsx
// Import animations
import '../animations.css';
// Or use inline styles with CSS variables
style={{ color: 'var(--color-primary-500)' }}
```

**Table not displaying**
```jsx
// Make sure columns and data have matching keys
columns = [{ key: 'name' }]
data = [{ name: 'Bus1' }]
```

### Mobile Issues

**Button not responding**
```tsx
// Ensure onPress is used, not onClick
<Button onPress={handlePress}>...</Button>
```

**Text overflowing**
```tsx
// Use numberOfLines prop
<Text numberOfLines={1}>Long text...</Text>
```

**ScrollView not scrolling**
```tsx
// Make sure it's not inside a View with flex: 1
<ScrollView scrollEnabled={true}>
```

---

## Resources

- **Frontend Docs**: See `COMPONENT_LIBRARY.md`
- **Mobile Docs**: See `MOBILE_COMPONENT_LIBRARY.md`
- **Design System**: Check `index.css` for theme variables
- **Icons**: [Ionicons List](https://ionic.io/ionicons)
- **Chart Library**: [Recharts Docs](https://recharts.org)

---

## Tips & Tricks

### Web
- Use `style={{}}` for dynamic styles
- Hover prop on Card for interactivity
- Render prop pattern in Table for custom cells
- Use Modal size variants (sm, md, lg, xl)

### Mobile
- SafeAreaView for proper padding
- FlatList for long lists (better performance)
- Platform module for OS-specific code
- useEffect cleanup for subscriptions

---

## Quick Tips

1. **Always import both the component and its subcomponents**
   ```jsx
   import { Card, CardHeader, CardContent, CardTitle } from './ui';
   ```

2. **Use semantic HTML (web) and native components (mobile)**
   - Good: `<button>` or `<Button>`
   - Avoid: `<div onClick={}>` or `<View onPress={}>`

3. **Keep components focused**
   - One responsibility per component
   - Pass data via props
   - Handle state at page level

4. **Test responsiveness**
   - Web: Resize browser window
   - Mobile: Test on actual device or emulator

5. **Accessibility matters**
   - Add labels to inputs
   - Use semantic color meanings
   - Ensure touch targets are 44x44+

---

## Getting Help

- Check the component source files
- Review example usage in dashboard pages
- Refer to documentation files
- Check browser/IDE console for errors

**Happy building! 🚀**
