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
    fc.test(
      'when the reviews can be loaded',
      [
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
            text: fc.html(),
          }),
        ),
      ],
      async (connection, preprint, prereviews) => {
        const getPreprint: Mock<_.GetPreprintEnv['getPreprint']> = jest.fn(_ => TE.right(preprint))
        const getPrereviews: Mock<_.GetPrereviewsEnv['getPrereviews']> = jest.fn(_ => TE.right(prereviews))

        const actual = await runMiddleware(_.preprint(preprint.id.doi)({ getPreprint, getPrereviews }), connection)()

        expect(actual).toStrictEqual(
          E.right([
            { type: 'setStatus', status: Status.OK },
            { type: 'setHeader', name: 'Content-Type', value: MediaType.textHTML },
            { type: 'setBody', body: expect.anything() },
          ]),
        )
        expect(getPreprint).toHaveBeenCalledWith(preprint.id.doi)
        expect(getPrereviews).toHaveBeenCalledWith(preprint.id)
      },
    )

    fc.test('when the preprint is not found', [fc.connection(), fc.preprintDoi()], async (connection, preprintDoi) => {
      const actual = await runMiddleware(
        _.preprint(preprintDoi)({
          getPreprint: () => TE.left('not-found'),
          getPrereviews: () => () => Promise.reject('should not be called'),
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
    })

    fc.test(
      'when the preprint is unavailable',
      [fc.connection(), fc.preprintDoi()],
      async (connection, preprintDoi) => {
        const actual = await runMiddleware(
          _.preprint(preprintDoi)({
            getPreprint: () => TE.left('unavailable'),
            getPrereviews: () => () => Promise.reject('should not be called'),
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

    fc.test('when the reviews cannot be loaded', [fc.connection(), fc.preprint()], async (connection, preprint) => {
      const actual = await runMiddleware(
        _.preprint(preprint.id.doi)({
          getPreprint: () => TE.right(preprint),
          getPrereviews: () => TE.left('unavailable'),
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
})
