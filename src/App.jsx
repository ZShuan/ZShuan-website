import React, { useState, useEffect, useCallback } from 'react';
import Story from './pages/Story';
import End from './pages/End';
import CityDetail from './pages/CityDetail';

import Navbar from './components/Navbar';

import PinkAnimationHome from './components/PinkAnimationHome';
import FirstsTimeline from './components/firsts/FirstsTimeline';
import LettersModule from './components/letters/LettersModule';
import LettersIcon from './components/letters/LettersIcon';

export default function App() {
  const [page, setPage] = useState('home');
  const [selectedCity, setSelectedCity] = useState(null);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [activeTab, setActiveTab] = useState('towhere');

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Sync tab state with URL hash for reload persistence
  useEffect(() => {
    // 1. Handle Pathname for direct city links (e.g. /city/珠海)
    const path = decodeURIComponent(window.location.pathname);
    if (path.startsWith('/city/')) {
      const cityName = path.replace('/city/', '');
      if (cityName) {
        setSelectedCity(cityName);
        setPage('city');
      }
    }

    // 2. Handle Hash for tabs
    const handleHashChange = () => {
      const hash = window.location.hash.replace('#', '');
      if (['towhere', 'breaking', 'letters'].includes(hash)) {
        setActiveTab(hash);
      }
    };

    // Initial load
    handleHashChange();

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const setTabWithHash = useCallback((tab) => {
    window.location.hash = tab;
    setActiveTab(tab);
  }, []);

  const handleSetTab = useCallback((tab) => {
    setTabWithHash(tab);
  }, [setTabWithHash]);

  const goTo = useCallback((p) => setPage(p), []);

  const goToCity = useCallback((cityName) => {
    setSelectedCity(cityName);
    setPage('city');
  }, []);

  const goBackToGlobe = useCallback(() => {
    setSelectedCity(null);
    setPage('home');
    handleSetTab('towhere');
  }, [handleSetTab]);

  return (
    <div style={{ width: '100%', height: '100%', margin: 0, padding: 0 }}>
          {/* Render home view if page is home OR city, to keep globe mounted */}
          {(page === 'home' || page === 'city') && (
            <div style={{ display: page === 'city' ? 'none' : 'block', width: '100%', height: '100%' }}>
              <Navbar
                activeTab={activeTab}
                setTab={handleSetTab}
                isMobile={isMobile}
                isDarkMode={['letters'].includes(activeTab)}
              />
              {!isMobile && (
                <LettersIcon
                  onClick={() => handleSetTab('letters')}
                  active={activeTab === 'letters'}
                  isDarkMode={['letters'].includes(activeTab)}
                />
              )}

              <div className="page-content">
                {activeTab === 'towhere' && <PinkAnimationHome goTo={goTo} goToCity={goToCity} isCityMode={page === 'city'} isMobile={isMobile} />}
                {activeTab === 'breaking' && <FirstsTimeline />}
                {activeTab === 'letters' && <LettersModule />}
              </div>
            </div>
          )}

          {page === 'story' && <Story goTo={goTo} />}
          {page === 'end' && <End goTo={goTo} />}

          {/* CityDetail renders on top, Globe continues to exist hidden */}
          {page === 'city' && selectedCity && (
            <div style={{ position: 'absolute', top: 0, left: 0, width: '100vw', height: '100%', zIndex: 9999, background: 'linear-gradient(135deg, #0a0f1a 0%, #0d1525 40%, #111d35 100%)' }}>
              <CityDetail cityName={selectedCity} goBack={goBackToGlobe} />
            </div>
          )}

        </div>
  );
}
