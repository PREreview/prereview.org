import { test } from '@fast-check/jest'
import { describe, expect } from '@jest/globals'
import * as _ from '../src/sciety'
import * as fc from './fc'

describe('isScietyPreprint', () => {
  test.prop([
    fc.oneof(
      fc.africarxivOsfPreprintId(),
      fc.biorxivPreprintId(),
      fc.edarxivPreprintId(),
      fc.medrxivPreprintId(),
      fc.metaarxivPreprintId(),
      fc.osfPreprintId(),
      fc.psyarxivPreprintId(),
      fc.researchSquarePreprintId(),
      fc.scieloPreprintId(),
      fc.socarxivPreprintId(),
    ),
  ])('with a Sciety preprint ID', preprintId => {
    expect(_.isScietyPreprint(preprintId)).toBeTruthy()
  })

  test.prop([
    fc.oneof(
      fc.africarxivFigsharePreprintId(),
      fc.africarxivZenodoPreprintId(),
      fc.arxivPreprintId(),
      fc.authoreaPreprintId(),
      fc.chemrxivPreprintId(),
      fc.eartharxivPreprintId(),
      fc.ecoevorxivPreprintId(),
      fc.engrxivPreprintId(),
      fc.philsciPreprintId(),
      fc.preprintsorgPreprintId(),
      fc.scienceOpenPreprintId(),
      fc.zenodoPreprintId(),
    ),
  ])('with a non-Sciety preprint ID', preprintId => {
    expect(_.isScietyPreprint(preprintId)).toBeFalsy()
  })
})
