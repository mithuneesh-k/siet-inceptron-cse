import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { IoMoon, IoMoonOutline, IoSunny, IoSunnyOutline } from 'react-icons/io5';
import { useTheme } from '../../contexts/ThemeContext';

export function SwitchMode({
  width = 68,
  height = 34,
  darkColor = '#090d14',
  lightColor = '#ffffff',
  knobDarkColor = '#166534',
  knobLightColor = '#84cc16',
  borderDarkColor = 'rgba(132, 204, 22, 0.4)',
  borderLightColor = '#d7e2d3',
}) {
  const [mounted, setMounted] = useState(false);
  const { theme, toggleTheme } = useTheme();

  useEffect(() => {
    requestAnimationFrame(() => setMounted(true));
  }, []);

  if (!mounted) {
    return <div style={{ width, height, borderRadius: '9999px', border: '2px solid transparent' }} />;
  }

  const isDark = theme === 'dark';
  const iconSize = height * 0.45;

  return (
    <motion.button
      type="button"
      onClick={toggleTheme}
      className="switch-mode-btn"
      style={{
        position: 'relative',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderRadius: '9999px',
        border: '2px solid',
        borderColor: isDark ? borderDarkColor : borderLightColor,
        width,
        height,
        cursor: 'pointer',
        overflow: 'hidden',
        background: 'transparent',
        padding: 0,
        outline: 'none',
        flexShrink: 0,
      }}
      aria-label="Toggle Light and Dark Mode"
    >
      {/* TRACK BACKGROUND */}
      <motion.div
        style={{
          position: 'absolute',
          inset: 0,
          borderRadius: '9999px',
        }}
        animate={{ backgroundColor: isDark ? darkColor : lightColor }}
        transition={{ duration: 0.4 }}
      />

      {/* SLIDING KNOB */}
      <motion.div
        layout
        transition={{ type: 'spring', stiffness: 260, damping: 20 }}
        style={{
          position: 'absolute',
          borderRadius: '9999px',
          border: '2px solid',
          zIndex: 30,
          width: height - 4,
          height: height - 4,
          right: isDark ? 2 : undefined,
          left: isDark ? undefined : 2,
          backgroundColor: isDark ? knobDarkColor : knobLightColor,
          borderColor: isDark ? borderDarkColor : borderLightColor,
        }}
      />

      {/* SUN ICON */}
      <motion.div
        style={{
          position: 'relative',
          zIndex: 30,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: height,
          height,
        }}
        animate={{ rotate: isDark ? 45 : 0 }}
        transition={{ stiffness: 20 }}
      >
        {isDark ? (
          <IoSunnyOutline
            color="#8A8A8F"
            fill="#8A8A8F"
            stroke="#8A8A8F"
            style={{ width: iconSize, height: iconSize }}
          />
        ) : (
          <IoSunny
            color="#ffffff"
            fill="#ffffff"
            style={{ width: iconSize, height: iconSize }}
          />
        )}
      </motion.div>

      {/* MOON ICON */}
      <motion.div
        style={{
          position: 'relative',
          zIndex: 30,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: height,
          height,
        }}
        animate={{ rotate: isDark ? 0 : 15 }}
        transition={{ stiffness: 20, damping: 14 }}
      >
        {isDark ? (
          <IoMoon
            color="#ffffff"
            fill="#ffffff"
            style={{ width: iconSize, height: iconSize }}
          />
        ) : (
          <IoMoonOutline
            color="#6b7280"
            fill="#6b7280"
            stroke="#6b7280"
            style={{ width: iconSize, height: iconSize }}
          />
        )}
      </motion.div>
    </motion.button>
  );
}

export default SwitchMode;
