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
  C.intersect(
    C.sum('reviewType')({
      questions: C.struct({
        reviewType: C.literal('questions'),
        introductionMatches: C.literal('yes', 'partly', 'no', 'skip'),
        methodsAppropriate: C.literal(
          'inappropriate',
          'somewhat-inappropriate',
          'adequate',
          'mostly-appropriate',
          'highly-appropriate',
          'skip',
        ),
        resultsSupported: C.literal(
          'not-supported',
          'partially-supported',
          'neutral',
          'well-supported',
          'strongly-supported',
          'skip',
        ),
      }),
      freeform: C.struct({
        reviewType: C.literal('freeform'),
        review: RawHtmlC,
      }),
    }),
  ),
)
