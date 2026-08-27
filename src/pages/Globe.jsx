import React, { useState } from 'react';
import CesiumGlobe from '../components/CesiumGlobe';
import { motion } from 'framer-motion';

// 定义城市列表（基于pointsData）
const cities = [
  '深圳', '香港', '惠州', '珠海', '中山', '东莞', '外伶仃岛', '南澳岛',
  '台北', '台南', '高雄', '马来西亚', '成都', '广元', '绵阳'
];

export default function Globe({ goTo, goToCity }) {
  const [showSidebar, setShowSidebar] = useState(false);
  const [showHelp, setShowHelp] = useState(false);

  const sidebarWidth = 250;
  const rectangleStyle = {
    position: 'absolute',
    bottom: '20px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    background: 'rgba(255, 255, 255, 0.2)',
    borderRadius: '20px',
    padding: '8px 12px',
    backdropFilter: 'blur(10px)',
    boxShadow: '0 2px 10px rgba(0,0,0,0.3)',
    zIndex: 10,
    ...(showSidebar ? {
      left: `calc(100% - ${sidebarWidth / 2}px)`,
      right: 'auto',
      transform: 'translateX(-50%)',
      width: `${sidebarWidth - 40}px`,
    } : {
      right: '20px',
      left: 'auto',
      transform: 'none',
      width: 'auto',
    }),
  };

  return (
    <div style={{ width: '100vw', height: '100vh', background: '#000', position: 'relative' }}>
      <CesiumGlobe goToCity={goToCity} />
      <div style={{ position: 'absolute', top: '20px', left: '20px', color: 'white' }}>
        <button onClick={() => goTo('home')} style={{ padding: '10px 20px', marginRight: '10px', background: 'rgba(255, 255, 255, 0.2)', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' }}>返回首页</button>
      </div>
      {/* 移除旧的箭头按钮 */}
      
      {/* 新矩形框 - 始终显示，位置固定 */}
      <div style={rectangleStyle}>
        {/* 箭头 - 根据状态切换方向 */}
        <button 
          onClick={() => setShowSidebar(!showSidebar)}
          style={{
            background: 'none',
            border: 'none',
            color: 'white',
            fontSize: '20px',
            cursor: 'pointer',
            marginRight: '8px'
          }}
        >
          {showSidebar ? '›' : '‹'} {/* ‹ 向左, › 向右 */}
        </button>
        {/* 标题 */}
        <span style={{ color: 'white', fontWeight: 'bold', marginRight: '8px' }}>
          一路向哪？
        </span>
        {/* 帮助图标 */}
        <button 
          onClick={() => setShowHelp(true)}
          style={{
            width: '32px',
            height: '32px',
            borderRadius: '50%',
            background: 'rgba(255, 255, 255, 0.2)',
            border: '1px solid rgba(255, 255, 255, 0.3)',
            color: 'white',
            fontSize: '16px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 'bold'
          }}
        >
          ?
        </button>
      </div>

      {/* 侧边栏 - 移除关闭按钮 */}
      <div style={{
        position: 'absolute',
        top: 0,
        right: 0,
        height: '100vh',
        width: `${sidebarWidth}px`,
        background: 'rgba(0, 0, 0, 0.8)',
        transform: showSidebar ? 'translateX(0)' : 'translateX(100%)',
        transition: 'transform 0.3s ease',
        overflowY: 'auto',
        padding: '20px',
        boxSizing: 'border-box',
        zIndex: 5 // 低于矩形框
      }}>
        <h2 style={{ color: 'white', marginBottom: '20px' }}>选择地点</h2>
        {cities.map((city) => (
          <motion.button
            key={city}
            onClick={() => {
              goToCity(city);
              setShowSidebar(false);
            }}
            style={{
              display: 'block',
              width: '100%',
              padding: '10px 20px',
              margin: '10px 0',
              background: 'transparent',
              color: 'white',
              border: '1px solid rgba(255, 255, 255, 0.3)',
              borderRadius: '5px',
              cursor: 'pointer',
              textAlign: 'left'
            }}
            animate={{ scale: [1, 1.02, 1] }}
            transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
          >
            {city}
          </motion.button>
        ))}
      </div>

      {/* 帮助模态 */}
      {showHelp && (
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          background: 'rgba(0, 0, 0, 0.9)',
          padding: '20px',
          borderRadius: '10px',
          color: 'white',
          maxWidth: '400px',
          zIndex: 1000
        }}>
          <h3>送给阿肴25岁的生日礼物！</h3>
          <p>· 5.28 决定要给阿肴做一个独一无二的生日礼物</p>
          <p>· 6.28 在台湾旅行之后，开始有思路：根据我们去过的地方整理照片</p>
          <p>· 7.13 正式开始开发 《一路向哪？》 网站</p>
          <p>· 8.28 《一路向哪？》V1.0 上线啦！</p>
          <button 
            onClick={() => setShowHelp(false)}
            style={{ marginTop: '10px', padding: '5px 10px', background: 'rgba(255, 255, 255, 0.2)', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' }}
          >
            关闭
          </button>
        </div>
      )}
    </div>
  );
}
