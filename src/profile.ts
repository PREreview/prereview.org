import { Temporal } from '@js-temporal/polyfill'
import { format } from 'fp-ts-routing'
import type { Reader } from 'fp-ts/Reader'
import * as RTE from 'fp-ts/ReaderTaskEither'
import * as RA from 'fp-ts/ReadonlyArray'
import * as RNEA from 'fp-ts/ReadonlyNonEmptyArray'
import type * as TE from 'fp-ts/TaskEither'
import { flow, pipe } from 'fp-ts/function'
import { Status, type StatusOpen } from 'hyper-ts'
import * as RM from 'hyper-ts/lib/ReaderMiddleware'
import type { LanguageCode } from 'iso-639-1'
import type { Orcid } from 'orcid-id-ts'
import { getLangDir } from 'rtl-detect'
import { match } from 'ts-pattern'
import { getClubName } from './club-details'
import type { ClubId } from './club-id'
import { type Html, html, plainText, rawHtml, sendHtml } from './html'
import { notFound, serviceUnavailable } from './middleware'
import { page } from './page'
import type { PreprintId } from './preprint-id'
import type { OrcidProfileId, ProfileId, PseudonymProfileId } from './profile-id'
import { reviewMatch } from './routes'
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
}: {
  avatar?: URL
  name: string
  orcid?: Orcid
  prereviews: Prereviews
  user?: User
}) {
  return page({
    title: plainText`${name}’s PREreviews`,
    content: html`
      <main id="main-content">
        <div class="profile-header">
          <div>
            <h1>${name}’s PREreviews</h1>

            ${orcid
              ? html`
                  <dl class="summary-list">
                    <div>
                      <dt>ORCID iD</dt>
                      <dd><a href="https://orcid.org/${orcid}" class="orcid">${orcid}</a></dd>
                    </div>
                  </dl>
                `
              : ''}
          </div>

          ${avatar instanceof URL ? html` <img src="${avatar.href}" width="300" height="300" alt="" /> ` : ''}
        </div>

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
                          ${formatList('en')(prereview.reviewers)}
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
    RNEA.map(item => html`<b>${item}</b>`.toString()),
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
