import { NavLink } from 'react-router-dom';
import EduviaLogo from './EduviaLogo';

export default function Sidebar({ subtitle, items }) {
  return (
    <aside className="sidebar">
      <div className="sidebar__brand">
        <EduviaLogo variant="sidebar" />
        {subtitle ? <div className="sidebar__subtitle">{subtitle}</div> : null}
      </div>
      <nav className="sidebar__nav">
        {items.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) =>
              `sidebar__link${isActive ? ' sidebar__link--active' : ''}`
            }>
            {item.icon ? <item.icon size={18} /> : null}
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
