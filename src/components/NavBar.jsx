import logo from '../assets/logo1.png';

function NavBar({ userName = 'Invitado' }) {
	return (
		<header className="app-navbar-wrap">
			<nav className="app-navbar" aria-label="Navegacion principal de usuario">
				<a className="app-brand" href="#" aria-label="Ir al inicio">
					<img className="app-brand-logo" src={logo} alt="OvniTicket logo" />
					<span><h2>OvniTicket</h2></span>
				</a>

				<ul className="app-navbar-menu">
					<li>
						<a href="#">Inicio</a>
					</li>
					<li>
						<a href="#">Eventos</a>
					</li>
					<li>
						<a href="#">Ayuda</a>
					</li>
				</ul>

				<div className="app-navbar-user">
					<button className="btn btn-primary" type="button">
						Registrarse
					</button>
				</div>
			</nav>
		</header>
	);
}

export default NavBar;
