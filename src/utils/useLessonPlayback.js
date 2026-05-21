import { useCallback, useEffect, useMemo, useState } from "react";
import { clamp } from "./lessonMath";

export function useLessonPlayback({ frameCount, resetKey }) {
  const safeFrameCount = Math.max(frameCount, 1);
  const [frameIndex, setFrameIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);

  useEffect(() => {
    setFrameIndex(0);
    setIsPlaying(false);
  }, [resetKey, safeFrameCount]);

  useEffect(() => {
    if (!isPlaying || safeFrameCount <= 1) {
      return undefined;
    }

    const timer = window.setInterval(() => {
      setFrameIndex((previous) => {
        if (previous >= safeFrameCount - 1) {
          setIsPlaying(false);
          return safeFrameCount - 1;
        }
        return previous + 1;
      });
    }, 960 / speed);

    return () => window.clearInterval(timer);
  }, [isPlaying, safeFrameCount, speed]);

  const progress = useMemo(
    () => (safeFrameCount <= 1 ? 1 : frameIndex / (safeFrameCount - 1)),
    [frameIndex, safeFrameCount]
  );

  const setProgress = useCallback(
    (nextProgress) => {
      setIsPlaying(false);
      const nextIndex = Math.round(clamp(nextProgress, 0, 1) * (safeFrameCount - 1));
      setFrameIndex(nextIndex);
    },
    [safeFrameCount]
  );

  const goNext = useCallback(() => {
    setIsPlaying(false);
    setFrameIndex((previous) => Math.min(previous + 1, safeFrameCount - 1));
  }, [safeFrameCount]);

  const goPrev = useCallback(() => {
    setIsPlaying(false);
    setFrameIndex((previous) => Math.max(previous - 1, 0));
  }, []);

  const reset = useCallback(() => {
    setIsPlaying(false);
    setFrameIndex(0);
  }, []);

  return {
    frameIndex,
    isPlaying,
    progress,
    speed,
    setFrameIndex,
    setIsPlaying,
    setProgress,
    setSpeed,
    goNext,
    goPrev,
    reset
  };
}

export function useLessonKeyboardShortcuts({ onTogglePlay, onPrev, onNext, enabled = true }) {
  useEffect(() => {
    if (!enabled) {
      return undefined;
    }

    function handleKeyDown(event) {
      const target = event.target;
      const tagName = target?.tagName;
      if (tagName === "INPUT" || tagName === "TEXTAREA" || tagName === "SELECT") {
        return;
      }

      if (event.code === "Space") {
        event.preventDefault();
        onTogglePlay();
      } else if (event.key === "ArrowLeft") {
        event.preventDefault();
        onPrev();
      } else if (event.key === "ArrowRight") {
        event.preventDefault();
        onNext();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [enabled, onNext, onPrev, onTogglePlay]);
}
