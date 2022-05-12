import * as E from 'fp-ts/Either'
import { Status } from 'hyper-ts'
import * as _ from '../src/publish-review'
import * as fc from './fc'
import { runMiddleware } from './middleware'

describe('publish-review', () => {
  test('publishReview', async () => {
    await fc.assert(
      fc.asyncProperty(fc.connection(), async connection => {
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
})
