// Classic DP Levenshtein distance algorithm
function levenshtein(a, b) {
  const m = a.length;
  const n = b.length;
  const dp = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + cost
      );
    }
  }
  return dp[m][n];
}

function nearestSuggestions(list, ident) {
  const cand = [];
  list.forEach((it) => {
    if (it.id) cand.push({ type: 'id', value: it.id, item: it });
    if (it.key) cand.push({ type: 'key', value: it.key, item: it });
    if (it.name) cand.push({ type: 'name', value: it.name, item: it });
  });
  const scored = cand.map((c) => ({
    ...c,
    dist: levenshtein(ident.toLowerCase(), c.value.toLowerCase())
  }));
  scored.sort((a, b) => a.dist - b.dist);
  return scored.map((s) => s.item);
}

function matchIdentifier(list, ident) {
  const needle = ident.toLowerCase();

  const by = (selector) =>
    list.filter((it) => {
      const v = selector(it);
      return v && v.toLowerCase() === needle;
    });

  let matches = by((it) => it.id);
  if (matches.length === 0) {
    matches = by((it) => it.key);
    if (matches.length === 0) {
      matches = by((it) => it.name);
    }
  }

  if (matches.length === 1) return { ok: true, item: matches[0] };

  if (matches.length > 1) {
    return { ok: false, ambiguous: true, suggestions: matches.slice(0, 5) };
  }

  // no match: suggestions by nearest strings
  const suggestions = nearestSuggestions(list, ident).slice(0, 5);
  return { ok: false, ambiguous: false, suggestions };
}

function serializeSuggestions(list) {
  return (list || []).map((it) => ({
    key: it.key,
    id: it.id,
    name: it.name,
    status: it.status,
    container: it.container
  }));
}

module.exports = {
  levenshtein,
  nearestSuggestions,
  matchIdentifier,
  serializeSuggestions
};
