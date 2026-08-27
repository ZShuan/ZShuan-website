import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';

const WriteLetter = ({ onSend, onSaveDraft, onCancel, initialData }) => {
    const [content, setContent] = useState(initialData?.content || '');
    const [sender, setSender] = useState(initialData?.sender || '');
    const [recipient, setRecipient] = useState(initialData?.recipient || '');
    const [date, setDate] = useState(initialData?.date || new Date().toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' }));
    const textAreaRef = useRef(null);
    const [penPos, setPenPos] = useState({ x: 0, y: 0 });

    // Update pen position based on the text area content and cursor
    useEffect(() => {
        if (!textAreaRef.current) return;

        const updatePenPosition = () => {
            const el = textAreaRef.current;
            // Get approximate cursor position. 
            // For a simple cute effect, we can just track the bottom-most / right-most written area or attach to mouse.
            // Easiest is to track the length of the string to estimate rows and cols purely for visual flair.
            const lines = content.split('\n');
            const currentLine = lines.length;
            const currentCol = lines[lines.length - 1].length;

            // Rough estimation of character width and line height
            const charWidth = 10;
            const lineHeight = 30;

            const x = Math.min(currentCol * charWidth + 20, el.clientWidth - 20);
            const y = Math.min(currentLine * lineHeight + 10, el.clientHeight - 20);

            setPenPos({ x, y });
        };

        updatePenPosition();
    }, [content]);

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!content.trim() || !sender.trim()) return;

        onSend({
            id: initialData?.id || Date.now(),
            sender,
            recipient,
            date,
            content,
            draftIndex: initialData?.draftIndex
        });
    };

    const handleSaveDraft = () => {
        onSaveDraft({
            id: initialData?.id || Date.now(),
            sender,
            recipient,
            date,
            content,
            draftIndex: initialData?.draftIndex
        });
    };


    return (
        <motion.div
            className="write-letter-container"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
        >
            <div className="parchment writing-mode">
                <form onSubmit={handleSubmit} className="letter-form">
                    <div className="form-header">
                        <div className="input-group">
                            <span className="input-prefix">To.</span>
                            <input
                                type="text"
                                placeholder="..."
                                value={recipient}
                                onChange={(e) => setRecipient(e.target.value)}
                                className="sender-input"
                                style={{ flex: 1, borderBottom: '1px solid #d7ccc8' }}
                            />
                        </div>
                    </div>

                    <div className="textarea-wrapper">
                        <textarea
                            ref={textAreaRef}
                            value={content}
                            onChange={(e) => setContent(e.target.value)}
                            placeholder="To write..."
                            className="letter-textarea"
                            required
                        ></textarea>

                        {/* The Pen Animation */}
                        <motion.div
                            className="writing-pen"
                            animate={{
                                x: penPos.x,
                                y: penPos.y,
                                rotate: content.length % 2 === 0 ? -15 : -5 // tiny wiggle while typing
                            }}
                            transition={{ type: 'spring', damping: 20, stiffness: 300 }}
                        >
                            ✍️
                        </motion.div>
                    </div>

                    <div className="form-footer">
                        <div className="date-input-container">
                            <div className="input-group">
                                <span className="input-prefix">From.</span>
                                <input
                                    type="text"
                                    placeholder="..."
                                    value={sender}
                                    onChange={(e) => setSender(e.target.value)}
                                    className="sender-input"
                                    required
                                />
                            </div>
                            <input
                                type="text"
                                placeholder="Date"
                                value={date}
                                onChange={(e) => setDate(e.target.value)}
                                className="sender-input"
                                required
                            />
                        </div>

                        <div className="form-actions">
                            <button type="button" className="btn-cancel" onClick={onCancel}>取消</button>
                            <button type="button" className="btn-draft" onClick={handleSaveDraft}>存草稿</button>
                            <button type="submit" className="btn-send">寄出</button>
                        </div>
                    </div>
                </form>
            </div>
        </motion.div>
    );
};

export default WriteLetter;
