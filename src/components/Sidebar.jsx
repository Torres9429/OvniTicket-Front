const defaultMenus = {
  user: [
    { label: 'Inicio', href: '#' },
    { label: 'Comprar Boletos', href: '#' },
    { label: 'Mis Compras', href: '#' },
    { label: 'Perfil', href: '#' },
  ],
  client: [
    { label: 'Dashboard', href: '#' },
    { label: 'Eventos', href: '#' },
    { label: 'Ventas', href: '#' },
    { label: 'Soporte', href: '#' },
  ],
};

function Sidebar({ role = 'user', title, menuItems }) {
  const items = menuItems ?? defaultMenus[role] ?? defaultMenus.user;
  const heading = title ?? (role === 'client' ? 'Panel Cliente' : 'Panel Usuario');

  return (
    <aside className="app-sidebar" aria-label={heading}>
      <h2 className="app-sidebar-title">{heading}</h2>
      <nav>
        <ul className="app-sidebar-list">
          {items.map((item) => (
            <li key={item.label}>
              <a className="app-sidebar-link" href={item.href}>
                {item.label}
              </a>
            </li>
          ))}
        </ul>
      </nav>
    </aside>
  );
}

export default Sidebar;
