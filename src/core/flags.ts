// URL flags: ?debug ?poster ?nowebgl ?tier=low|mid|high
const q = new URLSearchParams(typeof location !== 'undefined' ? location.search : '');
export const flags = {
  debug: q.has('debug'),
  poster: q.get('poster'), // '1' (hero) | 'exploded'
  noWebGL: q.has('nowebgl'),
  tier: q.get('tier') as 'low' | 'mid' | 'high' | null,
  explode: q.has('explode') ? Number(q.get('explode')) : null,
};
