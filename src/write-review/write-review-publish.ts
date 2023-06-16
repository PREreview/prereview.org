import type { Doi } from 'doi-ts'
import { format } from 'fp-ts-routing'
import type { Reader } from 'fp-ts/Reader'
import * as RTE from 'fp-ts/ReaderTaskEither'
import * as R from 'fp-ts/Refinement'
import type * as TE from 'fp-ts/TaskEither'
import { flow, pipe } from 'fp-ts/function'
import { Status, type StatusOpen } from 'hyper-ts'
import type * as M from 'hyper-ts/lib/Middleware'
import * as RM from 'hyper-ts/lib/ReaderMiddleware'
import type { Orcid } from 'orcid-id-ts'
import { getLangDir } from 'rtl-detect'
import { P, match } from 'ts-pattern'
import { type Html, html, plainText, sendHtml } from '../html'
import { fixHeadingLevels } from '../html'
import { getMethod, notFound, seeOther, serviceUnavailable } from '../middleware'
import { page } from '../page'
import { type PreprintTitle, getPreprintTitle } from '../preprint'
import { isPseudonym } from '../pseudonym'
import {
  profileMatch,
  writeReviewConductMatch,
  writeReviewMatch,
  writeReviewPersonaMatch,
  writeReviewPublishMatch,
  writeReviewPublishedMatch,
  writeReviewReviewMatch,
} from '../routes'
import { type User, getUser } from '../user'
import { type CompletedForm, CompletedFormC } from './completed-form'
import { deleteForm, getForm, redirectToNextForm, saveForm } from './form'
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
          .with({ method: 'POST', form: P.when(R.fromEitherK(CompletedFormC.decode)) }, handlePublishForm)
          .with({ form: P.when(R.fromEitherK(CompletedFormC.decode)) }, showPublishForm)
          .otherwise(flow(({ form }) => form, fromMiddlewareK(redirectToNextForm(preprint.id)))),
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
  return html`${fixHeadingLevels(1, form.review)}

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
            <h1 id="preview-label">Check your PREreview</h1>

            <blockquote class="preview" tabindex="0" aria-labelledby="preview-label">
              <h2>
                PREreview of
                <cite lang="${preprint.language}" dir="${getLangDir(preprint.language)}">${preprint.title}</cite>
              </h2>

              <div class="byline">
                <span class="visually-hidden">Authored</span> by
                ${displayAuthor(review.persona === 'public' ? user : { name: user.pseudonym })}
              </div>

              <div>${fixHeadingLevels(2, renderReview(review))}</div>
            </blockquote>

            <div class="button-group" role="group">
              <a href="${format(writeReviewReviewMatch.formatter, { id: preprint.id })}">Change PREreview</a>
              <a href="${format(writeReviewPersonaMatch.formatter, { id: preprint.id })}">Change name</a>
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
