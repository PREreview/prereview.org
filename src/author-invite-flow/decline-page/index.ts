import { Temporal } from '@js-temporal/polyfill'
import type { Doi } from 'doi-ts'
import { format } from 'fp-ts-routing'
import type * as RT from 'fp-ts/ReaderTask'
import * as RTE from 'fp-ts/ReaderTaskEither'
import type * as RNEA from 'fp-ts/ReadonlyNonEmptyArray'
import type * as TE from 'fp-ts/TaskEither'
import { pipe } from 'fp-ts/function'
import type { LanguageCode } from 'iso-639-1'
import type { Orcid } from 'orcid-id-ts'
import { P, match } from 'ts-pattern'
import type { Uuid } from 'uuid-ts'
import {
  type GetAuthorInviteEnv,
  type SaveAuthorInviteEnv,
  getAuthorInvite,
  saveAuthorInvite,
} from '../../author-invite'
import type { Html } from '../../html'
import { havingProblemsPage, pageNotFound } from '../../http-error'
import { type LogInResponse, type PageResponse, RedirectResponse, type StreamlinePageResponse } from '../../response'
import { authorInviteDeclineMatch } from '../../routes'
import type { ClubId } from '../../types/club-id'
import type { PreprintId } from '../../types/preprint-id'
import { declinePage } from './decline-page'
import { inviteDeclinedPage } from './invite-declined-page'

import PlainDate = Temporal.PlainDate

export interface Prereview {
  addendum?: Html
  authors: {
    named: RNEA.ReadonlyNonEmptyArray<{ name: string; orcid?: Orcid }>
    anonymous: number
  }
  club?: ClubId
  doi: Doi
  language?: LanguageCode
  license: 'CC-BY-4.0'
  published: PlainDate
  preprint: {
    id: PreprintId
    language: LanguageCode
    title: Html
  }
  structured: boolean
  text: Html
}

export interface GetPrereviewEnv {
  getPrereview: (id: number) => TE.TaskEither<'unavailable', Prereview>
}

const getPrereview = (id: number): RTE.ReaderTaskEither<GetPrereviewEnv, 'unavailable' | 'not-found', Prereview> =>
  RTE.asksReaderTaskEither(RTE.fromTaskEitherK(({ getPrereview }) => getPrereview(id)))

export const authorInviteDecline = ({
  id,
  method,
}: {
  id: Uuid
  method: string
}): RT.ReaderTask<
  GetAuthorInviteEnv & GetPrereviewEnv & SaveAuthorInviteEnv,
  LogInResponse | PageResponse | RedirectResponse | StreamlinePageResponse
> =>
  match(method)
    .with('POST', () => handleDecline(id))
    .otherwise(() => showDeclinePage(id))

const showDeclinePage = (id: Uuid) =>
  pipe(
    RTE.Do,
    RTE.let('inviteId', () => id),
    RTE.apS(
      'invite',
      pipe(
        getAuthorInvite(id),
        RTE.chainW(invite =>
          match(invite)
            .with({ status: P.union('assigned', 'completed') }, () => RTE.left('not-found' as const))
            .with({ status: 'declined' }, () => RTE.left('declined' as const))
            .with({ status: 'open' }, RTE.right)
            .otherwise(RTE.right),
        ),
      ),
    ),
    RTE.bindW('review', ({ invite }) => getPrereview(invite.review)),
    RTE.matchW(
      error =>
        match(error)
          .with('declined', () => inviteDeclinedPage(id))
          .with('not-found', () => pageNotFound)
          .with('unavailable', () => havingProblemsPage)
          .exhaustive(),
      declinePage,
    ),
  )

const handleDecline = (id: Uuid) =>
  pipe(
    getAuthorInvite(id),
    RTE.chainFirstW(invite =>
      match(invite)
        .with({ status: P.union('assigned', 'completed') }, () => RTE.left('not-found' as const))
        .with({ status: 'declined' }, () => RTE.right(undefined))
        .with({ status: 'open' }, invite => saveAuthorInvite(id, { status: 'declined', review: invite.review }))
        .exhaustive(),
    ),
    RTE.matchW(
      error =>
        match(error)
          .with('not-found', () => pageNotFound)
          .with('unavailable', () => havingProblemsPage)
          .exhaustive(),
      () => RedirectResponse({ location: format(authorInviteDeclineMatch.formatter, { id }) }),
    ),
  )
