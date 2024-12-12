import cspBuilder from 'content-security-policy-builder'
import type { HelmetOptions } from 'helmet'

const crowdin = {
  scriptSrc: ['cdn.crowdin.com', "'unsafe-inline'", "'unsafe-eval'"],
  imgSrc: ['*.crowdin.com'],
  frameSrc: ['crowdin.com', 'accounts.crowdin.com'],
  crossOriginEmbedderPolicy: 'unsafe-none' as const,
}

const scriptSrc = ["'self'", 'cdn.usefathom.com']

const imgSrc = [
  "'self'",
  'data:',
  'avatars.slack-edge.com',
  'cdn.usefathom.com',
  'content.prereview.org',
  'res.cloudinary.com',
  'secure.gravatar.com',
  '*.wp.com',
]
const crossOriginEmbedderPolicy = 'credentialless'

export const securityHeaders = (protocol: URL['protocol'], useCrowdinInContext: boolean) => ({
  'Content-Security-Policy': cspBuilder({
    directives: {
      'script-src': useCrowdinInContext ? scriptSrc.concat(crowdin.scriptSrc) : scriptSrc,
      'img-src': useCrowdinInContext ? imgSrc.concat(crowdin.imgSrc) : imgSrc,
      'upgrade-insecure-requests': protocol === 'https:',
      'default-src': "'self'",
      'base-uri': "'self'",
      'font-src': ["'self'", 'https:', 'data:'],
      'form-action': "'self'",
      'frame-ancestors': "'self'",
      'frame-src': useCrowdinInContext ? crowdin.frameSrc : "'none'",
      'object-src': "'none'",
      'script-src-attr': useCrowdinInContext ? "'unsafe-inline'" : "'none'",
      'style-src': ["'self'", 'https:', "'unsafe-inline'"],
    },
  }),
  'Cross-Origin-Embedder-Policy': useCrowdinInContext ? crowdin.crossOriginEmbedderPolicy : crossOriginEmbedderPolicy,
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

export const helmetOptions = (protocol: URL['protocol'], useCrowdinInContext: boolean) =>
  ({
    contentSecurityPolicy: {
      directives: {
        'script-src': useCrowdinInContext ? scriptSrc.concat(crowdin.scriptSrc) : scriptSrc,
        'img-src': useCrowdinInContext ? imgSrc.concat(crowdin.imgSrc) : imgSrc,
        upgradeInsecureRequests: protocol === 'https:' ? [] : null,
        'script-src-attr': useCrowdinInContext ? "'unsafe-inline'" : "'none'",
        'frame-src': useCrowdinInContext ? crowdin.frameSrc : "'none'",
      },
    },
    crossOriginEmbedderPolicy: {
      policy: useCrowdinInContext ? crowdin.crossOriginEmbedderPolicy : crossOriginEmbedderPolicy,
    },
    strictTransportSecurity: protocol === 'https:',
  }) satisfies Readonly<HelmetOptions>
