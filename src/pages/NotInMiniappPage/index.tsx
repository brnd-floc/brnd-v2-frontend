// Dependencies
import React from 'react';

export default function NotInMiniappPage(): React.ReactNode {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        padding: '20px',
        textAlign: 'center',
      }}
    >
      <h1>NOT INSIDE A MINIAPP CONTEXT</h1>
    </div>
  );
}

