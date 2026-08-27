import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

const LetterPaper = ({ letter, onClose }) => {
    const [displayedText, setDisplayedText] = useState('');

    useEffect(() => {
        let index = 0;
        const interval = setInterval(() => {
            index++;
            setDisplayedText((prev) => {
                // If the user already skipped (displayedText is full), don't overwrite
                if (prev.length >= letter.content.length) {
                    clearInterval(interval);
                    return prev;
                }
                return letter.content.slice(0, index);
            });
            if (index >= letter.content.length) clearInterval(interval);
        }, 50);

        return () => clearInterval(interval);
    }, [letter.content]);

    const handleDoubleClick = () => {
        setDisplayedText(letter.content);
    };

    return (
        <motion.div
            className="letter-paper-wrapper"
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 50, scale: 0.9 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            onClick={onClose}
        >
            <div
                className="parchment"
                onClick={(e) => {
                    e.stopPropagation();
                    setDisplayedText(letter.content);
                }}
                title="点击即可跳过打字动画"
            >
                <button className="close-letter-btn" onClick={onClose}>&times;</button>
                <div className="letter-header">
                    <div className="letter-recipient">To. {letter.recipient || '...'}</div>
                </div>
                <div className="letter-body">
                    <pre className="handwriting-text">{displayedText}</pre>
                </div>
                <div className="letter-footer">
                    <div className="letter-sender">From. {letter.sender}</div>
                    <div className="letter-date">{letter.date}</div>
                </div>
            </div>
        </motion.div>
    );
};

export default LetterPaper;
