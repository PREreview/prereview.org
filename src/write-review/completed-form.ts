import { pipe } from 'fp-ts/function'
import * as C from 'io-ts/Codec'
import { NonEmptyStringC } from '../string'

export type CompletedForm = C.TypeOf<typeof CompletedFormC>

export const ReviewFormC = C.struct({
  review: NonEmptyStringC,
})

export const PersonaFormC = C.struct({
  persona: C.literal('public', 'pseudonym'),
})

export const AuthorsFormC = C.struct({
  moreAuthors: C.literal('yes', 'no'),
})

export const PartialCompetingInterestsFormC = C.struct({
  competingInterests: C.literal('yes', 'no'),
})

export const CompetingInterestsFormC = C.sum('competingInterests')({
  yes: C.struct({
    competingInterests: C.literal('yes'),
    competingInterestsDetails: NonEmptyStringC,
  }),
  no: C.struct({
    competingInterests: C.literal('no'),
  }),
})

export const CodeOfConductFormC = C.struct({
  conduct: C.literal('yes'),
})

export const CompletedFormC = pipe(
  ReviewFormC,
  C.intersect(PersonaFormC),
  C.intersect(AuthorsFormC),
  C.intersect(CompetingInterestsFormC),
  C.intersect(CodeOfConductFormC),
)
