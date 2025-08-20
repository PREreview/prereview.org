import { pipe, Schema } from 'effect'

export type DomainId = (typeof domainIds)[number]

export const domainIds = ['1', '2', '3', '4'] as const

export const DomainIdSchema = pipe(Schema.String, Schema.filter(isDomainId))

export function isDomainId(value: string): value is DomainId {
  return (domainIds as ReadonlyArray<string>).includes(value)
}
