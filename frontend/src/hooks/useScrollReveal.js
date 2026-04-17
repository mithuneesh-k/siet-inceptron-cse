/**
 * useScrollReveal — Shared scroll-triggered entrance animation hook.
 * Replicates the exact GSAP physics from the cinematic landing page
 * so every portal page feels cohesive.
 *
 * Animation DNA (from MotionCards / HorizontalWords / Footer):
 *   - Elastic pop:  elastic.out(1, 0.4)  / duration 1.7s
 *   - Elastic bounce: elastic.out(1.2, 1)
 *   - Card fan: elastic.out(1, 0.5) / 0.9s
 *   - Scroll trigger: start "top 70%", toggleActions "play none none reverse"
 *   - Stagger: 0.06–0.12s
 */

import { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

/**
 * Animate child elements of a container when they scroll into view.
 *
 * @param {Object} options
 * @param {string}  options.childSelector  - CSS selector for children to animate (default: '[data-reveal]')
 * @param {string}  options.preset         - 'fadeUp' | 'popIn' | 'slideLeft' | 'slideRight'
 * @param {number}  options.stagger        - Stagger delay between children (default: 0.08)
 * @param {string}  options.start          - ScrollTrigger start position (default: 'top 78%')
 * @param {boolean} options.once           - Only play once, don't reverse (default: true)
 */
export function useScrollReveal({
  childSelector = '[data-reveal]',
  preset = 'fadeUp',
  stagger = 0.08,
  start = 'top 78%',
  once = true,
} = {}) {
  const containerRef = useRef(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const children = container.querySelectorAll(childSelector);
    if (!children.length) return;

    // Define preset from/to values matching landing page physics
    const presets = {
      fadeUp: {
        from: { opacity: 0, y: 40, scale: 0.97 },
        to: { opacity: 1, y: 0, scale: 1, duration: 1.0, ease: 'elastic.out(1, 0.55)' },
      },
      popIn: {
        from: { opacity: 0, scale: 0, rotation: -15 },
        to: { opacity: 1, scale: 1, rotation: 0, duration: 1.7, ease: 'elastic.out(1, 0.4)' },
      },
      slideLeft: {
        from: { opacity: 0, x: 60 },
        to: { opacity: 1, x: 0, duration: 1.0, ease: 'elastic.out(1, 0.6)' },
      },
      slideRight: {
        from: { opacity: 0, x: -60 },
        to: { opacity: 1, x: 0, duration: 1.0, ease: 'elastic.out(1, 0.6)' },
      },
    };

    const p = presets[preset] || presets.fadeUp;

    gsap.set(children, p.from);

    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: container,
        start,
        toggleActions: once ? 'play none none none' : 'play none none reverse',
      },
    });

    tl.to(children, {
      ...p.to,
      stagger,
    });

    return () => {
      tl.scrollTrigger?.kill();
      tl.kill();
    };
  }, [childSelector, preset, stagger, start, once]);

  return containerRef;
}

/**
 * Single-element scroll reveal — animates one element when it enters viewport.
 */
export function useElementReveal({
  preset = 'fadeUp',
  start = 'top 80%',
  delay = 0,
  once = true,
} = {}) {
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const presets = {
      fadeUp: {
        from: { opacity: 0, y: 30 },
        to: { opacity: 1, y: 0, duration: 0.9, ease: 'elastic.out(1, 0.55)', delay },
      },
      popIn: {
        from: { opacity: 0, scale: 0, rotation: -20 },
        to: { opacity: 1, scale: 1, rotation: 0, duration: 1.7, ease: 'elastic.out(1, 0.4)', delay },
      },
    };

    const p = presets[preset] || presets.fadeUp;
    gsap.set(el, p.from);

    const st = ScrollTrigger.create({
      trigger: el,
      start,
      toggleActions: once ? 'play none none none' : 'play none none reverse',
      onEnter: () => gsap.to(el, p.to),
      onEnterBack: once ? undefined : () => gsap.to(el, p.to),
      onLeave: once ? undefined : () => gsap.to(el, p.from),
      onLeaveBack: once ? undefined : () => gsap.to(el, { ...p.from, duration: 0.3, ease: 'sine.inOut' }),
    });

    return () => st.kill();
  }, [preset, start, delay, once]);

  return ref;
}

export default useScrollReveal;
