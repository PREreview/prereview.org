import { HttpClient, type HttpClientError, HttpClientRequest, HttpClientResponse } from '@effect/platform'
import { test } from '@fast-check/jest'
import { describe, expect, jest } from '@jest/globals'
import { Temporal } from '@js-temporal/polyfill'
import { Doi } from 'doi-ts'
import { Effect, pipe, Tuple } from 'effect'
import * as _ from '../../../src/ExternalApis/JapanLinkCenter/Record.js'
import * as EffectTest from '../../EffectTest.js'
import * as fc from '../../fc.js'

describe('getRecord', () => {
  test.prop(
    [
      fc
        .doi()
        .map(doi =>
          Tuple.make(
            doi,
            new URL(encodeURIComponent(encodeURIComponent(doi)), 'https://api.japanlinkcenter.org/dois/').href,
          ),
        ),
    ],
    {
      examples: [
        [[Doi('10.51094/jxiv.1041'), 'https://api.japanlinkcenter.org/dois/10.51094%252Fjxiv.1041']],
        [[Doi('10.51094/jxiv.1041/1'), 'https://api.japanlinkcenter.org/dois/10.51094%252Fjxiv.1041%252F1']],
      ],
    },
  )('calls the record API', ([doi, expectedUrl]) =>
    Effect.gen(function* () {
      const clientSpy = jest.fn((_: HttpClientRequest.HttpClientRequest) => new Response())
      const client = stubbedClient(clientSpy)

      yield* pipe(Effect.flip(_.getRecord(doi)), Effect.provideService(HttpClient.HttpClient, client))

      expect(clientSpy).toHaveBeenCalledWith(HttpClientRequest.get(expectedUrl))
    }).pipe(EffectTest.run),
  )

  describe('with a response', () => {
    describe('with a 200 status code', () => {
      describe('with a record', () => {
        test.prop([fc.doi()])('returns the record', doi =>
          Effect.gen(function* () {
            const record = {
              status: 'OK',
              apiType: 'doi',
              apiVersion: 'v1',
              message: { total: 1, rows: 1, totalPages: 1, page: 1 },
              data: {
                siteId: 'SI/JST.preprint',
                content_type: 'GD',
                doi,
                url: 'https://doi.org/10.51094/jxiv.1041',
                ra: 'JaLC',
                prefix: '10.51094',
                site_name: '国立研究開発法人　科学技術振興機構 (JST)　preprint',
                publisher_list: [{ publisher_name: 'Jxiv', lang: 'ja', location: 'JPN' }],
                title_list: [
                  {
                    lang: 'en',
                    title:
                      'Transitions and Future Challenges in Gender Equality and Science, Technology and Innovation Policies Targeting Women Researchers',
                  },
                  {
                    lang: 'ja',
                    title: '「女性研究者」を対象にした男女共同参画・科学 技術イノベーション政策の変遷と今後の課題',
                  },
                ],
                creator_list: [
                  {
                    sequence: '1',
                    type: 'person',
                    names: [
                      { lang: 'en', last_name: 'Shiomitsu', first_name: 'Noriko' },
                      { lang: 'ja', last_name: '塩満', first_name: '典子' },
                    ],
                    affiliation_list: [
                      { affiliation_name: 'Planning Office, Sanyo-Onoda City University', sequence: '1', lang: 'en' },
                      { affiliation_name: '山陽小野田市立山口東京理科大学　企画室', sequence: '1', lang: 'ja' },
                    ],
                  },
                  {
                    sequence: '2',
                    type: 'person',
                    names: [
                      { lang: 'en', last_name: 'Honma', first_name: 'Miwako' },
                      { lang: 'ja', last_name: '本間', first_name: '美和子' },
                    ],
                    affiliation_list: [
                      {
                        affiliation_name:
                          'Department of Biomolecular Sciences, Fukushima Medical University School of Medicine',
                        sequence: '1',
                        lang: 'en',
                      },
                      {
                        affiliation_name: '福島県立医科大学 医学部附属研究施設 生体物質研究部門',
                        sequence: '1',
                        lang: 'ja',
                      },
                    ],
                  },
                  {
                    sequence: '3',
                    type: 'person',
                    names: [
                      { lang: 'en', last_name: 'Yamada', first_name: 'Keiko ' },
                      { lang: 'ja', last_name: '山田', first_name: '惠子' },
                    ],
                    affiliation_list: [
                      {
                        affiliation_name: 'Former Center of Medical Education, Sapporo Medical University',
                        sequence: '1',
                        lang: 'en',
                      },
                      { affiliation_name: '元札幌医科大学医療人育成センター', sequence: '1', lang: 'ja' },
                    ],
                  },
                ],
                publication_date: { publication_year: '2025', publication_month: '01', publication_day: '28' },
                edition: { version: '2' },
                relation_list: [
                  {
                    content: 'https://jxiv.jst.go.jp/index.php/jxiv/preprint/download/1041/2898',
                    type: 'URL',
                    relation: 'fullTextPdf',
                  },
                ],
                updated_date: '2025-01-28',
              },
            }

            const client = stubbedClient(() => new Response(JSON.stringify(record), { status: 200 }))

            const actual = yield* pipe(_.getRecord(doi), Effect.provideService(HttpClient.HttpClient, client))

            expect(actual).toStrictEqual(
              new _.Record({
                content_type: 'GD',
                doi,
                url: new URL('https://doi.org/10.51094/jxiv.1041'),
                title_list: [
                  {
                    lang: 'en',
                    title:
                      'Transitions and Future Challenges in Gender Equality and Science, Technology and Innovation Policies Targeting Women Researchers',
                  },
                  {
                    lang: 'ja',
                    title: '「女性研究者」を対象にした男女共同参画・科学 技術イノベーション政策の変遷と今後の課題',
                  },
                ],
                creator_list: [
                  {
                    type: 'person',
                    names: [
                      { lang: 'en', last_name: 'Shiomitsu', first_name: 'Noriko' },
                      { lang: 'ja', last_name: '塩満', first_name: '典子' },
                    ],
                    researcher_id_list: [],
                  },
                  {
                    type: 'person',
                    names: [
                      { lang: 'en', last_name: 'Honma', first_name: 'Miwako' },
                      { lang: 'ja', last_name: '本間', first_name: '美和子' },
                    ],
                    researcher_id_list: [],
                  },
                  {
                    type: 'person',
                    names: [
                      { lang: 'en', last_name: 'Yamada', first_name: 'Keiko ' },
                      { lang: 'ja', last_name: '山田', first_name: '惠子' },
                    ],
                    researcher_id_list: [],
                  },
                ],
                publication_date: Temporal.PlainDate.from('2025-01-28'),
              }),
            )
          }).pipe(EffectTest.run),
        )
      })

      describe('with a unknown body', () => {
        test.prop([fc.doi(), fc.string()])('returns an error', (doi, body) =>
          Effect.gen(function* () {
            const client = stubbedClient(() => new Response(body, { status: 200 }))

            const actual = yield* pipe(
              Effect.flip(_.getRecord(doi)),
              Effect.provideService(HttpClient.HttpClient, client),
            )

            expect(actual._tag).toStrictEqual('RecordIsUnavailable')
            expect(actual.cause).toStrictEqual(
              expect.objectContaining({ _tag: expect.stringMatching(/^ParseError|ResponseError$/) }),
            )
          }).pipe(EffectTest.run),
        )
      })
    })

    describe('with a 404 status code', () => {
      test.prop([fc.doi()])('always fails', doi =>
        Effect.gen(function* () {
          const client = stubbedClient(() => new Response(null, { status: 404 }))

          const actual = yield* pipe(
            Effect.flip(_.getRecord(doi)),
            Effect.provideService(HttpClient.HttpClient, client),
          )

          expect(actual._tag).toStrictEqual('RecordIsNotFound')
          expect(actual.cause).toStrictEqual(expect.objectContaining({ status: 404 }))
        }).pipe(EffectTest.run),
      )
    })

    describe('with another status code', () => {
      test.prop([fc.doi(), fc.statusCode().filter(status => status >= 201 && status !== 404)])(
        'with another status code',
        (doi, status) =>
          Effect.gen(function* () {
            const client = stubbedClient(() => new Response(null, { status }))

            const actual = yield* pipe(
              Effect.flip(_.getRecord(doi)),
              Effect.provideService(HttpClient.HttpClient, client),
            )

            expect(actual._tag).toStrictEqual('RecordIsUnavailable')
            expect(actual.cause).toStrictEqual(expect.objectContaining({ status }))
          }).pipe(EffectTest.run),
      )
    })
  })

  describe('with a request error', () => {
    test.prop([fc.doi(), fc.httpClientRequestError()])('returns unavailable', (doi, error) =>
      Effect.gen(function* () {
        const client = stubbedFailingClient(() => error)
        const actual = yield* pipe(Effect.flip(_.getRecord(doi)), Effect.provideService(HttpClient.HttpClient, client))

        expect(actual._tag).toStrictEqual('RecordIsUnavailable')
        expect(actual.cause).toStrictEqual(error)
      }).pipe(EffectTest.run),
    )
  })

  describe('with a response error', () => {
    test.prop([fc.doi(), fc.httpClientResponseError()])('returns unavailable', (doi, error) =>
      Effect.gen(function* () {
        const client = stubbedFailingClient(() => error)
        const actual = yield* pipe(Effect.flip(_.getRecord(doi)), Effect.provideService(HttpClient.HttpClient, client))

        expect(actual._tag).toStrictEqual('RecordIsUnavailable')
        expect(actual.cause).toStrictEqual(error)
      }).pipe(EffectTest.run),
    )
  })
})

const stubbedClient = (f: (request: HttpClientRequest.HttpClientRequest) => Response) =>
  HttpClient.makeWith<never, never, never, never>(
    Effect.andThen(request => HttpClientResponse.fromWeb(request, f(request))),
    Effect.succeed,
  )

const stubbedFailingClient = (f: (request: HttpClientRequest.HttpClientRequest) => HttpClientError.HttpClientError) =>
  HttpClient.makeWith<never, never, HttpClientError.HttpClientError, never>(
    Effect.andThen(request => Effect.fail(f(request))),
    Effect.succeed,
  )
