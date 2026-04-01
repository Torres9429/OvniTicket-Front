import Sidebar from '../../components/Sidebar';
import BaseForm from '../../components/BaseForm';

const clientFields = [
	{
		name: 'nombreEvento',
		label: 'Nombre del evento',
		placeholder: 'Ej. Expo Galactica',
		required: true,
	},
	{
		name: 'aforo',
		label: 'Capacidad',
		type: 'number',
		placeholder: '500',
		required: true,
	},
	{
		name: 'descripcion',
		label: 'Descripcion',
		type: 'textarea',
		placeholder: 'Describe el evento y reglas de acceso',
		required: true,
	},
];

function ClientHome() {
	const handleSubmit = (event) => {
		event.preventDefault();
	};

	return (
		<section className="app-shell">
			<Sidebar role="client" />
			<main className="app-main">
				<BaseForm
					title="Crea un nuevo evento"
					subtitle="Carga informacion base para empezar a vender."
					fields={clientFields}
					onSubmit={handleSubmit}
					submitText="Publicar evento"
				/>
			</main>
		</section>
	);
}

export default ClientHome;
