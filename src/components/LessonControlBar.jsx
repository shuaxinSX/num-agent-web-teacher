const SPEED_OPTIONS = [0.5, 1, 1.5, 2];

export function LessonControlBar({
  isPlaying,
  onTogglePlay,
  onReset,
  onPrev,
  onNext,
  progress,
  onProgressChange,
  speed,
  onSpeedChange,
  n,
  nLabel = "总子区间数 N",
  nMin = 1,
  nMax = 10,
  nStep = 1,
  onNChange,
  helperText
}) {
  return (
    <div className="lesson-control-bar">
      <div className="lesson-control-actions">
        <button type="button" onClick={onPrev}>
          上一步
        </button>
        <button type="button" className="is-primary" onClick={onTogglePlay}>
          {isPlaying ? "暂停" : "播放"}
        </button>
        <button type="button" onClick={onNext}>
          下一步
        </button>
        <button type="button" onClick={onReset}>
          重置
        </button>
      </div>

      <label className="lesson-control-range">
        <span>进度</span>
        <input
          type="range"
          min="0"
          max="1"
          step="0.001"
          value={progress}
          title={(progress * 100).toFixed(1) + "%"}
          onChange={(event) => onProgressChange(Number(event.target.value))}
        />
      </label>

      <label className="lesson-control-range">
        <span>
          {nLabel} = <strong>{n}</strong>
        </span>
        <input
          type="range"
          min={nMin}
          max={nMax}
          step={nStep}
          value={n}
          title={String(n)}
          onChange={(event) => onNChange(Number(event.target.value))}
        />
      </label>

      <label className="lesson-control-speed">
        <span>速度</span>
        <select value={speed} onChange={(event) => onSpeedChange(Number(event.target.value))}>
          {SPEED_OPTIONS.map((item) => (
            <option key={item} value={item}>
              {item}x
            </option>
          ))}
        </select>
      </label>

      <div className="lesson-control-hint">
        {helperText || "支持播放、暂停、单步、拖动进度；拖动后会自动暂停。"}
      </div>
    </div>
  );
}
