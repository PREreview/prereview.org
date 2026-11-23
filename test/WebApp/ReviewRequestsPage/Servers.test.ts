import { Array } from 'effect'
import * as _ from '../../../src/WebApp/ReviewRequestsPage/Servers.ts'
import { describe, expect, it } from '../../vitest.ts'

describe('registrantsForServer', () => {
  it('combines the registrants of servers that share them', () => {
    expect(_.registrantsForServer('biorxiv-medrxiv')).toStrictEqual(['1101', '64898'])
  })

  it.each(_.Servers)('lists each registrant for %s only once', server => {
    const registrants = _.registrantsForServer(server)

    expect(registrants).toStrictEqual(Array.dedupe(registrants))
  })
})
