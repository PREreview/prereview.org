import { format } from 'fp-ts-routing'
import type * as RT from 'fp-ts/ReaderTask'
import * as RTE from 'fp-ts/ReaderTaskEither'
import type * as TE from 'fp-ts/TaskEither'
import { pipe } from 'fp-ts/function'
import type { LanguageCode } from 'iso-639-1'
import { getLangDir } from 'rtl-detect'
import { match } from 'ts-pattern'
import type { Uuid } from 'uuid-ts'
import { type GetAuthorInviteEnv, getAuthorInvite } from '../author-invite'
import { type Html, html, plainText } from '../html'
import { havingProblemsPage, pageNotFound } from '../http-error'
import { type PageResponse, StreamlinePageResponse } from '../response'
import { authorInviteMatch, authorInviteStartMatch } from '../routes'
import type { User } from '../user'

export interface Prereview {
  preprint: {
    language: LanguageCode
    title: Html
  }
}

export interface GetPrereviewEnv {
  getPrereview: (id: number) => TE.TaskEither<'unavailable', Prereview>
}

const getPrereview = (id: number): RTE.ReaderTaskEither<GetPrereviewEnv, 'unavailable' | 'not-found', Prereview> =>
  RTE.asksReaderTaskEither(RTE.fromTaskEitherK(({ getPrereview }) => getPrereview(id)))

export const authorInvite = ({
  id,
  user,
}: {
  id: Uuid
  user?: User
}): RT.ReaderTask<GetPrereviewEnv & GetAuthorInviteEnv, PageResponse | StreamlinePageResponse> =>
  pipe(
    RTE.Do,
    RTE.let('user', () => user),
    RTE.let('inviteId', () => id),
    RTE.apS('invite', getAuthorInvite(id)),
    RTE.bindW('review', ({ invite }) => getPrereview(invite.review)),
    RTE.matchW(
      error =>
        match(error)
          .with('not-found', () => pageNotFound)
          .with('unavailable', () => havingProblemsPage)
          .exhaustive(),
      startPage,
    ),
  )

function startPage({ inviteId, review, user }: { inviteId: Uuid; review: Prereview; user?: User }) {
  return StreamlinePageResponse({
    title: plainText`Be listed as an author`,
    main: html`
      <h1>Be listed as an author</h1>

      <p>
        You’ve been invited to appear as an author of a PREreview of
        <cite lang="${review.preprint.language}" dir="${getLangDir(review.preprint.language)}"
          >${review.preprint.title}</cite
        >.
      </p>

      ${user
        ? ''
        : html`
            <h2>Before you start</h2>

            <p>We will ask you to log in with your ORCID&nbsp;iD. If you don’t have an iD, you can create one.</p>

            <details>
              <summary><span>What is an ORCID&nbsp;iD?</span></summary>

              <div>
                <p>
                  An <a href="https://orcid.org/"><dfn>ORCID&nbsp;iD</dfn></a> is a unique identifier that distinguishes
                  you from everyone with the same or similar name.
                </p>
              </div>
            </details>
          `}

      <a href="${format(authorInviteStartMatch.formatter, { id: inviteId })}" role="button" draggable="false"
        >Start now</a
      >
    `,
    canonical: format(authorInviteMatch.formatter, { id: inviteId }),
  })
}
