export type StatusCode = (typeof StatusCodes)[number]

export type CacheableStatusCodes = (typeof cacheableStatusCodes)[number]

export type NonCacheableStatusCodes = (typeof nonCacheableStatusCodes)[number]

export const Continue = 100
export const SwitchingProtocols = 101
export const Processing = 102
export const EarlyHints = 103
export const OK = 200
export const Created = 201
export const Accepted = 202
export const NonAuthoritativeInformation = 203
export const NoContent = 204
export const ResetContent = 205
export const PartialContent = 206
export const MultiStatus = 207
export const AlreadyReported = 208
export const IMUsed = 226
export const MultipleChoices = 300
export const MovedPermanently = 301
export const Found = 302
export const SeeOther = 303
export const NotModified = 304
export const UseProxy = 305
export const SwitchProxy = 306
export const TemporaryRedirect = 307
export const PermanentRedirect = 308
export const BadRequest = 400
export const Unauthorized = 401
export const PaymentRequired = 402
export const Forbidden = 403
export const NotFound = 404
export const MethodNotAllowed = 405
export const NotAcceptable = 406
export const ProxyAuthenticationRequired = 407
export const RequestTimeout = 408
export const Conflict = 409
export const Gone = 410
export const LengthRequired = 411
export const PreconditionFailed = 412
export const PayloadTooLarge = 413
export const URITooLong = 414
export const UnsupportedMediaType = 415
export const RangeNotSatisfiable = 416
export const ExpectationFailed = 417
export const Teapot = 418
export const MisdirectedRequest = 421
export const UnprocessableEntity = 422
export const Locked = 423
export const FailedDependency = 424
export const TooEarly = 425
export const UpgradeRequired = 426
export const PreconditionRequired = 428
export const TooManyRequests = 429
export const RequestHeaderFieldsTooLarge = 431
export const UnavailableForLegalReasons = 451
export const InternalServerError = 500
export const NotImplemented = 501
export const BadGateway = 502
export const ServiceUnavailable = 503
export const GatewayTimeout = 504
export const HTTPVersionNotSupported = 505
export const VariantAlsoNegotiates = 506
export const InsufficientStorage = 507
export const LoopDetected = 508
export const NotExtended = 510
export const NetworkAuthenticationRequired = 511

const cacheableStatusCodes = [
  OK,
  NonAuthoritativeInformation,
  NoContent,
  PartialContent,
  MultipleChoices,
  MovedPermanently,
  NotFound,
  MethodNotAllowed,
  Gone,
  URITooLong,
  NotImplemented,
] as const

const nonCacheableStatusCodes = [
  Continue,
  SwitchingProtocols,
  Processing,
  EarlyHints,
  Created,
  Accepted,
  ResetContent,
  MultiStatus,
  AlreadyReported,
  IMUsed,
  Found,
  SeeOther,
  NotModified,
  UseProxy,
  SwitchProxy,
  TemporaryRedirect,
  PermanentRedirect,
  BadRequest,
  Unauthorized,
  PaymentRequired,
  Forbidden,
  NotAcceptable,
  ProxyAuthenticationRequired,
  RequestTimeout,
  Conflict,
  LengthRequired,
  PreconditionFailed,
  PayloadTooLarge,
  UnsupportedMediaType,
  RangeNotSatisfiable,
  ExpectationFailed,
  Teapot,
  MisdirectedRequest,
  UnprocessableEntity,
  Locked,
  FailedDependency,
  TooEarly,
  UpgradeRequired,
  PreconditionRequired,
  TooManyRequests,
  RequestHeaderFieldsTooLarge,
  UnavailableForLegalReasons,
  InternalServerError,
  BadGateway,
  ServiceUnavailable,
  GatewayTimeout,
  HTTPVersionNotSupported,
  VariantAlsoNegotiates,
  InsufficientStorage,
  LoopDetected,
  NotExtended,
  NetworkAuthenticationRequired,
] as const

export const StatusCodes = [...cacheableStatusCodes, ...nonCacheableStatusCodes]

export function isCacheable(status: StatusCode): status is CacheableStatusCodes {
  return (cacheableStatusCodes as ReadonlyArray<StatusCode>).includes(status)
}

export function isNonCacheable(status: StatusCode): status is NonCacheableStatusCodes {
  return (nonCacheableStatusCodes as ReadonlyArray<StatusCode>).includes(status)
}
