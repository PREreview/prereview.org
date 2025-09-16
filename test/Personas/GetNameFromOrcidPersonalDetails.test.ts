import { test } from '@fast-check/jest'
import { describe, expect } from '@jest/globals'
import { Option, Tuple } from 'effect'
import { Orcid } from '../../src/ExternalApis/index.js'
import * as _ from '../../src/Personas/GetNameFromOrcidPersonalDetails.js'
import { NonEmptyString } from '../../src/types/NonEmptyString.js'
import * as fc from '../fc.js'

describe('GetNameFromOrcidPersonalDetails', () => {
  test.prop(
    [
      fc
        .tuple(fc.nonEmptyString(), fc.nonEmptyString(), fc.nonEmptyString())
        .map(([creditName, givenNames, familyName]) =>
          Tuple.make<[string | undefined, string, string | undefined, string]>(
            creditName,
            givenNames,
            familyName,
            creditName,
          ),
        ),
    ],
    {
      examples: [
        [['J. S. Carberry', 'Josiah', 'Carberry', 'J. S. Carberry']],
        [[undefined, 'Josiah', 'Carberry', 'Josiah Carberry']],
        [[undefined, 'Josiah', undefined, 'Josiah']],
      ],
    },
  )('with a name', ([creditName, givenNames, familyName, expected]) => {
    const personalDetails = new Orcid.PersonalDetails({
      ...stubPersonalDetails,
      name: {
        givenNames: { value: NonEmptyString(givenNames) },
        familyName: typeof familyName === 'string' ? { value: NonEmptyString(familyName) } : null,
        creditName: typeof creditName === 'string' ? { value: NonEmptyString(creditName) } : null,
      },
    })

    const actual = _.GetNameFromOrcidPersonalDetails(personalDetails)

    expect(actual).toStrictEqual(Option.some(expected))
  })

  test.each([null, { givenNames: null, familyName: null, creditName: null }])('without a name', name => {
    const personalDetails = new Orcid.PersonalDetails({
      ...stubPersonalDetails,
      name,
    })

    const actual = _.GetNameFromOrcidPersonalDetails(personalDetails)

    expect(actual).toStrictEqual(Option.none())
  })
})

const stubPersonalDetails = new Orcid.PersonalDetails({ name: null })
