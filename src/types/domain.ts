import { pipe, Schema, SchemaIssue, SchemaGetter, Effect } from 'effect'
import domains from './data/domains.json' with { type: 'json' }

export type DomainId = keyof typeof domains

export const domainIds = Object.keys(domains) as Array<DomainId>

export const DomainIdSchema = pipe(Schema.String, Schema.refine(isDomainId))

export const DomainIdFromOpenAlexUrlSchema = Schema.URLFromString.pipe(
  Schema.decodeTo(DomainIdSchema, {
    decode: SchemaGetter.transformEffect(url =>
      url.origin === 'https://openalex.org' && url.pathname.startsWith('/domains/')
        ? Effect.succeed(decodeURIComponent(url.pathname.slice(9)))
        : Effect.fail(new SchemaIssue.InvalidValue(undefined, url)),
    ),
    encode: SchemaGetter.transformEffect(domainId =>
      Effect.succeed(new URL(`https://openalex.org/domains/${encodeURIComponent(domainId)}`)),
    ),
  }),
)

export function isDomainId(value: string): value is DomainId {
  return (domainIds as ReadonlyArray<string>).includes(value)
}
