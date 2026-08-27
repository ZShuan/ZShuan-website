import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './style.css';

// 预加载本地底图：让 Cesium 初始化时直接命中缓存，减少首屏等待
const basemapPreload = new Image();
basemapPreload.src = `${import.meta.env.BASE_URL}earthmap.jpg`;

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
); 
