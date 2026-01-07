import { pipe } from 'effect'
import * as C from 'io-ts/lib/Codec.js'
import * as E from 'io-ts/lib/Encoder.js'
import { RawHtmlC } from '../../html.ts'
import { EmailAddressC } from '../../types/EmailAddress.ts'
import { NonEmptyStringC } from '../../types/NonEmptyString.ts'
import type { Form } from './form.ts'

export type CompletedForm = C.TypeOf<typeof CompletedFormC>

export const CompletedFormC = pipe(
  C.struct({
    conduct: C.literal('yes'),
    moreAuthors: C.literal('yes', 'yes-private', 'no'),
    persona: C.literal('public', 'pseudonym'),
    generativeAiIdeas: C.literal('yes', 'no'),
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
    C.sum('moreAuthors')({
      yes: C.struct({
        moreAuthors: C.literal('yes'),
        otherAuthors: pipe(C.array(C.struct({ name: NonEmptyStringC, emailAddress: EmailAddressC })), C.readonly),
      }),
      'yes-private': C.struct({
        moreAuthors: C.literal('yes-private'),
      }),
      no: C.struct({
        moreAuthors: C.literal('no'),
      }),
    }),
  ),
  C.intersect(
    C.sum('reviewType')({
      questions: pipe(
        C.struct({
          reviewType: C.literal('questions'),
          alreadyWritten: C.literal('no'),
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
          dataPresentation: C.literal(
            'inappropriate-unclear',
            'somewhat-inappropriate-unclear',
            'neutral',
            'mostly-appropriate-clear',
            'highly-appropriate-clear',
            'skip',
          ),
          findingsNextSteps: C.literal(
            'inadequately',
            'insufficiently',
            'adequately',
            'clearly-insightfully',
            'exceptionally',
            'skip',
          ),
          novel: C.literal('no', 'limited', 'some', 'substantial', 'highly', 'skip'),
          languageEditing: C.literal('yes', 'no'),
          shouldRead: C.literal('no', 'yes-but', 'yes'),
          readyFullReview: C.literal('no', 'yes-changes', 'yes'),
        }),
        C.intersect(
          C.partial({
            introductionMatchesDetails: C.partial({
              yes: NonEmptyStringC,
              partly: NonEmptyStringC,
              no: NonEmptyStringC,
            }),
            methodsAppropriateDetails: C.partial({
              inappropriate: NonEmptyStringC,
              'somewhat-inappropriate': NonEmptyStringC,
              adequate: NonEmptyStringC,
              'mostly-appropriate': NonEmptyStringC,
              'highly-appropriate': NonEmptyStringC,
            }),
            resultsSupportedDetails: C.partial({
              'not-supported': NonEmptyStringC,
              'partially-supported': NonEmptyStringC,
              neutral: NonEmptyStringC,
              'well-supported': NonEmptyStringC,
              'strongly-supported': NonEmptyStringC,
            }),
            dataPresentationDetails: C.partial({
              'inappropriate-unclear': NonEmptyStringC,
              'somewhat-inappropriate-unclear': NonEmptyStringC,
              neutral: NonEmptyStringC,
              'mostly-appropriate-clear': NonEmptyStringC,
              'highly-appropriate-clear': NonEmptyStringC,
            }),
            findingsNextStepsDetails: C.partial({
              inadequately: NonEmptyStringC,
              insufficiently: NonEmptyStringC,
              adequately: NonEmptyStringC,
              'clearly-insightfully': NonEmptyStringC,
              exceptionally: NonEmptyStringC,
              skip: NonEmptyStringC,
            }),
            novelDetails: C.partial({
              no: NonEmptyStringC,
              limited: NonEmptyStringC,
              some: NonEmptyStringC,
              substantial: NonEmptyStringC,
              highly: NonEmptyStringC,
            }),
            languageEditingDetails: C.partial({
              yes: NonEmptyStringC,
              no: NonEmptyStringC,
            }),
            shouldReadDetails: C.partial({
              no: NonEmptyStringC,
              'yes-but': NonEmptyStringC,
              yes: NonEmptyStringC,
            }),
            readyFullReviewDetails: C.partial({
              no: NonEmptyStringC,
              'yes-changes': NonEmptyStringC,
              yes: NonEmptyStringC,
            }),
          }),
        ),
        C.imap(
          values => ({
            ...values,
            introductionMatchesDetails:
              values.introductionMatches !== 'skip' && values.introductionMatchesDetails?.[values.introductionMatches]
                ? values.introductionMatchesDetails[values.introductionMatches]
                : undefined,
            methodsAppropriateDetails:
              values.methodsAppropriate !== 'skip' && values.methodsAppropriateDetails?.[values.methodsAppropriate]
                ? values.methodsAppropriateDetails[values.methodsAppropriate]
                : undefined,
            resultsSupportedDetails:
              values.resultsSupported !== 'skip' && values.resultsSupportedDetails?.[values.resultsSupported]
                ? values.resultsSupportedDetails[values.resultsSupported]
                : undefined,
            dataPresentationDetails:
              values.dataPresentation !== 'skip' && values.dataPresentationDetails?.[values.dataPresentation]
                ? values.dataPresentationDetails[values.dataPresentation]
                : undefined,
            findingsNextStepsDetails:
              values.findingsNextSteps !== 'skip' && values.findingsNextStepsDetails?.[values.findingsNextSteps]
                ? values.findingsNextStepsDetails[values.findingsNextSteps]
                : undefined,
            novelDetails:
              values.novel !== 'skip' && values.novelDetails?.[values.novel]
                ? values.novelDetails[values.novel]
                : undefined,
            languageEditingDetails: values.languageEditingDetails?.[values.languageEditing],
            shouldReadDetails: values.shouldReadDetails?.[values.shouldRead],
            readyFullReviewDetails: values.readyFullReviewDetails?.[values.readyFullReview],
          }),
          values => ({
            ...values,
            introductionMatchesDetails:
              values.introductionMatches !== 'skip' && values.introductionMatchesDetails
                ? { [values.introductionMatches]: values.introductionMatchesDetails }
                : {},
            methodsAppropriateDetails:
              values.methodsAppropriate !== 'skip' && values.methodsAppropriateDetails
                ? { [values.methodsAppropriate]: values.methodsAppropriateDetails }
                : {},
            resultsSupportedDetails:
              values.resultsSupported !== 'skip' && values.resultsSupportedDetails
                ? { [values.resultsSupported]: values.resultsSupportedDetails }
                : {},
            dataPresentationDetails:
              values.dataPresentation !== 'skip' && values.dataPresentationDetails
                ? { [values.dataPresentation]: values.dataPresentationDetails }
                : {},
            findingsNextStepsDetails:
              values.findingsNextSteps !== 'skip' && values.findingsNextStepsDetails
                ? { [values.findingsNextSteps]: values.findingsNextStepsDetails }
                : {},
            novelDetails: values.novel !== 'skip' && values.novelDetails ? { [values.novel]: values.novelDetails } : {},
            languageEditingDetails: values.languageEditingDetails
              ? { [values.languageEditing]: values.languageEditingDetails }
              : {},
            shouldReadDetails: values.shouldReadDetails ? { [values.shouldRead]: values.shouldReadDetails } : {},
            readyFullReviewDetails: values.readyFullReviewDetails
              ? { [values.readyFullReview]: values.readyFullReviewDetails }
              : {},
          }),
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
