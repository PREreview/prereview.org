import { format } from 'fp-ts-routing'
import * as RT from 'fp-ts/ReaderTask'
import * as RTE from 'fp-ts/ReaderTaskEither'
import type * as TE from 'fp-ts/TaskEither'
import { pipe } from 'fp-ts/function'
import { Status } from 'hyper-ts'
import type { LanguageCode } from 'iso-639-1'
import type { Orcid } from 'orcid-id-ts'
import { P, match } from 'ts-pattern'
import type { Uuid } from 'uuid-ts'
import {
  type AssignedAuthorInvite,
  type GetAuthorInviteEnv,
  type SaveAuthorInviteEnv,
  getAuthorInvite,
  saveAuthorInvite,
} from '../author-invite'
import { type Html, html, plainText } from '../html'
import { havingProblemsPage, noPermissionPage, pageNotFound } from '../http-error'
import { LogInResponse, type PageResponse, RedirectResponse, StreamlinePageResponse } from '../response'
import { authorInviteCheckMatch, authorInviteMatch, authorInvitePublishedMatch, profileMatch } from '../routes'
import type { User } from '../user'

export interface Prereview {
  preprint: {
    language: LanguageCode
    title: Html
  }
}

export interface AddAuthorToPrereviewEnv {
  addAuthorToPrereview: (prereview: number, author: User) => TE.TaskEither<'unavailable', void>
}

const addAuthorToPrereview = (prereview: number, author: User) =>
  RTE.asksReaderTaskEither(
    RTE.fromTaskEitherK(({ addAuthorToPrereview }: AddAuthorToPrereviewEnv) => addAuthorToPrereview(prereview, author)),
  )

export interface GetPrereviewEnv {
  getPrereview: (id: number) => TE.TaskEither<'unavailable', Prereview>
}

const getPrereview = (id: number): RTE.ReaderTaskEither<GetPrereviewEnv, 'unavailable' | 'not-found', Prereview> =>
  RTE.asksReaderTaskEither(RTE.fromTaskEitherK(({ getPrereview }) => getPrereview(id)))

export const authorInviteCheck = ({
  id,
  method,
  user,
}: {
  id: Uuid
  method: string
  user?: User
}): RT.ReaderTask<
  AddAuthorToPrereviewEnv & GetPrereviewEnv & GetAuthorInviteEnv & SaveAuthorInviteEnv,
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
            .with({ orcid: P.not(user.orcid) }, () => RTE.left('wrong-user' as const))
            .with({ status: 'completed' }, () => RTE.left('already-completed' as const))
            .with({ status: 'assigned' }, RTE.of)
            .exhaustive(),
        ),
      ),
    ),
    RTE.bindW('review', ({ invite }) => getPrereview(invite.review)),
    RTE.let('method', () => method),
    RTE.matchEW(
      error =>
        RT.of(
          match(error)
            .with('already-completed', () =>
              RedirectResponse({ location: format(authorInvitePublishedMatch.formatter, { id }) }),
            )
            .with('no-session', () => LogInResponse({ location: format(authorInviteMatch.formatter, { id }) }))
            .with('not-assigned', () => RedirectResponse({ location: format(authorInviteMatch.formatter, { id }) }))
            .with('not-found', () => pageNotFound)
            .with('unavailable', () => havingProblemsPage)
            .with('wrong-user', () => noPermissionPage)
            .exhaustive(),
        ),
      state =>
        match(state)
          .returnType<
            RT.ReaderTask<
              AddAuthorToPrereviewEnv & SaveAuthorInviteEnv,
              PageResponse | RedirectResponse | StreamlinePageResponse
            >
          >()
          .with({ method: 'POST' }, handlePublishForm)
          .with({ method: P.string }, state => RT.of(checkPage(state)))
          .exhaustive(),
    ),
  )

const handlePublishForm = ({ invite, inviteId, user }: { invite: AssignedAuthorInvite; inviteId: Uuid; user: User }) =>
  pipe(
    saveAuthorInvite(inviteId, { ...invite, status: 'completed' }),
    RTE.chainW(() =>
      pipe(
        addAuthorToPrereview(invite.review, user),
        RTE.orElseFirstW(error =>
          match(error)
            .with('unavailable', () => saveAuthorInvite(inviteId, invite))
            .exhaustive(),
        ),
      ),
    ),
    RTE.matchW(
      error =>
        match(error)
          .with('unavailable', () => failureMessage)
          .exhaustive(),
      () =>
        RedirectResponse({
          location: format(authorInvitePublishedMatch.formatter, { id: inviteId }),
        }),
    ),
  )

const failureMessage = StreamlinePageResponse({
  status: Status.ServiceUnavailable,
  title: plainText`Sorry, we’re having problems`,
  main: html`
    <h1>Sorry, we’re having problems</h1>

    <p>We were unable to add your name to the PREreview. We saved your work.</p>

    <p>Please try again later by coming back to this page.</p>

    <p>If this problem persists, please <a href="mailto:help@prereview.org">get in touch</a>.</p>
  `,
})

function checkPage({ inviteId, user }: { inviteId: Uuid; user: User }) {
  return StreamlinePageResponse({
    title: plainText`Check your details`,
    main: html`
      <single-use-form>
        <form method="post" action="${format(authorInviteCheckMatch.formatter, { id: inviteId })}" novalidate>
          <h1>Check your details</h1>

          <div class="summary-card">
            <div>
              <h2>Your details</h2>
            </div>

            <dl class="summary-list">
              <div>
                <dt>Published name</dt>
                <dd>${displayAuthor(user)}</dd>
              </div>
            </dl>
          </div>

          <h2>Now publish your updated PREreview</h2>

          <p>We will add your name to the author list.</p>

          <button>Update PREreview</button>
        </form>
      </single-use-form>
    `,
    canonical: format(authorInviteCheckMatch.formatter, { id: inviteId }),
    skipToLabel: 'form',
    js: ['single-use-form.js'],
  })
}

function displayAuthor({ name, orcid }: { name: string; orcid: Orcid }) {
  return html`<a href="${format(profileMatch.formatter, { profile: { type: 'orcid', value: orcid } })}" class="orcid"
    >${name}</a
  >`
}
