# Smart Bus Safety System - Frontend

A modern React-based web application for the Smart Bus Safety System, providing real-time bus tracking, occupancy predictions, maintenance reporting, and violation monitoring.

## Features

### For Passengers

- 🚌 **Real-time Bus Tracking**: View live bus locations and occupancy levels
- 📊 **Occupancy Predictions**: Get ML-powered predictions for bus crowding
- 📍 **Route Information**: Access detailed bus route and schedule information
- ⚠️ **Safety Alerts**: Receive notifications about overcrowding and safety violations

### For Bus Conductors

- 🔧 **Maintenance Reporting**: Report mechanical issues and maintenance needs
- 📝 **Issue Tracking**: Track maintenance history and status
- 🚍 **Fleet Overview**: View all buses and their current status
- 📋 **Service Logs**: Access historical maintenance records

### For Transport Authorities

- 📈 **Analytics Dashboard**: Comprehensive violation and fleet analytics
- ⚠️ **Violation Monitoring**: Track footboard and overcrowding violations
- 🛠️ **Maintenance Oversight**: Monitor pending and completed maintenance
- 📊 **Fleet Management**: View real-time status of entire bus fleet
- 🗺️ **Violation Mapping**: Geographic visualization of safety violations

## Technology Stack

- **Framework**: React 18
- **Build Tool**: Vite 5
- **Styling**: TailwindCSS 3
- **Routing**: React Router 6
- **HTTP Client**: Axios
- **Notifications**: React Toastify
- **Icons**: Lucide React

## Prerequisites

- Node.js 16.x or higher
- npm or yarn
- Backend API running on `http://localhost:3000`
- ML Service running on `http://localhost:5001`

## Installation

1. **Navigate to frontend directory**:

   ```bash
   cd frontend
   ```

2. **Install dependencies**:

   ```bash
   npm install
   ```

3. **Configure environment** (optional):
   Create a `.env` file if you need to override defaults:
   ```env
   VITE_API_URL=http://localhost:3000/api
   ```

## Running the Application

### Development Mode

Start the development server with hot reload:

```bash
npm run dev
```

The application will be available at `http://localhost:5173`

### Production Build

Build the application for production:

```bash
npm run build
```

Preview the production build:

```bash
npm run preview
```

## Project Structure

```
frontend/
├── public/              # Static assets
├── src/
│   ├── components/      # Reusable components
│   │   ├── Navbar.jsx
│   │   ├── ProtectedRoute.jsx
│   │   └── LoadingSpinner.jsx
│   ├── context/         # React context providers
│   │   └── AuthContext.jsx
│   ├── pages/           # Page components
│   │   ├── Login.jsx
│   │   ├── Register.jsx
│   │   ├── passenger/
│   │   │   └── PassengerDashboard.jsx
│   │   ├── conductor/
│   │   │   └── ConductorDashboard.jsx
│   │   └── authority/
│   │       └── AuthorityDashboard.jsx
│   ├── services/        # API service layer
│   │   └── api.js
│   ├── App.jsx          # Main app component
│   ├── main.jsx         # Application entry point
│   └── index.css        # Global styles
├── index.html
├── package.json
├── vite.config.js
└── tailwind.config.js
```

## User Roles

### Passenger

- **Username**: Any username
- **Role**: `passenger`
- **Access**: Bus tracking, occupancy predictions, real-time status

### Conductor

- **Username**: Any username
- **Role**: `conductor`
- **Access**: Maintenance reporting, fleet overview, service logs

### Authority

- **Username**: Any username
- **Role**: `authority`
- **Access**: Full system analytics, violation monitoring, fleet management

## API Integration

The frontend communicates with the backend API through the centralized `api.js` service:

### Authentication

- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `GET /api/auth/profile` - Get user profile

### Bus Operations

- `GET /api/bus` - List all buses
- `POST /api/bus` - Create new bus
- `GET /api/bus/:id` - Get bus details
- `PUT /api/bus/:id` - Update bus
- `DELETE /api/bus/:id` - Delete bus
- `GET /api/bus/:id/status` - Get real-time bus status
- `GET /api/bus/:id/violations` - Get bus violations
- `GET /api/bus/:id/logs` - Get bus data logs
- `POST /api/bus/:id/predict` - Get occupancy prediction

### Maintenance

- `GET /api/maintenance` - List maintenance logs
- `POST /api/maintenance` - Create maintenance report
- `GET /api/maintenance/:id` - Get maintenance details
- `PUT /api/maintenance/:id` - Update maintenance status

### IoT Data

- `POST /api/iot/iot-data` - Submit IoT sensor data

## Authentication

The app uses JWT token-based authentication:

1. User logs in with username and password
2. Backend returns JWT token
3. Token stored in localStorage
4. Token automatically attached to all API requests via axios interceptor
5. Protected routes redirect to login if no valid token

## Development Guidelines

### Adding New Pages

1. Create component in appropriate `pages/` subdirectory
2. Add route in `App.jsx`
3. Wrap with `ProtectedRoute` if authentication required

### Adding New API Endpoints

1. Add function to `src/services/api.js`
2. Follow existing naming conventions
3. Handle errors appropriately

### Styling Guidelines

- Use TailwindCSS utility classes
- Custom components defined in `index.css`
- Consistent color scheme: blue for primary, red for errors/violations
- Responsive design: mobile-first approach

## Troubleshooting

### API Connection Issues

**Problem**: Cannot connect to backend
**Solution**:

- Ensure backend is running on port 3000
- Check Vite proxy configuration in `vite.config.js`
- Verify CORS settings in backend

### Authentication Errors

**Problem**: Token expired or invalid
**Solution**:

- Logout and login again
- Clear localStorage: `localStorage.clear()`
- Check backend JWT configuration

### Build Errors

**Problem**: Build fails
**Solution**:

- Delete `node_modules` and reinstall: `rm -rf node_modules && npm install`
- Clear Vite cache: `rm -rf node_modules/.vite`
- Check Node.js version compatibility

## Performance Optimization

- Code splitting with React.lazy() for route-based splitting
- Image optimization with proper formats
- Memoization of expensive computations
- Debouncing of API calls for search/filter operations

## Security Considerations

- JWT tokens stored in localStorage (consider httpOnly cookies for production)
- Axios interceptors handle token refresh
- Protected routes prevent unauthorized access
- Input validation on all forms
- XSS protection via React's built-in escaping

## Future Enhancements

- [ ] Real-time updates via WebSocket
- [ ] Offline support with Service Workers
- [ ] Push notifications for violations
- [ ] Interactive map visualization
- [ ] Advanced analytics charts
- [ ] Export data to CSV/PDF
- [ ] Multi-language support
- [ ] Dark mode toggle

## License

This project is part of the Smart Bus Safety System research project.

## Support

For issues or questions, contact the development team.
