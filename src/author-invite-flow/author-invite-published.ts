import type { Doi } from 'doi-ts'
import { pipe } from 'effect'
import { format } from 'fp-ts-routing'
import type * as RT from 'fp-ts/lib/ReaderTask.js'
import * as RTE from 'fp-ts/lib/ReaderTaskEither.js'
import type * as TE from 'fp-ts/lib/TaskEither.js'
import type { LanguageCode } from 'iso-639-1'
import { P, match } from 'ts-pattern'
import type { Uuid } from 'uuid-ts'
import { type GetAuthorInviteEnv, getAuthorInvite } from '../author-invite.ts'
import { type Html, html, plainText, rawHtml } from '../html.ts'
import { havingProblemsPage, noPermissionPage, pageNotFound } from '../http-error.ts'
import { type SupportedLocale, translate } from '../locales/index.ts'
import { LogInResponse, type PageResponse, RedirectResponse, StreamlinePageResponse } from '../Response/index.ts'
import {
  authorInviteCheckMatch,
  authorInviteDeclineMatch,
  authorInviteMatch,
  authorInvitePublishedMatch,
  reviewMatch,
} from '../routes.ts'
import type { User } from '../user.ts'

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
  locale,
}: {
  id: Uuid
  user?: User
  locale: SupportedLocale
}): RT.ReaderTask<
  GetPrereviewEnv & GetAuthorInviteEnv,
  LogInResponse | PageResponse | RedirectResponse | StreamlinePageResponse
> =>
  pipe(
    RTE.Do,
    RTE.apS('user', RTE.fromNullable('no-session' as const)(user)),
    RTE.let('locale', () => locale),
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
          .with('not-found', () => pageNotFound(locale))
          .with('unavailable', () => havingProblemsPage(locale))
          .with('wrong-user', () => noPermissionPage(locale))
          .exhaustive(),
      publishedPage,
    ),
  )

function publishedPage({
  inviteId,
  review,
  reviewId,
  locale,
}: {
  inviteId: Uuid
  review: Prereview
  reviewId: number
  locale: SupportedLocale
}) {
  const t = translate(locale, 'author-invite-flow')
  const prereviewLink = (text: string) =>
    html`<a href="${format(reviewMatch.formatter, { id: reviewId })}">${text}</a>`.toString()
  return StreamlinePageResponse({
    title: pipe(t('nameAdded')(), plainText),
    main: html`
      <div class="panel">
        <h1>${t('nameAdded')()}</h1>

        <div>
          ${t('yourDoi')()} <br />
          <strong class="doi" translate="no">${review.doi}</strong>
        </div>
      </div>

      <h2>${t('whatHappensNext')()}</h2>

      <p>${t('ableToSeePrereviewShortly')()}</p>

      <p>${rawHtml(t('closeWindowOrSeePrereview')({ link: prereviewLink }))}</p>
    `,
    canonical: format(authorInvitePublishedMatch.formatter, { id: inviteId }),
  })
}
