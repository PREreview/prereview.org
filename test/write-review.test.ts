import * as E from 'fp-ts/Either'
import { MediaType, Status } from 'hyper-ts'
import * as _ from '../src/write-review'
import * as fc from './fc'
import { runMiddleware } from './middleware'

describe('write-review', () => {
  describe('writeReview', () => {
    test('non-POST request', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.connection({ method: fc.requestMethod().filter(method => method !== 'POST') }),
          async connection => {
            const actual = await runMiddleware(_.writeReview, connection)()

            expect(actual).toStrictEqual(
              E.right([
                { type: 'setStatus', status: Status.OK },
                { type: 'setHeader', name: 'Content-Type', value: MediaType.textHTML },
                { type: 'setBody', body: expect.anything() },
              ]),
            )
          },
        ),
      )
    })

    describe('POST request', () => {
      test('with a string', async () => {
        await fc.assert(
          fc.asyncProperty(
            fc.connection({ body: fc.record({ review: fc.nonEmptyString() }), method: fc.constant('POST') }),
            async connection => {
              const actual = await runMiddleware(_.writeReview, connection)()

              expect(actual).toStrictEqual(
                E.right([
                  { type: 'setStatus', status: Status.SeeOther },
                  { type: 'setHeader', name: 'Location', value: '/preprints/doi-10.1101-2022.01.13.476201/success' },
                  { type: 'endResponse' },
                ]),
              )
            },
          ),
        )
      })

      test('with an empty string', async () => {
        await fc.assert(
          fc.asyncProperty(
            fc.connection({ body: fc.record({ review: fc.constant('') }), method: fc.constant('POST') }),
            async connection => {
              const actual = await runMiddleware(_.writeReview, connection)()

              expect(actual).toStrictEqual(
                E.right([
                  { type: 'setStatus', status: Status.SeeOther },
                  { type: 'setHeader', name: 'Location', value: '/preprints/doi-10.1101-2022.01.13.476201/review' },
                  { type: 'endResponse' },
                ]),
              )
            },
          ),
        )
      })
    })
  })
})
