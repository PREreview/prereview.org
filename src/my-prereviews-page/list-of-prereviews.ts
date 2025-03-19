import { flow, pipe } from 'effect'
import { format } from 'fp-ts-routing'
import * as RNEA from 'fp-ts/lib/ReadonlyNonEmptyArray.js'
import rtlDetect from 'rtl-detect'
import { match } from 'ts-pattern'
import { html, plainText, rawHtml, type Html } from '../html.js'
import { translate, type SupportedLocale } from '../locales/index.js'
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

export const toResponse = ({ prereviews, user }: ListOfPrereviews, locale: SupportedLocale) =>
  PageResponse({
    title: plainText(translate(locale, 'my-prereviews-page', 'myPrereviews')()),
    main: html`
      <h1>${translate(locale, 'my-prereviews-page', 'myPrereviews')()}</h1>

      <div class="inset">
        <p>${translate(locale, 'my-prereviews-page', 'onlyYouCanSee')()}</p>

        <div class="forward-group">
          <a href="${format(profileMatch.formatter, { profile: ProfileId.forOrcid(user.orcid) })}" class="forward"
            ><span>${translate(locale, 'my-prereviews-page', 'viewPublicProfile')()}</span></a
          >

          <a
            href="${format(profileMatch.formatter, { profile: ProfileId.forPseudonym(user.pseudonym) })}"
            class="forward"
            ><span>${translate(locale, 'my-prereviews-page', 'viewPseudonymProfile')()}</span></a
          >
        </div>
      </div>

      <ol class="cards">
        ${prereviews.map(
          prereview => html`
            <li>
              <article>
                <a href="${format(reviewMatch.formatter, { id: prereview.id })}">
                  ${rawHtml(
                    translate(
                      locale,
                      'reviews-list',
                      'reviewText',
                    )({
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
                        ${prereview.subfields.map(
                          subfield => html`<li><span>${getSubfieldName(subfield, locale)}</span></li>`,
                        )}
                      </ul>
                    `
                  : ''}

                <dl>
                  <dt>${translate(locale, 'reviews-list', 'reviewPublished')()}</dt>
                  <dd>${renderDate(locale)(prereview.published)}</dd>
                  <dt>${translate(locale, 'reviews-list', 'reviewServer')()}</dt>
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
                      .with('jxiv', () => 'Jxiv')
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
