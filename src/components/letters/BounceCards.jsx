import React, { useEffect, useRef, Children, isValidElement, cloneElement } from 'react';
import { gsap } from 'gsap';
import './BounceCards.css';

export default function BounceCards({
    className = '',
    children,
    containerWidth = 800,
    containerHeight = 500,
    animationDelay = 0.5,
    animationStagger = 0.06,
    easeType = 'elastic.out(1, 0.8)',
    transformStyles = [
        'rotate(-10deg) translate(-250px)',
        'rotate(-5deg) translate(-125px)',
        'rotate(0deg) translate(0px)',
        'rotate(5deg) translate(125px)',
        'rotate(10deg) translate(250px)'
    ],
    enableHover = true
}) {
    const containerRef = useRef(null);
    const childArr = Children.toArray(children);

    useEffect(() => {
        const ctx = gsap.context(() => {
            gsap.fromTo(
                '.card',
                { scale: 0 },
                {
                    scale: 1,
                    stagger: animationStagger,
                    ease: easeType,
                    delay: animationDelay
                }
            );
        }, containerRef);
        return () => ctx.revert();
    }, [animationStagger, easeType, animationDelay]);

    const getNoRotationTransform = transformStr => {
        const hasRotate = /rotate\([\s\S]*?\)/.test(transformStr);
        if (hasRotate) {
            return transformStr.replace(/rotate\([\s\S]*?\)/, 'rotate(0deg)');
        } else if (transformStr === 'none') {
            return 'rotate(0deg)';
        } else {
            return `${transformStr} rotate(0deg)`;
        }
    };

    const getPushedTransform = (baseTransform, offsetX) => {
        const translateRegex = /translate\(([-0-9.]+)px\)/;
        const match = baseTransform.match(translateRegex);
        if (match) {
            const currentX = parseFloat(match[1]);
            const newX = currentX + offsetX;
            return baseTransform.replace(translateRegex, `translate(${newX}px)`);
        } else {
            return baseTransform === 'none' ? `translate(${offsetX}px)` : `${baseTransform} translate(${offsetX}px)`;
        }
    };

    const pushSiblings = hoveredIdx => {
        if (!enableHover || !containerRef.current) return;

        const q = gsap.utils.selector(containerRef);

        childArr.forEach((_, i) => {
            const target = q(`.card-${i}`);
            gsap.killTweensOf(target);

            const baseTransform = transformStyles[i] || 'none';

            if (i === hoveredIdx) {
                const noRotationTransform = getNoRotationTransform(baseTransform);
                // Snap zIndex instantly
                gsap.set(target, { zIndex: 100 });
                // Bring hovered card slightly forward and straighten it
                gsap.to(target, {
                    transform: noRotationTransform,
                    duration: 0.4,
                    ease: 'back.out(1.4)',
                    overwrite: 'auto'
                });
            } else {
                const offsetX = i < hoveredIdx ? -160 : 160;
                const pushedTransform = getPushedTransform(baseTransform, offsetX);

                const distance = Math.abs(hoveredIdx - i);
                const delay = distance * 0.05;

                // Snap zIndex instantly, delayed if needed (but instant is usually better for cleanup)
                gsap.set(target, { zIndex: childArr.length - distance });

                gsap.to(target, {
                    transform: pushedTransform,
                    duration: 0.4,
                    ease: 'back.out(1.4)',
                    delay,
                    overwrite: 'auto'
                });
            }
        });
    };

    const resetSiblings = () => {
        if (!enableHover || !containerRef.current) return;

        const q = gsap.utils.selector(containerRef);

        childArr.forEach((_, i) => {
            const target = q(`.card-${i}`);
            gsap.killTweensOf(target);
            const baseTransform = transformStyles[i] || 'none';

            // Snap zIndex back to original instantly
            gsap.set(target, { zIndex: childArr.length - i });

            gsap.to(target, {
                transform: baseTransform,
                duration: 0.4,
                ease: 'back.out(1.4)',
                overwrite: 'auto'
            });
        });
    };

    return (
        <div
            className={`bounceCardsContainer ${className}`}
            ref={containerRef}
            style={{
                position: 'relative',
                width: containerWidth,
                height: containerHeight
            }}
        >
            {childArr.map((child, idx) => (
                <div
                    key={idx}
                    className={`card card-${idx}`}
                    style={{
                        transform: transformStyles[idx] ?? 'none',
                        zIndex: childArr.length - idx, // Initial z-index
                        width: 400, // Fixed width for children
                        height: 280 // Fixed height for children
                    }}
                    onMouseEnter={() => pushSiblings(idx)}
                    onMouseLeave={resetSiblings}
                    onClick={(e) => {
                        // Crucial fix: explicitly trigger the child's onClick from the positioned wrapper
                        if (isValidElement(child) && child.props.onClick) {
                            child.props.onClick(e);
                        }
                    }}
                >
                    {isValidElement(child) ? cloneElement(child, { isFront: true }) : child}
                </div>
            ))}
        </div>
    );
}
