import { test } from '@fast-check/jest'
import { describe, expect } from '@jest/globals'
import { Effect, Either } from 'effect'
import * as _ from '../../../../src/ExternalApis/Datacite/GetRecord/HandleResponse.ts'
import * as StatusCodes from '../../../../src/StatusCodes.ts'
import * as EffectTest from '../../../EffectTest.ts'
import * as fc from '../../../fc.ts'
import arxiv from '../RecordSamples/arxiv.json' with { type: 'json' }
import dryadHtml from '../RecordSamples/dryad-html.json' with { type: 'json' }
import dryad from '../RecordSamples/dryad.json' with { type: 'json' }
import lifecycleJournalArticle from '../RecordSamples/lifecycle-journal-article.json' with { type: 'json' }
import lifecycleJournalRegistration from '../RecordSamples/lifecycle-journal-registration.json' with { type: 'json' }
import osfFile from '../RecordSamples/osf-file.json' with { type: 'json' }
import osfProject from '../RecordSamples/osf-project.json' with { type: 'json' }
import osfRegistration from '../RecordSamples/osf-registration.json' with { type: 'json' }
import zenodoAfricarxiv from '../RecordSamples/zenodo-africarxiv.json' with { type: 'json' }
import zenodoEmptyResourceType from '../RecordSamples/zenodo-empty-resource-type.json' with { type: 'json' }
import zenodoJournalArticle from '../RecordSamples/zenodo-journal-article.json' with { type: 'json' }
import zenodoNoAbstract from '../RecordSamples/zenodo-no-abstract.json' with { type: 'json' }
import zenodoTrailingSpace from '../RecordSamples/zenodo-trailing-space.json' with { type: 'json' }
import zenodo from '../RecordSamples/zenodo.json' with { type: 'json' }

describe('HandleResponse', () => {
  describe('with a 200 status code', () => {
    describe('with a decodable body', () => {
      test.prop([
        fc.httpClientResponse({
          json: fc.constantFrom(
            arxiv,
            dryadHtml,
            dryad,
            lifecycleJournalArticle,
            lifecycleJournalRegistration,
            osfFile,
            osfProject,
            osfRegistration,
            zenodoAfricarxiv,
            zenodoEmptyResourceType,
            zenodoJournalArticle,
            zenodoNoAbstract,
            zenodoTrailingSpace,
            zenodo,
          ) as never,
          status: fc.constant(StatusCodes.OK),
        }),
      ])('decodes the response', response =>
        Effect.gen(function* () {
          const actual = yield* Effect.either(_.HandleResponse(response))

          expect(actual).toStrictEqual(Either.right(expect.anything()))
        }).pipe(EffectTest.run),
      )
    })

    describe('with an unknown JSON body', () => {
      test.prop([
        fc.httpClientResponse({
          json: fc.json(),
          status: fc.constant(StatusCodes.OK),
        }),
      ])('returns an error', response =>
        Effect.gen(function* () {
          const actual = yield* Effect.flip(_.HandleResponse(response))

          expect(actual._tag).toStrictEqual('RecordIsUnavailable')
          expect(actual.cause).toMatchObject({ _tag: 'ParseError' })
        }).pipe(EffectTest.run),
      )
    })

    describe('with an unknown body', () => {
      test.prop([
        fc.httpClientResponse({
          status: fc.constant(StatusCodes.OK),
          text: fc.lorem(),
        }),
      ])('returns an error', response =>
        Effect.gen(function* () {
          const actual = yield* Effect.flip(_.HandleResponse(response))

          expect(actual._tag).toStrictEqual('RecordIsUnavailable')
          expect(actual.cause).toMatchObject({ _tag: 'ResponseError', reason: 'Decode', response })
        }).pipe(EffectTest.run),
      )
    })
  })

  describe('with a 404 status code', () => {
    test.prop([fc.httpClientResponse({ status: fc.constant(StatusCodes.NotFound) })])('returns an error', response =>
      Effect.gen(function* () {
        const actual = yield* Effect.flip(_.HandleResponse(response))

        expect(actual._tag).toStrictEqual('RecordIsNotFound')
        expect(actual.cause).toMatchObject({ _tag: 'ResponseError', reason: 'StatusCode', response })
      }).pipe(EffectTest.run),
    )
  })

  describe('with another status code', () => {
    test.prop([
      fc.httpClientResponse({
        status: fc.statusCode().filter(status => ![StatusCodes.OK, StatusCodes.NotFound].includes(status)),
      }),
    ])('returns an error', response =>
      Effect.gen(function* () {
        const actual = yield* Effect.flip(_.HandleResponse(response))

        expect(actual._tag).toStrictEqual('RecordIsUnavailable')
        expect(actual.cause).toMatchObject({ _tag: 'ResponseError', reason: 'StatusCode', response })
      }).pipe(EffectTest.run),
    )
  })
})
