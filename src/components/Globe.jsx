import React, { useRef, useEffect, useState, Suspense } from 'react';
import { Canvas, useFrame, useLoader, useThree } from '@react-three/fiber';
import { OrbitControls, Stars } from '@react-three/drei';
import * as THREE from 'three';

// 经纬度转球面坐标
function latLngToVector3(lat, lng, radius = 2) {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lng + 180) * (Math.PI / 180);
  const x = -radius * Math.sin(phi) * Math.cos(theta);
  const z = radius * Math.sin(phi) * Math.sin(theta);
  const y = radius * Math.cos(phi);
  return new THREE.Vector3(x, y, z);
}

// 生成球面上的弧线点
function getArcPoints(from, to, num = 100) {
  const start = latLngToVector3(from[1], from[0]);
  const end = latLngToVector3(to[1], to[0]);
  const points = [];
  for (let i = 0; i <= num; i++) {
    const t = i / num;
    // 球面插值
    const p = new THREE.Vector3().lerpVectors(start, end, t);
    // 提高中间点高度，形成弧线
    const arcHeight = Math.sin(Math.PI * t) * 0.5;
    p.normalize().multiplyScalar(2 + arcHeight);
    points.push(p);
  }
  return points;
}

function FlyLine({ from, to, duration = 2 }) {
  const [progress, setProgress] = useState(0);
  const points = getArcPoints(from, to, 100);
  const lineRef = useRef();

  useFrame((state, delta) => {
    setProgress((prev) => Math.min(prev + delta / duration, 1));
  });

  // 只显示部分线段，表现飞行动画
  const visiblePoints = points.slice(0, Math.floor(points.length * progress));

  return (
    <>
      {/* 终点标记 */}
      <mesh position={points[points.length - 1]}>
        <sphereGeometry args={[0.05, 16, 16]} />
        <meshStandardMaterial color="#ff4f4f" />
      </mesh>
      {/* 飞线 */}
      {visiblePoints.length > 1 && (
        <line ref={lineRef}>
          <bufferGeometry>
            <bufferAttribute
              attach="attributes-position"
              count={visiblePoints.length}
              array={new Float32Array(visiblePoints.flatMap((p) => [p.x, p.y, p.z]))}
              itemSize={3}
            />
          </bufferGeometry>
          <lineBasicMaterial color="#ffb347" linewidth={2} />
        </line>
      )}
    </>
  );
}

function Earth() {
  // 使用自定义地球贴图
  const texture = useLoader(THREE.TextureLoader, '/satellitemap.jpg');
  return (
    <mesh>
      <sphereGeometry args={[2, 64, 64]} />
      <meshStandardMaterial map={texture} metalness={0.4} roughness={0.7} />
    </mesh>
  );
}

// 深圳、台湾（台北）经纬度
const pointsData = [
  { name: '深圳', lng: 114.0579, lat: 22.5431, color: '#4f8cff', date: '', desc: '', photos: [] },
  { name: '香港', lng: 114.1694, lat: 22.3193, color: '#ffb347', date: '', desc: '', photos: [] },
  { name: '惠州', lng: 114.4168, lat: 23.1115, color: '#4f8cff', date: '', desc: '', photos: [] },
  { name: '珠海', lng: 113.5767, lat: 22.2707, color: '#ffb347', date: '', desc: '', photos: [] },
  { name: '中山', lng: 113.392, lat: 22.521, color: '#4f8cff', date: '', desc: '', photos: [] },
  { name: '东莞', lng: 113.760, lat: 23.020, color: '#ffb347', date: '', desc: '', photos: [] },
  { name: '外伶仃岛', lng: 114.0050, lat: 22.1150, color: '#4f8cff', date: '', desc: '', photos: [] },
  { name: '南澳岛', lng: 117.0700, lat: 23.4400, color: '#ffb347', date: '', desc: '', photos: [] },
  { name: '台北', lng: 121.5654, lat: 25.0330, color: '#4f8cff', date: '', desc: '', photos: [] },
  { name: '马来西亚', lng: 101.9758, lat: 4.2105, color: '#ffb347', date: '', desc: '', photos: [] },
  { name: '成都', lng: 104.0665, lat: 30.5728, color: '#4f8cff', date: '', desc: '', photos: [] },
  { name: '广元', lng: 105.8436, lat: 32.4416, color: '#ffb347', date: '', desc: '', photos: [] },
];

// 视角动画控制
function CameraAnimation({ targetVec, lookAtVec }) {
  const { camera, controls } = useThree();
  const animating = useRef(false);
  const start = useRef({});
  const duration = 1.2; // 动画时长
  const tRef = useRef(0);

  useEffect(() => {
    if (!targetVec || !lookAtVec || !controls) return;
    animating.current = true;
    start.current = {
      pos: camera.position.clone(),
      look: controls.target.clone(),
    };
    tRef.current = 0;
  }, [targetVec, lookAtVec, controls]);

  useFrame((_, delta) => {
    if (!animating.current || !controls) return;
    tRef.current += delta;
    let t = Math.min(tRef.current / duration, 1);
    camera.position.lerpVectors(start.current.pos, targetVec, t);
    controls.target.lerpVectors(start.current.look, lookAtVec, t);
    controls.update();
    if (t >= 1) animating.current = false;
  });
  return null;
}

function GlobePoints({ onPointClick, activeIndex }) {
  // 呼吸动画
  useFrame((state) => {
    state.scene.traverse((obj) => {
      if (obj.userData.pointIndex !== undefined) {
        const scale = 1 + 0.2 * Math.sin(state.clock.elapsedTime * 2 + obj.userData.pointIndex);
        obj.scale.set(scale, scale, scale);
      }
    });
  });
  return (
    <>
      {pointsData.map((pt, i) => {
        const pos = latLngToVector3(pt.lat, pt.lng, 2.05);
        return (
          <mesh
            key={pt.name}
            position={pos}
            userData={{ pointIndex: i }}
            onClick={() => onPointClick && onPointClick(i)}
            castShadow
          >
            <sphereGeometry args={[0.07, 24, 24]} />
            <meshStandardMaterial color={pt.color} emissive={activeIndex === i ? pt.color : '#222'} emissiveIntensity={activeIndex === i ? 0.7 : 0.2} />
          </mesh>
        );
      })}
    </>
  );
}

// 所有点两两连线
function AllFlyLines() {
  const lines = [];
  for (let i = 0; i < pointsData.length; i++) {
    for (let j = i + 1; j < pointsData.length; j++) {
      lines.push(
        <FlyLine key={i + '-' + j} from={[pointsData[i].lng, pointsData[i].lat]} to={[pointsData[j].lng, pointsData[j].lat]} duration={2} />
      );
    }
  }
  return <>{lines}</>;
}

// 进入动画参数
const CHINA_LNG = 105.0; // 中国大致中心经度
const CHINA_LAT = 35.0;  // 中国大致中心纬度

function EntryAnimation({ onFinish }) {
  const { camera, controls, scene } = useThree();
  const [progress, setProgress] = useState(0);
  const duration = 1.8; // 动画时长（秒）
  const startPos = new THREE.Vector3(0, 0, 12); // 初始相机远离地球
  const endPos = latLngToVector3(CHINA_LAT, CHINA_LNG, 6); // 最终正对中国
  const startTarget = new THREE.Vector3(0, 0, 0);
  const endTarget = latLngToVector3(CHINA_LAT, CHINA_LNG, 0);
  const globeRef = useRef();

  useFrame((_, delta) => {
    if (!controls) return;
    setProgress((p) => {
      const next = Math.min(p + delta / duration, 1);
      // 相机位置插值
      camera.position.lerpVectors(startPos, endPos, easeInOut(next));
      controls.target.lerpVectors(startTarget, endTarget, easeInOut(next));
      controls.update();
      // 地球缩放插值
      if (globeRef.current) {
        globeRef.current.scale.setScalar(0.5 + 0.5 * next);
      }
      if (next === 1 && onFinish) onFinish();
      return next;
    });
  });

  // 给地球加ref
  useEffect(() => {
    if (!scene || !controls) return;
    const globe = scene.children.find(obj => obj.type === 'Mesh' && obj.geometry.type === 'SphereGeometry');
    if (globe) globeRef.current = globe;
  }, [scene, controls]);

  return null;
}

function easeInOut(t) {
  return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
}

export default function Globe({ active, onPointClick, fullScreen }) {
  // fullScreen: true=全屏模式，false=分屏模式
  // active: 当前激活点索引，null=无激活
  // onPointClick: 点击点的回调
  // ... existing code ...
  // 控制样式和交互
  const [entryAnim, setEntryAnim] = useState(fullScreen); // 仅全屏时播放入场动画
  const isFull = !!fullScreen;
  const width = isFull ? '100vw' : '50vw';
  const height = '100vh';
  return (
    <div style={{ width, height, background: 'radial-gradient(ellipse at center, #0a183d 0%, #000 100%)', position: isFull ? 'absolute' : 'relative', left: 0, top: 0, float: isFull ? 'none' : 'left', zIndex: 1 }}>
      <Canvas camera={{ position: [0, 0, 12], fov: 50 }} style={{ width, height, background: 'transparent' }} shadows>
        <Stars radius={40} depth={80} count={2000} factor={4} saturation={0.5} fade speed={1} />
        <ambientLight intensity={0.7} />
        <directionalLight position={[5, 5, 5]} intensity={1} />
        <Suspense fallback={null}>
          <Earth />
        </Suspense>
        <GlobePoints onPointClick={isFull && !entryAnim ? onPointClick : undefined} activeIndex={active} />
        {/* <AllFlyLines /> */}
        {/* 相机动画控制 */}
        {active !== null && !entryAnim && pointsData[active] && (
          <CameraAnimation
            targetVec={latLngToVector3(pointsData[active].lat, pointsData[active].lng, 4.5)}
            lookAtVec={latLngToVector3(pointsData[active].lat, pointsData[active].lng, 0)}
          />
        )}
        {/* {isFull && entryAnim && <EntryAnimation onFinish={() => setEntryAnim(false)} /> } */}
        {/* 控制交互 */}
        <OrbitControls
          enablePan={false}
          enableZoom={isFull && !entryAnim}
          enableRotate={isFull && !entryAnim}
          autoRotate={isFull && !entryAnim}
        />
      </Canvas>
      <div className="absolute top-0 left-0 h-full bg-white bg-opacity-50 p-2 rounded-r-lg flex flex-col items-center space-y-4 w-16">
        <div className="flex items-center space-x-2">
          <img src="/icons/map.svg" alt="Map" className="w-6 h-6" />
          <span className="text-sm font-medium">地图</span>
        </div>
        <div className="flex items-center space-x-2">
          <img src="/icons/timeline.svg" alt="Timeline" className="w-6 h-6" />
          <span className="text-sm font-medium">时间线</span>
        </div>
        <div className="flex items-center space-x-2">
          <img src="/icons/info.svg" alt="Info" className="w-6 h-6" />
          <span className="text-sm font-medium">信息</span>
        </div>
      </div>
    </div>
  );
}

// 导出点数据
export { pointsData }; 