import React, { useState, useEffect } from 'react';
import BounceCards from './BounceCards';
import Envelope from './Envelope';
import LetterPaper from './LetterPaper';
import WriteLetter from './WriteLetter';
import { AnimatePresence, motion } from 'framer-motion';
import { supabase } from '../../lib/supabaseClient';
import './letters.css';



const LettersModule = () => {
    const [letters, setLetters] = useState([]);
    const [loading, setLoading] = useState(true);
    const [viewState, setViewState] = useState('stack'); // 'stack', 'reading', 'writing'
    const [selectedLetter, setSelectedLetter] = useState(null);
    const [drafts, setDrafts] = useState([]);
    const [currentEditData, setCurrentEditData] = useState(null);

    // Fetch letters from Supabase on mount
    useEffect(() => {
        fetchLetters();
    }, []);

    const fetchLetters = async () => {
        setLoading(true);
        try {
            // 1. Fetch published letters
            const { data: lettersData, error: lettersError } = await supabase
                .from('letters')
                .select('*')
                .eq('is_draft', false)
                .order('created_at', { ascending: false });

            if (lettersError) throw lettersError;
            setLetters(lettersData || []);

            // 2. Fetch drafts
            const { data: draftData, error: draftError } = await supabase
                .from('letters')
                .select('*')
                .eq('is_draft', true)
                .order('created_at', { ascending: false });

            if (draftError) throw draftError;
            setDrafts(draftData || []);

        } catch (error) {
            console.error('Error fetching letters/drafts:', error.message);
        } finally {
            setLoading(false);
        }
    };



    const handleOpenLetter = (letter) => {
        setSelectedLetter(letter);
        setViewState('reading');
    };

    const handleCloseLetter = () => {
        setViewState('stack');
        setSelectedLetter(null);
    };

    const handleOpenWrite = () => {
        setCurrentEditData(null); // New blank letter
        setViewState('writing');
    };

    const handleOpenDraft = (draft) => {
        setCurrentEditData(draft);
        setViewState('writing');
    };

    const handleSaveDraft = async (draftData) => {
        try {
            if (draftData.id && typeof draftData.id === 'string' && draftData.id.length > 15) {
                // Update existing persistent draft
                const { error } = await supabase
                    .from('letters')
                    .update({
                        sender: draftData.sender,
                        recipient: draftData.recipient,
                        date: draftData.date,
                        content: draftData.content,
                        is_draft: true
                    })
                    .eq('id', draftData.id);

                if (error) throw error;
            } else {
                // Add new persistent draft
                if (drafts.length >= 4) {
                    alert('草稿箱已满，请先清理一些草稿。');
                    return;
                }
                const { error } = await supabase
                    .from('letters')
                    .insert([
                        {
                            sender: draftData.sender,
                            recipient: draftData.recipient,
                            date: draftData.date,
                            content: draftData.content,
                            is_draft: true
                        }
                    ]);

                if (error) throw error;
            }

            await fetchLetters(); // Refresh both
            setViewState('stack');
        } catch (error) {
            console.error('Error saving draft:', error);
            alert(`保存草稿失败: ${error.message}`);
        }
    };

    const handleDeleteDraft = async (e, draftId) => {
        e.stopPropagation();
        if (!window.confirm('确定要删除这张稿纸吗？')) return;

        try {
            const { error } = await supabase
                .from('letters')
                .delete()
                .eq('id', draftId);

            if (error) throw error;
            await fetchLetters();
        } catch (error) {
            console.error('Error deleting draft:', error);
        }
    };

    const handleSendLetter = async (newLetterData) => {
        try {
            if (newLetterData.id && typeof newLetterData.id === 'string' && newLetterData.id.length > 15) {
                // It was a persistent draft, update it to published
                const { error } = await supabase
                    .from('letters')
                    .update({
                        sender: newLetterData.sender,
                        recipient: newLetterData.recipient,
                        date: newLetterData.date,
                        content: newLetterData.content,
                        is_draft: false
                    })
                    .eq('id', newLetterData.id);

                if (error) throw error;
            } else {
                // It's a new letter
                const { error } = await supabase
                    .from('letters')
                    .insert([
                        {
                            sender: newLetterData.sender,
                            recipient: newLetterData.recipient,
                            date: newLetterData.date,
                            content: newLetterData.content,
                            is_draft: false
                        }
                    ]);

                if (error) throw error;
            }

            // 2. Refresh local state
            await fetchLetters();
            setViewState('stack');
        } catch (error) {
            console.error('Error sending letter:', error);
            alert(`发送失败: ${error.message || '请检查网络或数据库配置'}`);
        }
    };

    return (
        <div className="letters-module-container">
            {loading && (
                <div className="loading-overlay">
                    <div className="loader"></div>
                    <p>正在载入时光信箱...</p>
                </div>
            )}

            <div className="letters-main-area">
                <AnimatePresence mode="wait">
                    {viewState === 'stack' && (
                        <motion.div
                            key="stack"
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 20 }}
                            className="stack-wrapper" style={{ width: '100%', height: '100%' }}
                        >
                            <BounceCards>
                                {letters.map((letter) => (
                                    <Envelope
                                        key={letter.id}
                                        sender={letter.sender}
                                        date={letter.date}
                                        stampType={(String(letter.id || '').charCodeAt(0) || 0) % 6 + 1}
                                        onClick={() => handleOpenLetter(letter)}
                                    />
                                ))}
                            </BounceCards>
                        </motion.div>
                    )}

                    {viewState === 'reading' && selectedLetter && (
                        <LetterPaper
                            key="reading"
                            letter={selectedLetter}
                            onClose={handleCloseLetter}
                        />
                    )}

                    {viewState === 'writing' && (
                        <WriteLetter
                            key="writing"
                            initialData={currentEditData}
                            onSend={handleSendLetter}
                            onSaveDraft={handleSaveDraft}
                            onCancel={() => setViewState('stack')}
                        />
                    )}
                </AnimatePresence>
            </div>

            {letters.length === 0 && viewState === 'stack' && (
                <div className="empty-state">
                    <p>No more letters left. Why not write one?</p>
                </div>
            )}

            {/* Drafts Tray */}
            {viewState === 'stack' && drafts.length > 0 && (
                <div className="drafts-tray">
                    {drafts.map((draft) => (
                        <div
                            key={draft.id}
                            className="draft-item"
                            onClick={() => handleOpenDraft(draft)}
                            title="点击继续编辑草稿"
                        >
                            <button
                                className="delete-draft-btn"
                                onClick={(e) => handleDeleteDraft(e, draft.id)}
                            >
                                &times;
                            </button>
                            <div className="draft-sender-preview">{draft.sender || '无署名'}</div>
                            <div className="draft-lines-preview"></div>
                        </div>
                    ))}
                </div>
            )}

            {/* Corner illustration - Click to write */}
            <motion.div
                className="corner-pen-illustration clickable"
                onClick={handleOpenWrite}
                initial={{ x: 100, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: 0.5, duration: 0.8 }}
                style={{ cursor: 'pointer', pointerEvents: 'auto' }}
            >
                <svg width="200" height="200" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M13.5 6.5L17.5 10.5" stroke="#8d6e63" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M4 20L5 15L16 4C16.5304 3.46957 17.25 3.17157 18 3.17157C18.75 3.17157 19.4696 3.46957 20 4C20.5304 4.53043 20.8284 5.25 20.8284 6C20.8284 6.75 20.5304 7.46957 20 8L9 19L4 20Z" stroke="#8d6e63" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M4 20H8" stroke="#8d6e63" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M12 20H20" stroke="#8d6e63" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <div className="pen-label">Write</div>
            </motion.div>
        </div>
    );
};

export default LettersModule;
