import React, { useEffect, useRef, useState, useMemo } from 'react';
import * as Cesium from 'cesium';

// ============ 全局常量 ============
const EARTH_ROTATION_SPEED = 0.005236; // 地球自转速度（rad/帧@60fps）
const MOON_DISTANCE = 15000000; // 月球轨道半径（米）
const DEFAULT_CAMERA_HEIGHT = 35000000; // 默认/轨道相机高度（米）
const ORBIT_CAMERA_HEIGHT = 6000000; // 中国巡游相机高度（米）
const DRONE_ORBIT_HEIGHT = 350000; // 城市环绕起始高度（米）

export default function CesiumGlobe({ goToCity, activeStage = -1, stageAnimating = true, isCityMode = false, onUserInteract, cityPoints: cityPointsProp = [] }) {
  const stageAnimationRef = useRef(null); // Tracks the current stage animation cleanup
  const stageAnimatingRef = useRef(stageAnimating); // Keep a mutable ref for rAF loops
  const moonPosRef = useRef(null); // Ref for tracking moon pos safely
  const cesiumContainer = useRef(null);
  const viewer = useRef(null);
  const starsRef = useRef(null); // Ref for tracking star primitive
  const cityEntitiesRef = useRef([]); // Ref for tracking dynamically added city entities
  const masterAngleRef = useRef(0); // Persistent global rotation phase
  const lastTickTimeRef = useRef(performance.now());

  // 地图风格状态
  const [mapStyle, setMapStyle] = useState('local'); // 默认本地底图，避免在线瓦片卡顿
  const currentImageryLayerRef = useRef(null);

  // 地图风格配置（使用瓦片地图服务，支持缩放更新）
  const mapStyles = {
    local: {
      name: '本地底图',
      provider: () => new Cesium.SingleTileImageryProvider({
        url: `${import.meta.env.BASE_URL}earthmap.jpg`,
        tileWidth: 2048,
        tileHeight: 1024,
        credit: 'Local basemap'
      })
    },
    satellite: {
      name: '卫星图',
      provider: () => new Cesium.UrlTemplateImageryProvider({
        url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
        credit: 'Esri'
      })
    },
    street: {
      name: '街道图',
      provider: () => new Cesium.UrlTemplateImageryProvider({
        url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
        subdomains: ['a', 'b', 'c'],
        credit: 'OpenStreetMap contributors'
      })
    }
  };

  // 相机状态保存
  const savedCameraState = useRef(null);

  // 切换地图风格函数（使用瓦片地图服务）
  const switchMapStyle = (styleKey) => {
    if (!viewer.current) {
      return;
    }

    const styleConfig = mapStyles[styleKey];
    if (!styleConfig) {
      return;
    }

    try {
      // 清空所有影像层
      viewer.current.imageryLayers.removeAll();

      // 创建瓦片地图提供者
      const provider = styleConfig.provider();

      // 添加影像层
      const newLayer = viewer.current.imageryLayers.addImageryProvider(provider);
      currentImageryLayerRef.current = newLayer;

    } catch (error) {
    }
  };

  useEffect(() => {
    if (!cesiumContainer.current || viewer.current) return;

    try {
      // 设置 Cesium 静态资源路径
      window.CESIUM_BASE_URL = import.meta.env.BASE_URL + 'cesium/';

      // 设置 Cesium Token (可选，如果你有的话)
      // Cesium.Ion.defaultAccessToken = 'your-token-here';

      // 创建最简单的 Viewer 配置
      viewer.current = new Cesium.Viewer(cesiumContainer.current, {
        contextOptions: { webgl: { alpha: true, antialias: false, powerPreference: 'high-performance' } },
        baseLayerPicker: false,
        timeline: false,
        animation: false,
        navigationHelpButton: false,
        homeButton: false,
        geocoder: false,
        sceneModePicker: false,
        infoBox: false,
        selectionIndicator: false,
        fullscreenButton: false,
        vrButton: false,
        requestRenderMode: true,
        creditContainer: document.createElement('div'),
      });

      viewer.current.clock.shouldAnimate = true;
      // 高 DPI 适配：Retina/高分屏下地球更清晰；上限 1.5，避免 2x~3x 像素
      // 渲染让弱显卡重新变卡
      viewer.current.cesiumWidget.resolutionScale = Math.min(window.devicePixelRatio || 1, 1.5);
      // 关键：maximumRenderTimeChange 默认值为 0，会让 Cesium 在模拟时间每
      // 次变化时都强制渲染，导致 requestRenderMode 失效。设为大值后，空闲
      // 时只在相机变化或被显式请求时才渲染，界面响应明显变快。
      viewer.current.scene.maximumRenderTimeChange = Number.MAX_VALUE;

      // 隐藏左下角的控制器
      viewer.current.cesiumWidget.creditContainer.style.display = 'none';

      // 设置地球基础样式
      viewer.current.scene.globe.enableLighting = false;
      viewer.current.scene.globe.show = true;
      // 关闭 HDR 渲染，弱显卡上更省开销，视觉差异很小
      viewer.current.scene.highDynamicRange = false;

      // 关闭瓦片预加载，避免后台持续拉取在线瓦片导致卡顿
      viewer.current.scene.globe.preloadAncestors = false;
      viewer.current.scene.globe.preloadSiblings = false;
      viewer.current.scene.globe.maximumScreenSpaceError = 4;
      viewer.current.scene.globe.tileCacheSize = 300; // Cache fewer tiles in memory

      // Replace blurry default skybox with custom star particles
      viewer.current.scene.skyBox = undefined;
      viewer.current.scene.backgroundColor = new Cesium.Color(0, 0, 0, 0); // Transparent to show CSS gradient
      const starPoints = viewer.current.scene.primitives.add(new Cesium.PointPrimitiveCollection());
      starsRef.current = starPoints; // Store for rotation stabilization
      // 60 颗星星，用斐波那契球面均匀分布在地球周围
      const STAR_COUNT = 60;
      const goldenRatio = (1 + Math.sqrt(5)) / 2;
      for (let i = 0; i < STAR_COUNT; i++) {
        const theta = Math.acos(1 - (2 * (i + 0.5)) / STAR_COUNT);
        const phi = 2 * Math.PI * i / goldenRatio;
        const r = 1e9;
        starPoints.add({
          position: new Cesium.Cartesian3(
            r * Math.sin(theta) * Math.cos(phi),
            r * Math.sin(theta) * Math.sin(phi),
            r * Math.cos(theta)
          ),
          pixelSize: 1.0 + (i % 3) * 0.5,
          color: Cesium.Color.fromAlpha(Cesium.Color.WHITE, 0.6 + (i % 4) * 0.1)
        });
      } // Higher quality tiles

      // User interaction detection: when user touches the globe, notify parent
      const handleUserTouch = () => {
        if (onUserInteract) onUserInteract();
      };
      const canvas = viewer.current.cesiumWidget.canvas;
      canvas.addEventListener('pointerdown', handleUserTouch);
      canvas.addEventListener('wheel', handleUserTouch);

      // 移除默认的Ion影像层（需要token），改用本地地图资源
      viewer.current.imageryLayers.removeAll();

      // 使用初始地图风格
      switchMapStyle(mapStyle);

      // 设置初始相机位置：优先恢复上次视角，否则使用默认视角
        if (savedCameraState.current) {
          viewer.current.camera.setView({
            destination: savedCameraState.current.destination,
            orientation: savedCameraState.current.orientation
          });
          // 恢复后清除保存的状态，避免重复使用
          savedCameraState.current = null;
        } else {
          // 默认视角：飞到能同时看到地球和月球的最佳视角
          viewer.current.camera.setView({
            destination: Cesium.Cartesian3.fromDegrees(114 + 10, 23, 25000000), // 调整到能看到地球和月球的距离
          });
        }

      // 城市点位由独立的 useEffect 根据 cityPointsProp 动态管理

      // 添加月球 - 保持位置持久性
      if (!moonPosRef.current) {
        moonPosRef.current = Cesium.Cartesian3.fromDegrees(114 + 20, 23, MOON_DISTANCE);
      }

      // 使用静态位置与静态材质（而非 CallbackProperty），避免空闲时
      // Cesium 因动态实体持续请求渲染，拖慢界面响应
      const moonEntity = viewer.current.entities.add({
        name: '月球',
        position: moonPosRef.current,
        ellipsoid: {
          radii: new Cesium.Cartesian3(500000, 500000, 500000), // 放大月球半径，更容易看到
          material: Cesium.Color.WHITE,
          outline: false,
        },
        description: '月球 - 异地时光',
        isMoon: true,
      });

      // 添加月球光晕效果 - 内层
      const moonGlowEntity = viewer.current.entities.add({
        name: '月球光晕',
        position: moonPosRef.current,
        ellipsoid: {
          radii: new Cesium.Cartesian3(550000, 550000, 550000), // 内层光晕
          material: new Cesium.Color(1.0, 0.85, 0.4, 0.35),
          outline: false,
        },
        description: '月球光晕',
      });

      // 添加羽化外层光晕
      const moonFeatherGlowEntity = viewer.current.entities.add({
        name: '月球羽化光晕',
        position: moonPosRef.current,
        ellipsoid: {
          radii: new Cesium.Cartesian3(600000, 600000, 600000), // 羽化外层
          material: new Cesium.Color(1.0, 0.9, 0.6, 0.17),
          outline: false,
        },
        description: '月球羽化光晕',
      });

      // 添加最外层羽化
      const moonSoftGlowEntity = viewer.current.entities.add({
        name: '月球软羽化',
        position: moonPosRef.current,
        ellipsoid: {
          radii: new Cesium.Cartesian3(650000, 650000, 650000), // 最外层羽化
          material: new Cesium.Color(1.0, 0.95, 0.8, 0.08),
          outline: false,
        },
        description: '月球软羽化',
      });

      // ========= Global Master Ticker =========
      // This loop runs forever, keeping Moon and Stars moving regardless of stage.
      // Ambient updates are throttled to ~30fps and combined with requestRenderMode
      // so the GPU is not forced to render every animation frame while idle.
      const AMBIENT_FRAME_MS = 1000 / 30;
      let lastAmbientUpdateRef = performance.now();
      const tick = (time) => {
        const dt = (time - lastTickTimeRef.current) / 16.666; // Normalize to 60fps
        lastTickTimeRef.current = time;

        const safeDt = Math.min(dt, 2.0); // Precision guard
        // 20s per rotation calculation: (2 * Math.PI) / (20s * 60fps) ≈ 0.005236
        masterAngleRef.current += EARTH_ROTATION_SPEED * safeDt;

        // Freeze ambient motion entirely when the user is in control (carousel
        // stopped), when the globe is hidden behind the city page, or when the
        // tab is in the background. Cesium still renders instantly on camera
        // changes (drag/click), so the UI stays responsive.
        if (!stageAnimatingRef.current || isCityMode || document.hidden) {
          requestAnimationFrame(tick);
          return;
        }

        // Skip heavy ambient work (moon + stars) when it is not due yet
        const elapsedSinceUpdate = time - lastAmbientUpdateRef;
        if (elapsedSinceUpdate < AMBIENT_FRAME_MS) {
          requestAnimationFrame(tick);
          return;
        }
        lastAmbientUpdateRef = time;

        const earthAngle = masterAngleRef.current;

        // 1. Update Moon (Physical Logic: Space -> ECEF)
        const MOON_ORBIT_INCLINATION = Cesium.Math.toRadians(5.14);
        
        const EARTH_MOON_RATIO = 30;
        const moonOrbitAngle = earthAngle / EARTH_MOON_RATIO;

        const moonX = Math.cos(moonOrbitAngle) * MOON_DISTANCE;
        const moonY = Math.sin(moonOrbitAngle) * MOON_DISTANCE;
        const moonZ_s = moonY * Math.sin(MOON_ORBIT_INCLINATION);
        const moonY_s = moonY * Math.cos(MOON_ORBIT_INCLINATION);
        const spacePos = new Cesium.Cartesian3(moonX, moonY_s, moonZ_s);

        const rotateToEcef = Cesium.Matrix3.fromRotationZ(-earthAngle);
        const ecefPos = Cesium.Matrix3.multiplyByVector(rotateToEcef, spacePos, new Cesium.Cartesian3());

        if (moonPosRef.current) moonPosRef.current = ecefPos;

        // 2. Update Stars (Stabilize in Space)
        if (starsRef.current) {
          const starRotation = Cesium.Matrix3.fromRotationZ(-earthAngle);
          starsRef.current.modelMatrix = Cesium.Matrix4.fromRotationTranslation(starRotation);
        }

        // With requestRenderMode enabled, explicitly request a frame after updating
        if (viewer.current) viewer.current.scene.requestRender();

        requestAnimationFrame(tick);
      };

      // Start ticker with current time to avoid NaN
      tick(performance.now());

      // ========= Label Occlusion Post-Render Manager =========
      // Hides overlapping labels to prevent clutter
      let lastLabelOcclusionRun = 0;
      const resolveLabelOcclusion = () => {
        if (!viewer.current) return;
        const labels = viewer.current.entities.values.filter(e => e.label);
        // 标签很少时无需检测；并且节流到 500ms 一次，避免每帧 O(n²)
        if (labels.length < 10) return;
        const now = performance.now();
        if (now - lastLabelOcclusionRun < 500) return;
        lastLabelOcclusionRun = now;
        const screenCoords = [];

        // Reset visibility first (only for distance Check)
        labels.forEach(e => {
          const pos = e.position.getValue(viewer.current.clock.currentTime);
          if (!pos) return;
          const pixelPos = Cesium.SceneTransforms.worldToWindowCoordinates(viewer.current.scene, pos);
          if (pixelPos) {
            screenCoords.push({ entity: e, x: pixelPos.x, y: pixelPos.y, hidden: false });
          }
        });

        // Simple distance-based occlusion Check (N^2 but fine for ~20 cities)
        const MIN_DIST = 100; // Pixels
        for (let i = 0; i < screenCoords.length; i++) {
          if (screenCoords[i].hidden) continue;
          for (let j = i + 1; j < screenCoords.length; j++) {
            if (screenCoords[j].hidden) continue;
            const dx = screenCoords[i].x - screenCoords[j].x;
            const dy = screenCoords[i].y - screenCoords[j].y;
            const distSq = dx * dx + dy * dy;
            if (distSq < MIN_DIST * MIN_DIST) {
              // Hide the one with lower "priority" (index) or just the later one
              screenCoords[j].hidden = true;
              screenCoords[j].entity.label.show = false;
            }
          }
        }

        // Show the non-hidden ones
        screenCoords.forEach(c => {
          if (!c.hidden) c.entity.label.show = true;
        });
      };
      viewer.current.scene.postRender.addEventListener(resolveLabelOcclusion);

      // 添加点击事件监听器
      const clickHandler = (event) => {

        try {
          const pickedObject = viewer.current.scene.pick(new Cesium.Cartesian2(event.clientX, event.clientY));

          if (Cesium.defined(pickedObject) && Cesium.defined(pickedObject.id)) {
            const entity = pickedObject.id;

            if (entity.pointData) {
              const pointData = entity.pointData;

              onCityClick(pointData.name);
            }
          }
        } catch (error) {
        }
      };

      viewer.current.cesiumWidget.canvas.addEventListener('click', clickHandler);

    } catch (error) {
    }

    // 清理函数
    return () => {
      try {
        if (viewer.current) {
          // Extra cleanup for custom listeners
          if (typeof resolveLabelOcclusion === 'function') {
            viewer.current.scene.postRender.removeEventListener(resolveLabelOcclusion);
          }
          if (canvas) {
            canvas.removeEventListener('pointerdown', handleUserTouch);
            canvas.removeEventListener('wheel', handleUserTouch);
            canvas.removeEventListener('click', clickHandler);
          }
          viewer.current.destroy();
          viewer.current = null;
        }
      } catch (error) {
      }
    };
  }, [goToCity]);

  // === Dynamic Stage Animation System ===

  // Sync stageAnimating ref
  useEffect(() => {
    stageAnimatingRef.current = stageAnimating;
    if (!stageAnimating && stageAnimationRef.current) {
      // Immediately cancel running animation when stageAnimating becomes false
      stageAnimationRef.current();
      stageAnimationRef.current = null;
      // Also cancel any in-progress flyTo
      if (viewer.current) viewer.current.camera.cancelFlight();
    }
  }, [stageAnimating]);

  useEffect(() => {
    if (!viewer.current || activeStage < 0 || !stageAnimating) return;

    // Cleanup previous stage animation
    if (stageAnimationRef.current) {
      stageAnimationRef.current();
      stageAnimationRef.current = null;
    }

    if (activeStage === 0) {
      let cancelled = false;

      // Dynamic flyTo: Predict where the rotation will be after 2s
      // Speed per second: 0.005236 * 60 = 0.31416 rad/s (Perfectly 1 rot / 20s)
      const ROT_SPEED_PER_SEC = EARTH_ROTATION_SPEED * 60;
      const FLY_DURATION = 2;
      const predictedAngle = masterAngleRef.current + (ROT_SPEED_PER_SEC * FLY_DURATION);

      const startLng = 114;
      const startLat = 32;
      const endLng = startLng - (predictedAngle * 180 / Math.PI);
      const startDest = Cesium.Cartesian3.fromDegrees(endLng, startLat, DEFAULT_CAMERA_HEIGHT);

      viewer.current.camera.flyTo({
        destination: startDest,
        orientation: { heading: 0, pitch: -Math.PI / 2, roll: 0 },
        duration: FLY_DURATION,
        complete: () => {
          if (cancelled || !stageAnimatingRef.current) return;

          // Force-sync immediately on arrival to eliminate prediction lag
          const actualAngle = masterAngleRef.current;
          const syncLng = startLng - (actualAngle * 180 / Math.PI);
          viewer.current.camera.setView({
            destination: Cesium.Cartesian3.fromDegrees(syncLng, startLat, DEFAULT_CAMERA_HEIGHT),
            orientation: { heading: 0, pitch: -Math.PI / 2, roll: 0 }
          });

          let lastLoopTime = performance.now();
          let lastFrameTime = performance.now();
          const orbitLoop = (time) => {
            if (cancelled || !viewer.current || !stageAnimatingRef.current) return;
            if (time - lastFrameTime < 1000 / 30) {
              requestAnimationFrame(orbitLoop);
              return;
            }
            lastFrameTime = time;
            const dt = (time - lastLoopTime) / 16.666;
            lastLoopTime = time;

            const earthAngle = masterAngleRef.current;
            const camLngAdjusted = startLng - (earthAngle * 180 / Math.PI);

            viewer.current.camera.setView({
              destination: Cesium.Cartesian3.fromDegrees(camLngAdjusted, startLat, DEFAULT_CAMERA_HEIGHT),
              orientation: { heading: 0, pitch: -Math.PI / 2, roll: 0 }
            });

            requestAnimationFrame(orbitLoop);
          };
          orbitLoop(performance.now());
        }
      });

      stageAnimationRef.current = () => { cancelled = true; };
    }
    else if (activeStage === 1) {
      let angle = 0;
      let cancelled = false;

      // Targeting China (approx 110, 35)
      const startLng = 110;
      const startLat = 15;
      // Aligned with orbit start at angle=0 (lat becomes 15 + cos(0)*5 = 20)
      const flightDest = Cesium.Cartesian3.fromDegrees(startLng, 20, ORBIT_CAMERA_HEIGHT);

      viewer.current.camera.flyTo({
        destination: flightDest,
        orientation: { heading: 0, pitch: -Cesium.Math.toRadians(65), roll: 0 },
        duration: 2,
        complete: () => {
          if (cancelled || !stageAnimatingRef.current) return;

          // Force-sync to match orbitLoop entry (angle=0)
          viewer.current.camera.setView({
            destination: Cesium.Cartesian3.fromDegrees(startLng, 20, ORBIT_CAMERA_HEIGHT),
            orientation: { heading: 0, pitch: -Cesium.Math.toRadians(65), roll: 0 }
          });

          let lastLoopTime = performance.now();
          let lastFrameTime = performance.now();
          const rotateLoop = (time) => {
            if (cancelled || !viewer.current || !stageAnimatingRef.current) return;
            if (time - lastFrameTime < 1000 / 30) {
              requestAnimationFrame(rotateLoop);
              return;
            }
            lastFrameTime = time;
            const dt = (time - lastLoopTime) / 16.666;
            lastLoopTime = time;

            const camLng = startLng + Math.sin(angle) * 10;
            const camLat = startLat + Math.cos(angle) * 5;
            viewer.current.camera.setView({
              destination: Cesium.Cartesian3.fromDegrees(camLng, camLat, ORBIT_CAMERA_HEIGHT),
              orientation: { heading: angle * 0.4, pitch: -Cesium.Math.toRadians(65), roll: 0 }
            });
            angle += 0.006 * Math.min(dt, 2.0); // Faster speed for Stage 1 focus (China Overview)
            requestAnimationFrame(rotateLoop);
          };
          rotateLoop(performance.now());
        }
      });

      stageAnimationRef.current = () => { cancelled = true; };
    }
    else if (activeStage === 2) {
      let cancelled = false;
      const getFurthestCity = (currentCityName) => {
        const availableCityNames = Object.keys(cityPositions).filter(name => name !== currentCityName);
        if (availableCityNames.length === 0) {
          return Object.keys(cityPositions)[0] || null;
        }
        return availableCityNames[Math.floor(Math.random() * availableCityNames.length)];
      };

      const runDroneOrbit = (cityName, cityCoord) => {
        if (cancelled || !viewer.current || !stageAnimatingRef.current || !cityCoord) {
          return;
        }

        const carto = Cesium.Cartographic.fromCartesian(cityCoord);
        const lng = Cesium.Math.toDegrees(carto.longitude);
        const lat = Cesium.Math.toDegrees(carto.latitude);
        const orbitHeight = DRONE_ORBIT_HEIGHT;

        viewer.current.camera.flyTo({
          destination: Cesium.Cartesian3.fromDegrees(lng, lat + 1, orbitHeight),
          orientation: { heading: Math.PI, pitch: Cesium.Math.toRadians(-45), roll: 0 },
          duration: 3,
          complete: () => {
            if (cancelled || !stageAnimatingRef.current) return;

            let orbitAngle = 0;
            let lastLoopTime = performance.now();
            let lastFrameTime = performance.now();
            const startDroneLoop = (time) => {
              if (cancelled || !viewer.current || !stageAnimatingRef.current) return;
              if (time - lastFrameTime < 1000 / 30) {
                requestAnimationFrame(startDroneLoop);
                return;
              }
              lastFrameTime = time;
              const dt = (time - lastLoopTime) / 16.666;
              lastLoopTime = time;

              orbitAngle += 0.005 * Math.min(dt, 2.0);
              const currentHeight = DRONE_ORBIT_HEIGHT - (Math.min(orbitAngle, Math.PI) / Math.PI) * 200000;

              const dLng = lng + Math.sin(orbitAngle) * 2;
              const dLat = lat + Math.cos(orbitAngle) * 1;

              viewer.current.camera.setView({
                destination: Cesium.Cartesian3.fromDegrees(dLng, dLat, currentHeight),
                orientation: {
                  heading: orbitAngle + Math.PI,
                  pitch: Cesium.Math.toRadians(-45),
                  roll: 0
                }
              });

              if (orbitAngle < Math.PI * 2) {
                requestAnimationFrame(startDroneLoop);
              } else {
                // Done with this city, pick furthest next city
                const nextCity = getFurthestCity(cityName);
                setTimeout(() => {
                  if (!cancelled && nextCity) {
                    const nextCoord = cityPositions[nextCity];
                    if (nextCoord) {
                      runDroneOrbit(nextCity, nextCoord);
                    }
                  }
                }, 500);
              }
            };
            startDroneLoop(performance.now());
          }
        });
      };

      // Start with a city that has valid coordinates
      const firstValidCity = Object.keys(cityPositions)[0];
      if (firstValidCity && cityPositions[firstValidCity]) {
        runDroneOrbit(firstValidCity, cityPositions[firstValidCity]);
      } else {
      }
      stageAnimationRef.current = () => { cancelled = true; };
    }

    return () => {
      if (stageAnimationRef.current) {
        stageAnimationRef.current();
        stageAnimationRef.current = null;
      }
    };
  }, [activeStage, stageAnimating]);

  // Camera interaction is always enabled - user can interrupt animations at any time

  // ========= Dynamic City Points from Supabase =========
  useEffect(() => {
    if (!viewer.current || !cityPointsProp || cityPointsProp.length === 0) return;

    // Remove previously added city entities
    cityEntitiesRef.current.forEach(entity => {
      try {
        if (viewer.current && viewer.current.entities.contains(entity)) {
          viewer.current.entities.remove(entity);
        }
      } catch (e) { /* entity may already be removed */ }
    });
    cityEntitiesRef.current = [];

    cityPointsProp.forEach((pt, index) => {
      try {
        const position = Cesium.Cartesian3.fromDegrees(pt.lng, pt.lat, 0);

        const entity = viewer.current.entities.add({
          name: pt.name,
          position: position,
          point: {
            pixelSize: new Cesium.CallbackProperty((time) => {
              const phase = Cesium.JulianDate.secondsDifference(time, viewer.current.clock.currentTime) * 2 * Math.PI / 2;
              return 15 + Math.sin(phase) * 2;
            }, false),
            color: Cesium.Color.WHITE.withAlpha(0.8),
            outlineColor: Cesium.Color.WHITE.withAlpha(0.4),
            outlineWidth: new Cesium.CallbackProperty((time) => {
              const phase = Cesium.JulianDate.secondsDifference(time, viewer.current.clock.currentTime) * 2 * Math.PI / 2;
              return 3 + Math.sin(phase) * 3;
            }, false),
            heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
            scaleByDistance: new Cesium.NearFarScalar(1.5e2, 1.5, 1.5e7, 0.5),
          },
          label: {
            text: pt.name,
            font: 'bold 16px PingFang SC, Microsoft YaHei, Arial, sans-serif',
            fillColor: Cesium.Color.WHITE,
            outlineColor: Cesium.Color.BLACK,
            outlineWidth: 2,
            style: Cesium.LabelStyle.FILL_AND_OUTLINE,
            pixelOffset: new Cesium.Cartesian2(0, -35),
            showBackground: true,
            backgroundColor: Cesium.Color.BLACK.withAlpha(0.7),
            backgroundPadding: new Cesium.Cartesian2(10, 6),
            scaleByDistance: new Cesium.NearFarScalar(1.5e2, 1.2, 1.5e7, 0.6),
            horizontalOrigin: Cesium.HorizontalOrigin.CENTER,
            verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
            scale: new Cesium.CallbackProperty((time) => {
              const phase = Cesium.JulianDate.secondsDifference(time, viewer.current.clock.currentTime) * 2 * Math.PI / 2;
              return 1 + Math.sin(phase) * 0.02;
            }, false),
          },
          description: pt.name,
          pointData: pt,
        });

        cityEntitiesRef.current.push(entity);
      } catch (error) {
      }
    });

  }, [cityPointsProp]);

  // 城市坐标配置（从 cityPointsProp 动态生成）
  const cityPositions = useMemo(() => {
    const positions = {};
    if (cityPointsProp && cityPointsProp.length > 0) {
      cityPointsProp.forEach(pt => {
        positions[pt.name] = Cesium.Cartesian3.fromDegrees(pt.lng, pt.lat, 0);
      });
    }
    return positions;
  }, [cityPointsProp]);

  const onCityClick = (cityName) => {
    // 保存当前相机状态，以便返回地球页时恢复
    if (viewer.current && viewer.current.camera) {
      savedCameraState.current = {
        destination: viewer.current.camera.position.clone(),
        orientation: {
          heading: viewer.current.camera.heading,
          pitch: viewer.current.camera.pitch,
          roll: viewer.current.camera.roll
        }
      };
    }

    // 直接跳转，不显示路径动画
    if (goToCity) goToCity(cityName);
  };

  // 监听地图风格变化（仅在viewer已创建且不是初始化时）
  useEffect(() => {
    if (viewer.current) {
      switchMapStyle(mapStyle);
    }
  }, [mapStyle]);

  return (
    <div ref={cesiumContainer} style={{ width: '100vw', height: '100vh', margin: 0, padding: 0, overflow: 'hidden', position: 'relative' }}>

      {/* 底图切换按钮：本地底图（流畅）/ 高清在线底图（细节多） */}
      <button
        onClick={() => setMapStyle(prev => prev === 'local' ? 'satellite' : 'local')}
        style={{
          position: 'absolute',
          top: '20px',
          left: '20px',
          zIndex: 100,
          background: 'rgba(10, 15, 26, 0.75)',
          color: 'rgba(255, 255, 255, 0.85)',
          border: '1px solid rgba(255, 255, 255, 0.2)',
          borderRadius: '20px',
          padding: '8px 14px',
          fontSize: '13px',
          cursor: 'pointer',
          transition: 'opacity 0.2s',
        }}
        title="本地底图加载快、流畅；高清在线底图细节更多但依赖网络"
      >
        {mapStyle === 'local' ? '🗺 高清底图' : '🗺 本地底图'}
      </button>

    </div>
  );
} 
