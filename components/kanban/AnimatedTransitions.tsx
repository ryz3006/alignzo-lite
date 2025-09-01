// =====================================================
// ANIMATED TRANSITIONS AND MICRO-INTERACTIONS
// =====================================================

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence, useAnimation, Variants } from 'framer-motion';

// Animation variants for different components
export const cardAnimations: Variants = {
  hidden: {
    opacity: 0,
    y: 20,
    scale: 0.95
  },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      type: "spring" as const,
      stiffness: 300,
      damping: 24,
      duration: 0.4
    }
  },
  hover: {
    y: -8,
    scale: 1.02,
    boxShadow: "0 20px 40px rgba(0,0,0,0.15)",
    transition: {
      type: "spring" as const,
      stiffness: 400,
      damping: 17
    }
  },
  tap: {
    scale: 0.98,
    transition: {
      duration: 0.1
    }
  },
  drag: {
    scale: 1.05,
    rotate: 2,
    boxShadow: "0 25px 50px rgba(0,0,0,0.2)",
    transition: {
      type: "spring" as const,
      stiffness: 300,
      damping: 20
    }
  }
};

export const columnAnimations: Variants = {
  hidden: {
    opacity: 0,
    x: -30
  },
  visible: (index: number) => ({
    opacity: 1,
    x: 0,
    transition: {
      delay: index * 0.1,
      type: "spring" as const,
      stiffness: 100,
      damping: 15
    }
  }),
  hover: {
    scale: 1.02,
    transition: {
      type: "spring" as const,
      stiffness: 300,
      damping: 30
    }
  }
};

export const staggerContainer: Variants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.2
    }
  }
};

export const slideInFromRight: Variants = {
  hidden: {
    x: "100%",
    opacity: 0
  },
  visible: {
    x: 0,
    opacity: 1,
    transition: {
      type: "spring" as const,
      stiffness: 100,
      damping: 20
    }
  },
  exit: {
    x: "100%",
    opacity: 0,
    transition: {
      duration: 0.3
    }
  }
};

export const fadeInUp: Variants = {
  hidden: {
    y: 60,
    opacity: 0
  },
  visible: {
    y: 0,
    opacity: 1,
    transition: {
      type: "spring" as const,
      stiffness: 100,
      damping: 15
    }
  }
};

export const scaleIn: Variants = {
  hidden: {
    scale: 0,
    opacity: 0
  },
  visible: {
    scale: 1,
    opacity: 1,
    transition: {
      type: "spring" as const,
      stiffness: 200,
      damping: 20
    }
  },
  exit: {
    scale: 0,
    opacity: 0,
    transition: {
      duration: 0.2
    }
  }
};

// Enhanced Task Card with animations
interface AnimatedTaskCardProps {
  children: React.ReactNode;
  index: number;
  isDragging?: boolean;
  isMoving?: boolean;
  onClick?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
}

export const AnimatedTaskCard: React.FC<AnimatedTaskCardProps> = ({
  children,
  index,
  isDragging,
  isMoving,
  onClick,
  onEdit,
  onDelete
}) => {
  const controls = useAnimation();
  
  useEffect(() => {
    if (isMoving) {
      controls.start({
        scale: 0.95,
        opacity: 0.7,
        transition: { duration: 0.2 }
      });
    } else {
      controls.start({
        scale: 1,
        opacity: 1,
        transition: { duration: 0.2 }
      });
    }
  }, [isMoving, controls]);

  return (
    <motion.div
      layout
      layoutId={`task-${index}`}
      initial="hidden"
      animate={isMoving ? controls : "visible"}
      whileHover="hover"
      whileTap="tap"
      variants={cardAnimations}
      custom={index}
      onClick={onClick}
      className="cursor-pointer"
      style={{
        transformOrigin: 'center center'
      }}
    >
      {children}
      
      {/* Loading overlay with animation */}
      <AnimatePresence>
        {isMoving && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-blue-500/10 backdrop-blur-sm rounded-2xl flex items-center justify-center"
          >
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
              className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full"
            />
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

// Enhanced Column with animations
interface AnimatedColumnProps {
  children: React.ReactNode;
  index: number;
  isDragOver?: boolean;
}

export const AnimatedColumn: React.FC<AnimatedColumnProps> = ({
  children,
  index,
  isDragOver
}) => {
  return (
    <motion.div
      layout
      initial="hidden"
      animate="visible"
      whileHover="hover"
      variants={columnAnimations}
      custom={index}
      className={`transition-all duration-300 ${
        isDragOver ? 'ring-2 ring-blue-400 ring-opacity-50' : ''
      }`}
    >
      {children}
    </motion.div>
  );
};

// Floating Action Button with micro-interactions
interface FloatingActionButtonProps {
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  color?: string;
}

export const FloatingActionButton: React.FC<FloatingActionButtonProps> = ({
  onClick,
  icon,
  label,
  color = "blue"
}) => {
  const [isHovered, setIsHovered] = useState(false);
  
  return (
    <motion.button
      whileHover={{ scale: 1.1, y: -2 }}
      whileTap={{ scale: 0.95 }}
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
      onClick={onClick}
      className={`fixed bottom-6 right-6 z-50 bg-gradient-to-r from-${color}-500 to-${color}-600 hover:from-${color}-600 hover:to-${color}-700 text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-200`}
    >
      <div className="flex items-center p-4">
        <motion.div
          animate={{ rotate: isHovered ? 90 : 0 }}
          transition={{ duration: 0.2 }}
        >
          {icon}
        </motion.div>
        <AnimatePresence>
          {isHovered && (
            <motion.span
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: "auto", opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="ml-2 font-medium whitespace-nowrap overflow-hidden"
            >
              {label}
            </motion.span>
          )}
        </AnimatePresence>
      </div>
    </motion.button>
  );
};

// Notification Toast with animation
interface AnimatedToastProps {
  message: string;
  type: 'success' | 'error' | 'info';
  isVisible: boolean;
  onClose: () => void;
}

export const AnimatedToast: React.FC<AnimatedToastProps> = ({
  message,
  type,
  isVisible,
  onClose
}) => {
  useEffect(() => {
    if (isVisible) {
      const timer = setTimeout(onClose, 4000);
      return () => clearTimeout(timer);
    }
  }, [isVisible, onClose]);

  const getToastColor = () => {
    switch (type) {
      case 'success': return 'from-emerald-500 to-green-600';
      case 'error': return 'from-red-500 to-pink-600';
      default: return 'from-blue-500 to-indigo-600';
    }
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: -100, scale: 0.3 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -100, scale: 0.3 }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
          className={`fixed top-6 right-6 z-50 bg-gradient-to-r ${getToastColor()} text-white px-6 py-4 rounded-2xl shadow-2xl backdrop-blur-sm`}
        >
          <div className="flex items-center space-x-3">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: "spring", stiffness: 500 }}
              className="w-2 h-2 bg-white rounded-full"
            />
            <span className="font-medium">{message}</span>
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={onClose}
              className="ml-4 text-white/80 hover:text-white transition-colors"
            >
              ×
            </motion.button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

// Loading Spinner with animation
export const AnimatedLoadingSpinner: React.FC = () => {
  return (
    <div className="flex items-center justify-center">
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
        className="relative w-12 h-12"
      >
        <div className="absolute inset-0 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 opacity-20"></div>
        <div className="absolute inset-2 rounded-full bg-white dark:bg-slate-900"></div>
        <motion.div
          animate={{ scale: [0.8, 1.2, 0.8] }}
          transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
          className="absolute inset-4 rounded-full bg-gradient-to-r from-blue-500 to-purple-600"
        ></motion.div>
      </motion.div>
    </div>
  );
};

// Page transition wrapper
interface PageTransitionProps {
  children: React.ReactNode;
}

export const PageTransition: React.FC<PageTransitionProps> = ({ children }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.3, ease: "easeInOut" }}
    >
      {children}
    </motion.div>
  );
};

export default {
  AnimatedTaskCard,
  AnimatedColumn,
  FloatingActionButton,
  AnimatedToast,
  AnimatedLoadingSpinner,
  PageTransition,
  cardAnimations,
  columnAnimations,
  staggerContainer,
  slideInFromRight,
  fadeInUp,
  scaleIn
};
