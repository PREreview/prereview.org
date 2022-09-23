import { pipe } from 'fp-ts/function'
import * as D from 'io-ts/Decoder'
import { NonEmptyStringC } from '../string'

export type CompletedForm = D.TypeOf<typeof CompletedFormD>

export const CompletedFormD = pipe(
  D.struct({
    conduct: D.literal('yes'),
    moreAuthors: D.literal('yes', 'no'),
    persona: D.literal('public', 'pseudonym'),
    review: NonEmptyStringC,
  }),
  D.intersect(
    D.sum('moreAuthors')({
      yes: D.struct({
        moreAuthors: D.literal('yes'),
        otherAuthors: pipe(D.array(NonEmptyStringC), D.readonly),
      }),
      no: D.struct({
        moreAuthors: D.literal('no'),
      }),
    }),
  ),
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
