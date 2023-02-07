import { test } from '@fast-check/jest'
import { describe, expect, jest } from '@jest/globals'
import * as E from 'fp-ts/Either'
import * as TE from 'fp-ts/TaskEither'
import { MediaType, Status } from 'hyper-ts'
import type { Mock } from 'jest-mock'
import * as _ from '../src/review'
import * as fc from './fc'
import { runMiddleware } from './middleware'

describe('review', () => {
  describe('review', () => {
    test.prop([
      fc.integer(),
      fc.connection({ method: fc.requestMethod().filter(method => method !== 'POST') }),
      fc.record({
        authors: fc.nonEmptyArray(fc.record({ name: fc.string(), orcid: fc.orcid() }, { requiredKeys: ['name'] })),
        doi: fc.doi(),
        language: fc.option(fc.languageCode(), { nil: undefined }),
        license: fc.constant('CC-BY-4.0' as const),
        published: fc.plainDate(),
        preprint: fc.record({
          doi: fc.preprintDoi(),
          language: fc.languageCode(),
          title: fc.html(),
        }),
        text: fc.html(),
      }),
    ])('when the review can be loaded', async (id, connection, prereview) => {
      const getPrereview: Mock<_.GetPrereviewEnv['getPrereview']> = jest.fn(_ => TE.right(prereview))

      const actual = await runMiddleware(_.review(id)({ getPrereview }), connection)()

      expect(actual).toStrictEqual(
        E.right([
          { type: 'setStatus', status: Status.OK },
          { type: 'setHeader', name: 'Content-Type', value: MediaType.textHTML },
          { type: 'setBody', body: expect.anything() },
        ]),
      )
      expect(getPrereview).toHaveBeenCalledWith(id)
    })

    test.prop([fc.integer(), fc.connection({ method: fc.requestMethod().filter(method => method !== 'POST') })])(
      'when the review is not found',
      async (id, connection) => {
        const actual = await runMiddleware(
          _.review(id)({ getPrereview: () => TE.left({ status: Status.NotFound }) }),
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

    test.prop([
      fc.integer(),
      fc.connection({ method: fc.requestMethod().filter(method => method !== 'POST') }),
      fc.anything(),
    ])('when the review cannot be loaded', async (id, connection, error) => {
      const actual = await runMiddleware(_.review(id)({ getPrereview: () => TE.left(error) }), connection)()

      expect(actual).toStrictEqual(
        E.right([
          { type: 'setStatus', status: Status.ServiceUnavailable },
          { type: 'setHeader', name: 'Content-Type', value: MediaType.textHTML },
          { type: 'setBody', body: expect.anything() },
        ]),
      )
    })
  })
})
