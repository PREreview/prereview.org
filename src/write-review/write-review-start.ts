import { format } from 'fp-ts-routing'
import * as Eq from 'fp-ts/Eq'
import * as O from 'fp-ts/Option'
import { not } from 'fp-ts/Predicate'
import * as RA from 'fp-ts/ReadonlyArray'
import { flow, pipe } from 'fp-ts/function'
import { type ResponseEnded, Status, type StatusOpen } from 'hyper-ts'
import type { OAuthEnv } from 'hyper-ts-oauth'
import * as RM from 'hyper-ts/ReaderMiddleware'
import { Eq as eqOrcid } from 'orcid-id-ts'
import { getLangDir } from 'rtl-detect'
import { P, match } from 'ts-pattern'
import { html, plainText, sendHtml } from '../html'
import { logInAndRedirect } from '../log-in'
import { notFound, seeOther, serviceUnavailable } from '../middleware'
import { type FathomEnv, type PhaseEnv, page } from '../page'
import { type Preprint, type PreprintTitle, getPreprint } from '../preprint'
import type { PublicUrlEnv } from '../public-url'
import { preprintReviewsMatch, writeReviewReviewTypeMatch, writeReviewStartMatch } from '../routes'
import { type GetUserEnv, type User, getUser } from '../user'
import { type Form, getForm, nextFormMatch } from './form'

export const writeReviewStart = flow(
  RM.fromReaderTaskEitherK(getPreprint),
  RM.ichainW(preprint =>
    pipe(
      getUser,
      RM.filterOrElseW(
        not(user => RA.elem(eqAuthorByOrcid)(user, preprint.authors)),
        user => ({ type: 'is-author' as const, user }),
      ),
      RM.bindTo('user'),
      RM.bindW(
        'form',
        RM.fromReaderTaskEitherK(({ user }) => getForm(user.orcid, preprint.id)),
      ),
      RM.ichainW(({ form, user }) =>
        showCarryOnPage({ id: preprint.id, language: preprint.title.language, title: preprint.title.text }, form, user),
      ),
      RM.orElseW(error =>
        match(error)
          .returnType<
            RM.ReaderMiddleware<
              GetUserEnv & FathomEnv & PhaseEnv & PublicUrlEnv & OAuthEnv,
              StatusOpen,
              ResponseEnded,
              never,
              void
            >
          >()
          .with({ type: 'is-author', user: P.select() }, user => showOwnPreprintPage(preprint, user))
          .with(
            'no-form',
            RM.fromMiddlewareK(() => seeOther(format(writeReviewReviewTypeMatch.formatter, { id: preprint.id }))),
          )
          .with('no-session', () => logInAndRedirect(writeReviewStartMatch.formatter, { id: preprint.id }))
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

const showCarryOnPage = flow(
  RM.fromReaderK(carryOnPage),
  RM.ichainFirst(() => RM.status(Status.OK)),
  RM.ichainMiddlewareK(sendHtml),
)

const showOwnPreprintPage = (preprint: Preprint, user: User) =>
  pipe(
    RM.rightReader(ownPreprintPage(preprint, user)),
    RM.ichainFirst(() => RM.status(Status.Forbidden)),
    RM.ichainMiddlewareK(sendHtml),
  )

const eqAuthorByOrcid = Eq.contramap(O.fromNullableK((author: Preprint['authors'][number]) => author.orcid))(
  O.getEq(eqOrcid),
)

function carryOnPage(preprint: PreprintTitle, form: Form, user: User) {
  return page({
    title: plainText`Write a PREreview`,
    content: html`
      <nav>
        <a href="${format(preprintReviewsMatch.formatter, { id: preprint.id })}" class="back">Back to preprint</a>
      </nav>

      <main id="main-content">
        <h1>Write a PREreview</h1>

        <p>
          As you’ve already started a PREreview of
          <cite lang="${preprint.language}" dir="${getLangDir(preprint.language)}">${preprint.title}</cite>, we’ll take
          you to the next step so you can carry&nbsp;on.
        </p>

        <a href="${format(nextFormMatch(form).formatter, { id: preprint.id })}" role="button" draggable="false"
          >Continue</a
        >
      </main>
    `,
    skipLinks: [[html`Skip to main content`, '#main-content']],
    type: 'streamline',
    user,
  })
}

function ownPreprintPage(preprint: Preprint, user: User) {
  return page({
    title: plainText`Sorry, you can’t review your own preprint`,
    content: html`
      <nav>
        <a href="${format(preprintReviewsMatch.formatter, { id: preprint.id })}" class="back">Back to preprint</a>
      </nav>

      <main id="main-content">
        <h1>Sorry, you can’t review your own preprint</h1>

        <p>If you’re not an author, please <a href="mailto:help@prereview.org">get in touch</a>.</p>
      </main>
    `,
    skipLinks: [[html`Skip to main content`, '#main-content']],
    user,
  })
}
