import React, { useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useCarouselController } from '@/hooks/useCarouselController';

const defaultDotLabel = (item, index) => `Ir para o item ${index + 1}`;
const defaultGetItemKey = (item, index) => (item && item.id ? item.id : index);

const HorizontalCarousel = ({
  id,
  items = [],
  itemRenderer,
  ariaLabel,
  className = '',
  trackClassName = '',
  itemClassName = '',
  showArrows = true,
  showDots = true,
  gradientEdges = true,
  autoplayInterval = 0,
  pauseOnHover = true,
  prevButtonLabel = 'Ver item anterior',
  nextButtonLabel = 'Ver próximo item',
  dotAriaLabel = defaultDotLabel,
  getItemKey = defaultGetItemKey,
  emptyState = null,
}) => {
  const itemsLength = items?.length ?? 0;
  const hasItems = itemsLength > 0 && typeof itemRenderer === 'function';

  const {
    scrollRef,
    activeIndex,
    canNavigate,
    goToNext,
    goToPrevious,
    scrollToIndex,
    handleKeyDown,
  } = useCarouselController(itemsLength);

  const isPausedRef = useRef(false);
  const shouldAutoPlay = autoplayInterval > 0 && itemsLength > 1;

  useEffect(() => {
    if (!shouldAutoPlay) {
      return undefined;
    }

    const intervalId = window.setInterval(() => {
      if (!isPausedRef.current) {
        goToNext();
      }
    }, autoplayInterval);

    return () => window.clearInterval(intervalId);
  }, [autoplayInterval, goToNext, shouldAutoPlay]);

  const pauseAutoPlay = () => {
    isPausedRef.current = true;
  };

  const resumeAutoPlay = () => {
    isPausedRef.current = false;
  };

  const hoverHandlers = pauseOnHover && shouldAutoPlay
    ? {
        onMouseEnter: pauseAutoPlay,
        onMouseLeave: resumeAutoPlay,
        onFocusCapture: pauseAutoPlay,
        onBlurCapture: resumeAutoPlay,
      }
    : {};

  const renderDots = () => {
    if (!showDots || itemsLength <= 1) {
      return null;
    }

    return (
      <div className="flex flex-wrap items-center justify-center gap-3 mt-6">
        {items.map((item, index) => {
          const key = getItemKey(item, index);
          const isActive = activeIndex === index;
          const label = dotAriaLabel(item, index);

          return (
            <button
              key={`${key}-indicator`}
              type="button"
              onClick={() => scrollToIndex(index)}
              className={cn(
                'w-3 h-3 rounded-full transition-colors duration-300',
                isActive ? 'bg-[#2d8659]' : 'bg-gray-300 hover:bg-gray-400'
              )}
              aria-label={label}
              aria-current={isActive}
            />
          );
        })}
      </div>
    );
  };

  if (!hasItems) {
    return typeof emptyState === 'function' ? emptyState() : emptyState;
  }

  return (
    <div id={id} className={cn('relative', className)}>
      {showArrows && canNavigate && (
        <>
          <button
            type="button"
            onClick={goToPrevious}
            className="hidden md:flex items-center justify-center absolute top-1/2 -left-4 z-10 w-12 h-12 rounded-full bg-white/95 shadow-lg border border-gray-200 text-[#2d8659] hover:bg-[#2d8659]/10 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#2d8659]"
            aria-label={prevButtonLabel}
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            type="button"
            onClick={goToNext}
            className="hidden md:flex items-center justify-center absolute top-1/2 -right-4 z-10 w-12 h-12 rounded-full bg-white/95 shadow-lg border border-gray-200 text-[#2d8659] hover:bg-[#2d8659]/10 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#2d8659]"
            aria-label={nextButtonLabel}
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </>
      )}

      {gradientEdges && canNavigate && (
        <>
          <div className="pointer-events-none absolute inset-y-0 left-0 w-12 bg-gradient-to-r from-white via-white/80 to-transparent hidden lg:block" aria-hidden="true" />
          <div className="pointer-events-none absolute inset-y-0 right-0 w-12 bg-gradient-to-l from-white via-white/80 to-transparent hidden lg:block" aria-hidden="true" />
        </>
      )}

      <div className="relative" {...hoverHandlers}>
        <div
          ref={scrollRef}
          className={cn(
            'flex overflow-x-auto gap-6 pb-8 scroll-smooth carousel-container',
            trackClassName
          )}
          style={{ scrollSnapType: 'x mandatory' }}
          tabIndex={0}
          role="region"
          aria-roledescription="carrossel"
          aria-label={ariaLabel}
          onKeyDown={handleKeyDown}
        >
          {items.map((item, index) => {
            const key = getItemKey(item, index);
            const content = itemRenderer({ item, index, isActive: activeIndex === index });

            return (
              <div
                key={key}
                className={cn('flex-shrink-0', itemClassName)}
                style={{ scrollSnapAlign: 'center' }}
              >
                {content}
              </div>
            );
          })}
        </div>
      </div>

      {renderDots()}
    </div>
  );
};

export default HorizontalCarousel;
