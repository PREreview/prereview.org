import { format } from 'fp-ts-routing'
import * as RA from 'fp-ts/lib/ReadonlyArray.js'
import * as RNEA from 'fp-ts/lib/ReadonlyNonEmptyArray.js'
import { flow, pipe } from 'fp-ts/lib/function.js'
import rtlDetect from 'rtl-detect'
import { match } from 'ts-pattern'
import { getClubName } from '../club-details.js'
import { type Html, html, rawHtml } from '../html.js'
import { type SupportedLocale, translate } from '../locales/index.js'
import { reviewMatch } from '../routes.js'
import { renderDate } from '../time.js'
import type { NonEmptyString } from '../types/string.js'
import { getSubfieldName } from '../types/subfield.js'
import type { Prereviews } from './prereviews.js'

export function renderListOfPrereviews(
  prereviews: Prereviews,
  name: NonEmptyString | undefined,
  locale: SupportedLocale,
) {
  return pipe(
    prereviews,
    RA.match(
      () => html`
        <div class="inset">
          <p>
            ${name
              ? translate(locale, 'profile-page')('noResults')({ name })
              : translate(locale, 'profile-page')('noResultsAnonymous')()}
          </p>

          <p>${translate(locale, 'profile-page')('appearHere')()}</p>
        </div>
      `,
      prereviews => html`
        <ol class="cards">
          ${prereviews.map(
            prereview => html`
              <li>
                <article>
                  <a href="${format(reviewMatch.formatter, { id: prereview.id })}">
                    ${rawHtml(
                      prereview.club
                        ? translate(locale, 'reviews-list')('clubReviewText')({
                            club: html`<b>${getClubName(prereview.club)}</b>`.toString(),
                            reviewers: pipe(
                              prereview.reviewers,
                              RNEA.map(name => html`<b>${name}</b>`),
                              formatList(locale),
                            ).toString(),
                            preprint: html`<cite
                              dir="${rtlDetect.getLangDir(prereview.preprint.language)}"
                              lang="${prereview.preprint.language}"
                              >${prereview.preprint.title}</cite
                            >`.toString(),
                          })
                        : translate(locale, 'reviews-list')('reviewText')({
                            reviewers: pipe(
                              prereview.reviewers,
                              RNEA.map(name => html`<b>${name}</b>`),
                              formatList(locale),
                            ).toString(),
                            preprint: html`<cite
                              dir="${rtlDetect.getLangDir(prereview.preprint.language)}"
                              lang="${prereview.preprint.language}"
                              >${prereview.preprint.title}</cite
                            >`.toString(),
                          }),
                    )}
                  </a>

                  ${prereview.subfields.length > 0
                    ? html`
                        <ul class="categories">
                          ${prereview.subfields.map(subfield => html`<li>${getSubfieldName(subfield, locale)}</li>`)}
                        </ul>
                      `
                    : ''}

                  <dl>
                    <dt>${translate(locale, 'reviews-list')('reviewPublished')()}</dt>
                    <dd>${renderDate(locale)(prereview.published)}</dd>
                    <dt>${translate(locale, 'reviews-list')('reviewServer')()}</dt>
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
  )
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
