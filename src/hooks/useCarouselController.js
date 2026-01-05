import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Shared controller for horizontal carousels driven by scroll snapping.
 */
export function useCarouselController(itemsLength) {
  const scrollRef = useRef(null);
  const [activeIndex, setActiveIndex] = useState(0);

  const clampIndex = useCallback(
    (index) => {
      if (!itemsLength || itemsLength <= 0) {
        return 0;
      }
      return Math.max(0, Math.min(index, itemsLength - 1));
    },
    [itemsLength]
  );

  const scrollToIndex = useCallback(
    (index) => {
      const element = scrollRef.current;
      if (!element || !itemsLength) {
        return;
      }

      const clampedIndex = clampIndex(index);
      const targetChild = element.children?.[clampedIndex];

      if (targetChild) {
        element.scrollTo({ left: targetChild.offsetLeft, behavior: 'smooth' });
      }

      setActiveIndex(clampedIndex);
    },
    [clampIndex, itemsLength]
  );

  const handleScroll = useCallback(() => {
    const element = scrollRef.current;
    if (!element || !itemsLength) {
      return;
    }

    const itemWidth = itemsLength > 0 ? element.scrollWidth / itemsLength : 0;
    if (!itemWidth) {
      return;
    }

    const newIndex = clampIndex(Math.round(element.scrollLeft / itemWidth));
    setActiveIndex((prev) => (prev === newIndex ? prev : newIndex));
  }, [clampIndex, itemsLength]);

  useEffect(() => {
    const element = scrollRef.current;
    if (!element) {
      return undefined;
    }

    element.addEventListener('scroll', handleScroll, { passive: true });
    return () => element.removeEventListener('scroll', handleScroll);
  }, [handleScroll]);

  useEffect(() => {
    setActiveIndex((prev) => clampIndex(prev));
  }, [clampIndex]);

  const canNavigate = itemsLength > 1;

  const navigateBy = useCallback(
    (direction) => {
      if (!canNavigate || !itemsLength) {
        return;
      }
      const nextIndex = (activeIndex + direction + itemsLength) % itemsLength;
      scrollToIndex(nextIndex);
    },
    [activeIndex, canNavigate, itemsLength, scrollToIndex]
  );

  const goToNext = useCallback(() => navigateBy(1), [navigateBy]);
  const goToPrevious = useCallback(() => navigateBy(-1), [navigateBy]);

  const handleKeyDown = useCallback(
    (event) => {
      if (!canNavigate) {
        return;
      }

      if (event.key === 'ArrowRight') {
        event.preventDefault();
        navigateBy(1);
      }

      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        navigateBy(-1);
      }
    },
    [canNavigate, navigateBy]
  );

  return {
    scrollRef,
    activeIndex,
    canNavigate,
    scrollToIndex,
    goToNext,
    goToPrevious,
    handleKeyDown,
  };
}
