import React from 'react';

export default function Story({ goTo }) {
  return (
    <div style={{ width: '100%', height: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f0f0f0' }}>
      <h1>旅行故事</h1>
      <p>这里是你的旅行故事页面。</p>
      <button onClick={() => goTo('home')}>返回首页</button>
    </div>
  );
}


