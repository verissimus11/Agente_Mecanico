// Middleware de detección de subdominios para multi-tenant.
// Extrae el subdominio del host y lo mapea al slug del taller.
//
// Ejemplos:
//   aluaodon.tallerflow.com  →  slug = "aluaodon"  (mapeado a "alua-odon-motor" o el slug real)
//   tallerflow.com           →  slug = null (panel admin)
//   localhost:3000            →  slug = null (desarrollo)

function extractSubdomain(host, appDomain) {
  if (!host || !appDomain) return null;

  // Quitar puerto del host
  const cleanHost = host.split(':')[0].toLowerCase();
  const cleanDomain = appDomain.split(':')[0].toLowerCase();

  // Si el host === dominio principal → no hay subdominio
  if (cleanHost === cleanDomain || cleanHost === `www.${cleanDomain}`) {
    return null;
  }

  // Si termina en .dominio → extraer subdominio
  const suffix = `.${cleanDomain}`;
  if (cleanHost.endsWith(suffix)) {
    const sub = cleanHost.slice(0, -suffix.length);
    // Solo aceptar subdominios simples (sin puntos extra)
    if (sub && !sub.includes('.') && /^[a-z0-9][a-z0-9-]*[a-z0-9]$|^[a-z0-9]+$/.test(sub)) {
      return sub;
    }
  }

  return null;
}

function subdomainDetector(req, res, next) {
  const appDomain = process.env.APP_DOMAIN || '';
  const host = req.hostname || req.headers.host || '';

  req.workshopSubdomain = extractSubdomain(host, appDomain);
  return next();
}

module.exports = { subdomainDetector, extractSubdomain };
