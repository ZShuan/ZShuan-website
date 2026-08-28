import React from 'react';
import CityUploadPanel from './CityUploadPanel';

/**
 * 管理面板：由标题连续点击 5 次触发。
 * 城市图片存储已切换到 Supabase Storage，不再需要 GitHub Token。
 */
export default function AdminTokenManager({ isOpen, onClose, onCityCreated, goToCity }) {
    if (!isOpen) return null;

    return (
        <CityUploadPanel
            onBack={onClose}
            onCityCreated={onCityCreated}
            goToCity={goToCity}
        />
    );
}
