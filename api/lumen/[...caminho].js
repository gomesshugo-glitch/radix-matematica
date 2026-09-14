// Função serverless para o Vercel: proxy de mesma origem para a API do Lumen.
// Copiar para a raiz do repositório do Radix como  api/lumen/[...caminho].js
// (o Vercel cria a rota /api/lumen/* automaticamente). A página de vendas chama
// /api/lumen/... porque a API do Lumen não devolve cabeçalhos CORS.
// Nada de segredo aqui: o token do comprador vai no Authorization e é repassado.
const LUMEN_BASE = 'https://lumen-app-production-9917.up.railway.app';
const PERMITIDOS = /^\/(storefront\/[^/]+(\/listings\/[^/]+)?|auth\/(register|login)|me|checkout|orders(\/[^/]+\/charges)?|charges\/[^/]+|enrollments)$/;

export default async function handler(req, res) {
  const partes = Array.isArray(req.query.caminho) ? req.query.caminho : [req.query.caminho].filter(Boolean);
  const caminho = '/' + partes.join('/');
  if (!PERMITIDOS.test(caminho)) return res.status(404).json({ error: 'caminho nao permitido' });
  const i = req.url.indexOf('?');
  const busca = i >= 0 ? req.url.slice(i) : '';
  const cabecalhos = { accept: 'application/json' };
  for (const h of ['authorization', 'content-type', 'x-tenant-slug']) if (req.headers[h]) cabecalhos[h] = req.headers[h];
  const init = { method: req.method, headers: cabecalhos };
  if (!['GET', 'HEAD'].includes(req.method) && req.body != null) {
    init.body = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
  }
  try {
    const r = await fetch(LUMEN_BASE + caminho + busca, init);
    const texto = await r.text();
    res.status(r.status);
    res.setHeader('content-type', r.headers.get('content-type') || 'application/json');
    res.setHeader('cache-control', 'no-store');
    return res.send(texto);
  } catch (e) {
    return res.status(502).json({ error: 'proxy: ' + e.message });
  }
}
