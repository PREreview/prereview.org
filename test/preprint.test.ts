import { test } from '@fast-check/jest'
import { describe, expect, jest } from '@jest/globals'
import * as E from 'fp-ts/Either'
import * as TE from 'fp-ts/TaskEither'
import { MediaType, Status } from 'hyper-ts'
import type { Mock } from 'jest-mock'
import * as _ from '../src/preprint'
import * as fc from './fc'
import { runMiddleware } from './middleware'

describe('preprint', () => {
  describe('preprint', () => {
    test.prop([
      fc.connection(),
      fc.preprint(),
      fc.array(
        fc.record({
          authors: fc.nonEmptyArray(
            fc.record(
              {
                name: fc.string(),
                orcid: fc.orcid(),
              },
              { requiredKeys: ['name'] },
            ),
          ),
          id: fc.integer(),
          language: fc.option(fc.languageCode(), { nil: undefined }),
          text: fc.html(),
        }),
      ),
      fc.array(
        fc.record({
          author: fc.record(
            {
              name: fc.string(),
              orcid: fc.orcid(),
            },
            { requiredKeys: ['name'] },
          ),
          questions: fc.record({
            availableCode: fc.constantFrom('yes' as const, 'unsure' as const, 'na' as const, 'no' as const),
            availableData: fc.constantFrom('yes' as const, 'unsure' as const, 'na' as const, 'no' as const),
            coherent: fc.constantFrom('yes' as const, 'unsure' as const, 'na' as const, 'no' as const),
            ethics: fc.constantFrom('yes' as const, 'unsure' as const, 'na' as const, 'no' as const),
            future: fc.constantFrom('yes' as const, 'unsure' as const, 'na' as const, 'no' as const),
            limitations: fc.constantFrom('yes' as const, 'unsure' as const, 'na' as const, 'no' as const),
            methods: fc.constantFrom('yes' as const, 'unsure' as const, 'na' as const, 'no' as const),
            newData: fc.constantFrom('yes' as const, 'unsure' as const, 'na' as const, 'no' as const),
            novel: fc.constantFrom('yes' as const, 'unsure' as const, 'na' as const, 'no' as const),
            peerReview: fc.constantFrom('yes' as const, 'unsure' as const, 'na' as const, 'no' as const),
            recommend: fc.constantFrom('yes' as const, 'unsure' as const, 'na' as const, 'no' as const),
            reproducibility: fc.constantFrom('yes' as const, 'unsure' as const, 'na' as const, 'no' as const),
          }),
        }),
      ),
    ])('when the reviews can be loaded', async (connection, preprint, prereviews, rapidPrereviews) => {
      const getPreprint: Mock<_.GetPreprintEnv['getPreprint']> = jest.fn(_ => TE.right(preprint))
      const getPrereviews: Mock<_.GetPrereviewsEnv['getPrereviews']> = jest.fn(_ => TE.right(prereviews))
      const getRapidPrereviews: Mock<_.GetRapidPrereviewsEnv['getRapidPrereviews']> = jest.fn(_ =>
        TE.right(rapidPrereviews),
      )

      const actual = await runMiddleware(
        _.preprint(preprint.id.doi)({
          getPreprint,
          getPrereviews,
          getRapidPrereviews,
        }),
        connection,
      )()

      expect(actual).toStrictEqual(
        E.right([
          { type: 'setStatus', status: Status.OK },
          { type: 'setHeader', name: 'Content-Type', value: MediaType.textHTML },
          { type: 'setBody', body: expect.anything() },
        ]),
      )
      expect(getPreprint).toHaveBeenCalledWith(preprint.id.doi)
      expect(getPrereviews).toHaveBeenCalledWith(preprint.id)
      expect(getRapidPrereviews).toHaveBeenCalledWith(preprint.id)
    })

    test.prop([fc.connection(), fc.preprintDoi()])(
      'when the preprint is not found',
      async (connection, preprintDoi) => {
        const actual = await runMiddleware(
          _.preprint(preprintDoi)({
            getPreprint: () => TE.left('not-found'),
            getPrereviews: () => () => Promise.reject('should not be called'),
            getRapidPrereviews: () => () => Promise.reject('should not be called'),
          }),
          connection,
        )()

        expect(actual).toStrictEqual(
          E.right([
            { type: 'setStatus', status: Status.NotFound },
            { type: 'setHeader', name: 'Cache-Control', value: 'no-store, must-revalidate' },
            { type: 'setHeader', name: 'Content-Type', value: MediaType.textHTML },
            { type: 'setBody', body: expect.anything() },
          ]),
        )
      },
    )

    test.prop([fc.connection(), fc.preprintDoi()])(
      'when the preprint is unavailable',
      async (connection, preprintDoi) => {
        const actual = await runMiddleware(
          _.preprint(preprintDoi)({
            getPreprint: () => TE.left('unavailable'),
            getPrereviews: () => () => Promise.reject('should not be called'),
            getRapidPrereviews: () => () => Promise.reject('should not be called'),
          }),
          connection,
        )()

        expect(actual).toStrictEqual(
          E.right([
            { type: 'setStatus', status: Status.ServiceUnavailable },
            { type: 'setHeader', name: 'Content-Type', value: MediaType.textHTML },
            { type: 'setBody', body: expect.anything() },
          ]),
        )
      },
    )

    test.prop([
      fc.connection(),
      fc.preprint(),
      fc.array(
        fc.record({
          author: fc.record(
            {
              name: fc.string(),
              orcid: fc.orcid(),
            },
            { requiredKeys: ['name'] },
          ),
          questions: fc.record({
            availableCode: fc.constantFrom('yes' as const, 'unsure' as const, 'na' as const, 'no' as const),
            availableData: fc.constantFrom('yes' as const, 'unsure' as const, 'na' as const, 'no' as const),
            coherent: fc.constantFrom('yes' as const, 'unsure' as const, 'na' as const, 'no' as const),
            ethics: fc.constantFrom('yes' as const, 'unsure' as const, 'na' as const, 'no' as const),
            future: fc.constantFrom('yes' as const, 'unsure' as const, 'na' as const, 'no' as const),
            limitations: fc.constantFrom('yes' as const, 'unsure' as const, 'na' as const, 'no' as const),
            methods: fc.constantFrom('yes' as const, 'unsure' as const, 'na' as const, 'no' as const),
            newData: fc.constantFrom('yes' as const, 'unsure' as const, 'na' as const, 'no' as const),
            novel: fc.constantFrom('yes' as const, 'unsure' as const, 'na' as const, 'no' as const),
            peerReview: fc.constantFrom('yes' as const, 'unsure' as const, 'na' as const, 'no' as const),
            recommend: fc.constantFrom('yes' as const, 'unsure' as const, 'na' as const, 'no' as const),
            reproducibility: fc.constantFrom('yes' as const, 'unsure' as const, 'na' as const, 'no' as const),
          }),
        }),
      ),
    ])('when the reviews cannot be loaded', async (connection, preprint, rapidPrereviews) => {
      const actual = await runMiddleware(
        _.preprint(preprint.id.doi)({
          getPreprint: () => TE.right(preprint),
          getPrereviews: () => TE.left('unavailable'),
          getRapidPrereviews: () => TE.right(rapidPrereviews),
        }),
        connection,
      )()

      expect(actual).toStrictEqual(
        E.right([
          { type: 'setStatus', status: Status.ServiceUnavailable },
          { type: 'setHeader', name: 'Content-Type', value: MediaType.textHTML },
          { type: 'setBody', body: expect.anything() },
        ]),
      )
    })

    test.prop([
      fc.connection(),
      fc.preprint(),
      fc.array(
        fc.record({
          authors: fc.nonEmptyArray(
            fc.record(
              {
                name: fc.string(),
                orcid: fc.orcid(),
              },
              { requiredKeys: ['name'] },
            ),
          ),
          id: fc.integer(),
          language: fc.option(fc.languageCode(), { nil: undefined }),
          text: fc.html(),
        }),
      ),
    ])('when the rapid PREreviews cannot be loaded', async (connection, preprint, prereviews) => {
      const actual = await runMiddleware(
        _.preprint(preprint.id.doi)({
          getPreprint: () => TE.right(preprint),
          getPrereviews: () => TE.right(prereviews),
          getRapidPrereviews: () => TE.left('unavailable'),
        }),
        connection,
      )()

      expect(actual).toStrictEqual(
        E.right([
          { type: 'setStatus', status: Status.ServiceUnavailable },
          { type: 'setHeader', name: 'Content-Type', value: MediaType.textHTML },
          { type: 'setBody', body: expect.anything() },
        ]),
      )
    })
  })

  describe('redirectToPreprint', () => {
    test.prop([fc.connection(), fc.uuid(), fc.preprintDoi()])(
      'when the DOI is found',
      async (connection, uuid, doi) => {
        const getPreprintDoiFromUuid: Mock<_.GetPreprintDoiFromUuidEnv['getPreprintDoiFromUuid']> = jest.fn(_ =>
          TE.right(doi),
        )

        const actual = await runMiddleware(_.redirectToPreprint(uuid)({ getPreprintDoiFromUuid }), connection)()

        expect(actual).toStrictEqual(
          E.right([
            { type: 'setStatus', status: Status.MovedPermanently },
            {
              type: 'setHeader',
              name: 'Location',
              value: `/preprints/doi-${encodeURIComponent(
                doi.toLowerCase().replaceAll('-', '+').replaceAll('/', '-'),
              )}`,
            },
            { type: 'endResponse' },
          ]),
        )
        expect(getPreprintDoiFromUuid).toHaveBeenCalledWith(uuid)
      },
    )

    test.prop([fc.connection(), fc.uuid()])('when the DOI is not found', async (connection, uuid) => {
      const actual = await runMiddleware(
        _.redirectToPreprint(uuid)({ getPreprintDoiFromUuid: () => TE.left('not-found') }),
        connection,
      )()

      expect(actual).toStrictEqual(
        E.right([
          { type: 'setStatus', status: Status.NotFound },
          { type: 'setHeader', name: 'Cache-Control', value: 'no-store, must-revalidate' },
          { type: 'setHeader', name: 'Content-Type', value: MediaType.textHTML },
          { type: 'setBody', body: expect.anything() },
        ]),
      )
    })

    test.prop([fc.connection(), fc.uuid()])('when the DOI is unavailable', async (connection, uuid) => {
      const actual = await runMiddleware(
        _.redirectToPreprint(uuid)({ getPreprintDoiFromUuid: () => TE.left('unavailable') }),
        connection,
      )()

      expect(actual).toStrictEqual(
        E.right([
          { type: 'setStatus', status: Status.ServiceUnavailable },
          { type: 'setHeader', name: 'Cache-Control', value: 'no-store, must-revalidate' },
          { type: 'setHeader', name: 'Content-Type', value: MediaType.textHTML },
          { type: 'setBody', body: expect.anything() },
        ]),
      )
    })
  })
})
