// Animation utilities with reduced motion support

// Check if user prefers reduced motion
export const prefersReducedMotion = (): boolean => {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
};

// Page transition variants
export const pageVariants = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -20 }
};

export const pageTransition = {
  type: 'tween' as const,
  ease: 'easeInOut',
  duration: 0.3
};

// Modal animation variants
export const modalVariants = {
  hidden: { opacity: 0, scale: 0.9 },
  visible: { 
    opacity: 1, 
    scale: 1,
    transition: {
      type: 'spring',
      damping: 25,
      stiffness: 300
    }
  },
  exit: { 
    opacity: 0, 
    scale: 0.9,
    transition: { duration: 0.2 }
  }
};

// Like button animation variants
export const likeVariants = {
  initial: { scale: 1 },
  tap: { scale: 0.9 },
  liked: {
    scale: [1, 1.3, 1],
    transition: { duration: 0.3 }
  }
};

// Post grid item animation variants
export const gridItemVariants = {
  hidden: { opacity: 0, scale: 0.8 },
  visible: (i: number) => ({
    opacity: 1,
    scale: 1,
    transition: {
      delay: i * 0.05,
      duration: 0.3
    }
  })
};

// Get animation config based on user preference
export const getAnimationConfig = (config: any) => {
  if (prefersReducedMotion()) {
    return { duration: 0 };
  }
  return config;
};

// Wrapper for motion components that respects reduced motion
export const getMotionProps = (props: any) => {
  if (prefersReducedMotion()) {
    return {
      initial: false,
      animate: false,
      exit: false,
      transition: { duration: 0 }
    };
  }
  return props;
};
