import { Temporal } from '@js-temporal/polyfill'
import type { Doi } from 'doi-ts'
import { format } from 'fp-ts-routing'
import type * as RT from 'fp-ts/ReaderTask'
import * as RTE from 'fp-ts/ReaderTaskEither'
import * as RNEA from 'fp-ts/ReadonlyNonEmptyArray'
import type * as TE from 'fp-ts/TaskEither'
import { flow, pipe } from 'fp-ts/function'
import type { LanguageCode } from 'iso-639-1'
import { type Orcid, Eq as eqOrcid } from 'orcid-id-ts'
import { getLangDir } from 'rtl-detect'
import { P, match } from 'ts-pattern'
import type { Uuid } from 'uuid-ts'
import { type GetAuthorInviteEnv, getAuthorInvite } from '../author-invite'
import { getClubName } from '../club-details'
import { type Html, fixHeadingLevels, html, plainText, rawHtml } from '../html'
import { havingProblemsPage, noPermissionPage, pageNotFound } from '../http-error'
import { type PageResponse, RedirectResponse, StreamlinePageResponse } from '../response'
import {
  authorInviteMatch,
  authorInvitePublishedMatch,
  authorInviteStartMatch,
  clubProfileMatch,
  profileMatch,
} from '../routes'
import { renderDate } from '../time'
import type { ClubId } from '../types/club-id'
import type { PreprintId } from '../types/preprint-id'
import { isPseudonym } from '../types/pseudonym'
import type { User } from '../user'

import PlainDate = Temporal.PlainDate

export interface Prereview {
  addendum?: Html
  authors: {
    named: RNEA.ReadonlyNonEmptyArray<{ name: string; orcid?: Orcid }>
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

export const authorInvite = ({
  id,
  user,
}: {
  id: Uuid
  user?: User
}): RT.ReaderTask<GetPrereviewEnv & GetAuthorInviteEnv, PageResponse | RedirectResponse | StreamlinePageResponse> =>
  pipe(
    RTE.Do,
    RTE.let('user', () => user),
    RTE.let('inviteId', () => id),
    RTE.apS('invite', getAuthorInvite(id)),
    RTE.filterOrElseW(
      ({ user, invite }) => !user || !('orcid' in invite) || eqOrcid.equals(user.orcid, invite.orcid),
      () => 'wrong-user' as const,
    ),
    RTE.bindW('review', ({ invite }) => getPrereview(invite.review)),
    RTE.matchW(
      error =>
        match(error)
          .with('not-found', () => pageNotFound)
          .with('unavailable', () => havingProblemsPage)
          .with('wrong-user', () => noPermissionPage)
          .exhaustive(),
      state =>
        match(state)
          .with({ user: P.not(undefined), invite: { status: 'completed' } }, () =>
            RedirectResponse({ location: format(authorInvitePublishedMatch.formatter, { id }) }),
          )
          .with({ user: P.not(undefined), invite: { status: 'assigned' } }, () =>
            RedirectResponse({ location: format(authorInviteStartMatch.formatter, { id }) }),
          )
          .otherwise(startPage),
    ),
  )

function startPage({ inviteId, review, user }: { inviteId: Uuid; review: Prereview; user?: User }) {
  return StreamlinePageResponse({
    title: plainText`Be listed as an author`,
    main: html`
      <h1>Be listed as an author</h1>

      <article class="preview" tabindex="0" aria-labelledby="prereview-title">
        <header>
          <h2 id="prereview-title">
            ${review.structured ? 'Structured ' : ''}PREreview of
            <cite lang="${review.preprint.language}" dir="${getLangDir(review.preprint.language)}"
              >${review.preprint.title}</cite
            >
          </h2>

          <div class="byline">
            <span class="visually-hidden">Authored</span> by
            ${pipe(review.authors.named, RNEA.map(displayAuthor), formatList('en'))}
            ${review.club
              ? html`of the
                  <a href="${format(clubProfileMatch.formatter, { id: review.club })}">${getClubName(review.club)}</a>`
              : ''}
          </div>

          <dl>
            <div>
              <dt>Published</dt>
              <dd>${renderDate(review.published)}</dd>
            </div>
            <div>
              <dt>DOI</dt>
              <dd class="doi" translate="no">${review.doi}</dd>
            </div>
            <div>
              <dt>License</dt>
              <dd>
                ${match(review.license)
                  .with(
                    'CC-BY-4.0',
                    () => html`
                      <a href="https://creativecommons.org/licenses/by/4.0/">
                        <dfn>
                          <abbr title="Attribution 4.0 International"><span translate="no">CC BY 4.0</span></abbr>
                        </dfn>
                      </a>
                    `,
                  )
                  .exhaustive()}
              </dd>
            </div>
          </dl>
        </header>

        <div ${review.language ? html`lang="${review.language}" dir="${getLangDir(review.language)}"` : ''}>
          ${fixHeadingLevels(1, review.text)}
        </div>

        ${review.addendum
          ? html`
              <h2>Addendum</h2>

              ${fixHeadingLevels(2, review.addendum)}
            `
          : ''}
      </article>

      <p>You’ve been invited to appear as an author on this PREreview.</p>

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

function formatList(
  ...args: ConstructorParameters<typeof Intl.ListFormat>
): (list: RNEA.ReadonlyNonEmptyArray<Html | string>) => Html {
  const formatter = new Intl.ListFormat(...args)

  return flow(
    RNEA.map(item => html`${item}`.toString()),
    list => formatter.format(list),
    rawHtml,
  )
}
