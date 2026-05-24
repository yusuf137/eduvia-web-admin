import { NavLink } from 'react-router-dom';

export default function Sidebar({ title, subtitle, items }) {
  return (
    <aside className="sidebar">
      <div className="sidebar__brand">
        <div className="sidebar__logo">E</div>
        <div>
          <div className="sidebar__title">{title}</div>
          {subtitle ? <div className="sidebar__subtitle">{subtitle}</div> : null}
        </div>
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
