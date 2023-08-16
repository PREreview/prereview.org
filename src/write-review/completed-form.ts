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
          C.sum('introductionMatches')({
            yes: pipe(
              C.struct({ introductionMatches: C.literal('yes') }),
              C.intersect(
                pipe(
                  C.partial({ introductionMatchesDetails: C.partial({ yes: NonEmptyStringC }) }),
                  C.imap(
                    form =>
                      form.introductionMatchesDetails?.['yes']
                        ? { introductionMatchesDetails: form.introductionMatchesDetails['yes'] }
                        : {},
                    form =>
                      form.introductionMatchesDetails
                        ? { introductionMatchesDetails: { yes: form.introductionMatchesDetails } }
                        : {},
                  ),
                ),
              ),
            ),
            partly: pipe(
              C.struct({ introductionMatches: C.literal('partly') }),
              C.intersect(
                pipe(
                  C.partial({ introductionMatchesDetails: C.partial({ partly: NonEmptyStringC }) }),
                  C.imap(
                    form =>
                      form.introductionMatchesDetails?.['partly']
                        ? { introductionMatchesDetails: form.introductionMatchesDetails['partly'] }
                        : {},
                    form =>
                      form.introductionMatchesDetails
                        ? { introductionMatchesDetails: { partly: form.introductionMatchesDetails } }
                        : {},
                  ),
                ),
              ),
            ),
            no: pipe(
              C.struct({ introductionMatches: C.literal('no') }),
              C.intersect(
                pipe(
                  C.partial({ introductionMatchesDetails: C.partial({ no: NonEmptyStringC }) }),
                  C.imap(
                    form =>
                      form.introductionMatchesDetails?.['no']
                        ? { introductionMatchesDetails: form.introductionMatchesDetails['no'] }
                        : {},
                    form =>
                      form.introductionMatchesDetails
                        ? { introductionMatchesDetails: { no: form.introductionMatchesDetails } }
                        : {},
                  ),
                ),
              ),
            ),
            skip: C.struct({ introductionMatches: C.literal('skip') }),
          }),
        ),
        C.intersect(
          C.sum('dataPresentation')({
            'inappropriate-unclear': pipe(
              C.struct({ dataPresentation: C.literal('inappropriate-unclear') }),
              C.intersect(
                pipe(
                  C.partial({ dataPresentationDetails: C.partial({ 'inappropriate-unclear': NonEmptyStringC }) }),
                  C.imap(
                    form =>
                      form.dataPresentationDetails?.['inappropriate-unclear']
                        ? { dataPresentationDetails: form.dataPresentationDetails['inappropriate-unclear'] }
                        : {},
                    form =>
                      form.dataPresentationDetails
                        ? { dataPresentationDetails: { 'inappropriate-unclear': form.dataPresentationDetails } }
                        : {},
                  ),
                ),
              ),
            ),
            'somewhat-inappropriate-unclear': pipe(
              C.struct({ dataPresentation: C.literal('somewhat-inappropriate-unclear') }),
              C.intersect(
                pipe(
                  C.partial({
                    dataPresentationDetails: C.partial({ 'somewhat-inappropriate-unclear': NonEmptyStringC }),
                  }),
                  C.imap(
                    form =>
                      form.dataPresentationDetails?.['somewhat-inappropriate-unclear']
                        ? { dataPresentationDetails: form.dataPresentationDetails['somewhat-inappropriate-unclear'] }
                        : {},
                    form =>
                      form.dataPresentationDetails
                        ? {
                            dataPresentationDetails: { 'somewhat-inappropriate-unclear': form.dataPresentationDetails },
                          }
                        : {},
                  ),
                ),
              ),
            ),
            neutral: pipe(
              C.struct({ dataPresentation: C.literal('neutral') }),
              C.intersect(
                pipe(
                  C.partial({ dataPresentationDetails: C.partial({ neutral: NonEmptyStringC }) }),
                  C.imap(
                    form =>
                      form.dataPresentationDetails?.['neutral']
                        ? { dataPresentationDetails: form.dataPresentationDetails['neutral'] }
                        : {},
                    form =>
                      form.dataPresentationDetails
                        ? { dataPresentationDetails: { neutral: form.dataPresentationDetails } }
                        : {},
                  ),
                ),
              ),
            ),
            'mostly-appropriate-clear': pipe(
              C.struct({ dataPresentation: C.literal('mostly-appropriate-clear') }),
              C.intersect(
                pipe(
                  C.partial({ dataPresentationDetails: C.partial({ 'mostly-appropriate-clear': NonEmptyStringC }) }),
                  C.imap(
                    form =>
                      form.dataPresentationDetails?.['mostly-appropriate-clear']
                        ? { dataPresentationDetails: form.dataPresentationDetails['mostly-appropriate-clear'] }
                        : {},
                    form =>
                      form.dataPresentationDetails
                        ? { dataPresentationDetails: { 'mostly-appropriate-clear': form.dataPresentationDetails } }
                        : {},
                  ),
                ),
              ),
            ),
            'highly-appropriate-clear': pipe(
              C.struct({ dataPresentation: C.literal('highly-appropriate-clear') }),
              C.intersect(
                pipe(
                  C.partial({ dataPresentationDetails: C.partial({ 'highly-appropriate-clear': NonEmptyStringC }) }),
                  C.imap(
                    form =>
                      form.dataPresentationDetails?.['highly-appropriate-clear']
                        ? { dataPresentationDetails: form.dataPresentationDetails['highly-appropriate-clear'] }
                        : {},
                    form =>
                      form.dataPresentationDetails
                        ? { dataPresentationDetails: { 'highly-appropriate-clear': form.dataPresentationDetails } }
                        : {},
                  ),
                ),
              ),
            ),
            skip: C.struct({ dataPresentation: C.literal('skip') }),
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
