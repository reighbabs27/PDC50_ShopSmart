import { useState } from 'react';
import { Link } from 'react-router-dom';
import StatusMessage from '../components/StatusMessage.jsx';
import { api } from '../services/api.js';

const SAMPLE_QUESTIONS = [
  'Which keyboard is below ₱2,000?',
  'Wireless mouse below ₱700',
  'Do you have any refrigerators?'
];

export default function AssistantPage() {
  const [question, setQuestion] = useState('');
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function ask(event) {
    if (event) event.preventDefault();
    setError('');
    setResult(null);
    setLoading(true);

    try {
      const data = await api.askAssistant(question);
      setResult(data);
    } catch (caught) {
      setError(caught.message);
    } finally {
      setLoading(false);
    }
  }

  function handleSampleClick(sample) {
    setQuestion(sample);
  }

  return (
    <section className="assistant-layout">
      <div>
        <p className="eyebrow">GROUNDED AI ASSISTANT</p>
        <h1>Find a product</h1>
        <p>
          Ask questions about ShopSmart products. Recommendations are grounded in current, active catalog facts with verified prices and availability.
        </p>

        <form onSubmit={ask}>
          <label>
            Your question
            <textarea
              value={question}
              onChange={(event) => setQuestion(event.target.value)}
              minLength={3}
              maxLength={300}
              placeholder="Which keyboard is below ₱2,000?"
              required
            />
          </label>

          <div className="sample-prompts">
            <span className="sample-label">Try asking:</span>
            <div className="sample-chips">
              {SAMPLE_QUESTIONS.map((sample) => (
                <button
                  type="button"
                  key={sample}
                  className="sample-chip"
                  onClick={() => handleSampleClick(sample)}
                >
                  {sample}
                </button>
              ))}
            </div>
          </div>

          <button disabled={loading} type="submit">
            {loading ? 'Searching catalog…' : 'Ask ShopSmart'}
          </button>
        </form>
      </div>

      <div className="assistant-answer">
        <h2>Assistant response</h2>
        <StatusMessage type="error">{error}</StatusMessage>

        {loading && (
          <div className="assistant-loading-box" role="status">
            <p>Searching active catalog and verifying product facts…</p>
          </div>
        )}

        {!loading && !result && !error && (
          <p className="assistant-placeholder">Your verified answer and product recommendations will appear here.</p>
        )}

        {!loading && result && (
          <div className="assistant-result-body">
            <div className="assistant-bubble">
              <p>{result.answer}</p>
            </div>

            {result.recommendedProducts && result.recommendedProducts.length > 0 && (
              <div className="assistant-section">
                <h3>Recommended Products</h3>
                <div className="recommendations">
                  {result.recommendedProducts.map((product) => (
                    <Link
                      key={product.id}
                      to={`/products/${product.id}`}
                      className="recommendation-card"
                    >
                      <span className="rec-name">{product.name}</span>
                      <span className="rec-meta">
                        {product.category && <span className="rec-category">{product.category}</span>}
                        <span className="rec-price">₱{Number(product.price).toLocaleString('en-PH')}</span>
                      </span>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {result.recommendedProducts && result.recommendedProducts.length === 0 && (
              <div className="no-match-box">
                <p>No matching active products found in the catalog for this inquiry.</p>
              </div>
            )}

            {result.sources && result.sources.length > 0 && (
              <div className="assistant-sources">
                <h3>Verified Catalog Sources</h3>
                <div className="sources-list">
                  {result.sources.map((source) => (
                    <Link
                      key={source.id}
                      to={`/products/${source.id}`}
                      className="source-badge"
                      title={`View product #${source.id}`}
                    >
                      <span className="source-icon">📦</span>
                      <span className="source-title">{source.name}</span>
                      <span className="source-tag-id">ID: {source.id}</span>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
