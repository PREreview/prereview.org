import { pipe } from 'fp-ts/function'
import * as C from 'io-ts/Codec'
import { RawHtmlC } from '../html'
import { NonEmptyStringC } from '../string'

export type CompletedForm = C.TypeOf<typeof CompletedFormC>

export const CompletedFormC = pipe(
  C.struct({
    conduct: C.literal('yes'),
    moreAuthors: C.literal('yes', 'yes-private', 'no'),
    persona: C.literal('public', 'pseudonym'),
    review: RawHtmlC,
    reviewType: C.literal('freeform'),
  }),
  C.intersect(
    C.sum('competingInterests')({
      yes: C.struct({
        competingInterests: C.literal('yes'),
        competingInterestsDetails: NonEmptyStringC,
      }),
      no: C.struct({
        competingInterests: C.literal('no'),
      }),
    }),
  ),
)
