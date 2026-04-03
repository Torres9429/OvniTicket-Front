import { Link } from 'react-router-dom';

function NotFound() {
  return (
    <main className="not-found-page app-card">
      <h1>404</h1>
      <p>La ruta que buscas no existe.</p>
      <Link to="/" className="btn btn-primary">
        Volver al inicio
      </Link>
    </main>
  );
}

export default NotFound;
