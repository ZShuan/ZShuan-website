import React, { useState, useRef, useEffect } from 'react';
import { motion, useAnimation } from 'framer-motion';
import { gsap } from 'gsap';

const Envelope = ({ sender, date, onClick, isFront, stampType }) => {
    const [isAnimating, setIsAnimating] = useState(false);
    const flapControls = useAnimation();
    const letterControls = useAnimation();
    const trapRef = useRef(null);

    // Using a ref to bind the click event natively to bypass React's synthetic 
    // event dropping under complex 3D transforms (WebKit bug).
    useEffect(() => {
        const el = trapRef.current;
        if (!el) return;

        const nativeClickHandler = (e) => {
            // Prevent duplicate handling if React did manage to catch it
            e.preventDefault();
            e.stopPropagation();
            handleClick(e);
        };

        // Passive false is important to ensure preventDefault works
        el.addEventListener('click', nativeClickHandler, { passive: false });

        // Also listen to touchstart/touchend as fallback for mobile hit testing
        el.addEventListener('touchend', (e) => {
            // Only trigger click if it was a tap, not a long scroll
            nativeClickHandler(e);
        }, { passive: false });

        return () => {
            el.removeEventListener('click', nativeClickHandler);
            el.removeEventListener('touchend', nativeClickHandler);
        };
    }, [isAnimating]);

    const handleClick = async (e) => {
        if (e && e.stopPropagation) e.stopPropagation();

        if (isAnimating) {
            console.log("DEBUG: Ignored click because already animating");
            return;
        }

        console.log("DEBUG: Foreground Envelope Clicked!");
        setIsAnimating(true);

        try {
            // 1. Lift the envelope with deep shadow using GSAP directly on the DOM node
            const rootEl = trapRef.current?.parentElement;
            if (rootEl) {
                await gsap.to(rootEl, {
                    scale: 1.05,
                    y: -40,
                    rotateX: -5,
                    boxShadow: "0 60px 120px rgba(0,0,0,0.4)",
                    duration: 0.5,
                    ease: "power2.out"
                });
            }

            // 2. Open the flap
            await flapControls.start({
                rotateX: 180,
                zIndex: 10,
                transition: { duration: 0.7, ease: "easeInOut" }
            });

            // 3. Extract the inner letter
            await letterControls.start({
                y: -350,
                scale: 1.05,
                opacity: 1,
                zIndex: 50,
                transition: { duration: 1.0, ease: [0.34, 1.56, 0.64, 1] }
            });

            // 4. Brief pause then transition
            await new Promise(r => setTimeout(r, 300));
            onClick();
        } catch (err) {
            console.error("Animation error:", err);
        } finally {
            setIsAnimating(false);
        }
    };

    return (
        <div
            className="envelope-container"
            style={{
                width: '100%',
                height: '100%',
                cursor: 'pointer',
                borderRadius: '16px',
                background: 'linear-gradient(135deg, #fdfaf3 0%, #f7f3e8 100%)',
                boxShadow: "0 15px 40px rgba(0,0,0,0.15)",
                transformStyle: 'preserve-3d',
                perspective: '2000px',
                pointerEvents: 'auto',
                touchAction: 'none' // Important for reliable onTap on some devices
            }}
        >
            {/* Front of Envelope */}
            <div className="envelope-front">
                <div className="envelope-content">
                    <div className="stamp-area">
                        <div className={`stamp stamp-v${stampType || 1}`}></div>
                        <div className="postmark"></div>
                    </div>
                    <div className="sender-info">
                        <p className="sender-name">{sender}</p>
                        <p className="sender-date">{date}</p>
                    </div>
                    <div className="decorative-lines">
                        <div className="line line-1"></div>
                        <div className="line line-2"></div>
                    </div>
                </div>
            </div>

            {/* Back of Envelope */}
            <div className="envelope-back">
                <div className="envelope-back-body"></div>

                {/* Flap */}
                <motion.div
                    className="envelope-flap"
                    initial={{ rotateX: 0, zIndex: 30 }}
                    animate={flapControls}
                    style={{ originY: 0 }}
                >
                    <div className="flap-triangle"></div>
                    <div className="flap-shadow"></div>
                </motion.div>

                {/* The Letter inside */}
                <motion.div
                    className="envelope-pop-letter"
                    initial={{ y: 0, opacity: 0 }}
                    animate={letterControls}
                >
                    <div className="tiny-paper"></div>
                </motion.div>
            </div>

            {/* ULTIMATE CLICK TRAP: Native DOM listener bound via useRef */}
            <div
                ref={trapRef}
                className="ultimate-click-trap"
                style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    zIndex: 9999,
                    cursor: 'pointer',
                    display: 'block'
                }}
            />
        </div>
    );
};

export default Envelope;
