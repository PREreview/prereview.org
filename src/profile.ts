import { Temporal } from '@js-temporal/polyfill'
import { format } from 'fp-ts-routing'
import type { Reader } from 'fp-ts/Reader'
import * as RTE from 'fp-ts/ReaderTaskEither'
import * as RA from 'fp-ts/ReadonlyArray'
import * as RNEA from 'fp-ts/ReadonlyNonEmptyArray'
import type * as TE from 'fp-ts/TaskEither'
import { flow, identity, pipe } from 'fp-ts/function'
import { Status, type StatusOpen } from 'hyper-ts'
import * as RM from 'hyper-ts/lib/ReaderMiddleware'
import type { LanguageCode } from 'iso-639-1'
import type { Orcid } from 'orcid-id-ts'
import { getLangDir } from 'rtl-detect'
import { P, match } from 'ts-pattern'
import { getClubName, isLeadFor } from './club-details'
import type { ClubId } from './club-id'
import { type Html, html, plainText, rawHtml, sendHtml } from './html'
import { notFound, serviceUnavailable } from './middleware'
import { page } from './page'
import type { PreprintId } from './preprint-id'
import type { OrcidProfileId, ProfileId, PseudonymProfileId } from './profile-id'
import { getResearchInterests } from './research-interests'
import { clubProfileMatch, reviewMatch } from './routes'
import { type SlackUser, getSlackUser } from './slack-user'
import type { NonEmptyString } from './string'
import { renderDate } from './time'
import { type User, maybeGetUser } from './user'

import PlainDate = Temporal.PlainDate

export type Prereviews = ReadonlyArray<{
  readonly id: number
  readonly club?: ClubId
  readonly reviewers: RNEA.ReadonlyNonEmptyArray<string>
  readonly published: PlainDate
  readonly preprint: {
    readonly id: PreprintId
    readonly language: LanguageCode
    readonly title: Html
  }
}>

export interface GetPrereviewsEnv {
  getPrereviews: (profile: ProfileId) => TE.TaskEither<'unavailable', Prereviews>
}

export interface GetNameEnv {
  getName: (orcid: Orcid) => TE.TaskEither<'not-found' | 'unavailable', string>
}

export interface GetAvatarEnv {
  getAvatar: (orcid: Orcid) => TE.TaskEither<'not-found' | 'unavailable', URL>
}

const getPrereviews = (profile: ProfileId) =>
  pipe(
    RTE.ask<GetPrereviewsEnv>(),
    RTE.chainTaskEitherK(({ getPrereviews }) => getPrereviews(profile)),
  )

const getName = (orcid: Orcid) =>
  pipe(
    RTE.ask<GetNameEnv>(),
    RTE.chainTaskEitherK(({ getName }) => getName(orcid)),
  )

const getAvatar = (orcid: Orcid) =>
  pipe(
    RTE.ask<GetAvatarEnv>(),
    RTE.chainTaskEitherK(({ getAvatar }) => getAvatar(orcid)),
  )

export const profile = (profileId: ProfileId) =>
  match(profileId)
    .with({ type: 'orcid' }, profileForOrcid)
    .with({ type: 'pseudonym' }, profileForPseudonym)
    .exhaustive()

const profileForOrcid = (profile: OrcidProfileId) =>
  pipe(
    RM.fromReaderTaskEither(getPrereviews(profile)),
    RM.bindTo('prereviews'),
    RM.apSW('name', RM.fromReaderTaskEither(getName(profile.value))),
    RM.apSW('user', maybeGetUser),
    RM.apSW(
      'researchInterests',
      pipe(
        RM.fromReaderTaskEither(getResearchInterests(profile.value)),
        RM.map(researchInterests =>
          match(researchInterests)
            .with({ visibility: 'public', value: P.select() }, identity)
            .with({ visibility: 'restricted' }, () => undefined)
            .exhaustive(),
        ),
        RM.orElseW(error =>
          match(error)
            .with('not-found', () => RM.of(undefined))
            .otherwise(RM.left),
        ),
      ),
    ),
    RM.apSW(
      'avatar',
      pipe(
        RM.fromReaderTaskEither(getAvatar(profile.value)),
        RM.orElseW(error =>
          match(error)
            .with('not-found', () => RM.right(undefined))
            .with('unavailable', RM.left)
            .exhaustive(),
        ),
      ),
    ),
    RM.apS('orcid', RM.of(profile.value)),
    RM.apS('clubs', RM.of(isLeadFor(profile.value))),
    RM.apSW(
      'slackUser',
      pipe(
        RM.fromReaderTaskEither(getSlackUser(profile.value)),
        RM.orElseW(error =>
          match(error)
            .with('not-found', () => RM.right(undefined))
            .with('unavailable', RM.left)
            .exhaustive(),
        ),
      ),
    ),
    chainReaderKW(createPage),
    RM.ichainFirst(() => RM.status(Status.OK)),
    RM.ichainMiddlewareKW(sendHtml),
    RM.orElseW(error =>
      match(error)
        .with('not-found', () => notFound)
        .with('unavailable', () => serviceUnavailable)
        .exhaustive(),
    ),
  )

const profileForPseudonym = (profileId: PseudonymProfileId) =>
  pipe(
    RM.fromReaderTaskEither(getPrereviews(profileId)),
    RM.bindTo('prereviews'),
    RM.apSW('name', RM.of(profileId.value)),
    RM.apSW('user', maybeGetUser),
    chainReaderKW(createPage),
    RM.ichainFirst(() => RM.status(Status.OK)),
    RM.ichainMiddlewareKW(sendHtml),
    RM.orElseW(error =>
      match(error)
        .with('unavailable', () => serviceUnavailable)
        .exhaustive(),
    ),
  )

function createPage({
  orcid,
  name,
  prereviews,
  user,
  avatar,
  researchInterests,
  clubs = [],
  slackUser,
}: {
  avatar?: URL
  clubs?: ReadonlyArray<ClubId>
  name: string
  orcid?: Orcid
  prereviews: Prereviews
  researchInterests?: NonEmptyString
  slackUser?: SlackUser
  user?: User
}) {
  return page({
    title: plainText`${name}`,
    content: html`
      <main id="main-content">
        <div class="profile-header">
          <div>
            <h1>${name}</h1>

            ${orcid
              ? html`
                  <dl class="summary-list">
                    <div>
                      <dt>ORCID iD</dt>
                      <dd><a href="https://orcid.org/${orcid}" class="orcid">${orcid}</a></dd>
                    </div>

                    ${slackUser
                      ? html`
                          <div>
                            <dt>Slack Community name</dt>
                            <dd>
                              <span class="slack">
                                <img src="${slackUser.image.href}" alt="" width="48" height="48" />
                                <span>${slackUser.name}</span>
                              </span>
                            </dd>
                          </div>
                        `
                      : ''}
                    ${researchInterests
                      ? html`
                          <div>
                            <dt>Research interests</dt>
                            <dd>${researchInterests}</dd>
                          </div>
                        `
                      : ''}
                    ${RA.isNonEmpty(clubs)
                      ? html`
                          <div>
                            <dt>Clubs</dt>
                            <dd>
                              ${pipe(
                                clubs,
                                RNEA.map(
                                  club =>
                                    html`<a href="${format(clubProfileMatch.formatter, { id: club })}"
                                      >${getClubName(club)}</a
                                    >`,
                                ),
                                formatList('en'),
                              )}
                            </dd>
                          </div>
                        `
                      : ''}
                  </dl>
                `
              : ''}
          </div>

          ${avatar instanceof URL ? html` <img src="${avatar.href}" width="300" height="300" alt="" /> ` : ''}
        </div>

        <h2>PREreviews</h2>

        ${pipe(
          prereviews,
          RA.match(
            () => html`
              <div class="inset">
                <p>${name} hasn’t published a PREreview yet.</p>

                <p>When they do, it’ll appear here.</p>
              </div>
            `,
            prereviews => html`
              <ol class="cards">
                ${prereviews.map(
                  prereview => html`
                    <li>
                      <article>
                        <a href="${format(reviewMatch.formatter, { id: prereview.id })}">
                          ${pipe(
                            prereview.reviewers,
                            RNEA.map(name => html`<b>${name}</b>`),
                            formatList('en'),
                          )}
                          ${prereview.club ? html`of the <b>${getClubName(prereview.club)}</b>` : ''} reviewed
                          <cite dir="${getLangDir(prereview.preprint.language)}" lang="${prereview.preprint.language}"
                            >${prereview.preprint.title}</cite
                          >
                        </a>

                        <dl>
                          <dt>Review published</dt>
                          <dd>${renderDate(prereview.published)}</dd>
                          <dt>Preprint server</dt>
                          <dd>
                            ${match(prereview.preprint.id.type)
                              .with('africarxiv', () => 'AfricArXiv Preprints')
                              .with('arxiv', () => 'arXiv')
                              .with('authorea', () => 'Authorea')
                              .with('biorxiv', () => 'bioRxiv')
                              .with('chemrxiv', () => 'ChemRxiv')
                              .with('eartharxiv', () => 'EarthArXiv')
                              .with('ecoevorxiv', () => 'EcoEvoRxiv')
                              .with('edarxiv', () => 'EdArXiv')
                              .with('engrxiv', () => 'engrXiv')
                              .with('medrxiv', () => 'medRxiv')
                              .with('metaarxiv', () => 'MetaArXiv')
                              .with('osf', () => 'OSF Preprints')
                              .with('philsci', () => 'PhilSci-Archive')
                              .with('preprints.org', () => 'Preprints.org')
                              .with('psyarxiv', () => 'PsyArXiv')
                              .with('research-square', () => 'Research Square')
                              .with('scielo', () => 'SciELO Preprints')
                              .with('science-open', () => 'ScienceOpen Preprints')
                              .with('socarxiv', () => 'SocArXiv')
                              .with('zenodo', () => 'Zenodo')
                              .exhaustive()}
                          </dd>
                        </dl>
                      </article>
                    </li>
                  `,
                )}
              </ol>
            `,
          ),
        )}
      </main>
    `,
    skipLinks: [[html`Skip to main content`, '#main-content']],
    user,
  })
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

// https://github.com/DenisFrezzato/hyper-ts/pull/85
function fromReaderK<R, A extends ReadonlyArray<unknown>, B, I = StatusOpen, E = never>(
  f: (...a: A) => Reader<R, B>,
): (...a: A) => RM.ReaderMiddleware<R, I, I, E, B> {
  return (...a) => RM.rightReader(f(...a))
}

// https://github.com/DenisFrezzato/hyper-ts/pull/85
function chainReaderKW<R2, A, B>(
  f: (a: A) => Reader<R2, B>,
): <R1, I, E>(ma: RM.ReaderMiddleware<R1, I, I, E, A>) => RM.ReaderMiddleware<R1 & R2, I, I, E, B> {
  return RM.chainW(fromReaderK(f))
}
