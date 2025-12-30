import React from 'react';
import { NavLink } from 'react-router-dom';
import { ROLE_ROUTES } from '../../utils/constants';
import './Sidebar.css';

const Sidebar = ({ role }) => {
  const routes = ROLE_ROUTES[role] || [];

  return (
    <aside className="sidebar">
      <ul className="sidebar-menu">
        {routes.map(route => (
          <li key={route.path}>
            <NavLink
              to={route.path}
              className={({ isActive }) => isActive ? 'active' : ''}
            >
              {route.label}
            </NavLink>
          </li>
        ))}
      </ul>
    </aside>
  );
};

export default Sidebar;
