import type { Doi } from 'doi-ts'
import { format } from 'fp-ts-routing'
import * as E from 'fp-ts/Either'
import * as RTE from 'fp-ts/ReaderTaskEither'
import type * as TE from 'fp-ts/TaskEither'
import { flow, pipe } from 'fp-ts/function'
import { type ResponseEnded, Status, type StatusOpen } from 'hyper-ts'
import type { SessionEnv } from 'hyper-ts-session'
import * as RM from 'hyper-ts/ReaderMiddleware'
import { P, match } from 'ts-pattern'
import { type ContactEmailAddress, maybeGetContactEmailAddress } from '../../contact-email-address'
import { requiresVerifiedEmailAddress } from '../../feature-flags'
import { type Html, fixHeadingLevels, html, plainText, sendHtml } from '../../html'
import { getMethod, notFound, seeOther, serviceUnavailable } from '../../middleware'
import { type FathomEnv, type PhaseEnv, type TemplatePageEnv, page } from '../../page'
import { type PreprintTitle, getPreprintTitle } from '../../preprint'
import { handlePageResponse } from '../../response'
import { writeReviewEnterEmailAddressMatch, writeReviewMatch, writeReviewPublishedMatch } from '../../routes'
import type { EmailAddress } from '../../types/email-address'
import type { NonEmptyString } from '../../types/string'
import { type User, getUser } from '../../user'
import type { GetUserOnboardingEnv } from '../../user-onboarding'
import { type CompletedForm, CompletedFormC } from '../completed-form'
import { type Form, type FormStoreEnv, deleteForm, getForm, redirectToNextForm, saveForm } from '../form'
import { storeInformationForWriteReviewPublishedPage } from '../published-review'
import { getCompetingInterests, publishForm } from './publish-form'

export interface NewPrereview {
  conduct: 'yes'
  otherAuthors: ReadonlyArray<{ name: NonEmptyString; emailAddress: EmailAddress }>
  persona: 'public' | 'pseudonym'
  preprint: PreprintTitle
  review: Html
  structured: boolean
  user: User
}

export interface PublishPrereviewEnv {
  publishPrereview: (newPrereview: NewPrereview) => TE.TaskEither<'unavailable', [Doi, number]>
}

export const writeReviewPublish = flow(
  RM.fromReaderTaskEitherK(getPreprintTitle),
  RM.ichainW(preprint =>
    pipe(
      RM.right({ preprint }),
      RM.apSW('user', getUser),
      RM.bindW(
        'originalForm',
        RM.fromReaderTaskEitherK(({ user }) => getForm(user.orcid, preprint.id)),
      ),
      RM.bind('form', ({ originalForm }) => RM.right(CompletedFormC.decode(originalForm))),
      RM.apSW('method', RM.fromMiddleware(getMethod)),
      RM.bindW(
        'requiresVerifiedEmailAddress',
        RM.fromReaderK(({ user }) => requiresVerifiedEmailAddress(user)),
      ),
      RM.bindW('contactEmailAddress', ({ requiresVerifiedEmailAddress, user }) =>
        requiresVerifiedEmailAddress
          ? RM.fromReaderTaskEither(maybeGetContactEmailAddress(user.orcid))
          : RM.of(undefined),
      ),
      RM.ichainW(decideNextStep),
      RM.orElseW(error =>
        match(error)
          .with(
            'no-form',
            'no-session',
            RM.fromMiddlewareK(() => seeOther(format(writeReviewMatch.formatter, { id: preprint.id }))),
          )
          .with('form-unavailable', P.instanceOf(Error), 'unavailable', () => serviceUnavailable)
          .exhaustive(),
      ),
    ),
  ),
  RM.orElseW(error =>
    match(error)
      .with('not-found', () => notFound)
      .with('unavailable', () => serviceUnavailable)
      .exhaustive(),
  ),
)

const decideNextStep = (state: {
  contactEmailAddress?: ContactEmailAddress
  form: E.Either<unknown, CompletedForm>
  originalForm: Form
  preprint: PreprintTitle
  requiresVerifiedEmailAddress: boolean
  user: User
}) =>
  match(state)
    .returnType<
      RM.ReaderMiddleware<
        GetUserOnboardingEnv & FathomEnv & PhaseEnv & TemplatePageEnv & FormStoreEnv & PublishPrereviewEnv & SessionEnv,
        StatusOpen,
        ResponseEnded,
        never,
        void
      >
    >()
    .with(
      P.union({ form: P.when(E.isLeft) }, { originalForm: { alreadyWritten: P.optional(undefined) } }),
      ({ originalForm }) => RM.fromMiddleware(redirectToNextForm(state.preprint.id)(originalForm)),
    )
    .with({ requiresVerifiedEmailAddress: true, contactEmailAddress: P.optional({ type: 'unverified' }) }, () =>
      RM.fromMiddleware(seeOther(format(writeReviewEnterEmailAddressMatch.formatter, { id: state.preprint.id }))),
    )
    .with({ method: 'POST', form: P.when(E.isRight) }, ({ form, ...state }) =>
      handlePublishForm({ ...state, form: form.right }),
    )
    .with({ form: P.when(E.isRight) }, ({ form, ...state }) =>
      showPublishForm({
        ...state,
        form: form.right,
      }),
    )
    .exhaustive()

const handlePublishForm = ({
  form,
  originalForm,
  preprint,
  user,
}: {
  form: CompletedForm
  originalForm: Form
  preprint: PreprintTitle
  user: User
}) =>
  pipe(
    RM.fromReaderTaskEither(deleteForm(user.orcid, preprint.id)),
    RM.map(() => ({
      conduct: form.conduct,
      otherAuthors: form.moreAuthors === 'yes' ? form.otherAuthors : [],
      persona: form.persona,
      preprint,
      review: renderReview(form),
      structured: form.reviewType === 'questions',
      user,
    })),
    RM.chainReaderTaskEitherKW(
      flow(
        publishPrereview,
        RTE.orElseFirstW(error =>
          match(error)
            .with('unavailable', () => saveForm(user.orcid, preprint.id)(originalForm))
            .exhaustive(),
        ),
      ),
    ),
    RM.ichainFirst(() => RM.status(Status.SeeOther)),
    RM.ichainFirst(() => RM.header('Location', format(writeReviewPublishedMatch.formatter, { id: preprint.id }))),
    RM.ichainW(([doi, id]) => storeInformationForWriteReviewPublishedPage(doi, id, form)),
    RM.ichain(() => RM.closeHeaders()),
    RM.ichain(() => RM.end()),
    RM.orElseW(() => showFailureMessage(user)),
  )

const showPublishForm = ({ form, preprint, user }: { form: CompletedForm; preprint: PreprintTitle; user: User }) =>
  pipe(
    RM.of({}),
    RM.apS('user', RM.of(user)),
    RM.apS('response', RM.of(publishForm(preprint, form, user))),
    RM.ichainW(handlePageResponse),
  )

const publishPrereview = (newPrereview: NewPrereview) =>
  RTE.asksReaderTaskEither(
    RTE.fromTaskEitherK(({ publishPrereview }: PublishPrereviewEnv) => publishPrereview(newPrereview)),
  )

const showFailureMessage = flow(
  RM.fromReaderK(failureMessage),
  RM.ichainFirst(() => RM.status(Status.ServiceUnavailable)),
  RM.ichainMiddlewareK(sendHtml),
)

function renderReview(form: CompletedForm) {
  return html`${match(form)
      .with(
        { reviewType: 'questions' },
        form =>
          html` <dl>
            <div>
              <dt>Does the introduction explain the objective of the research presented in the preprint?</dt>
              <dd>
                ${match(form.introductionMatches)
                  .with('yes', () => 'Yes')
                  .with('partly', () => 'Partly')
                  .with('no', () => 'No')
                  .with('skip', () => 'I don’t know')
                  .exhaustive()}
              </dd>
              ${form.introductionMatches !== 'skip' && form.introductionMatchesDetails
                ? html` <dd>${form.introductionMatchesDetails}</dd>`
                : ''}
            </div>
            <div>
              <dt>Are the methods well-suited for this research?</dt>
              <dd>
                ${match(form.methodsAppropriate)
                  .with('inappropriate', () => 'Highly inappropriate')
                  .with('somewhat-inappropriate', () => 'Somewhat inappropriate')
                  .with('adequate', () => 'Neither appropriate nor inappropriate')
                  .with('mostly-appropriate', () => 'Somewhat appropriate')
                  .with('highly-appropriate', () => 'Highly appropriate')
                  .with('skip', () => 'I don’t know')
                  .exhaustive()}
              </dd>
              ${form.methodsAppropriate !== 'skip' && form.methodsAppropriateDetails
                ? html` <dd>${form.methodsAppropriateDetails}</dd>`
                : ''}
            </div>
            <div>
              <dt>Are the conclusions supported by the data?</dt>
              <dd>
                ${match(form.resultsSupported)
                  .with('not-supported', () => 'Highly unsupported')
                  .with('partially-supported', () => 'Somewhat unsupported')
                  .with('neutral', () => 'Neither supported nor unsupported')
                  .with('well-supported', () => 'Somewhat supported')
                  .with('strongly-supported', () => 'Highly supported')
                  .with('skip', () => 'I don’t know')
                  .exhaustive()}
              </dd>
              ${form.resultsSupported !== 'skip' && form.resultsSupportedDetails
                ? html` <dd>${form.resultsSupportedDetails}</dd>`
                : ''}
            </div>
            <div>
              <dt>Are the data presentations, including visualizations, well-suited to represent the data?</dt>
              <dd>
                ${match(form.dataPresentation)
                  .with('inappropriate-unclear', () => 'Highly inappropriate or unclear')
                  .with('somewhat-inappropriate-unclear', () => 'Somewhat inappropriate or unclear')
                  .with('neutral', () => 'Neither appropriate and clear nor inappropriate and unclear')
                  .with('mostly-appropriate-clear', () => 'Somewhat appropriate and clear')
                  .with('highly-appropriate-clear', () => 'Highly appropriate and clear')
                  .with('skip', () => 'I don’t know')
                  .exhaustive()}
              </dd>
              ${form.dataPresentation !== 'skip' && form.dataPresentationDetails
                ? html` <dd>${form.dataPresentationDetails}</dd>`
                : ''}
            </div>
            <div>
              <dt>
                How clearly do the authors discuss, explain, and interpret their findings and potential next steps for
                the research?
              </dt>
              <dd>
                ${match(form.findingsNextSteps)
                  .with('inadequately', () => 'Very unclearly')
                  .with('insufficiently', () => 'Somewhat unclearly')
                  .with('adequately', () => 'Neither clearly nor unclearly')
                  .with('clearly-insightfully', () => 'Somewhat clearly')
                  .with('exceptionally', () => 'Very clearly')
                  .with('skip', () => 'I don’t know')
                  .exhaustive()}
              </dd>
              ${form.findingsNextSteps !== 'skip' && form.findingsNextStepsDetails
                ? html` <dd>${form.findingsNextStepsDetails}</dd>`
                : ''}
            </div>
            <div>
              <dt>Is the preprint likely to advance academic knowledge?</dt>
              <dd>
                ${match(form.novel)
                  .with('no', () => 'Not at all likely')
                  .with('limited', () => 'Not likely')
                  .with('some', () => 'Moderately likely')
                  .with('substantial', () => 'Somewhat likely')
                  .with('highly', () => 'Highly likely')
                  .with('skip', () => 'I don’t know')
                  .exhaustive()}
              </dd>
              ${form.novel !== 'skip' && form.novelDetails ? html` <dd>${form.novelDetails}</dd>` : ''}
            </div>
            <div>
              <dt>Would it benefit from language editing?</dt>
              <dd>
                ${match(form.languageEditing)
                  .with('no', () => 'No')
                  .with('yes', () => 'Yes')
                  .exhaustive()}
              </dd>
              ${form.languageEditingDetails ? html` <dd>${form.languageEditingDetails}</dd>` : ''}
            </div>
            <div>
              <dt>Would you recommend this preprint to others?</dt>
              <dd>
                ${match(form.shouldRead)
                  .with('no', () => 'No, it’s of low quality or is majorly flawed')
                  .with('yes-but', () => 'Yes, but it needs to be improved')
                  .with('yes', () => 'Yes, it’s of high quality')
                  .exhaustive()}
              </dd>
              ${form.shouldReadDetails ? html` <dd>${form.shouldReadDetails}</dd>` : ''}
            </div>
            <div>
              <dt>Is it ready for attention from an editor, publisher or broader audience?</dt>
              <dd>
                ${match(form.readyFullReview)
                  .with('no', () => 'No, it needs a major revision')
                  .with('yes-changes', () => 'Yes, after minor changes')
                  .with('yes', () => 'Yes, as it is')
                  .exhaustive()}
              </dd>
              ${form.readyFullReviewDetails ? html` <dd>${form.readyFullReviewDetails}</dd>` : ''}
            </div>
          </dl>`,
      )
      .with({ reviewType: 'freeform' }, form => fixHeadingLevels(1, form.review))
      .exhaustive()}

    <h2>Competing interests</h2>

    <p>${getCompetingInterests(form)}</p>`
}

function failureMessage(user: User) {
  return page({
    title: plainText`Sorry, we’re having problems`,
    content: html`
      <main id="main-content">
        <h1>Sorry, we’re having problems</h1>

        <p>We were unable to publish your PREreview. We saved your work.</p>

        <p>Please try again later by coming back to this page.</p>

        <p>If this problem persists, please <a href="mailto:help@prereview.org">get in touch</a>.</p>
      </main>
    `,
    skipLinks: [[html`Skip to main content`, '#main-content']],
    type: 'streamline',
    user,
  })
}
