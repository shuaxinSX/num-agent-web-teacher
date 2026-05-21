function projectPoint(value, minValue, maxValue, length, padding) {
  if (maxValue === minValue) {
    return length / 2;
  }

  const ratio = (value - minValue) / (maxValue - minValue);
  return padding + ratio * (length - padding * 2);
}

export function FunctionPlot({ preview }) {
  if (!preview || preview.samples.length < 2) {
    return null;
  }

  const width = 520;
  const height = 260;
  const padding = 20;
  const allYValues = preview.samples.map((sample) => sample.y);
  allYValues.push(0);

  const minX = preview.samples[0].x;
  const maxX = preview.samples[preview.samples.length - 1].x;
  const minY = Math.min(...allYValues);
  const maxY = Math.max(...allYValues);

  const curvePath = preview.samples
    .map((sample, index) => {
      const x = projectPoint(sample.x, minX, maxX, width, padding);
      const y = height - projectPoint(sample.y, minY, maxY, height, padding);
      return `${index === 0 ? "M" : "L"} ${x} ${y}`;
    })
    .join(" ");

  const zeroY = height - projectPoint(0, minY, maxY, height, padding);

  return (
    <div className="plot-card">
      <div className="plot-header">
        <p className="detail-title">函数与采样节点</p>
        <span>蓝线是函数，橙点是当前分段节点</span>
      </div>

      <svg
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label="函数曲线与采样节点"
      >
        <rect x="0" y="0" width={width} height={height} rx="18" className="plot-bg" />
        <line
          x1={padding}
          y1={zeroY}
          x2={width - padding}
          y2={zeroY}
          className="plot-axis"
        />
        <path d={curvePath} className="plot-curve" />
        {preview.nodes.map((node) => {
          const cx = projectPoint(node.x, minX, maxX, width, padding);
          const cy = height - projectPoint(node.y, minY, maxY, height, padding);
          return <circle key={`${node.x}-${node.y}`} cx={cx} cy={cy} r="4.5" className="plot-node" />;
        })}
      </svg>
    </div>
  );
}
