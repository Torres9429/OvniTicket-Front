import { useContext, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import "../styles/Login.css";
import { AuthContext } from '../context/AuthContext';

function Login() {
	const { handleLogin, error, loading } = useContext(AuthContext);
	const navigate = useNavigate();

	const [form, setForm] = useState({
		correo: '',
		password: '',
	});

	const handleChange = (e) => {
		setForm({
			...form,
			[e.target.name]: e.target.value,
		});
	};

	const handleSubmit = async (e) => {
		e.preventDefault();
		const res = await handleLogin(form.correo, form.password);
		if (res?.success) navigate("/");
	};

	return (
		<div className="login-bg">

			{/* estrellas */}
			<div className="stars"></div>

			{/* card */}
			<div className="login-card">
				<h2 style={{"color": "var(--color-primary)"}}>Login</h2>

				<form onSubmit={handleSubmit}>

					<div className="input-group">
						<input
							type="email"
							name="correo"
							placeholder="Correo"
							value={form.correo}
							onChange={handleChange}
							required
						/>
					</div>

					<div className="input-group">
						<input
							type="password"
							name="password"
							placeholder="Contraseña"
							value={form.password}
							onChange={handleChange}
							required
						/>
					</div>

					<div className="login-options">
						<label>
							<input type="checkbox" /> Recordarme
						</label>
						<span className="forgot">¿Olvidaste tu contraseña?</span>
					</div>

					<button type="submit" disabled={loading}>
						{loading ? "Ingresando..." : "Entrar"}
					</button>

					{error && <p className="error">{error}</p>}

					<p className="register">
						¿No tienes cuenta? <span>Regístrate</span>
					</p>
				</form>
			</div>
		</div>
	);
}

export default Login;
