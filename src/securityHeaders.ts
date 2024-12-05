import cspBuilder from 'content-security-policy-builder'
import type { HelmetOptions } from 'helmet'

export const securityHeaders = (protocol: URL['protocol']) => ({
  'Content-Security-Policy': cspBuilder({
    directives: {
      'script-src': ["'self'", 'cdn.usefathom.com'],
      'img-src': [
        "'self'",
        'data:',
        'avatars.slack-edge.com',
        'cdn.usefathom.com',
        'content.prereview.org',
        'res.cloudinary.com',
        'secure.gravatar.com',
        '*.wp.com',
      ],
      'upgrade-insecure-requests': protocol === 'https:',
      'default-src': "'self'",
      'base-uri': "'self'",
      'font-src': ["'self'", 'https:', 'data:'],
      'form-action': "'self'",
      'frame-ancestors': "'self'",
      'object-src': "'none'",
      'script-src-attr': "'none'",
      'style-src': ["'self'", 'https:', "'unsafe-inline'"],
    },
  }),
  'Cross-Origin-Embedder-Policy': 'credentialless',
  'Cross-Origin-Opener-Policy': 'same-origin',
  'Cross-Origin-Resource-Policy': 'same-origin',
  'Origin-Agent-Cluster': '?1',
  'Referrer-Policy': 'no-referrer',
  'Strict-Transport-Security': protocol === 'https:' ? 'max-age=15552000; includeSubDomains' : undefined,
  'X-Content-Type-Options': 'nosniff',
  'X-DNS-Prefetch-Control': 'off',
  'X-Download-Options': 'noopen',
  'X-Frame-Options': 'SAMEORIGIN',
  'X-Permitted-Cross-Domain-Policies': 'none',
  'X-XSS-Protection': '0',
})

export const helmetOptions = (protocol: URL['protocol']) =>
  ({
    contentSecurityPolicy: {
      directives: {
        'script-src': ["'self'", 'cdn.usefathom.com'],
        'img-src': [
          "'self'",
          'data:',
          'avatars.slack-edge.com',
          'cdn.usefathom.com',
          'content.prereview.org',
          'res.cloudinary.com',
          'secure.gravatar.com',
          '*.wp.com',
        ],
        upgradeInsecureRequests: protocol === 'https:' ? [] : null,
      },
    },
    crossOriginEmbedderPolicy: {
      policy: 'credentialless',
    },
    strictTransportSecurity: protocol === 'https:',
  }) satisfies Readonly<HelmetOptions>
