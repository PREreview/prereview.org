import * as E from 'fp-ts/Either'
import { Status } from 'hyper-ts'
import * as _ from '../src/publish-review'
import * as fc from './fc'
import { runMiddleware } from './middleware'

describe('publish-review', () => {
  describe('publishReview', () => {
    test('with a string', async () => {
      await fc.assert(
        fc.asyncProperty(fc.connection({ body: fc.record({ review: fc.nonEmptyString() }) }), async connection => {
          const actual = await runMiddleware(_.publishReview, connection)()

          expect(actual).toStrictEqual(
            E.right([
              { type: 'setStatus', status: Status.SeeOther },
              { type: 'setHeader', name: 'Location', value: '/preprints/doi-10.1101-2022.01.13.476201/success' },
              { type: 'endResponse' },
            ]),
          )
        }),
      )
    })

    test('with an empty string', async () => {
      await fc.assert(
        fc.asyncProperty(fc.connection({ body: fc.record({ content: fc.constant('') }) }), async connection => {
          const actual = await runMiddleware(_.publishReview, connection)()

          expect(actual).toStrictEqual(
            E.right([
              { type: 'setStatus', status: Status.SeeOther },
              { type: 'setHeader', name: 'Location', value: '/preprints/doi-10.1101-2022.01.13.476201/review' },
              { type: 'endResponse' },
            ]),
          )
        }),
      )
    })
  })
})
