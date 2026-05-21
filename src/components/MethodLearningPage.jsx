import { comparisonRows } from "../content/courseContent";
import { ExperimentPanel } from "./ExperimentPanel";
import { InlineMathText } from "./InlineMathText";
import { MethodSection } from "./MethodSection";

function getComparisonRow(method) {
  return comparisonRows.find((row) => row.name === method.navTitle) || comparisonRows[0];
}

export function MethodLearningPage({ method, onOpenVisualizer }) {
  const comparison = getComparisonRow(method);

  return (
    <div className="method-page-shell">
      <section className="method-page-hero">
        <div className="method-page-hero-copy">
          <h2>{method.title}</h2>
          <p>
            <InlineMathText text={method.intro} />
          </p>
        </div>

        <div className="method-page-hero-actions">
          <button type="button" className="secondary-button" onClick={onOpenVisualizer}>
            切到图像实验
          </button>
        </div>
      </section>

      <section className="method-page-facts">
        <article className="method-page-fact">
          <span>方法特征</span>
          <strong>{comparison.feature}</strong>
        </article>
        <article className="method-page-fact">
          <span>分段条件</span>
          <strong>{comparison.constraint}</strong>
        </article>
        <article className="method-page-fact">
          <span>适用场景</span>
          <strong>{comparison.bestFor}</strong>
        </article>
      </section>

      <MethodSection method={method} />

      <section className="experiment-section">
        <div className="experiment-section-head">
          <h3>{method.title}实验页</h3>
        </div>

        <ExperimentPanel methods={[method]} />
      </section>
    </div>
  );
}
