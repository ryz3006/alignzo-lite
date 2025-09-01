// =====================================================
// SIMPLE CSS-BASED ANIMATIONS (NO EXTERNAL DEPENDENCIES)
// =====================================================

import React, { useState, useEffect } from 'react';

// CSS-based animation classes
export const animationClasses = {
  // Card animations
  cardEnter: 'opacity-0 translate-y-5 scale-95',
  cardEnterActive: 'opacity-100 translate-y-0 scale-100 transition-all duration-300 ease-out',
  cardHover: 'hover:-translate-y-2 hover:scale-105 hover:shadow-xl transition-all duration-200',
  cardTap: 'active:scale-98 transition-all duration-100',
  
  // Column animations
  columnEnter: 'opacity-0 -translate-x-8',
  columnEnterActive: 'opacity-100 translate-x-0 transition-all duration-500 ease-out',
  columnHover: 'hover:scale-102 transition-all duration-200',
  
  // Fade animations
  fadeIn: 'opacity-0',
  fadeInActive: 'opacity-100 transition-opacity duration-300',
  fadeOut: 'opacity-100',
  fadeOutActive: 'opacity-0 transition-opacity duration-300',
  
  // Slide animations
  slideUp: 'translate-y-full',
  slideUpActive: 'translate-y-0 transition-transform duration-300 ease-out',
  slideDown: '-translate-y-full',
  slideDownActive: 'translate-y-0 transition-transform duration-300 ease-out',
  
  // Scale animations
  scaleIn: 'scale-0',
  scaleInActive: 'scale-100 transition-transform duration-200 ease-out',
  scaleOut: 'scale-100',
  scaleOutActive: 'scale-0 transition-transform duration-200 ease-in',
  
  // Loading animations
  spin: 'animate-spin',
  pulse: 'animate-pulse',
  bounce: 'animate-bounce',
  
  // Drag states
  dragging: 'scale-105 rotate-2 shadow-2xl transition-all duration-200',
  dragOver: 'ring-2 ring-blue-400 ring-opacity-50 bg-blue-50 dark:bg-blue-900/20 transition-all duration-200'
};

// Staggered animation hook
export const useStaggeredAnimation = (itemCount: number, delay: number = 100) => {
  const [visibleItems, setVisibleItems] = useState<number>(0);

  useEffect(() => {
    if (visibleItems < itemCount) {
      const timer = setTimeout(() => {
        setVisibleItems(prev => prev + 1);
      }, delay);
      return () => clearTimeout(timer);
    }
  }, [visibleItems, itemCount, delay]);

  return (index: number) => index < visibleItems;
};

// Simple animated wrapper components
interface AnimatedCardProps {
  children: React.ReactNode;
  index: number;
  isDragging?: boolean;
  isMoving?: boolean;
  onClick?: () => void;
  className?: string;
}

export const AnimatedCard: React.FC<AnimatedCardProps> = ({
  children,
  index,
  isDragging,
  isMoving,
  onClick,
  className = ''
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), index * 100);
    return () => clearTimeout(timer);
  }, [index]);

  const cardClasses = `
    ${isVisible ? animationClasses.cardEnterActive : animationClasses.cardEnter}
    ${isDragging ? animationClasses.dragging : ''}
    ${animationClasses.cardHover}
    ${isMoving ? 'opacity-60 pointer-events-none' : ''}
    cursor-pointer
    ${className}
  `;

  return (
    <div
      className={cardClasses}
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        transitionDelay: `${index * 50}ms`
      }}
    >
      {children}
      
      {/* Loading overlay */}
      {isMoving && (
        <div className="absolute inset-0 bg-blue-500/10 backdrop-blur-sm rounded-2xl flex items-center justify-center z-10">
          <div className="flex items-center space-x-3">
            <div className={`w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full ${animationClasses.spin}`} />
            <span className="text-sm font-medium text-blue-700 dark:text-blue-300">Moving...</span>
          </div>
        </div>
      )}
    </div>
  );
};

interface AnimatedColumnProps {
  children: React.ReactNode;
  index: number;
  isDragOver?: boolean;
  className?: string;
}

export const AnimatedColumn: React.FC<AnimatedColumnProps> = ({
  children,
  index,
  isDragOver,
  className = ''
}) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), index * 150);
    return () => clearTimeout(timer);
  }, [index]);

  const columnClasses = `
    ${isVisible ? animationClasses.columnEnterActive : animationClasses.columnEnter}
    ${isDragOver ? animationClasses.dragOver : ''}
    ${animationClasses.columnHover}
    ${className}
  `;

  return (
    <div 
      className={columnClasses}
      style={{
        transitionDelay: `${index * 100}ms`
      }}
    >
      {children}
    </div>
  );
};

// Toast notification component
interface SimpleToastProps {
  message: string;
  type: 'success' | 'error' | 'info';
  isVisible: boolean;
  onClose: () => void;
}

export const SimpleToast: React.FC<SimpleToastProps> = ({
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
      case 'success': return 'bg-gradient-to-r from-emerald-500 to-green-600';
      case 'error': return 'bg-gradient-to-r from-red-500 to-pink-600';
      default: return 'bg-gradient-to-r from-blue-500 to-indigo-600';
    }
  };

  if (!isVisible) return null;

  return (
    <div className={`
      fixed top-6 right-6 z-50 
      ${getToastColor()} 
      text-white px-6 py-4 rounded-2xl shadow-2xl backdrop-blur-sm
      ${isVisible ? animationClasses.slideDownActive : animationClasses.slideDown}
      transform-gpu
    `}>
      <div className="flex items-center space-x-3">
        <div className={`w-2 h-2 bg-white rounded-full ${animationClasses.scaleInActive}`} />
        <span className="font-medium">{message}</span>
        <button
          onClick={onClose}
          className="ml-4 text-white/80 hover:text-white transition-colors hover:scale-110 transform"
        >
          ×
        </button>
      </div>
    </div>
  );
};

// Loading spinner component
export const SimpleLoadingSpinner: React.FC<{ size?: 'sm' | 'md' | 'lg' }> = ({ 
  size = 'md' 
}) => {
  const sizeClasses = {
    sm: 'w-6 h-6',
    md: 'w-8 h-8',
    lg: 'w-12 h-12'
  };

  return (
    <div className="flex items-center justify-center">
      <div className={`${sizeClasses[size]} relative`}>
        <div className="absolute inset-0 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 opacity-20"></div>
        <div className="absolute inset-2 rounded-full bg-white dark:bg-slate-900"></div>
        <div className={`absolute inset-3 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 ${animationClasses.spin}`}></div>
      </div>
    </div>
  );
};

// Page transition wrapper
interface PageTransitionProps {
  children: React.ReactNode;
  className?: string;
}

export const PageTransition: React.FC<PageTransitionProps> = ({ 
  children, 
  className = '' 
}) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 50);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className={`
      ${isVisible ? animationClasses.fadeInActive : animationClasses.fadeIn}
      ${className}
    `}>
      {children}
    </div>
  );
};

// Floating action button
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
  color = 'blue'
}) => {
  const [isHovered, setIsHovered] = useState(false);
  
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`
        fixed bottom-6 right-6 z-50 
        bg-gradient-to-r from-${color}-500 to-${color}-600 
        hover:from-${color}-600 hover:to-${color}-700 
        text-white rounded-full shadow-lg hover:shadow-xl 
        transform hover:scale-110 hover:-translate-y-1
        transition-all duration-200 active:scale-95
      `}
    >
      <div className="flex items-center p-4">
        <div className={`transform ${isHovered ? 'rotate-90' : ''} transition-transform duration-200`}>
          {icon}
        </div>
        <div className={`
          overflow-hidden transition-all duration-200 
          ${isHovered ? 'max-w-xs opacity-100 ml-2' : 'max-w-0 opacity-0'}
        `}>
          <span className="font-medium whitespace-nowrap">{label}</span>
        </div>
      </div>
    </button>
  );
};

export default {
  AnimatedCard,
  AnimatedColumn,
  SimpleToast,
  SimpleLoadingSpinner,
  PageTransition,
  FloatingActionButton,
  animationClasses,
  useStaggeredAnimation
};
