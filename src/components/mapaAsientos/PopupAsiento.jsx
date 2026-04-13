import React from 'react';
import PropTypes from 'prop-types';

const isClickInside = (e, element) => {
  let node = e.target;
  while (node) {
    if (node === element) return true;
    node = node.parentNode;
  }
  return false;
};

const PopupAsiento = ({ position, data, zoneName, price, onClose }) => {
  const containerRef = React.useRef(null);

  React.useEffect(() => {
    const onClick = (e) => {
      if (!isClickInside(e, containerRef.current)) {
        onClose();
      }
    };
    window.addEventListener('click', onClick);
    return () => window.removeEventListener('click', onClick);
  }, [onClose]);

  return (
    <div
      ref={containerRef}
      style={{
        position: 'absolute',
        top: position.y + 20 + 'px',
        left: position.x + 20 + 'px',
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
        Asiento {data.label || `F${data.row}-C${data.col}`}
      </div>
      {zoneName && <div>Zona: {zoneName}</div>}
      {price != null && <div>Precio: ${price}</div>}
      <div style={{ color: data.estatus === 'reservado' ? '#e53e3e' : '#38a169' }}>
        {data.estatus === 'reservado' ? 'Reservado' : 'Disponible'}
      </div>
      {data.estatus !== 'reservado' && (
        <div style={{ marginTop: '4px', color: '#718096', fontSize: '11px' }}>
          Click para seleccionar
        </div>
      )}
    </div>
  );
};

export default PopupAsiento;

PopupAsiento.propTypes = {
  position: PropTypes.shape({
    x: PropTypes.number.isRequired,
    y: PropTypes.number.isRequired,
  }).isRequired,
  data: PropTypes.shape({
    label: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    row: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    col: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    estatus: PropTypes.string,
  }).isRequired,
  zoneName: PropTypes.string,
  price: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  onClose: PropTypes.func.isRequired,
};

PopupAsiento.defaultProps = {
  zoneName: undefined,
  price: undefined,
};
