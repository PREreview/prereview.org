import type { Doi } from 'doi-ts'
import { format } from 'fp-ts-routing'
import type { Reader } from 'fp-ts/Reader'
import * as RTE from 'fp-ts/ReaderTaskEither'
import * as R from 'fp-ts/Refinement'
import type * as TE from 'fp-ts/TaskEither'
import { flow, pipe } from 'fp-ts/function'
import { type ResponseEnded, Status, type StatusOpen } from 'hyper-ts'
import type { SessionEnv } from 'hyper-ts-session'
import type * as M from 'hyper-ts/lib/Middleware'
import * as RM from 'hyper-ts/lib/ReaderMiddleware'
import type { Orcid } from 'orcid-id-ts'
import { getLangDir } from 'rtl-detect'
import { P, match } from 'ts-pattern'
import type { CanRapidReviewEnv } from '../feature-flags'
import { type Html, html, plainText, sendHtml } from '../html'
import { fixHeadingLevels } from '../html'
import { getMethod, notFound, seeOther, serviceUnavailable } from '../middleware'
import { type FathomEnv, type PhaseEnv, page } from '../page'
import { type PreprintTitle, getPreprintTitle } from '../preprint'
import { isPseudonym } from '../pseudonym'
import {
  profileMatch,
  writeReviewCompetingInterestsMatch,
  writeReviewConductMatch,
  writeReviewDataPresentationMatch,
  writeReviewFindingsNextStepsMatch,
  writeReviewIntroductionMatchesMatch,
  writeReviewMatch,
  writeReviewMethodsAppropriateMatch,
  writeReviewPersonaMatch,
  writeReviewPublishMatch,
  writeReviewPublishedMatch,
  writeReviewResultsSupportedMatch,
  writeReviewReviewMatch,
} from '../routes'
import { type GetUserEnv, type User, getUser } from '../user'
import { type CompletedForm, CompletedFormC } from './completed-form'
import { type FormStoreEnv, deleteForm, getForm, redirectToNextForm, saveForm } from './form'
import { storeInformationForWriteReviewPublishedPage } from './published-review'

export type NewPrereview = {
  conduct: 'yes'
  persona: 'public' | 'pseudonym'
  preprint: PreprintTitle
  review: Html
  user: User
}

export interface PublishPrereviewEnv {
  publishPrereview: (newPrereview: NewPrereview) => TE.TaskEither<unknown, [Doi, number]>
}

export const writeReviewPublish = flow(
  RM.fromReaderTaskEitherK(getPreprintTitle),
  RM.ichainW(preprint =>
    pipe(
      RM.right({ preprint }),
      RM.apSW('user', getUser),
      RM.bindW(
        'form',
        RM.fromReaderTaskEitherK(({ user }) => getForm(user.orcid, preprint.id)),
      ),
      RM.apSW('method', RM.fromMiddleware(getMethod)),
      RM.ichainW(state =>
        match(state)
          .returnType<
            RM.ReaderMiddleware<
              CanRapidReviewEnv & FathomEnv & FormStoreEnv & GetUserEnv & PhaseEnv & PublishPrereviewEnv & SessionEnv,
              StatusOpen,
              ResponseEnded,
              never,
              void
            >
          >()
          .with({ form: { alreadyWritten: P.optional(undefined) } }, ({ form, user }) =>
            redirectToNextForm(preprint.id)(form, user),
          )
          .with({ method: 'POST', form: P.when(R.fromEitherK(CompletedFormC.decode)) }, handlePublishForm)
          .with({ form: P.when(R.fromEitherK(CompletedFormC.decode)) }, showPublishForm)
          .otherwise(({ form, user }) => redirectToNextForm(preprint.id)(form, user)),
      ),
      RM.orElseW(error =>
        match(error)
          .with(
            'no-form',
            'no-session',
            fromMiddlewareK(() => seeOther(format(writeReviewMatch.formatter, { id: preprint.id }))),
          )
          .with('form-unavailable', P.instanceOf(Error), () => serviceUnavailable)
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

const handlePublishForm = ({ form, preprint, user }: { form: CompletedForm; preprint: PreprintTitle; user: User }) =>
  pipe(
    RM.fromReaderTaskEither(deleteForm(user.orcid, preprint.id)),
    RM.map(() => ({
      conduct: form.conduct,
      persona: form.persona,
      preprint,
      review: renderReview(form),
      user,
    })),
    RM.chainReaderTaskEitherKW(
      flow(
        publishPrereview,
        RTE.orElseFirstW(() => saveForm(user.orcid, preprint.id)(form)),
      ),
    ),
    RM.ichainFirst(() => RM.status(Status.SeeOther)),
    RM.ichainFirst(() => RM.header('Location', format(writeReviewPublishedMatch.formatter, { id: preprint.id }))),
    RM.ichainW(([doi, id]) => storeInformationForWriteReviewPublishedPage(doi, id, form)),
    RM.ichain(() => RM.closeHeaders()),
    RM.ichain(() => RM.end()),
    RM.orElseW(() => showFailureMessage(user)),
  )

const showPublishForm = flow(
  fromReaderK(({ form, preprint, user }: { form: CompletedForm; preprint: PreprintTitle; user: User }) =>
    publishForm(preprint, form, user),
  ),
  RM.ichainFirst(() => RM.status(Status.OK)),
  RM.ichainMiddlewareK(sendHtml),
)

const publishPrereview = (newPrereview: NewPrereview) =>
  RTE.asksReaderTaskEither(
    RTE.fromTaskEitherK(({ publishPrereview }: PublishPrereviewEnv) => publishPrereview(newPrereview)),
  )

const showFailureMessage = flow(
  fromReaderK(failureMessage),
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
              <dt>Does the introduction explain the objective and match the rest of the preprint?</dt>
              <dd>
                ${match(form.introductionMatches)
                  .with('yes', () => 'Yes')
                  .with('partly', () => 'Partly')
                  .with('no', () => 'No')
                  .with('skip', () => 'I don’t know')
                  .exhaustive()}
              </dd>
            </div>
            <div>
              <dt>Are the methods appropriate?</dt>
              <dd>
                ${match(form.methodsAppropriate)
                  .with('inappropriate', () => 'Inappropriate')
                  .with('somewhat-inappropriate', () => 'Somewhat inappropriate')
                  .with('adequate', () => 'Adequate')
                  .with('mostly-appropriate', () => 'Mostly appropriate')
                  .with('highly-appropriate', () => 'Highly appropriate')
                  .with('skip', () => 'I don’t know')
                  .exhaustive()}
              </dd>
            </div>
            <div>
              <dt>Are the results presented supported by the data?</dt>
              <dd>
                ${match(form.resultsSupported)
                  .with('not-supported', () => 'Not supported')
                  .with('partially-supported', () => 'Partially supported')
                  .with('neutral', () => 'Neither supported nor not supported')
                  .with('well-supported', () => 'Well supported')
                  .with('strongly-supported', () => 'Strongly supported')
                  .with('skip', () => 'I don’t know')
                  .exhaustive()}
              </dd>
            </div>
            <div>
              <dt>Are the data presentations, including visualizations, appropriate and clear?</dt>
              <dd>
                ${match(form.dataPresentation)
                  .with('inappropriate-unclear', () => 'Inappropriate and unclear')
                  .with('somewhat-inappropriate-unclear', () => 'Somewhat inappropriate or unclear')
                  .with('neutral', () => 'Neither adequate nor inadequate')
                  .with('mostly-appropriate-clear', () => 'Mostly appropriate and clear')
                  .with('highly-appropriate-clear', () => 'Highly appropriate and clear')
                  .with('skip', () => 'I don’t know')
                  .exhaustive()}
              </dd>
            </div>
            <div>
              <dt>
                How well do the authors discuss, explain, and interpret their findings and potential next steps for the
                research?
              </dt>
              <dd>
                ${match(form.findingsNextSteps)
                  .with('inadequately', () => 'Inadequately')
                  .with('insufficiently', () => 'Insufficiently')
                  .with('adequately', () => 'Adequately')
                  .with('clearly-insightfully', () => 'Clearly and insightfully')
                  .with('exceptionally', () => 'Exceptionally')
                  .with('skip', () => 'I don’t know')
                  .exhaustive()}
              </dd>
            </div>
          </dl>`,
      )
      .with({ reviewType: 'freeform' }, form => fixHeadingLevels(1, form.review))
      .exhaustive()}

    <h2>Competing interests</h2>

    <p>
      ${form.competingInterests === 'yes'
        ? form.competingInterestsDetails
        : 'The author declares that they have no competing interests.'}
    </p>`
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

function publishForm(preprint: PreprintTitle, review: CompletedForm, user: User) {
  return page({
    title: plainText`Publish your PREreview of “${preprint.title}”`,
    content: html`
      <nav>
        <a href="${format(writeReviewConductMatch.formatter, { id: preprint.id })}" class="back">Back</a>
      </nav>

      <main id="form">
        <single-use-form>
          <form method="post" action="${format(writeReviewPublishMatch.formatter, { id: preprint.id })}" novalidate>
            <h1>Check your PREreview</h1>

            <div class="summary-card">
              <div>
                <h2>Preprint details</h2>
              </div>

              <dl class="summary-list">
                <div>
                  <dt>Title</dt>
                  <dd>
                    <cite lang="${preprint.language}" dir="${getLangDir(preprint.language)}">${preprint.title}</cite>
                  </dd>
                </div>
                <div>
                  <dt>Preprint server</dt>
                  <dd>
                    ${match(preprint.id.type)
                      .with('africarxiv', () => 'AfricArXiv Preprints')
                      .with('arxiv', () => 'arXiv')
                      .with('biorxiv', () => 'bioRxiv')
                      .with('chemrxiv', () => 'ChemRxiv')
                      .with('eartharxiv', () => 'EarthArXiv')
                      .with('ecoevorxiv', () => 'EcoEvoRxiv')
                      .with('edarxiv', () => 'EdArXiv')
                      .with('engrxiv', () => 'engrXiv')
                      .with('medrxiv', () => 'medRxiv')
                      .with('metaarxiv', () => 'MetaArXiv')
                      .with('osf', () => 'OSF Preprints')
                      .with('philsci', () => 'PhilSci-Archive')
                      .with('preprints.org', () => 'Preprints.org')
                      .with('psyarxiv', () => 'PsyArXiv')
                      .with('research-square', () => 'Research Square')
                      .with('scielo', () => 'SciELO Preprints')
                      .with('science-open', () => 'ScienceOpen Preprints')
                      .with('socarxiv', () => 'SocArXiv')
                      .with('zenodo', () => 'Zenodo')
                      .exhaustive()}
                  </dd>
                </div>
              </dl>
            </div>

            <div class="summary-card">
              <div>
                <h2>Your details</h2>
              </div>

              <dl class="summary-list">
                <div>
                  <dt>Published name</dt>
                  <dd>${displayAuthor(review.persona === 'public' ? user : { name: user.pseudonym })}</dd>
                  <dd>
                    <a href="${format(writeReviewPersonaMatch.formatter, { id: preprint.id })}"
                      >Change <span class="visually-hidden">name</span></a
                    >
                  </dd>
                </div>

                <div>
                  <dt>Competing interests</dt>
                  <dd>${review.competingInterests === 'yes' ? review.competingInterestsDetails : 'None'}</dd>
                  <dd>
                    <a href="${format(writeReviewCompetingInterestsMatch.formatter, { id: preprint.id })}"
                      >Change <span class="visually-hidden">competing interests</span></a
                    >
                  </dd>
                </div>
              </dl>
            </div>

            <div class="summary-card">
              <div>
                <h2 id="review-label">Your review</h2>

                ${review.reviewType === 'freeform'
                  ? html`
                      <a href="${format(writeReviewReviewMatch.formatter, { id: preprint.id })}"
                        >Change <span class="visually-hidden">PREreview</span></a
                      >
                    `
                  : ''}
              </div>

              <div aria-labelledby="review-label" role="region" tabindex="0">
                ${review.reviewType === 'freeform'
                  ? fixHeadingLevels(2, review.review)
                  : html`
                      <dl class="summary-list">
                        <div>
                          <dt>Does the introduction explain the objective and match the rest of the preprint?</dt>
                          <dd>
                            ${match(review.introductionMatches)
                              .with('yes', () => 'Yes')
                              .with('partly', () => 'Partly')
                              .with('no', () => 'No')
                              .with('skip', () => 'I don’t know')
                              .exhaustive()}
                          </dd>
                          <dd>
                            <a href="${format(writeReviewIntroductionMatchesMatch.formatter, { id: preprint.id })}"
                              >Change
                              <span class="visually-hidden"
                                >if the introduction explains the objective and matches the rest of the preprint</span
                              ></a
                            >
                          </dd>
                        </div>
                        <div>
                          <dt>Are the methods appropriate?</dt>
                          <dd>
                            ${match(review.methodsAppropriate)
                              .with('inappropriate', () => 'Inappropriate')
                              .with('somewhat-inappropriate', () => 'Somewhat inappropriate')
                              .with('adequate', () => 'Adequate')
                              .with('mostly-appropriate', () => 'Mostly appropriate')
                              .with('highly-appropriate', () => 'Highly appropriate')
                              .with('skip', () => 'I don’t know')
                              .exhaustive()}
                          </dd>
                          <dd>
                            <a href="${format(writeReviewMethodsAppropriateMatch.formatter, { id: preprint.id })}"
                              >Change <span class="visually-hidden">if the methods are appropriate</span></a
                            >
                          </dd>
                        </div>
                        <div>
                          <dt>Are the results presented supported by the data?</dt>
                          <dd>
                            ${match(review.resultsSupported)
                              .with('not-supported', () => 'Not supported')
                              .with('partially-supported', () => 'Partially supported')
                              .with('neutral', () => 'Neither supported nor not supported')
                              .with('well-supported', () => 'Well supported')
                              .with('strongly-supported', () => 'Strongly supported')
                              .with('skip', () => 'I don’t know')
                              .exhaustive()}
                          </dd>
                          <dd>
                            <a href="${format(writeReviewResultsSupportedMatch.formatter, { id: preprint.id })}"
                              >Change
                              <span class="visually-hidden">if the results presented are supported by the data</span></a
                            >
                          </dd>
                        </div>
                        <div>
                          <dt>Are the data presentations, including visualizations, appropriate and clear?</dt>
                          <dd>
                            ${match(review.dataPresentation)
                              .with('inappropriate-unclear', () => 'Inappropriate and unclear')
                              .with('somewhat-inappropriate-unclear', () => 'Somewhat inappropriate or unclear')
                              .with('neutral', () => 'Neither adequate nor inadequate')
                              .with('mostly-appropriate-clear', () => 'Mostly appropriate and clear')
                              .with('highly-appropriate-clear', () => 'Highly appropriate and clear')
                              .with('skip', () => 'I don’t know')
                              .exhaustive()}
                          </dd>
                          <dd>
                            <a href="${format(writeReviewDataPresentationMatch.formatter, { id: preprint.id })}"
                              >Change
                              <span class="visually-hidden"
                                >if the data presentations are appropriate and clear</span
                              ></a
                            >
                          </dd>
                        </div>
                        <div>
                          <dt>
                            How well do the authors discuss, explain, and interpret their findings and potential next
                            steps for the research?
                          </dt>
                          <dd>
                            ${match(review.findingsNextSteps)
                              .with('inadequately', () => 'Inadequately')
                              .with('insufficiently', () => 'Insufficiently')
                              .with('adequately', () => 'Adequately')
                              .with('clearly-insightfully', () => 'Clearly and insightfully')
                              .with('exceptionally', () => 'Exceptionally')
                              .with('skip', () => 'I don’t know')
                              .exhaustive()}
                          </dd>
                          <dd>
                            <a href="${format(writeReviewFindingsNextStepsMatch.formatter, { id: preprint.id })}"
                              >Change
                              <span class="visually-hidden"
                                >how well the authors discuss their findings and next steps</span
                              ></a
                            >
                          </dd>
                        </div>
                      </dl>
                    `}
              </div>
            </div>

            <h2>Now publish your PREreview</h2>

            <p>
              We will assign your PREreview a DOI (a permanent identifier) and make it publicly available under a
              <a href="https://creativecommons.org/licenses/by/4.0/">CC&nbsp;BY&nbsp;4.0 license</a>.
            </p>

            <button>Publish PREreview</button>
          </form>
        </single-use-form>
      </main>
    `,
    js: ['single-use-form.js', 'error-summary.js'],
    skipLinks: [[html`Skip to form`, '#form']],
    type: 'streamline',
    user,
  })
}

function displayAuthor({ name, orcid }: { name: string; orcid?: Orcid }) {
  if (orcid) {
    return html`<a href="${format(profileMatch.formatter, { profile: { type: 'orcid', value: orcid } })}" class="orcid"
      >${name}</a
    >`
  }

  if (isPseudonym(name)) {
    return html`<a href="${format(profileMatch.formatter, { profile: { type: 'pseudonym', value: name } })}"
      >${name}</a
    >`
  }

  return name
}

// https://github.com/DenisFrezzato/hyper-ts/pull/83
const fromMiddlewareK =
  <R, A extends ReadonlyArray<unknown>, B, I, O, E>(
    f: (...a: A) => M.Middleware<I, O, E, B>,
  ): ((...a: A) => RM.ReaderMiddleware<R, I, O, E, B>) =>
  (...a) =>
    RM.fromMiddleware(f(...a))

// https://github.com/DenisFrezzato/hyper-ts/pull/85
function fromReaderK<R, A extends ReadonlyArray<unknown>, B, I = StatusOpen, E = never>(
  f: (...a: A) => Reader<R, B>,
): (...a: A) => RM.ReaderMiddleware<R, I, I, E, B> {
  return (...a) => RM.rightReader(f(...a))
}
