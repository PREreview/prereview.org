import { format } from 'fp-ts-routing'
import * as RNEA from 'fp-ts/lib/ReadonlyNonEmptyArray.js'
import { flow, pipe } from 'fp-ts/lib/function.js'
import rtlDetect from 'rtl-detect'
import { match } from 'ts-pattern'
import { type Html, html, plainText, rawHtml } from '../html.js'
import { DefaultLocale } from '../locales/index.js'
import { PageResponse } from '../response.js'
import { myPrereviewsMatch, profileMatch, reviewMatch } from '../routes.js'
import { renderDate } from '../time.js'
import { ProfileId } from '../types/index.js'
import { getSubfieldName } from '../types/subfield.js'
import type { User } from '../user.js'
import type { Prereview } from './prereviews.js'

export type { Prereview } from './prereviews.js'

export interface ListOfPrereviews {
  readonly _tag: 'ListOfPrereviews'
  readonly prereviews: RNEA.ReadonlyNonEmptyArray<Prereview>
  readonly user: User
}

export const ListOfPrereviews = (args: Omit<ListOfPrereviews, '_tag'>): ListOfPrereviews => ({
  _tag: 'ListOfPrereviews',
  ...args,
})

export const toResponse = ({ prereviews, user }: ListOfPrereviews) =>
  PageResponse({
    title: plainText`My PREreviews`,
    main: html`
      <h1>My PREreviews</h1>

      <div class="inset">
        <p>Only you can see this page. You have two profile pages that everyone can see:</p>

        <div class="forward-group">
          <a href="${format(profileMatch.formatter, { profile: ProfileId.forOrcid(user.orcid) })}" class="forward"
            ><span>View public profile</span></a
          >

          <a
            href="${format(profileMatch.formatter, { profile: ProfileId.forPseudonym(user.pseudonym) })}"
            class="forward"
            ><span>View pseudonym profile</span></a
          >
        </div>
      </div>

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
                  <cite dir="${rtlDetect.getLangDir(prereview.preprint.language)}" lang="${prereview.preprint.language}"
                    >${prereview.preprint.title}</cite
                  >
                </a>

                ${prereview.subfields.length > 0
                  ? html`
                      <ul class="categories">
                        ${prereview.subfields.map(
                          subfield => html`<li><span>${getSubfieldName(subfield, DefaultLocale)}</span></li>`,
                        )}
                      </ul>
                    `
                  : ''}

                <dl>
                  <dt>Review published</dt>
                  <dd>${renderDate(DefaultLocale)(prereview.published)}</dd>
                  <dt>Preprint server</dt>
                  <dd>
                    ${match(prereview.preprint.id.type)
                      .with('advance', () => 'Advance')
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
                      .with('verixiv', () => 'VeriXiv')
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
    canonical: format(myPrereviewsMatch.formatter, {}),
    current: 'my-prereviews',
  })

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
