import React from 'react';

export default function JourneyCard({ data }) {
  if (!data) return null;
  return (
    <div style={{ background: '#fff', borderRadius: 16, boxShadow: '0 4px 24px #0002', padding: 32, minWidth: 340, maxWidth: 420 }}>
      <h2 style={{ color: '#4f8cff', marginBottom: 8 }}>{data.name}</h2>
      <div style={{ color: '#888', fontSize: 16, marginBottom: 16 }}>{data.date}</div>
      <div style={{ fontSize: 18, marginBottom: 24 }}>{data.desc}</div>
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        {data.photos && data.photos.map((src, i) => (
          <img key={i} src={src} alt={data.name + i} style={{ width: 90, height: 90, objectFit: 'cover', borderRadius: 8, boxShadow: '0 2px 8px #0001' }} />
        ))}
      </div>
    </div>
  );
} 