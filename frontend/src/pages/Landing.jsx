import React, { useState, useEffect } from 'react';
import gsap from 'gsap';

import SvgSymbols from '../components/Truus/SvgSymbols';
import Navbar from '../components/Truus/Navbar';
import VimeoHero from '../components/Truus/VimeoHero';
import ServiceCards from '../components/Truus/ServiceCards';
import MotionCards from '../components/Truus/MotionCards';
import Showreel from '../components/Truus/Showreel';
import DoubleMarquee from '../components/Truus/DoubleMarquee';
import Footer from '../components/Truus/Footer';
import TransitionScribble from '../components/Truus/TransitionScribble';
import CursorBubble from '../components/Truus/CursorBubble';
import SmoothScroll from '../components/Truus/SmoothScroll';
import HorizontalWords from '../components/Truus/HorizontalWords';

function LoadingScreen({ onComplete }) {
    const [counter, setCounter] = useState(0);

    useEffect(() => {
        let t;
        const target = 100;
        let p = 0;
        const tick = () => {
            p += Math.random() * 3 + 1;
            if (p >= target) {
                setCounter(100);
                gsap.to('.loading-screen-wrap', {
                    yPercent: -100,
                    duration: 1.2,
                    ease: 'power4.inOut',
                    delay: 0.2,
                    onComplete
                });
            } else {
                setCounter(Math.floor(p));
                t = requestAnimationFrame(tick);
            }
        };
        t = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(t);
    }, [onComplete]);

    return (
        <div className="loading-screen-wrap" style={{ 
            position: 'fixed', inset: 0, zIndex: 99999, 
            backgroundColor: 'var(--bg-primary)', color: 'var(--color-text)', 
            display: 'flex', flexDirection: 'column', 
            justifyContent: 'center', alignItems: 'center' 
        }}>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 12 }}>
                <span style={{ fontSize: '10vw', fontWeight: 900, lineHeight: 0.8, fontFamily: '"Space Grotesk", sans-serif', color: '#2A7D14' }}>
                    {counter}
                </span>
                <span style={{ fontSize: '3vw', fontWeight: 600, color: '#f5f5f5', marginBottom: '1vw' }}>%</span>
            </div>
            <div style={{ marginTop: '30px', fontSize: '1.2rem', color: '#888', letterSpacing: '0.2em', textTransform: 'uppercase' }}>
                Initializing Inceptron
            </div>
        </div>
    );
}

export default function Landing() {
    const [isLoading, setIsLoading] = useState(true);

    return (
        <div className="bg-bg text-text-primary transition-colors" style={{ display: 'contents' }}>
            {isLoading && <LoadingScreen onComplete={() => setIsLoading(false)} />}
            
            <SvgSymbols />
            <SmoothScroll />
            <CursorBubble />
            
            <header className="main-header">
                <Navbar />
                <VimeoHero />
            </header>
            
            <HorizontalWords />
            
            <main>
                <div className="content-section motion-cards-wrapper">
                    <MotionCards />
                </div>
                <Showreel />
                <div className="content-section service-cards-wrapper">
                    <ServiceCards />
                </div>
            </main>
            
            <section className="Double-marquee">
                <DoubleMarquee />
            </section>
            
            <footer className="main-footer">
                <Footer />
            </footer>
            
            <TransitionScribble />
        </div>
    );
}
