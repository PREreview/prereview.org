import { Status } from 'hyper-ts'

export type CacheableStatusCodes = (typeof cacheableStatusCodes)[number]

export type NonCacheableStatusCodes = Exclude<Status, CacheableStatusCodes>

const cacheableStatusCodes = [
  Status.OK,
  Status.NonAuthoritativeInformation,
  Status.NoContent,
  Status.PartialContent,
  Status.MultipleChoices,
  Status.MovedPermanently,
  Status.NotFound,
  Status.MethodNotAllowed,
  Status.Gone,
  Status.URITooLong,
  Status.NotImplemented,
] as const

export function isCacheable(status: Status): status is CacheableStatusCodes {
  return (cacheableStatusCodes as ReadonlyArray<Status>).includes(status)
}

export function isNonCacheable(status: Status): status is NonCacheableStatusCodes {
  return !(cacheableStatusCodes as ReadonlyArray<Status>).includes(status)
}
