import { pipe } from 'fp-ts/function'
import * as D from 'io-ts/Decoder'
import { NonEmptyStringC } from '../string'

export type CompletedForm = D.TypeOf<typeof CompletedFormD>

export const ReviewFormD = D.struct({
  review: NonEmptyStringC,
})

export const PersonaFormD = D.struct({
  persona: D.literal('public', 'pseudonym'),
})

export const AuthorsFormD = D.struct({
  moreAuthors: D.literal('yes', 'no'),
})

export const PartialCompetingInterestsFormD = D.struct({
  competingInterests: D.literal('yes', 'no'),
})

export const CompetingInterestsFormD = D.sum('competingInterests')({
  yes: D.struct({
    competingInterests: D.literal('yes'),
    competingInterestsDetails: NonEmptyStringC,
  }),
  no: D.struct({
    competingInterests: D.literal('no'),
  }),
})

export const CodeOfConductFormD = D.struct({
  conduct: D.literal('yes'),
})

export const CompletedFormD = pipe(
  D.struct({
    conduct: D.literal('yes'),
    moreAuthors: D.literal('yes', 'no'),
    persona: D.literal('public', 'pseudonym'),
    review: NonEmptyStringC,
  }),
  D.intersect(
    D.sum('competingInterests')({
      yes: D.struct({
        competingInterests: D.literal('yes'),
        competingInterestsDetails: NonEmptyStringC,
      }),
      no: D.struct({
        competingInterests: D.literal('no'),
      }),
    }),
  ),
)
