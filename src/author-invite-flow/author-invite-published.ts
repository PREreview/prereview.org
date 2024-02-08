import type { Doi } from 'doi-ts'
import { format } from 'fp-ts-routing'
import type * as RT from 'fp-ts/ReaderTask'
import * as RTE from 'fp-ts/ReaderTaskEither'
import type * as TE from 'fp-ts/TaskEither'
import { pipe } from 'fp-ts/function'
import type { LanguageCode } from 'iso-639-1'
import { P, match } from 'ts-pattern'
import type { Uuid } from 'uuid-ts'
import { type GetAuthorInviteEnv, getAuthorInvite } from '../author-invite'
import { type Html, html, plainText } from '../html'
import { havingProblemsPage, noPermissionPage, pageNotFound } from '../http-error'
import { LogInResponse, type PageResponse, RedirectResponse, StreamlinePageResponse } from '../response'
import {
  authorInviteCheckMatch,
  authorInviteDeclineMatch,
  authorInviteMatch,
  authorInvitePublishedMatch,
  reviewMatch,
} from '../routes'
import type { User } from '../user'

export interface Prereview {
  doi: Doi
  preprint: {
    language: LanguageCode
    title: Html
  }
}

export interface GetPrereviewEnv {
  getPrereview: (id: number) => TE.TaskEither<'unavailable', Prereview>
}

const getPrereview = (id: number): RTE.ReaderTaskEither<GetPrereviewEnv, 'unavailable', Prereview> =>
  RTE.asksReaderTaskEither(RTE.fromTaskEitherK(({ getPrereview }) => getPrereview(id)))

export const authorInvitePublished = ({
  id,
  user,
}: {
  id: Uuid
  user?: User
}): RT.ReaderTask<
  GetPrereviewEnv & GetAuthorInviteEnv,
  LogInResponse | PageResponse | RedirectResponse | StreamlinePageResponse
> =>
  pipe(
    RTE.Do,
    RTE.apS('user', RTE.fromNullable('no-session' as const)(user)),
    RTE.let('inviteId', () => id),
    RTE.bindW('invite', ({ user }) =>
      pipe(
        getAuthorInvite(id),
        RTE.chainW(invite =>
          match(invite)
            .with({ status: 'open' }, () => RTE.left('not-assigned' as const))
            .with({ status: 'declined' }, () => RTE.left('declined' as const))
            .with({ orcid: P.not(user.orcid) }, () => RTE.left('wrong-user' as const))
            .with({ status: 'assigned' }, () => RTE.left('not-completed' as const))
            .with({ status: 'completed' }, RTE.of)
            .exhaustive(),
        ),
      ),
    ),
    RTE.let('reviewId', ({ invite }) => invite.review),
    RTE.bindW('review', ({ reviewId }) => getPrereview(reviewId)),
    RTE.matchW(
      error =>
        match(error)
          .with('declined', () => RedirectResponse({ location: format(authorInviteDeclineMatch.formatter, { id }) }))
          .with('no-session', () => LogInResponse({ location: format(authorInvitePublishedMatch.formatter, { id }) }))
          .with('not-assigned', () => RedirectResponse({ location: format(authorInviteMatch.formatter, { id }) }))
          .with('not-completed', () => RedirectResponse({ location: format(authorInviteCheckMatch.formatter, { id }) }))
          .with('not-found', () => pageNotFound)
          .with('unavailable', () => havingProblemsPage)
          .with('wrong-user', () => noPermissionPage)
          .exhaustive(),
      publishedPage,
    ),
  )

function publishedPage({ inviteId, review, reviewId }: { inviteId: Uuid; review: Prereview; reviewId: number }) {
  return StreamlinePageResponse({
    title: plainText`Name added`,
    main: html`
      <div class="panel">
        <h1>Name added</h1>

        <div>
          Your DOI <br />
          <strong class="doi" translate="no">${review.doi}</strong>
        </div>
      </div>

      <h2>What happens next</h2>

      <p>You’ll be able to see your name on the PREreview shortly.</p>

      <p>
        You can close this window, or
        <a href="${format(reviewMatch.formatter, { id: reviewId })}">see the PREreview</a>.
      </p>
    `,
    canonical: format(authorInvitePublishedMatch.formatter, { id: inviteId }),
  })
}
