import { mod11_2 } from 'cdigit'
import { type Equivalence, type Option, ParseResult, pipe, type Predicate, Schema } from 'effect'
import * as C from 'io-ts/lib/Codec.js'
import * as D from 'io-ts/lib/Decoder.js'
import * as OrcidIdTs from 'orcid-id-ts'
import { FptsToEffect } from '../RefactoringUtilities/index.ts'
import type { NonEmptyString } from './NonEmptyString.ts'

export type OrcidId = OrcidIdTs.Orcid & NonEmptyString

export const isOrcidId: Predicate.Refinement<unknown, OrcidId> = OrcidIdTs.isOrcid as never

export const OrcidIdSchema = pipe(Schema.String, Schema.filter(isOrcidId)).annotations({
  arbitrary: () => fc =>
    fc
      .string({
        unit: fc.constantFrom('0', '1', '2', '3', '4', '5', '6', '7', '8', '9'),
        minLength: 4 + 4 + 4 + 3,
        maxLength: 4 + 4 + 4 + 3,
      })
      .map(value => mod11_2.generate(value).replace(/.{4}(?=.)/g, '$&-'))
      .filter(isOrcidId),
})

export const OrcidId: (orcidId: string) => OrcidId = orcidId => OrcidIdSchema.make(orcidId)

export const OrcidIdFromUrlSchema = Schema.transformOrFail(Schema.URL, Schema.typeSchema(OrcidIdSchema), {
  strict: true,
  decode: (url, _, ast) =>
    ParseResult.fromOption(parse(url.href), () => new ParseResult.Type(ast, url, 'Not an ORCID iD')),
  encode: orcidId => ParseResult.succeed(OrcidIdTs.toUrl(orcidId)),
})

export const parse: (string: string) => Option.Option<OrcidId> = FptsToEffect.optionK(OrcidIdTs.parse as never)

export const toUrl: (orcid: OrcidId) => URL = OrcidIdTs.toUrl

export const OrcidIdEquivalence: Equivalence.Equivalence<OrcidId> = FptsToEffect.eq(OrcidIdTs.Eq)

export const OrcidC = C.fromDecoder(D.fromRefinement(isOrcidId, 'ORCID'))
