import { format } from 'fp-ts-routing'
import * as RT from 'fp-ts/ReaderTask'
import * as RTE from 'fp-ts/ReaderTaskEither'
import { pipe } from 'fp-ts/function'
import { Status } from 'hyper-ts'
import { getLangDir } from 'rtl-detect'
import { P, match } from 'ts-pattern'
import { html, plainText } from '../html'
import { havingProblemsPage, pageNotFound } from '../http-error'
import { type GetPreprintEnv, type Preprint, type PreprintTitle, getPreprint } from '../preprint'
import { LogInResponse, PageResponse, RedirectResponse, StreamlinePageResponse } from '../response'
import { preprintReviewsMatch, writeReviewReviewTypeMatch, writeReviewStartMatch } from '../routes'
import type { IndeterminatePreprintId } from '../types/preprint-id'
import type { User } from '../user'
import { type Form, type FormStoreEnv, getForm, nextFormMatch } from './form'
import { ensureUserIsNotAnAuthor } from './user-is-author'

export const writeReviewStart = ({
  id,
  user,
}: {
  id: IndeterminatePreprintId
  user?: User
}): RT.ReaderTask<
  GetPreprintEnv & FormStoreEnv,
  PageResponse | StreamlinePageResponse | RedirectResponse | LogInResponse
> =>
  pipe(
    getPreprint(id),
    RTE.matchE(
      error =>
        RT.of(
          match(error)
            .with('not-found', () => pageNotFound)
            .with('unavailable', () => havingProblemsPage)
            .exhaustive(),
        ),
      preprint =>
        pipe(
          RTE.Do,
          RTE.apS(
            'user',
            pipe(RTE.fromNullable('no-session' as const)(user), RTE.chainEitherKW(ensureUserIsNotAnAuthor(preprint))),
          ),
          RTE.bindW('form', ({ user }) => getForm(user.orcid, preprint.id)),
          RTE.matchW(
            error =>
              match(error)
                .with({ type: 'is-author' }, () => ownPreprintPage(preprint))
                .with('no-form', () =>
                  RedirectResponse({ location: format(writeReviewReviewTypeMatch.formatter, { id: preprint.id }) }),
                )
                .with('no-session', () =>
                  LogInResponse({ location: format(writeReviewStartMatch.formatter, { id: preprint.id }) }),
                )
                .with('form-unavailable', P.instanceOf(Error), () => havingProblemsPage)
                .exhaustive(),
            ({ form }) =>
              carryOnPage({ id: preprint.id, language: preprint.title.language, title: preprint.title.text }, form),
          ),
        ),
    ),
  )

function carryOnPage(preprint: PreprintTitle, form: Form) {
  return StreamlinePageResponse({
    title: plainText`Write a PREreview`,
    nav: html`
      <a href="${format(preprintReviewsMatch.formatter, { id: preprint.id })}" class="back">Back to preprint</a>
    `,
    main: html`
      <h1>Write a PREreview</h1>

      <p>
        As you’ve already started a PREreview of
        <cite lang="${preprint.language}" dir="${getLangDir(preprint.language)}">${preprint.title}</cite>, we’ll take
        you to the next step so you can carry&nbsp;on.
      </p>

      <a href="${format(nextFormMatch(form).formatter, { id: preprint.id })}" role="button" draggable="false"
        >Continue</a
      >
    `,
    canonical: format(writeReviewStartMatch.formatter, { id: preprint.id }),
  })
}

function ownPreprintPage(preprint: Preprint) {
  return PageResponse({
    status: Status.Forbidden,
    title: plainText`Sorry, you can’t review your own preprint`,
    nav: html`
      <a href="${format(preprintReviewsMatch.formatter, { id: preprint.id })}" class="back">Back to preprint</a>
    `,
    main: html`
      <h1>Sorry, you can’t review your own preprint</h1>

      <p>If you’re not an author, please <a href="mailto:help@prereview.org">get in touch</a>.</p>
    `,
    canonical: format(writeReviewStartMatch.formatter, { id: preprint.id }),
  })
}
