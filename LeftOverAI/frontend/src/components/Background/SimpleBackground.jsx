import React from 'react';

const SimpleBackground = () => {
  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100%',
      height: '100%',
      zIndex: 0,
      background: 'linear-gradient(135deg, #2c3e50 0%, #3498db 100%)',
      overflow: 'hidden'
    }}>
      <div style={{
        position: 'absolute',
        width: '100%',
        height: '100%',
        opacity: 0.1,
        backgroundImage: 'radial-gradient(#4CAF50 1px, transparent 1px)',
        backgroundSize: '50px 50px'
      }} />
    </div>
  );
};

export default SimpleBackground; 