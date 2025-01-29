import { test } from '@fast-check/jest'
import { describe, expect } from '@jest/globals'
import * as _ from '../../src/JapanLinkCenter/PreprintId.js'
import * as fc from '../fc.js'

describe('isJapanLinkCenterPreprintDoi', () => {
  test.prop([fc.japanLinkCenterPreprintDoi()])('with a Japan Link Center DOI', doi => {
    expect(_.isJapanLinkCenterPreprintDoi(doi)).toBe(true)
  })

  test.prop([fc.oneof(fc.crossrefPreprintDoi(), fc.datacitePreprintDoi(), fc.nonPreprintDoi())])(
    'with a non-Japan Link Center DOI',
    doi => {
      expect(_.isJapanLinkCenterPreprintDoi(doi)).toBe(false)
    },
  )
})
