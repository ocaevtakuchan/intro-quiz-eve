/**
 * Cloudflare Worker エントリーポイント
 * Workers Static Assets を通じてすべての静的ファイル (HTML, JS, CSS, WASM, SQL) を高速配信
 */
export default {
  async fetch(request, env) {
    return env.ASSETS.fetch(request);
  }
};
