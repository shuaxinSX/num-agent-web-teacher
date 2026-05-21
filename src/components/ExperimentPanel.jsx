import { useEffect, useState } from "react";
import { formatMetric, getMethodRequirement, runNumericalExperiment } from "../utils/numericalMethods";
import { FunctionPlot } from "./FunctionPlot";

function createInitialState(method) {
  return {
    methodId: method.id,
    expression: method.defaultExpression,
    aText: method.defaultA,
    bText: method.defaultB,
    nText: String(method.defaultN)
  };
}

export function ExperimentPanel({ methods }) {
  const [formState, setFormState] = useState(() => createInitialState(methods[0]));
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const hasMultipleMethods = methods.length > 1;

  const activeMethod = methods.find((method) => method.id === formState.methodId) || methods[0];
  const requirement = getMethodRequirement(formState.methodId);

  function runExperiment(nextState = formState) {
    try {
      const nextResult = runNumericalExperiment(nextState);
      setResult(nextResult);
      setError("");
    } catch (caughtError) {
      setResult(null);
      setError(caughtError.message);
    }
  }

  useEffect(() => {
    runExperiment(formState);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleMethodChange(event) {
    const nextMethod = methods.find((method) => method.id === event.target.value) || methods[0];
    const nextState = createInitialState(nextMethod);
    setFormState(nextState);
    runExperiment(nextState);
  }

  function handleSubmit(event) {
    event.preventDefault();
    runExperiment(formState);
  }

  return (
    <div className="experiment-grid">
      <form className="experiment-form" onSubmit={handleSubmit}>
        <div className="field-grid">
          {hasMultipleMethods ? (
            <label className="field">
              <span>方法</span>
              <select value={formState.methodId} onChange={handleMethodChange}>
                {methods.map((method) => (
                  <option key={method.id} value={method.id}>
                    {method.title}
                  </option>
                ))}
              </select>
            </label>
          ) : null}

          <label className="field field-wide">
            <span>函数 f(x)</span>
            <input
              value={formState.expression}
              onChange={(event) =>
                setFormState((current) => ({
                  ...current,
                  expression: event.target.value
                }))
              }
              placeholder="例如 sin(x) 或 exp(-x^2)"
            />
          </label>

          <label className="field">
            <span>左端点 a</span>
            <input
              value={formState.aText}
              onChange={(event) =>
                setFormState((current) => ({
                  ...current,
                  aText: event.target.value
                }))
              }
              placeholder="0"
            />
          </label>

          <label className="field">
            <span>右端点 b</span>
            <input
              value={formState.bText}
              onChange={(event) =>
                setFormState((current) => ({
                  ...current,
                  bText: event.target.value
                }))
              }
              placeholder="pi"
            />
          </label>

          <label className="field">
            <span>{requirement.inputLabel}</span>
            <input
              value={formState.nText}
              onChange={(event) =>
                setFormState((current) => ({
                  ...current,
                  nText: event.target.value
                }))
              }
              placeholder="8"
            />
          </label>
        </div>

        <div className="experiment-actions">
          <button type="submit" className="primary-button">
            计算
          </button>
          <button
            type="button"
            className="ghost-button"
            onClick={() => {
              const nextState = createInitialState(activeMethod);
              setFormState(nextState);
              runExperiment(nextState);
            }}
          >
            示例
          </button>
        </div>

        <div className="helper-inline">
          {!hasMultipleMethods ? <span>当前方法：{activeMethod.title}</span> : null}
          <span>支持 `sin(x)`、`exp(x)`、`pi`、`e`、`^`</span>
          <span>{requirement.hint}</span>
        </div>

        <div className="helper-card helper-card-warm">
          <p>{activeMethod.exampleText}</p>
        </div>
      </form>

      <div className="result-column">
        {error ? (
          <div className="result-error">{error}</div>
        ) : null}

        {result ? (
          <>
            <div className="metric-grid">
              <article className="metric-card">
                <span>近似积分值</span>
                <strong>{formatMetric(result.approximation)}</strong>
              </article>
              <article className="metric-card">
                <span>高精参考值</span>
                <strong>{formatMetric(result.reference)}</strong>
              </article>
              <article className="metric-card">
                <span>绝对误差</span>
                <strong>{formatMetric(result.absoluteError)}</strong>
              </article>
            </div>

            <div className="helper-card">
              <p>{result.note}</p>
              <p>
                有向积分区间为 [{formatMetric(result.orientedInput.a)},{" "}
                {formatMetric(result.orientedInput.b)}]，预览图区间为 [{formatMetric(result.plotInterval.a)},{" "}
                {formatMetric(result.plotInterval.b)}]，{result.parameterLabel}为 {result.parameterValue}。
              </p>
            </div>

            <FunctionPlot preview={result.preview} />
          </>
        ) : (
          <div className="empty-state">
            <p>填写参数后即可开始实验。</p>
          </div>
        )}
      </div>
    </div>
  );
}
