/**
 * useWiggle — Replicates the landing page's "wiggle on hover" effect.
 *
 * Animation DNA (from Truus/Navbar, Footer, CursorBubble):
 *   - rotation: N, duration: 0.17, repeat: -1, yoyo: true, ease: 'steps(1)'
 *   - On leave: rotation: 0, duration: 0.3, ease: 'power2.out'
 */

import { useEffect, useRef, useCallback } from 'react';
import { gsap } from 'gsap';

/**
 * @param {number} intensity — degrees of wiggle (default 4, matching landing page logo)
 * @returns {React.RefObject} — attach to the element you want to wiggle
 */
export function useWiggle(intensity = 4) {
  const ref = useRef(null);
  const tweenRef = useRef(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    gsap.set(el, { transformOrigin: 'center center' });

    const onEnter = () => {
      tweenRef.current = gsap.to(el, {
        rotation: intensity,
        duration: 0.17,
        repeat: -1,
        yoyo: true,
        ease: 'steps(1)',
      });
    };

    const onLeave = () => {
      if (tweenRef.current) {
        tweenRef.current.kill();
        gsap.to(el, { rotation: 0, duration: 0.3, ease: 'power2.out' });
      }
    };

    el.addEventListener('mouseenter', onEnter);
    el.addEventListener('mouseleave', onLeave);

    return () => {
      el.removeEventListener('mouseenter', onEnter);
      el.removeEventListener('mouseleave', onLeave);
      if (tweenRef.current) tweenRef.current.kill();
    };
  }, [intensity]);

  return ref;
}

/**
 * useElasticHover — scale bounce on hover (matches ServiceCards hover)
 * Animation DNA: elastic.out(1, 0.5), duration 0.9
 */
export function useElasticHover({ scale = 1.04, duration = 0.6 } = {}) {
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const onEnter = () => {
      gsap.to(el, {
        scale,
        duration,
        ease: 'elastic.out(1, 0.5)',
        overwrite: true,
      });
    };

    const onLeave = () => {
      gsap.to(el, {
        scale: 1,
        duration: duration * 0.7,
        ease: 'elastic.out(1, 0.5)',
        overwrite: true,
      });
    };

    el.addEventListener('mouseenter', onEnter);
    el.addEventListener('mouseleave', onLeave);

    return () => {
      el.removeEventListener('mouseenter', onEnter);
      el.removeEventListener('mouseleave', onLeave);
    };
  }, [scale, duration]);

  return ref;
}

export default useWiggle;
