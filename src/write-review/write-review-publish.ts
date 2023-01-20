import { Doi } from 'doi-ts'
import { format } from 'fp-ts-routing'
import { Reader } from 'fp-ts/Reader'
import * as RTE from 'fp-ts/ReaderTaskEither'
import * as R from 'fp-ts/Refinement'
import * as TE from 'fp-ts/TaskEither'
import { flow, pipe } from 'fp-ts/function'
import { Status, StatusOpen } from 'hyper-ts'
import { endSession } from 'hyper-ts-session'
import * as M from 'hyper-ts/lib/Middleware'
import * as RM from 'hyper-ts/lib/ReaderMiddleware'
import { Orcid } from 'orcid-id-ts'
import { getLangDir } from 'rtl-detect'
import { P, match } from 'ts-pattern'
import { Html, html, plainText, sendHtml } from '../html'
import { getMethod, notFound, seeOther, serviceUnavailable } from '../middleware'
import { page } from '../page'
import {
  preprintMatch,
  writeReviewConductMatch,
  writeReviewMatch,
  writeReviewPersonaMatch,
  writeReviewPublishMatch,
  writeReviewReviewMatch,
} from '../routes'
import { User, getUserFromSession } from '../user'
import { CompletedForm, CompletedFormD } from './completed-form'
import { deleteForm, getForm, redirectToNextForm } from './form'
import { Preprint, getPreprint } from './preprint'

export type NewPrereview = {
  conduct: 'yes'
  persona: 'public' | 'pseudonym'
  preprint: Preprint
  review: Html
  user: User
}

export interface PublishPrereviewEnv {
  publishPrereview: (newPrereview: NewPrereview) => TE.TaskEither<unknown, Doi>
}

export const writeReviewPublish = flow(
  RM.fromReaderTaskEitherK(getPreprint),
  RM.ichainW(preprint =>
    pipe(
      RM.right({ preprint }),
      RM.apS('user', getUserFromSession()),
      RM.bindW(
        'form',
        RM.fromReaderTaskEitherK(({ user }) => getForm(user.orcid, preprint.doi)),
      ),
      RM.apSW('method', RM.fromMiddleware(getMethod)),
      RM.ichainW(state =>
        match(state)
          .with({ method: 'POST', form: P.when(R.fromEitherK(CompletedFormD.decode)) }, handlePublishForm)
          .with({ method: 'POST', preprint: P.select() }, showFailureMessage)
          .with({ form: P.when(R.fromEitherK(CompletedFormD.decode)) }, showPublishForm)
          .otherwise(flow(({ form }) => form, fromMiddlewareK(redirectToNextForm(preprint.doi)))),
      ),
      RM.orElseW(error =>
        match(error)
          .with(
            'no-form',
            'no-session',
            fromMiddlewareK(() => seeOther(format(writeReviewMatch.formatter, { doi: preprint.doi }))),
          )
          .with('form-unavailable', 'session-unavailable', () => serviceUnavailable)
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

const handlePublishForm = ({ form, preprint, user }: { form: CompletedForm; preprint: Preprint; user: User }) =>
  pipe(
    RM.fromReaderTaskEither(deleteForm(user.orcid, preprint.doi)),
    RM.map(() => ({
      conduct: form.conduct,
      persona: form.persona,
      preprint,
      review: renderReview(form),
      user,
    })),
    RM.chainReaderTaskEitherKW(publishPrereview),
    RM.ichainW(doi => showSuccessMessage(preprint, doi, form.moreAuthors === 'yes')),
    RM.orElseW(() => showFailureMessage(preprint)),
  )

const showPublishForm = flow(
  fromReaderK(({ form, preprint, user }: { form: CompletedForm; preprint: Preprint; user: User }) =>
    publishForm(preprint, form, user),
  ),
  RM.ichainFirst(() => RM.status(Status.OK)),
  RM.ichainMiddlewareK(sendHtml),
)

const publishPrereview = (newPrereview: NewPrereview) =>
  RTE.asksReaderTaskEither(
    RTE.fromTaskEitherK(({ publishPrereview }: PublishPrereviewEnv) => publishPrereview(newPrereview)),
  )

const showSuccessMessage = flow(
  fromReaderK(successMessage),
  RM.ichainFirst(() => RM.status(Status.OK)),
  RM.ichainFirstW(() =>
    pipe(
      endSession(),
      RM.orElseW(() => RM.right(undefined)),
    ),
  ),
  RM.ichainMiddlewareKW(sendHtml),
)

const showFailureMessage = flow(
  fromReaderK(failureMessage),
  RM.ichainFirst(() => RM.status(Status.ServiceUnavailable)),
  RM.ichainFirstW(() =>
    pipe(
      endSession(),
      RM.orElseW(() => RM.right(undefined)),
    ),
  ),
  RM.ichainMiddlewareK(sendHtml),
)

function renderReview(form: CompletedForm) {
  return html`${form.review}

    <h3>Competing interests</h3>

    <p>
      ${form.competingInterests === 'yes'
        ? form.competingInterestsDetails
        : 'The author declares that they have no competing interests.'}
    </p>`
}

function successMessage(preprint: Preprint, doi: Doi, moreAuthors: boolean) {
  return page({
    title: plainText`PREreview published`,
    content: html`
      <main id="main-content">
        <div class="panel">
          <h1>PREreview published</h1>

          <p>
            Your DOI <br />
            <strong class="doi" translate="no">${doi}</strong>
          </p>
        </div>

        <h2>What happens next</h2>

        <p>You’ll be able to see your PREreview shortly.</p>

        ${moreAuthors
          ? html`
              <div class="inset">
                <p>
                  Please let us know the other authors’ details (names and ORCID&nbsp;iDs), and we’ll add them to the
                  PREreview. Our email address is <a href="mailto:contact@prereview.org">contact@prereview.org</a>.
                </p>
              </div>
            `
          : ''}

        <a href="${format(preprintMatch.formatter, { doi: preprint.doi })}" class="button">Back to preprint</a>
      </main>
    `,
    skipLinks: [[html`Skip to main content`, '#main-content']],
  })
}

function failureMessage(preprint: Preprint) {
  return page({
    title: plainText`Sorry, we’re having problems`,
    content: html`
      <main id="main-content">
        <h1>Sorry, we’re having problems</h1>

        <p>We’re unable to publish your PREreview now.</p>

        <p>Please try again later.</p>

        <a href="${format(preprintMatch.formatter, { doi: preprint.doi })}" class="button">Back to preprint</a>
      </main>
    `,
    skipLinks: [[html`Skip to main content`, '#main-content']],
  })
}

function publishForm(preprint: Preprint, review: CompletedForm, user: User) {
  return page({
    title: plainText`Publish your PREreview of “${preprint.title}”`,
    content: html`
      <nav>
        <a href="${format(writeReviewConductMatch.formatter, { doi: preprint.doi })}" class="back">Back</a>
      </nav>

      <main id="form">
        <single-use-form>
          <form method="post" action="${format(writeReviewPublishMatch.formatter, { doi: preprint.doi })}" novalidate>
            <h1 id="preview-label">Check your PREreview</h1>

            <blockquote class="preview" tabindex="0" aria-labelledby="preview-label">
              <h2>
                PREreview of “<span lang="${preprint.language}" dir="${getLangDir(preprint.language)}"
                  >${preprint.title}</span
                >”
              </h2>

              <ol aria-label="Authors of this PREreview" class="author-list">
                <li>${displayAuthor(review.persona === 'public' ? user : { name: user.pseudonym })}</li>
              </ol>

              ${renderReview(review)}
            </blockquote>

            <div class="button-group" role="group">
              <a href="${format(writeReviewReviewMatch.formatter, { doi: preprint.doi })}">Change PREreview</a>
              <a href="${format(writeReviewPersonaMatch.formatter, { doi: preprint.doi })}">Change name</a>
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
  })
}

function displayAuthor({ name, orcid }: { name: string; orcid?: Orcid }) {
  if (orcid) {
    return html`<a href="https://orcid.org/${orcid}">${name}</a>`
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
