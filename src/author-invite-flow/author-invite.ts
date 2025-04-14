import { Temporal } from '@js-temporal/polyfill'
import type { Doi } from 'doi-ts'
import { flow, pipe } from 'effect'
import { format } from 'fp-ts-routing'
import type * as RT from 'fp-ts/lib/ReaderTask.js'
import * as RTE from 'fp-ts/lib/ReaderTaskEither.js'
import * as RNEA from 'fp-ts/lib/ReadonlyNonEmptyArray.js'
import type * as TE from 'fp-ts/lib/TaskEither.js'
import type { LanguageCode } from 'iso-639-1'
import { type Orcid, Eq as eqOrcid } from 'orcid-id-ts'
import rtlDetect from 'rtl-detect'
import { P, match } from 'ts-pattern'
import type { Uuid } from 'uuid-ts'
import { type GetAuthorInviteEnv, getAuthorInvite } from '../author-invite.js'
import { getClubName } from '../club-details.js'
import { type Html, fixHeadingLevels, html, plainText, rawHtml } from '../html.js'
import { havingProblemsPage, noPermissionPage, pageNotFound } from '../http-error.js'
import { DefaultLocale, type SupportedLocale, translate } from '../locales/index.js'
import { type PageResponse, RedirectResponse, StreamlinePageResponse } from '../response.js'
import {
  authorInviteDeclineMatch,
  authorInviteMatch,
  authorInvitePublishedMatch,
  authorInviteStartMatch,
  clubProfileMatch,
  profileMatch,
} from '../routes.js'
import { renderDate } from '../time.js'
import type { ClubId } from '../types/club-id.js'
import { ProfileId } from '../types/index.js'
import type { PreprintId } from '../types/preprint-id.js'
import { isPseudonym } from '../types/pseudonym.js'
import type { User } from '../user.js'

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
    RTE.let('locale', () => DefaultLocale),
    RTE.let('inviteId', () => id),
    RTE.apS(
      'invite',
      pipe(
        getAuthorInvite(id),
        RTE.chainW(invite =>
          match(invite)
            .with({ status: 'declined' }, () => RTE.left('declined' as const))
            .otherwise(RTE.right),
        ),
      ),
    ),
    RTE.filterOrElseW(
      ({ user, invite }) => !user || !('orcid' in invite) || eqOrcid.equals(user.orcid, invite.orcid),
      () => 'wrong-user' as const,
    ),
    RTE.bindW('review', ({ invite }) => getPrereview(invite.review)),
    RTE.matchW(
      error =>
        match(error)
          .with('declined', () => RedirectResponse({ location: format(authorInviteDeclineMatch.formatter, { id }) }))
          .with('not-found', () => pageNotFound(DefaultLocale))
          .with('unavailable', () => havingProblemsPage(DefaultLocale))
          .with('wrong-user', () => noPermissionPage(DefaultLocale))
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

function startPage({
  inviteId,
  locale,
  review,
  user,
}: {
  inviteId: Uuid
  locale: SupportedLocale
  review: Prereview
  user?: User
}) {
  const t = translate(locale, 'author-invite-flow')

  return StreamlinePageResponse({
    title: plainText(t('beListed')()),
    main: html`
      <h1>${t('beListed')()}</h1>

      <article class="preview" tabindex="0" aria-labelledby="prereview-title">
        <header>
          <h2 id="prereview-title">
            ${rawHtml(
              translate(
                locale,
                'review-page',
                review.structured ? 'structuredReviewTitle' : 'reviewTitle',
              )({
                preprint: html`<cite
                  lang="${review.preprint.language}"
                  dir="${rtlDetect.getLangDir(review.preprint.language)}"
                  >${review.preprint.title}</cite
                >`.toString(),
              }),
            )}
          </h2>

          <div class="byline">
            ${rawHtml(
              review.club
                ? translate(
                    locale,
                    'review-page',
                    'clubReviewAuthors',
                  )({
                    authors: pipe(
                      review.authors.named,
                      RNEA.map(displayAuthor),
                      RNEA.concatW(
                        review.authors.anonymous > 0
                          ? [
                              translate(
                                locale,
                                'review-page',
                                'otherAuthors',
                              )({ otherAuthors: review.authors.anonymous }),
                            ]
                          : [],
                      ),
                      formatList(locale),
                    ).toString(),
                    club: html`<a href="${format(clubProfileMatch.formatter, { id: review.club })}"
                      >${getClubName(review.club)}</a
                    >`.toString(),
                    hide: text => html`<span class="visually-hidden">${text}</span>`.toString(),
                  })
                : translate(
                    locale,
                    'review-page',
                    'reviewAuthors',
                  )({
                    authors: pipe(
                      review.authors.named,
                      RNEA.map(displayAuthor),
                      RNEA.concatW(
                        review.authors.anonymous > 0
                          ? [
                              translate(
                                locale,
                                'review-page',
                                'otherAuthors',
                              )({ otherAuthors: review.authors.anonymous }),
                            ]
                          : [],
                      ),
                      formatList(locale),
                    ).toString(),
                    hide: text => html`<span class="visually-hidden">${text}</span>`.toString(),
                  }),
            )}
          </div>

          <dl>
            <div>
              <dt>${translate(locale, 'review-page', 'published')()}</dt>
              <dd>${renderDate(locale)(review.published)}</dd>
            </div>
            <div>
              <dt>DOI</dt>
              <dd class="doi" translate="no">${review.doi}</dd>
            </div>
            <div>
              <dt>${translate(locale, 'review-page', 'license')()}</dt>
              <dd>
                ${match(review.license)
                  .with(
                    'CC-BY-4.0',
                    () => html`
                      <a href="https://creativecommons.org/licenses/by/4.0/">
                        <dfn>
                          <abbr title="${translate(locale, 'review-page', 'licenseCcBy40')()}"
                            ><span translate="no">CC BY 4.0</span></abbr
                          >
                        </dfn>
                      </a>
                    `,
                  )
                  .exhaustive()}
              </dd>
            </div>
          </dl>
        </header>

        <div ${review.language ? html`lang="${review.language}" dir="${rtlDetect.getLangDir(review.language)}"` : ''}>
          ${fixHeadingLevels(1, review.text)}
        </div>

        ${review.addendum
          ? html`
              <h2>${translate(locale, 'review-page', 'addendumTitle')()}</h2>

              ${fixHeadingLevels(2, review.addendum)}
            `
          : ''}
      </article>

      <p>${t('invitedToAppear')()}</p>

      ${user
        ? ''
        : html`
            <h2>${t('beforeYouStart')()}</h2>

            <p>${t('weWillAskYouToLogInWithYourOrcid')()}</p>

            <details>
              <summary><span>${t('whatIsAnOrcid')()}</span></summary>

              <div>
                <p>
                  ${rawHtml(
                    t('orcidExplainer')({
                      link: text => html`<a href="https://orcid.org/"><dfn>${text}</dfn></a>`.toString(),
                    }),
                  )}
                </p>
              </div>
            </details>
          `}

      <a href="${format(authorInviteStartMatch.formatter, { id: inviteId })}" role="button" draggable="false"
        >${t('startNow')()}</a
      >
    `,
    canonical: format(authorInviteMatch.formatter, { id: inviteId }),
    allowRobots: false,
  })
}

function displayAuthor({ name, orcid }: { name: string; orcid?: Orcid }) {
  if (orcid) {
    return html`<a href="${format(profileMatch.formatter, { profile: ProfileId.forOrcid(orcid) })}" class="orcid"
      >${name}</a
    >`
  }

  if (isPseudonym(name)) {
    return html`<a href="${format(profileMatch.formatter, { profile: ProfileId.forPseudonym(name) })}">${name}</a>`
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
