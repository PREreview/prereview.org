import { it } from '@effect/vitest'
import { describe, expect } from 'vitest'
import * as _ from '../../../../src/ExternalInteractions/PreprintData/JapanLinkCenter/PreprintId.ts'
import * as fc from '../../../fc.ts'

describe('isJapanLinkCenterPreprintId', () => {
  it.prop('with a Japan Link Center ID', [fc.japanLinkCenterPreprintId()], ([id]) => {
    expect(_.isJapanLinkCenterPreprintId(id)).toBe(true)
  })

  it.prop(
    'with a non-Japan Link Center ID',
    [fc.oneof(fc.crossrefPreprintId(), fc.datacitePreprintId(), fc.philsciPreprintId())],
    ([id]) => {
      expect(_.isJapanLinkCenterPreprintId(id)).toBe(false)
    },
  )
})

describe('isDoiFromSupportedPublisher', () => {
  it.prop('with a Japan Link Center DOI', [fc.japanLinkCenterPreprintDoi()], ([doi]) => {
    expect(_.isDoiFromSupportedPublisher(doi)).toBe(true)
  })

  it.prop(
    'with a non-Japan Link Center DOI',
    [fc.oneof(fc.crossrefPreprintDoi(), fc.datacitePreprintDoi(), fc.nonPreprintDoi())],
    ([doi]) => {
      expect(_.isDoiFromSupportedPublisher(doi)).toBe(false)
    },
  )
})
