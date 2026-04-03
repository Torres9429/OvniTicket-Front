import { useContext } from 'react';
import { Outlet } from 'react-router-dom';
import NavBar from './NavBar';
import { AuthContext } from '../context/AuthContext';

function MainLayout() {
  const { user, handleLogout } = useContext(AuthContext);

  return (
    <>
      <NavBar userName={user?.username || user?.role || 'Usuario'} />
      <div className="app-layout-actions">
        <button type="button" className="btn btn-outline-secondary" onClick={handleLogout}>
          Cerrar sesion
        </button>
      </div>
      <Outlet />
    </>
  );
}

export default MainLayout;
