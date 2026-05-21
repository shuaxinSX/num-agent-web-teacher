import { useState } from "react";
import { formatExpressionAsLatex } from "../utils/numericalMethods";
import { InlineMathText } from "./InlineMathText";
import { MathFormula } from "./MathFormula";

export function MethodSection({ method }) {
  const [activeTab, setActiveTab] = useState("reasoning");
  const exampleLatex = formatExpressionAsLatex(method.defaultExpression);
  const parameterSymbol = method.id === "newton-cotes" ? "m" : "N";

  return (
    <section id={method.id} className="section-panel">
      <div className="section-header">
        <h3>{method.title}</h3>
        <p className="section-intro">
          <InlineMathText text={method.intro} />
        </p>
      </div>

      <div className="formula-grid">
        <article className="formula-card">
          <p className="formula-label">核心公式</p>
          <MathFormula latex={method.formula} />
        </article>
        <article className="formula-card">
          <p className="formula-label">复化公式</p>
          <MathFormula latex={method.compositeFormula} />
        </article>
        <article className="formula-card">
          <p className="formula-label">误差项</p>
          <MathFormula latex={method.errorFormula} />
        </article>
      </div>

      <div className="method-focus-grid">
        <article className="detail-card detail-card-accent">
          <p className="detail-title">几何直观</p>
          <p>
            <InlineMathText text={method.geometry} />
          </p>
        </article>

        <article className="detail-card">
          <p className="detail-title">要点</p>
          <ul className="point-list">
            {method.takeaways.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </article>

        <article className="detail-card detail-card-featured">
          <p className="detail-title">{method.exampleLabel}</p>
          <p>
            <InlineMathText text={method.exampleText} />
          </p>
          <div className="example-meta">
            <span>
              <MathFormula latex={`f(x) = ${exampleLatex}`} block={false} />
            </span>
            <span>
              [{method.defaultA}, {method.defaultB}]
            </span>
            <span>{parameterSymbol} = {method.defaultN}</span>
          </div>
        </article>

        <article className="detail-card detail-card-summary">
          <p className="detail-title">本章总结</p>
          <p>
            <InlineMathText text={method.summary} />
          </p>
        </article>
      </div>

      <div className="method-tabs" role="tablist" aria-label={`${method.title}内容切换`}>
        <button
          type="button"
          className={activeTab === "reasoning" ? "method-tab is-active" : "method-tab"}
          onClick={() => setActiveTab("reasoning")}
        >
          推导与步骤
        </button>
        <button
          type="button"
          className={activeTab === "error" ? "method-tab is-active" : "method-tab"}
          onClick={() => setActiveTab("error")}
        >
          误差与易错点
        </button>
        <button
          type="button"
          className={activeTab === "classroom" ? "method-tab is-active" : "method-tab"}
          onClick={() => setActiveTab("classroom")}
        >
          思考与练习
        </button>
      </div>

      <div className="method-grid method-grid-tabbed">
        {activeTab === "reasoning" ? (
          <>
            <article className="detail-card">
              <p className="detail-title">推导视角</p>
              <p>
                <InlineMathText text={method.derivation} />
              </p>
            </article>

            <article className="detail-card">
              <p className="detail-title">实现步骤</p>
              <ol className="step-list">
                {method.steps.map((step) => (
                  <li key={step}>
                    <InlineMathText text={step} />
                  </li>
                ))}
              </ol>
            </article>
          </>
        ) : null}

        {activeTab === "error" ? (
          <>
            <article className="detail-card">
              <p className="detail-title">误差怎么读</p>
              <p>
                <InlineMathText text={method.errorReading} />
              </p>
            </article>

            <article className="detail-card">
              <p className="detail-title">常见易错点</p>
              <ul className="point-list">
                {method.pitfalls.map((item) => (
                  <li key={item}>
                    <InlineMathText text={item} />
                  </li>
                ))}
              </ul>
            </article>
          </>
        ) : null}

        {activeTab === "classroom" ? (
          <>
            <article className="detail-card">
              <p className="detail-title">思考问题</p>
              <ul className="point-list">
                {method.prompts.map((item) => (
                  <li key={item}>
                    <InlineMathText text={item} />
                  </li>
                ))}
              </ul>
            </article>

            <article className="detail-card">
              <p className="detail-title">快速练习</p>
              <ul className="point-list">
                {method.practice.map((item) => (
                  <li key={item}>
                    <InlineMathText text={item} />
                  </li>
                ))}
              </ul>
            </article>
          </>
        ) : null}
      </div>
    </section>
  );
}
