import { Effect, Layer, Option } from 'effect'
import { Orcid } from '../../../../src/ExternalApis/index.ts'
import { PersonalDetailsAreInaccessible } from '../../../../src/ExternalApis/Orcid/PersonalDetails.ts'
import * as _ from '../../../../src/ExternalInteractions/OrcidRecords/GetName/index.ts'
import * as fc from '../../../fc.ts'
import { describe, expect, it } from '../../../vitest.ts'

describe('GetName', () => {
  it.effect.prop('when the record is inaccessible', [fc.orcidId()], ([orcidId]) =>
    Effect.gen(function* () {
      const actual = yield* _.GetName(orcidId)

      expect(actual).toStrictEqual(Option.none())
    }).pipe(
      Effect.provide(
        Layer.mock(Orcid.Orcid, { getPersonalDetails: () => Effect.fail(new PersonalDetailsAreInaccessible({})) }),
      ),
    ),
  )
})
