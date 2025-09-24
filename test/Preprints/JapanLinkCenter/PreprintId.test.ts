import { test } from '@fast-check/jest'
import { describe, expect } from '@jest/globals'
import * as _ from '../../../src/Preprints/JapanLinkCenter/PreprintId.ts'
import * as fc from '../../fc.ts'

describe('isJapanLinkCenterPreprintId', () => {
  test.prop([fc.japanLinkCenterPreprintId()])('with a Japan Link Center ID', id => {
    expect(_.isJapanLinkCenterPreprintId(id)).toBe(true)
  })

  test.prop([fc.oneof(fc.crossrefPreprintId(), fc.datacitePreprintId(), fc.philsciPreprintId())])(
    'with a non-Japan Link Center ID',
    id => {
      expect(_.isJapanLinkCenterPreprintId(id)).toBe(false)
    },
  )
})

describe('isDoiFromSupportedPublisher', () => {
  test.prop([fc.japanLinkCenterPreprintDoi()])('with a Japan Link Center DOI', doi => {
    expect(_.isDoiFromSupportedPublisher(doi)).toBe(true)
  })

  test.prop([fc.oneof(fc.crossrefPreprintDoi(), fc.datacitePreprintDoi(), fc.nonPreprintDoi())])(
    'with a non-Japan Link Center DOI',
    doi => {
      expect(_.isDoiFromSupportedPublisher(doi)).toBe(false)
    },
  )
})
