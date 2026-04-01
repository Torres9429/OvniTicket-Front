import heroImage from '../../assets/hero.png';

const upcomingEvents = [
	{
		id: 1,
		title: 'Cosmic Summer Fest',
		location: 'Auditorio Central, Ciudad de Mexico',
		price: '$47',
		category: 'Musica en vivo',
		image: heroImage,
	},
	{
		id: 2,
		title: 'Neon Arena Live',
		location: 'Foro Luna, Guadalajara',
		price: '$30 - $100',
		category: 'Entretenimiento',
		image: heroImage,
	},
];

const featuredEvents = [
	{
		id: 1,
		title: 'Late Night Party',
		date: '12 AGO',
		location: 'Monterrey, Nuevo Leon',
		image: heroImage,
	},
	{
		id: 2,
		title: 'Urban Sound Experience',
		date: '21 AGO',
		location: 'Puebla, Puebla',
		image: heroImage,
	},
	{
		id: 3,
		title: 'Galaxy DJ Session',
		date: '30 AGO',
		location: 'Queretaro, Queretaro',
		image: heroImage,
	},
];

function UserHome() {
	return (
		<main className="user-home" aria-label="Inicio usuario">
			<section className="user-hero" style={{ backgroundImage: `url(${heroImage})` }}>
				<div className="user-hero-overlay">
					<p className="user-hero-kicker">Eventos en tendencia</p>
					<h1>Compra boletos para tus conciertos favoritos</h1>
					<p>
						Explora eventos, compara precios y asegura tu entrada en segundos.
					</p>
					<button className="btn btn-primary" type="button">
						Ver eventos
					</button>
				</div>
			</section>

			<section className="user-benefits" aria-label="Beneficios de compra">
				<article className="user-benefit-item">
					<h3>Elige evento y zona</h3>
					<p>Encuentra rapido el mejor lugar para tu experiencia.</p>
				</article>
				<article className="user-benefit-item">
					<h3>Paga directo al organizador</h3>
					<p>Checkout simple y seguro para confirmar tu compra.</p>
				</article>
				<article className="user-benefit-item">
					<h3>Recibe ticket digital</h3>
					<p>Tu boleto llega por correo y queda en tu perfil.</p>
				</article>
			</section>

			<section className="user-events-section" aria-label="Proximos eventos">
				<div className="user-section-head">
					<h2>Proximos eventos</h2>
					<div className="user-section-filters">
						<button className="btn btn-sm btn-outline-secondary" type="button">
							Esta semana
						</button>
						<button className="btn btn-sm btn-outline-secondary" type="button">
							Este mes
						</button>
					</div>
				</div>

				<div className="user-events-grid">
					{upcomingEvents.map((event) => (
						<article className="user-event-card app-card" key={event.id}>
							<img src={event.image} alt={event.title} />
							<div className="user-event-body">
								<h3>{event.title}</h3>
								<p>{event.location}</p>
								<div className="user-event-meta">
									<span>{event.price}</span>
									<span>{event.category}</span>
								</div>
							</div>
						</article>
					))}
				</div>
			</section>

			<section className="user-events-section" aria-label="Eventos destacados">
				<div className="user-section-head">
					<h2>Eventos destacados</h2>
				</div>

				<div className="user-featured-grid">
					{featuredEvents.map((event) => (
						<article className="user-featured-card app-card" key={event.id}>
							<div className="user-featured-image-wrap">
								<img src={event.image} alt={event.title} />
								<span className="user-featured-date">{event.date}</span>
							</div>
							<div className="user-event-body">
								<h3>{event.title}</h3>
								<p>{event.location}</p>
							</div>
						</article>
					))}
				</div>
			</section>
		</main>
	);
}

export default UserHome;
