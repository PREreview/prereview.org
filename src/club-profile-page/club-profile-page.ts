import { format } from 'fp-ts-routing'
import * as RA from 'fp-ts/lib/ReadonlyArray.js'
import * as RNEA from 'fp-ts/lib/ReadonlyNonEmptyArray.js'
import { flow, pipe } from 'fp-ts/lib/function.js'
import rtlDetect from 'rtl-detect'
import { P, match } from 'ts-pattern'
import type { Club } from '../club-details.js'
import { type Html, html, plainText, rawHtml } from '../html.js'
import { DefaultLocale } from '../locales/index.js'
import * as assets from '../manifest.json'
import { PageResponse } from '../response.js'
import { clubProfileMatch, profileMatch, reviewMatch } from '../routes.js'
import { renderDate } from '../time.js'
import type { ClubId } from '../types/club-id.js'
import { getSubfieldName } from '../types/subfield.js'
import type { Prereviews } from './prereviews.js'

export function createPage({ club, id, prereviews }: { club: Club; id: ClubId; prereviews: Prereviews }) {
  return PageResponse({
    title: plainText`${club.name}`,
    main: html`
      <h1>${club.name}</h1>

      ${match(id)
        .with(
          P.string.startsWith('asapbio-'),
          () => html`
            <img src="${assets['asapbio.svg']}" width="1851" height="308" alt="ASAPbio" class="club-logo" />
          `,
        )
        .with(
          'jmir-publications',
          () => html`
            <a href="https://jmirpublications.com/"
              ><img src="${assets['jmir.svg']}" width="537" height="86" alt="JMIR Publications" class="club-logo"
            /></a>
          `,
        )
        .otherwise(() => '')}
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
            formatList(DefaultLocale),
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
                          formatList(DefaultLocale),
                        )}
                        reviewed
                        <cite
                          dir="${rtlDetect.getLangDir(prereview.preprint.language)}"
                          lang="${prereview.preprint.language}"
                          >${prereview.preprint.title}</cite
                        >
                      </a>

                      ${prereview.subfields.length > 0
                        ? html`
                            <ul class="categories">
                              ${prereview.subfields.map(subfield => html`<li>${getSubfieldName(subfield)}</li>`)}
                            </ul>
                          `
                        : ''}

                      <dl>
                        <dt>Review published</dt>
                        <dd>${renderDate(DefaultLocale)(prereview.published)}</dd>
                        <dt>Preprint server</dt>
                        <dd>
                          ${match(prereview.preprint.id.type)
                            .with('africarxiv', () => 'AfricArXiv Preprints')
                            .with('arcadia-science', () => 'Arcadia Science')
                            .with('arxiv', () => 'arXiv')
                            .with('authorea', () => 'Authorea')
                            .with('biorxiv', () => 'bioRxiv')
                            .with('chemrxiv', () => 'ChemRxiv')
                            .with('curvenote', () => 'Curvenote')
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
                            .with('psycharchives', () => 'PsychArchives')
                            .with('research-square', () => 'Research Square')
                            .with('scielo', () => 'SciELO Preprints')
                            .with('science-open', () => 'ScienceOpen Preprints')
                            .with('socarxiv', () => 'SocArXiv')
                            .with('techrxiv', () => 'TechRxiv')
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
