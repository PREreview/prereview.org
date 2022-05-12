import { Doi, isDoi } from 'doi-ts'
import { Request, Response } from 'express'
import * as fc from 'fast-check'
import * as H from 'hyper-ts'
import { ExpressConnection } from 'hyper-ts/lib/express'
import { Body, RequestMethod, createRequest, createResponse } from 'node-mocks-http'
import { NonEmptyString, isNonEmptyString } from '../src/string'

export * from 'fast-check'

export const doi = (): fc.Arbitrary<Doi> =>
  fc
    .tuple(
      fc.stringOf(fc.constantFrom('0', '1', '2', '3', '4', '5', '6', '7', '8', '9'), { minLength: 4 }),
      fc.unicodeString({ minLength: 1 }),
    )
    .map(([prefix, suffix]) => `10.${prefix}/${suffix}`)
    .filter(isDoi)

export const requestMethod = (): fc.Arbitrary<RequestMethod> =>
  fc.constantFrom('CONNECT', 'DELETE', 'GET', 'HEAD', 'OPTIONS', 'PATCH', 'POST', 'PUT', 'TRACE')

export const request = ({
  body,
  method,
}: { body?: fc.Arbitrary<Body>; method?: fc.Arbitrary<RequestMethod> } = {}): fc.Arbitrary<Request> =>
  fc
    .record({
      body: body ?? fc.constant(undefined),
      method: method ?? requestMethod(),
      url: fc.webUrl(),
    })
    .map(createRequest)

export const response = (): fc.Arbitrary<Response> => fc.record({ req: request() }).map(createResponse)

export const connection = <S = H.StatusOpen>(...args: Parameters<typeof request>): fc.Arbitrary<ExpressConnection<S>> =>
  fc.tuple(request(...args), response()).map(args => new ExpressConnection(...args))

export const nonEmptyString = (): fc.Arbitrary<NonEmptyString> => fc.string({ minLength: 1 }).filter(isNonEmptyString)
