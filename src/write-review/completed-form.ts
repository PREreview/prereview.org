import { pipe } from 'fp-ts/function'
import * as C from 'io-ts/Codec'
import * as E from 'io-ts/Encoder'
import { RawHtmlC } from '../html'
import { NonEmptyStringC } from '../string'
import type { Form } from './form'

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
      questions: pipe(
        C.struct({
          reviewType: C.literal('questions'),
          alreadyWritten: C.literal('no'),
          resultsSupported: C.literal(
            'not-supported',
            'partially-supported',
            'neutral',
            'well-supported',
            'strongly-supported',
            'skip',
          ),
          languageEditing: C.literal('yes', 'no'),
          shouldRead: C.literal('no', 'yes-but', 'yes'),
          readyFullReview: C.literal('no', 'yes-changes', 'yes'),
        }),
        C.intersect(
          pipe(
            C.struct({ introductionMatches: C.literal('yes', 'partly', 'no', 'skip') }),
            C.intersect(
              C.partial({
                introductionMatchesDetails: C.partial({
                  yes: NonEmptyStringC,
                  partly: NonEmptyStringC,
                  no: NonEmptyStringC,
                }),
              }),
            ),
            C.imap(
              ({ introductionMatches, introductionMatchesDetails }) =>
                introductionMatches === 'skip' || !introductionMatchesDetails?.[introductionMatches]
                  ? { introductionMatches }
                  : {
                      introductionMatches,
                      introductionMatchesDetails: introductionMatchesDetails[introductionMatches],
                    },
              ({ introductionMatches, introductionMatchesDetails }) =>
                introductionMatches === 'skip' || !introductionMatchesDetails
                  ? { introductionMatches }
                  : {
                      introductionMatches,
                      introductionMatchesDetails: { [introductionMatches]: introductionMatchesDetails },
                    },
            ),
          ),
        ),
        C.intersect(
          pipe(
            C.struct({
              methodsAppropriate: C.literal(
                'inappropriate',
                'somewhat-inappropriate',
                'adequate',
                'mostly-appropriate',
                'highly-appropriate',
                'skip',
              ),
            }),
            C.intersect(
              C.partial({
                methodsAppropriateDetails: C.partial({
                  inappropriate: NonEmptyStringC,
                  'somewhat-inappropriate': NonEmptyStringC,
                  adequate: NonEmptyStringC,
                  'mostly-appropriate': NonEmptyStringC,
                  'highly-appropriate': NonEmptyStringC,
                }),
              }),
            ),
            C.imap(
              ({ methodsAppropriate, methodsAppropriateDetails }) =>
                methodsAppropriate === 'skip' || !methodsAppropriateDetails?.[methodsAppropriate]
                  ? { methodsAppropriate }
                  : {
                      methodsAppropriate,
                      methodsAppropriateDetails: methodsAppropriateDetails[methodsAppropriate],
                    },
              ({ methodsAppropriate, methodsAppropriateDetails }) =>
                methodsAppropriate === 'skip' || !methodsAppropriateDetails
                  ? { methodsAppropriate }
                  : {
                      methodsAppropriate,
                      methodsAppropriateDetails: { [methodsAppropriate]: methodsAppropriateDetails },
                    },
            ),
          ),
        ),
        C.intersect(
          pipe(
            C.struct({
              resultsSupported: C.literal(
                'not-supported',
                'partially-supported',
                'neutral',
                'well-supported',
                'strongly-supported',
                'skip',
              ),
            }),
            C.intersect(
              C.partial({
                resultsSupportedDetails: C.partial({
                  'not-supported': NonEmptyStringC,
                  'partially-supported': NonEmptyStringC,
                  neutral: NonEmptyStringC,
                  'well-supported': NonEmptyStringC,
                  'strongly-supported': NonEmptyStringC,
                }),
              }),
            ),
            C.imap(
              ({ resultsSupported, resultsSupportedDetails }) =>
                resultsSupported === 'skip' || !resultsSupportedDetails?.[resultsSupported]
                  ? { resultsSupported }
                  : {
                      resultsSupported,
                      resultsSupportedDetails: resultsSupportedDetails[resultsSupported],
                    },
              ({ resultsSupported, resultsSupportedDetails }) =>
                resultsSupported === 'skip' || !resultsSupportedDetails
                  ? { resultsSupported }
                  : {
                      resultsSupported,
                      resultsSupportedDetails: { [resultsSupported]: resultsSupportedDetails },
                    },
            ),
          ),
        ),
        C.intersect(
          pipe(
            C.struct({
              dataPresentation: C.literal(
                'inappropriate-unclear',
                'somewhat-inappropriate-unclear',
                'neutral',
                'mostly-appropriate-clear',
                'highly-appropriate-clear',
                'skip',
              ),
            }),
            C.intersect(
              C.partial({
                dataPresentationDetails: C.partial({
                  'inappropriate-unclear': NonEmptyStringC,
                  'somewhat-inappropriate-unclear': NonEmptyStringC,
                  neutral: NonEmptyStringC,
                  'mostly-appropriate-clear': NonEmptyStringC,
                  'highly-appropriate-clear': NonEmptyStringC,
                }),
              }),
            ),
            C.imap(
              ({ dataPresentation, dataPresentationDetails }) =>
                dataPresentation === 'skip' || !dataPresentationDetails?.[dataPresentation]
                  ? { dataPresentation }
                  : {
                      dataPresentation,
                      dataPresentationDetails: dataPresentationDetails[dataPresentation],
                    },
              ({ dataPresentation, dataPresentationDetails }) =>
                dataPresentation === 'skip' || !dataPresentationDetails
                  ? { dataPresentation }
                  : {
                      dataPresentation,
                      dataPresentationDetails: { [dataPresentation]: dataPresentationDetails },
                    },
            ),
          ),
        ),
        C.intersect(
          pipe(
            C.struct({
              findingsNextSteps: C.literal(
                'inadequately',
                'insufficiently',
                'adequately',
                'clearly-insightfully',
                'exceptionally',
                'skip',
              ),
            }),
            C.intersect(
              C.partial({
                findingsNextStepsDetails: C.partial({
                  inadequately: NonEmptyStringC,
                  insufficiently: NonEmptyStringC,
                  adequately: NonEmptyStringC,
                  'clearly-insightfully': NonEmptyStringC,
                  exceptionally: NonEmptyStringC,
                  skip: NonEmptyStringC,
                }),
              }),
            ),
            C.imap(
              ({ findingsNextSteps, findingsNextStepsDetails }) =>
                findingsNextSteps === 'skip' || !findingsNextStepsDetails?.[findingsNextSteps]
                  ? { findingsNextSteps }
                  : {
                      findingsNextSteps,
                      findingsNextStepsDetails: findingsNextStepsDetails[findingsNextSteps],
                    },
              ({ findingsNextSteps, findingsNextStepsDetails }) =>
                findingsNextSteps === 'skip' || !findingsNextStepsDetails
                  ? { findingsNextSteps }
                  : {
                      findingsNextSteps,
                      findingsNextStepsDetails: { [findingsNextSteps]: findingsNextStepsDetails },
                    },
            ),
          ),
        ),
        C.intersect(
          pipe(
            C.struct({ novel: C.literal('no', 'limited', 'some', 'substantial', 'highly', 'skip') }),
            C.intersect(
              C.partial({
                novelDetails: C.partial({
                  no: NonEmptyStringC,
                  limited: NonEmptyStringC,
                  some: NonEmptyStringC,
                  substantial: NonEmptyStringC,
                  highly: NonEmptyStringC,
                }),
              }),
            ),
            C.imap(
              ({ novel, novelDetails }) =>
                novel === 'skip' || !novelDetails?.[novel] ? { novel } : { novel, novelDetails: novelDetails[novel] },
              ({ novel, novelDetails }) =>
                novel === 'skip' || !novelDetails ? { novel } : { novel, novelDetails: { [novel]: novelDetails } },
            ),
          ),
        ),
      ),
      freeform: C.struct({
        reviewType: C.literal('freeform'),
        alreadyWritten: C.literal('no', 'yes'),
        review: C.make(RawHtmlC, E.id()),
      }),
    }),
  ),
) satisfies C.Codec<Form, Form, any> // eslint-disable-line @typescript-eslint/no-explicit-any
