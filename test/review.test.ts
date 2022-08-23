import { isNonEmpty } from 'fp-ts/Array'
import * as E from 'fp-ts/Either'
import * as TE from 'fp-ts/TaskEither'
import { MediaType, Status } from 'hyper-ts'
import * as _ from '../src/review'
import * as fc from './fc'
import { runMiddleware } from './middleware'

describe('review', () => {
  describe('review', () => {
    test('when the review can be loaded', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer(),
          fc.connection({ method: fc.requestMethod().filter(method => method !== 'POST') }),
          fc.record({
            authors: fc
              .array(fc.record({ name: fc.string(), orcid: fc.orcid() }, { requiredKeys: ['name'] }), { minLength: 1 })
              .filter(isNonEmpty),
            doi: fc.doi(),
            postedDate: fc.plainDate(),
            preprint: fc.record({ doi: fc.preprintDoi(), language: fc.constant('en' as const), title: fc.html() }),
            text: fc.html(),
          }),
          async (id, connection, prereview) => {
            const getPrereview: jest.MockedFunction<_.GetPrereviewEnv['getPrereview']> = jest.fn(_ =>
              TE.right(prereview),
            )

            const actual = await runMiddleware(_.review(id)({ getPrereview }), connection)()

            expect(actual).toStrictEqual(
              E.right([
                { type: 'setStatus', status: Status.OK },
                { type: 'setHeader', name: 'Content-Type', value: MediaType.textHTML },
                { type: 'setBody', body: expect.anything() },
              ]),
            )
            expect(getPrereview).toHaveBeenCalledWith(id)
          },
        ),
      )
    })

    test('when the review is not found', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer(),
          fc.connection({ method: fc.requestMethod().filter(method => method !== 'POST') }),
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
        ),
      )
    })

    test('when the review cannot be loaded', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer(),
          fc.connection({ method: fc.requestMethod().filter(method => method !== 'POST') }),
          fc.anything(),
          async (id, connection, error) => {
            const actual = await runMiddleware(_.review(id)({ getPrereview: () => TE.left(error) }), connection)()

            expect(actual).toStrictEqual(
              E.right([
                { type: 'setStatus', status: Status.ServiceUnavailable },
                { type: 'setHeader', name: 'Content-Type', value: MediaType.textHTML },
                { type: 'setBody', body: expect.anything() },
              ]),
            )
          },
        ),
      )
    })
  })
})
