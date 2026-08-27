import React from 'react';
import { motion } from 'framer-motion';

const LettersIcon = ({ onClick, active, isDarkMode }) => {
    return (
        <motion.div
            className={`letters-icon-wrapper ${active ? 'active' : ''} ${isDarkMode ? 'dark-mode' : ''}`}
            onClick={onClick}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            title="初心慢递"
        >
            <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="envelope-svg"
            >
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                <polyline points="22,6 12,13 2,6" />
            </svg>
            {active && <div className="active-dot" />}
        </motion.div>
    );
};

export default LettersIcon;
