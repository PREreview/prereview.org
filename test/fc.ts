import { Doi, isDoi } from 'doi-ts'
import { Request, Response } from 'express'
import * as fc from 'fast-check'
import * as H from 'hyper-ts'
import { ExpressConnection } from 'hyper-ts/lib/express'
import { createRequest, createResponse } from 'node-mocks-http'

export * from 'fast-check'

export const doi = (): fc.Arbitrary<Doi> =>
  fc
    .tuple(
      fc.stringOf(fc.constantFrom('0', '1', '2', '3', '4', '5', '6', '7', '8', '9'), { minLength: 4 }),
      fc.unicodeString({ minLength: 1 }),
    )
    .map(([prefix, suffix]) => `10.${prefix}/${suffix}`)
    .filter(isDoi)

export const request = (): fc.Arbitrary<Request> => fc.record({ url: fc.webUrl() }).map(createRequest)

export const response = (): fc.Arbitrary<Response> => fc.record({ req: request() }).map(createResponse)

export const connection = <S = H.StatusOpen>(): fc.Arbitrary<ExpressConnection<S>> =>
  fc.tuple(request(), response()).map(args => new ExpressConnection(...args))
