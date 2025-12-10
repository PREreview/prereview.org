import { pipe, Schema } from 'effect'
// eslint-disable-next-line import/no-internal-modules
import domains from './data/domains.json' with { type: 'json' }

export type DomainId = keyof typeof domains

export const domainIds = Object.keys(domains) as Array<DomainId>

export const DomainIdSchema = pipe(Schema.String, Schema.filter(isDomainId))

export function isDomainId(value: string): value is DomainId {
  return (domainIds as ReadonlyArray<string>).includes(value)
}
