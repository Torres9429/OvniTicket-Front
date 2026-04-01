function BaseForm({ title, subtitle, fields, onSubmit, submitText = 'Guardar' }) {
  return (
    <section className="app-card app-form-card" aria-label={title}>
      <header className="app-form-header">
        <h2>{title}</h2>
        {subtitle ? <p>{subtitle}</p> : null}
      </header>

      <form className="app-form-grid" onSubmit={onSubmit}>
        {fields.map((field) => (
          <label className="app-form-field" key={field.name}>
            <span>{field.label}</span>
            {field.type === 'textarea' ? (
              <textarea
                name={field.name}
                placeholder={field.placeholder}
                rows={field.rows ?? 4}
                required={field.required}
              />
            ) : (
              <input
                type={field.type ?? 'text'}
                name={field.name}
                placeholder={field.placeholder}
                required={field.required}
              />
            )}
          </label>
        ))}

        <button className="btn btn-primary app-submit-btn" type="submit">
          {submitText}
        </button>
      </form>
    </section>
  );
}

export default BaseForm;
