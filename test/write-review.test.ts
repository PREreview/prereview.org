import * as E from 'fp-ts/Either'
import { MediaType, Status } from 'hyper-ts'
import * as _ from '../src/write-review'
import * as fc from './fc'
import { runMiddleware } from './middleware'

describe('write-review', () => {
  test('writeReview', async () => {
    await fc.assert(
      fc.asyncProperty(fc.connection(), async connection => {
        const actual = await runMiddleware(_.writeReview, connection)()

        expect(actual).toStrictEqual(
          E.right([
            { type: 'setStatus', status: Status.OK },
            { type: 'setHeader', name: 'Content-Type', value: MediaType.textHTML },
            { type: 'setBody', body: expect.anything() },
          ]),
        )
      }),
    )
  })
})
