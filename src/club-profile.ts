import { Temporal } from '@js-temporal/polyfill'
import { format } from 'fp-ts-routing'
import * as RTE from 'fp-ts/ReaderTaskEither'
import * as RA from 'fp-ts/ReadonlyArray'
import * as RNEA from 'fp-ts/ReadonlyNonEmptyArray'
import type * as TE from 'fp-ts/TaskEither'
import { flow, pipe } from 'fp-ts/function'
import { Status } from 'hyper-ts'
import * as RM from 'hyper-ts/ReaderMiddleware'
import type { LanguageCode } from 'iso-639-1'
import { getLangDir } from 'rtl-detect'
import { match } from 'ts-pattern'
import { type Club, getClubDetails } from './club-details'
import type { ClubId } from './club-id'
import { type Html, html, plainText, rawHtml, sendHtml } from './html'
import { serviceUnavailable } from './middleware'
import { templatePage } from './page'
import type { PreprintId } from './preprint-id'
import { profileMatch, reviewMatch } from './routes'
import { renderDate } from './time'
import { type User, maybeGetUser } from './user'

import PlainDate = Temporal.PlainDate

export type Prereviews = ReadonlyArray<{
  readonly id: number
  readonly reviewers: RNEA.ReadonlyNonEmptyArray<string>
  readonly published: PlainDate
  readonly preprint: {
    readonly id: PreprintId
    readonly language: LanguageCode
    readonly title: Html
  }
}>

export interface GetPrereviewsEnv {
  getPrereviews: (id: ClubId) => TE.TaskEither<'unavailable', Prereviews>
}

const getPrereviews = (id: ClubId) =>
  pipe(
    RTE.ask<GetPrereviewsEnv>(),
    RTE.chainTaskEitherK(({ getPrereviews }) => getPrereviews(id)),
  )

export const clubProfile = (id: ClubId) =>
  pipe(
    RM.fromReaderTaskEither(getPrereviews(id)),
    RM.bindTo('prereviews'),
    RM.apSW('club', RM.of(getClubDetails(id))),
    RM.apSW('user', maybeGetUser),
    RM.chainReaderKW(createPage),
    RM.ichainFirst(() => RM.status(Status.OK)),
    RM.ichainMiddlewareKW(sendHtml),
    RM.orElseW(error =>
      match(error)
        .with('unavailable', () => serviceUnavailable)
        .exhaustive(),
    ),
  )

function createPage({ club, prereviews, user }: { club: Club; prereviews: Prereviews; user?: User }) {
  return templatePage({
    title: plainText`${club.name}`,
    content: html`
      <main id="main-content">
        <h1>${club.name}</h1>

        ${club.description}

        <dl>
          <dt>Club leads</dt>
          <dd>
            ${pipe(
              club.leads,
              RNEA.map(
                lead =>
                  html`<a
                    href="${format(profileMatch.formatter, { profile: { type: 'orcid', value: lead.orcid } })}"
                    class="orcid"
                    >${lead.name}</a
                  >`,
              ),
              formatList('en'),
            )}
          </dd>
        </dl>

        <a href="${club.joinLink.href}" class="button">Join the club</a>

        <h2>PREreviews</h2>

        ${pipe(
          prereviews,
          RA.match(
            () => html`
              <div class="inset">
                <p>The ${club.name} hasn’t published a PREreview yet.</p>

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
                          reviewed
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
