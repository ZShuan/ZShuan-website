import React from 'react';
import '../style.css'; // Ensure we can style it

const Navbar = ({ activeTab, setTab, isMobile }) => {
    const allTabs = [
        { id: 'towhere', label: '一路向哪' },
        { id: 'breaking', label: '初时' },
    ];

    // 桌面端沿用量：顶部导航 2 个页签（信箱走右上角信封图标）
    // 移动端：底部导航 3 个页签，信箱也能直达
    const tabs = isMobile
        ? [
            { id: 'towhere', label: '一路向哪' },
            { id: 'breaking', label: '初时' },
            { id: 'letters', label: '信箱' },
        ]
        : allTabs;

    return (
        <nav className="fixed-navbar">
            <div className="navbar-container">
                {tabs.map((tab) => (
                    <button
                        key={tab.id}
                        className={`nav-tab ${activeTab === tab.id ? 'active' : ''}`}
                        onClick={() => setTab(tab.id)}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>
        </nav>
    );
};

export default Navbar;
