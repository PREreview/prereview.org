import { Temporal } from '@js-temporal/polyfill'
import { mod11_2 } from 'cdigit'
import { Doi, isDoi } from 'doi-ts'
import { Request, Response } from 'express'
import * as fc from 'fast-check'
import * as F from 'fetch-fp-ts'
import { isNonEmpty } from 'fp-ts/Array'
import { Refinement } from 'fp-ts/Refinement'
import * as H from 'hyper-ts'
import { ExpressConnection } from 'hyper-ts/lib/express'
import ISO6391, { LanguageCode } from 'iso-639-1'
import { Headers as FetchHeaders } from 'node-fetch'
import { Body, Headers, RequestMethod, createRequest, createResponse } from 'node-mocks-http'
import { Orcid, isOrcid } from 'orcid-id-ts'
import { Html, rawHtml, sanitizeHtml } from '../src/html'
import { Preprint } from '../src/preprint'
import { BiorxivPreprintId, MedrxivPreprintId, PreprintId, ScieloPreprintId } from '../src/preprint-id'
import { NonEmptyString, isNonEmptyString } from '../src/string'
import { User } from '../src/user'

export * from 'fast-check'

export const error = (): fc.Arbitrary<Error> => fc.string().map(error => new Error(error))

export const html = (): fc.Arbitrary<Html> => fc.string().map(rawHtml)

export const sanitisedHtml = (): fc.Arbitrary<Html> => fc.string().map(sanitizeHtml)

export const doiRegistrant = (): fc.Arbitrary<string> =>
  fc
    .tuple(
      fc.stringOf(fc.constantFrom('0', '1', '2', '3', '4', '5', '6', '7', '8', '9'), { minLength: 2 }),
      fc.array(fc.stringOf(fc.constantFrom('0', '1', '2', '3', '4', '5', '6', '7', '8', '9'), { minLength: 1 })),
    )
    .map(([one, two]) => [one, ...two].join('.'))

export const doi = <R extends string>(withRegistrant?: fc.Arbitrary<R>): fc.Arbitrary<Doi<R>> =>
  fc
    .tuple(withRegistrant ?? doiRegistrant(), fc.unicodeString({ minLength: 1 }))
    .map(([prefix, suffix]) => `10.${prefix}/${suffix}`)
    .filter(isDoi as Refinement<unknown, Doi<R>>)

export const preprintDoi = (): fc.Arbitrary<PreprintId['doi']> => preprintId().map(id => id.doi)

export const biorxivPreprintId = (): fc.Arbitrary<BiorxivPreprintId> =>
  fc.record({
    type: fc.constant('biorxiv'),
    doi: doi(fc.constant('1101')),
  })

export const medrxivPreprintId = (): fc.Arbitrary<MedrxivPreprintId> =>
  fc.record({
    type: fc.constant('medrxiv'),
    doi: doi(fc.constant('1101')),
  })

export const scieloPreprintId = (): fc.Arbitrary<ScieloPreprintId> =>
  fc.record({
    type: fc.constant('scielo'),
    doi: doi(fc.constant('1590')),
  })

export const preprintId = (): fc.Arbitrary<PreprintId> =>
  fc.oneof(biorxivPreprintId(), medrxivPreprintId(), scieloPreprintId())

export const orcid = (): fc.Arbitrary<Orcid> =>
  fc
    .stringOf(fc.constantFrom('0', '1', '2', '3', '4', '5', '6', '7', '8', '9'), {
      minLength: 4 + 4 + 4 + 3,
      maxLength: 4 + 4 + 4 + 3,
    })
    .map(value => mod11_2.generate(value).replace(/.{4}(?=.)/g, '$&-'))
    .filter(isOrcid)

const year = (): fc.Arbitrary<number> => fc.integer({ min: -271820, max: 275759 })

export const plainDate = (): fc.Arbitrary<Temporal.PlainDate> =>
  fc
    .record({
      year: year(),
      month: fc.integer({ min: 1, max: 12 }),
      day: fc.integer({ min: 1, max: 31 }),
    })
    .map(args => Temporal.PlainDate.from(args))

export const url = (): fc.Arbitrary<URL> => fc.webUrl().map(url => new URL(url))

export const requestMethod = (): fc.Arbitrary<RequestMethod> =>
  fc.constantFrom('CONNECT', 'DELETE', 'GET', 'HEAD', 'OPTIONS', 'PATCH', 'POST', 'PUT', 'TRACE')

const headerName = () =>
  fc.stringOf(
    fc.char().filter(char => /^[\^_`a-zA-Z\-0-9!#$%&'*+.|~]$/.test(char)),
    { minLength: 1 },
  )

const headers = () =>
  fc.option(fc.dictionary(headerName(), fc.string()), { nil: undefined }).map(init => new FetchHeaders(init))

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
  headers,
  method,
}: {
  body?: fc.Arbitrary<Body>
  headers?: fc.Arbitrary<Headers>
  method?: fc.Arbitrary<RequestMethod>
} = {}): fc.Arbitrary<Request> =>
  fc
    .record({
      body: body ?? fc.constant(undefined),
      headers: headers ?? fc.constant({}),
      method: method ?? requestMethod(),
      url: fc.webUrl(),
    })
    .map(createRequest)

export const response = (): fc.Arbitrary<Response> => fc.record({ req: request() }).map(createResponse)

export const connection = <S = H.StatusOpen>(...args: Parameters<typeof request>): fc.Arbitrary<ExpressConnection<S>> =>
  fc.tuple(request(...args), response()).map(args => new ExpressConnection(...args))

export const nonEmptyString = (): fc.Arbitrary<NonEmptyString> => fc.string({ minLength: 1 }).filter(isNonEmptyString)

export const languageCode = (): fc.Arbitrary<LanguageCode> => fc.constantFrom(...ISO6391.getAllCodes())

export const user = (): fc.Arbitrary<User> =>
  fc.record(
    {
      name: fc.string(),
      orcid: orcid(),
      pseudonym: fc.string(),
    },
    { requiredKeys: ['name', 'orcid'] },
  )

export const preprint = (): fc.Arbitrary<Preprint> =>
  fc.record({
    abstract: html(),
    authors: fc
      .array(
        fc.record(
          {
            name: fc.string(),
            orcid: orcid(),
          },
          { requiredKeys: ['name'] },
        ),
        { minLength: 1 },
      )
      .filter(isNonEmpty),
    id: preprintId(),
    language: languageCode(),
    posted: plainDate(),
    title: html(),
    url: url(),
  })
