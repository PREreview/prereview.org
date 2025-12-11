import { ParseResult, pipe, Schema } from 'effect'
// eslint-disable-next-line import/no-internal-modules
import domains from './data/domains.json' with { type: 'json' }

export type DomainId = keyof typeof domains

export const domainIds = Object.keys(domains) as Array<DomainId>

export const DomainIdSchema = pipe(Schema.String, Schema.filter(isDomainId))

export const DomainIdFromOpenAlexUrlSchema = Schema.transformOrFail(Schema.URL, DomainIdSchema, {
  strict: true,
  decode: (url, _, ast) =>
    url.origin === 'https://openalex.org' && url.pathname.startsWith('/domains/')
      ? ParseResult.succeed(decodeURIComponent(url.pathname.substring(9)))
      : ParseResult.fail(new ParseResult.Type(ast, url)),
  encode: domainId => ParseResult.succeed(new URL(`https://openalex.org/domains/${encodeURIComponent(domainId)}`)),
})

export function isDomainId(value: string): value is DomainId {
  return (domainIds as ReadonlyArray<string>).includes(value)
}
