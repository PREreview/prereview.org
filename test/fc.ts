import { Doi, isDoi } from 'doi-ts'
import { Request, Response } from 'express'
import * as fc from 'fast-check'
import * as F from 'fetch-fp-ts'
import * as H from 'hyper-ts'
import { ExpressConnection } from 'hyper-ts/lib/express'
import { Headers } from 'node-fetch'
import { Body, RequestMethod, createRequest, createResponse } from 'node-mocks-http'
import { NonEmptyString, isNonEmptyString } from '../src/string'
import { User } from '../src/user'

export * from 'fast-check'

export const error = (): fc.Arbitrary<Error> => fc.string().map(error => new Error(error))

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

const headerName = () =>
  fc.stringOf(
    fc.char().filter(char => /^[\^_`a-zA-Z\-0-9!#$%&'*+.|~]$/.test(char)),
    { minLength: 1 },
  )

const headers = () =>
  fc.option(fc.dictionary(headerName(), fc.string()), { nil: undefined }).map(init => new Headers(init))

export const fetchResponse = ({ status }: { status?: fc.Arbitrary<number> } = {}): fc.Arbitrary<F.Response> =>
  fc.record({
    headers: headers(),
    status: status ?? fc.integer(),
    statusText: fc.string(),
    url: fc.string(),
    text: fc.func(fc.string().map(text => Promise.resolve(text))),
  })

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

export const user = (): fc.Arbitrary<User> =>
  fc.record({
    name: fc.string(),
    orcid: fc.string(),
  })
