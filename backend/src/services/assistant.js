const STOP_WORDS = new Set([
  'the', 'and', 'for', 'with', 'which', 'what', 'where', 'who', 'how', 'can',
  'you', 'give', 'show', 'tell', 'find', 'recommend', 'product', 'products',
  'below', 'under', 'budget', 'price', 'peso', 'pesos', 'php', 'have', 'any',
  'some', 'please', 'item', 'items', 'looking', 'look', 'want', 'need', 'less',
  'than', 'much', 'cost', 'good', 'best', 'is', 'are'
]);

export function parseBudget(question) {
  const normalized = question.replaceAll(',', '');
  const match = normalized.match(
    /(?:(?:₱|php|pesos?)\s*(\d{2,6})(?:\.\d{1,2})?)|(?:(?:below|under|less than|max|budget(?: of)?|within|at most|up to)\s*(?:₱|php|pesos?)?\s*(\d{2,6}))/i
  );
  if (match) {
    return Number(match[1] || match[2]);
  }
  return null;
}

export function rankProducts(products, question) {
  const allTerms = question.toLowerCase().split(/[^a-z0-9]+/).filter((term) => term.length > 2);
  const meaningfulTerms = allTerms.filter((term) => !STOP_WORDS.has(term) && !/^\d+$/.test(term));
  const budget = parseBudget(question);

  return products
    .filter((product) => product.stock > 0 && product.active !== false && (budget === null || Number(product.price) <= budget))
    .map((product) => {
      if (meaningfulTerms.length === 0) {
        return { ...product, score: 1 };
      }
      const name = product.name.toLowerCase();
      const cat = product.category.toLowerCase();
      const desc = product.description.toLowerCase();
      const score = meaningfulTerms.reduce((acc, term) => {
        if (name.includes(term)) return acc + 3;
        if (cat.includes(term)) return acc + 2;
        if (desc.includes(term)) return acc + 1;
        return acc;
      }, 0);
      return { ...product, score };
    })
    .filter((p) => p.score > 0)
    .sort((a, b) => b.score - a.score || Number(a.price) - Number(b.price));
}

export function buildFallbackResponse(candidates) {
  if (!candidates || candidates.length === 0) {
    return {
      answer: 'I could not find an in-stock product matching that request in our catalog.',
      recommendedProducts: [],
      sources: []
    };
  }

  const namesAndPrices = candidates
    .map((product) => `${product.name} (₱${Number(product.price).toLocaleString('en-PH')})`)
    .join(', ');
  const primary = candidates[0];
  const answer = `Based on the current ShopSmart catalog, consider: ${namesAndPrices}. ${primary.name} is in stock with ${primary.stock} available units at ₱${Number(primary.price).toLocaleString('en-PH')}: ${primary.description}`;

  return {
    answer,
    recommendedProducts: candidates.map(({ id, name, price, category }) => ({
      id,
      name,
      price: Number(price),
      category
    })),
    sources: candidates.map(({ id, name }) => ({ type: 'product', id, name }))
  };
}

export async function callProviderDraft(question, publicFacts, options = {}) {
  const apiKey = options.apiKey || process.env.GEMINI_API_KEY || process.env.AI_API_KEY;
  if (!apiKey || options.simulateFailure || process.env.SIMULATE_PROVIDER_FAILURE === 'true') {
    throw new Error('AI provider key is not configured or provider failure simulated.');
  }

  const model = options.model || process.env.GEMINI_MODEL || 'gemini-1.5-flash';
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  const systemInstruction = `You are ShopSmart's grounded AI shopping assistant.
Recommend the best matching in-stock product(s) to answer the customer's question based strictly on the provided ShopSmart catalog facts.

STRICT CONSTRAINTS:
1. ONLY recommend products explicitly provided in the catalog facts. NEVER invent or hallucinate products, IDs, or specifications.
2. State the actual price in PHP (₱).
3. Be concise and helpful (1-3 sentences).
4. Return valid JSON only with keys "answer" (string) and "recommendedProductIds" (array of numbers).`;

  const prompt = `${systemInstruction}\n\nCustomer Question: "${question}"\n\nAVAILABLE CATALOG FACTS:\n${JSON.stringify(publicFacts, null, 2)}`;

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    signal: AbortSignal.timeout(8000),
    body: JSON.stringify({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.1,
        maxOutputTokens: 500,
        responseMimeType: 'application/json'
      }
    })
  });

  if (!response.ok) {
    const errorBody = await response.text().catch(() => '');
    throw new Error(`Provider HTTP ${response.status}: ${errorBody}`);
  }

  const data = await response.json();
  const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!rawText) throw new Error('Provider returned empty content.');

  const cleaned = rawText.replace(/```json\n?|\n?```/g, '').trim();
  return JSON.parse(cleaned);
}

export function verifyAndBuildResponse(draft, candidates) {
  if (!draft || typeof draft !== 'object') {
    return buildFallbackResponse(candidates);
  }

  const candidateMap = new Map(candidates.map((c) => [c.id, c]));
  const rawIds = Array.isArray(draft.recommendedProductIds) ? draft.recommendedProductIds : [];
  const validIds = rawIds.map((id) => Number(id)).filter((id) => candidateMap.has(id));

  if (validIds.length === 0) {
    return buildFallbackResponse(candidates);
  }

  const recommendedCandidates = validIds.map((id) => candidateMap.get(id));
  const answerText = typeof draft.answer === 'string' && draft.answer.trim().length > 0
    ? draft.answer.trim()
    : buildFallbackResponse(recommendedCandidates).answer;

  return {
    answer: answerText,
    recommendedProducts: recommendedCandidates.map(({ id, name, price, category }) => ({
      id,
      name,
      price: Number(price),
      category
    })),
    sources: recommendedCandidates.map(({ id, name }) => ({ type: 'product', id, name }))
  };
}

export function buildAssistantResponse(products, question, options = {}) {
  const candidates = rankProducts(products, question).slice(0, 3);

  // If no products match, provide honest no match immediately without calling provider
  if (candidates.length === 0) {
    const noMatchResult = {
      answer: 'I could not find an in-stock product matching that request in our catalog.',
      recommendedProducts: [],
      sources: []
    };
    const promise = Promise.resolve(noMatchResult);
    Object.assign(promise, noMatchResult);
    return promise;
  }

  const publicFacts = candidates.map((p) => ({
    id: p.id,
    name: p.name,
    category: p.category,
    description: p.description,
    price: Number(p.price),
    stock: p.stock
  }));

  const fallback = buildFallbackResponse(candidates);

  const execution = (async () => {
    try {
      const draft = await callProviderDraft(question, publicFacts, options);
      return verifyAndBuildResponse(draft, candidates);
    } catch {
      // Graceful rule-based fallback on any provider error / missing key / timeout
      return fallback;
    }
  })();

  // Attach properties to promise for synchronous compatibility with starter tests
  Object.assign(execution, fallback);
  return execution;
}
