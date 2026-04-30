import { mod11_2 } from 'cdigit'
import { type Equivalence, ParseResult, pipe, Schema } from 'effect'
import * as C from 'io-ts/lib/Codec.js'
import * as D from 'io-ts/lib/Decoder.js'
import * as OrcidId from 'orcid-id-ts'
import { FptsToEffect } from '../RefactoringUtilities/index.ts'

export { isOrcid as isOrcidId, Orcid as OrcidId, toUrl } from 'orcid-id-ts'

export const OrcidIdSchema = pipe(Schema.String, Schema.filter(OrcidId.isOrcid)).annotations({
  arbitrary: () => fc =>
    fc
      .string({
        unit: fc.constantFrom('0', '1', '2', '3', '4', '5', '6', '7', '8', '9'),
        minLength: 4 + 4 + 4 + 3,
        maxLength: 4 + 4 + 4 + 3,
      })
      .map(value => mod11_2.generate(value).replace(/.{4}(?=.)/g, '$&-'))
      .filter(OrcidId.isOrcid),
})

export const OrcidIdFromUrlSchema = Schema.transformOrFail(Schema.URL, Schema.typeSchema(OrcidIdSchema), {
  strict: true,
  decode: (url, _, ast) =>
    ParseResult.fromOption(parse(url.href), () => new ParseResult.Type(ast, url, 'Not an ORCID iD')),
  encode: orcidId => ParseResult.succeed(OrcidId.toUrl(orcidId)),
})

export const parse = FptsToEffect.optionK(OrcidId.parse)

export const OrcidIdEquivalence: Equivalence.Equivalence<OrcidId.Orcid> = FptsToEffect.eq(OrcidId.Eq)

export const OrcidC = C.fromDecoder(D.fromRefinement(OrcidId.isOrcid, 'ORCID'))
