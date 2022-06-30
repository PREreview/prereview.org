import * as E from 'fp-ts/Either'
import { Status } from 'hyper-ts'
import * as _ from '../src/lookup-doi'
import * as fc from './fc'
import { runMiddleware } from './middleware'

describe('lookup-doi', () => {
  describe('lookupDoi', () => {
    test('with a DOI', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.doi().chain(doi => fc.tuple(fc.constant(doi), fc.connection({ body: fc.constant({ doi }) }))),
          async ([doi, connection]) => {
            const actual = await runMiddleware(_.lookupDoi, connection)()

            expect(actual).toStrictEqual(
              E.right([
                { type: 'setStatus', status: Status.SeeOther },
                {
                  type: 'setHeader',
                  name: 'Location',
                  value: `/preprints/doi-${encodeURIComponent(doi.replace(/-/g, '+').replace(/\//g, '-'))}`,
                },
                { type: 'endResponse' },
              ]),
            )
          },
        ),
      )
    })

    test('with a non-DOI', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.connection({ body: fc.record({ doi: fc.string() }, { withDeletedKeys: true }) }),
          async connection => {
            const actual = await runMiddleware(_.lookupDoi, connection)()

            expect(actual).toStrictEqual(
              E.right([
                { type: 'setStatus', status: Status.SeeOther },
                { type: 'setHeader', name: 'Location', value: '/' },
                { type: 'endResponse' },
              ]),
            )
          },
        ),
      )
    })
  })
})
