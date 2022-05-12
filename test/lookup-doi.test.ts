import * as E from 'fp-ts/Either'
import { Status } from 'hyper-ts'
import * as _ from '../src/lookup-doi'
import * as fc from './fc'
import { runMiddleware } from './middleware'

describe('lookup-doi', () => {
  test('lookupDoi', async () => {
    await fc.assert(
      fc.asyncProperty(fc.doi(), fc.connection(), async (doi, connection) => {
        const actual = await runMiddleware(_.lookupDoi(doi), connection)()

        expect(actual).toStrictEqual(
          E.right([
            { type: 'setStatus', status: Status.Found },
            { type: 'setHeader', name: 'Location', value: `/preprints/doi-${doi.replace('/', '-')}` },
            { type: 'endResponse' },
          ]),
        )
      }),
    )
  })
})
