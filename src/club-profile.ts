import { Temporal } from '@js-temporal/polyfill'
import { format } from 'fp-ts-routing'
import type * as RT from 'fp-ts/ReaderTask'
import * as RTE from 'fp-ts/ReaderTaskEither'
import * as RA from 'fp-ts/ReadonlyArray'
import * as RNEA from 'fp-ts/ReadonlyNonEmptyArray'
import type * as TE from 'fp-ts/TaskEither'
import { flow, pipe } from 'fp-ts/function'
import type { LanguageCode } from 'iso-639-1'
import { getLangDir } from 'rtl-detect'
import { match } from 'ts-pattern'
import { type Club, getClubDetails } from './club-details'
import { type Html, html, plainText, rawHtml } from './html'
import { havingProblemsPage } from './http-error'
import { PageResponse } from './response'
import { clubProfileMatch, profileMatch, reviewMatch } from './routes'
import { renderDate } from './time'
import type { ClubId } from './types/club-id'
import type { PreprintId } from './types/preprint-id'

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

export const clubProfile = (id: ClubId): RT.ReaderTask<GetPrereviewsEnv, PageResponse> =>
  pipe(
    RTE.Do,
    RTE.let('id', () => id),
    RTE.apS('prereviews', getPrereviews(id)),
    RTE.let('club', () => getClubDetails(id)),
    RTE.match(() => havingProblemsPage, createPage),
  )

function createPage({ club, id, prereviews }: { club: Club; id: ClubId; prereviews: Prereviews }) {
  return PageResponse({
    title: plainText`${club.name}`,
    main: html`
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

      ${club.contact ? html`<a href="mailto:${club.contact}" class="button">Contact the club</a>` : ''}
      ${club.joinLink ? html`<a href="${club.joinLink.href}" class="button">Join the club</a> ` : ''}

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
                            .with('osf', () => 'OSF')
                            .with('osf-preprints', () => 'OSF Preprints')
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
    `,
    canonical: format(clubProfileMatch.formatter, { id }),
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
