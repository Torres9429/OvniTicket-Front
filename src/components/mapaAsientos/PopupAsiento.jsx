import React from 'react';

const esClickDentro = (e, elemento) => {
  let nodo = e.target;
  while (nodo) {
    if (nodo === elemento) return true;
    nodo = nodo.parentNode;
  }
  return false;
};

const PopupAsiento = ({ posicion, dato, nombreZona, precio, onCerrar }) => {
  const refContenedor = React.useRef(null);

  React.useEffect(() => {
    const onClick = (e) => {
      if (!esClickDentro(e, refContenedor.current)) {
        onCerrar();
      }
    };
    window.addEventListener('click', onClick);
    return () => window.removeEventListener('click', onClick);
  }, [onCerrar]);

  return (
    <div
      ref={refContenedor}
      style={{
        position: 'absolute',
        top: posicion.y + 20 + 'px',
        left: posicion.x + 20 + 'px',
        padding: '12px 16px',
        borderRadius: '8px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
        zIndex: 10,
        backgroundColor: 'white',
        minWidth: '160px',
        fontSize: '13px',
        lineHeight: '1.6',
      }}
    >
      <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>
        Asiento {dato.label || `F${dato.row}-C${dato.col}`}
      </div>
      {nombreZona && <div>Zona: {nombreZona}</div>}
      {precio != null && <div>Precio: ${precio}</div>}
      <div style={{ color: dato.estatus === 'reservado' ? '#e53e3e' : '#38a169' }}>
        {dato.estatus === 'reservado' ? 'Reservado' : 'Disponible'}
      </div>
      {dato.estatus !== 'reservado' && (
        <div style={{ marginTop: '4px', color: '#718096', fontSize: '11px' }}>
          Click para seleccionar
        </div>
      )}
    </div>
  );
};

export default PopupAsiento;
