import { Match } from 'effect'
import { format } from 'fp-ts-routing'
import { Status } from 'hyper-ts'
import { html, plainText, rawHtml } from '../html.js'
import { translate, type SupportedLocale } from '../locales/index.js'
import { PageResponse } from '../response.js'
import { requestAPrereviewMatch } from '../routes.js'
import type { IndeterminatePreprintId } from '../types/preprint-id.js'

export const unknownPreprintPage = (preprint: IndeterminatePreprintId, locale: SupportedLocale) => {
  return PageResponse({
    status: Status.BadRequest,
    title: plainText(translate(locale, 'request-a-prereview-page', 'dontKnowPreprint')()),
    main: html`
      <h1>${translate(locale, 'request-a-prereview-page', 'dontKnowPreprint')()}</h1>

      ${preprint._tag === 'philsci'
        ? html`
            <p>
              ${rawHtml(
                translate(
                  locale,
                  'request-a-prereview-page',
                  'urlCouldBePhilsci',
                )({
                  url: html`<q class="select-all" translate="no"
                    >https://philsci-archive.pitt.edu/${preprint.value}/</q
                  >`.toString(),
                }),
              )}
            </p>

            <p>${translate(locale, 'request-a-prereview-page', 'checkCorrectUrl')()}</p>

            <p>${translate(locale, 'request-a-prereview-page', 'checkPastedUrl')()}</p>

            <p>${rawHtml(translate(locale, 'request-a-prereview-page', 'urlIsCorrect')({ contact: mailToHelp }))}</p>
          `
        : html`
            <p>
              ${rawHtml(
                Match.valueTags(preprint, {
                  AdvancePreprintId: () => translate(locale, 'request-a-prereview-page', 'doiCouldBeAdvance'),
                  africarxiv: () => translate(locale, 'request-a-prereview-page', 'doiCouldBeAfricarxiv'),
                  'arcadia-science': () => translate(locale, 'request-a-prereview-page', 'doiCouldBeArcadiaScience'),
                  arxiv: () => translate(locale, 'request-a-prereview-page', 'doiCouldBeArxiv'),
                  authorea: () => translate(locale, 'request-a-prereview-page', 'doiCouldBeAuthorea'),
                  biorxiv: () => translate(locale, 'request-a-prereview-page', 'doiCouldBeBiorxiv'),
                  'biorxiv-medrxiv': () => translate(locale, 'request-a-prereview-page', 'doiCouldBeBiorxivMedrxiv'),
                  chemrxiv: () => translate(locale, 'request-a-prereview-page', 'doiCouldBeChemrxiv'),
                  curvenote: () => translate(locale, 'request-a-prereview-page', 'doiCouldBeCurvenote'),
                  eartharxiv: () => translate(locale, 'request-a-prereview-page', 'doiCouldBeEartharxiv'),
                  ecoevorxiv: () => translate(locale, 'request-a-prereview-page', 'doiCouldBeEcoevorxiv'),
                  edarxiv: () => translate(locale, 'request-a-prereview-page', 'doiCouldBeEdarxiv'),
                  engrxiv: () => translate(locale, 'request-a-prereview-page', 'doiCouldBeEngrxiv'),
                  jxiv: () => translate(locale, 'request-a-prereview-page', 'doiCouldBeJxiv'),
                  'lifecycle-journal': () =>
                    translate(locale, 'request-a-prereview-page', 'doiCouldBeLifecycleJournal'),
                  medrxiv: () => translate(locale, 'request-a-prereview-page', 'doiCouldBeMedrxiv'),
                  metaarxiv: () => translate(locale, 'request-a-prereview-page', 'doiCouldBeMetaarxiv'),
                  neurolibre: () => translate(locale, 'request-a-prereview-page', 'doiCouldBeNeurolibre'),
                  osf: () => translate(locale, 'request-a-prereview-page', 'doiCouldBeOsf'),
                  'osf-preprints': () => translate(locale, 'request-a-prereview-page', 'doiCouldBeOsf'),
                  'osf-lifecycle-journal': () =>
                    translate(locale, 'request-a-prereview-page', 'doiCouldBeOsfLifecycleJournal'),
                  'preprints.org': () => translate(locale, 'request-a-prereview-page', 'doiCouldBePreprintsorg'),
                  psyarxiv: () => translate(locale, 'request-a-prereview-page', 'doiCouldBePsyarxiv'),
                  psycharchives: () => translate(locale, 'request-a-prereview-page', 'doiCouldBePsycharchives'),
                  'research-square': () => translate(locale, 'request-a-prereview-page', 'doiCouldBeResearchSquare'),
                  scielo: () => translate(locale, 'request-a-prereview-page', 'doiCouldBeScielo'),
                  'science-open': () => translate(locale, 'request-a-prereview-page', 'doiCouldBeScienceOpen'),
                  socarxiv: () => translate(locale, 'request-a-prereview-page', 'doiCouldBeSocarxiv'),
                  ssrn: () => translate(locale, 'request-a-prereview-page', 'doiCouldBeSsrn'),
                  techrxiv: () => translate(locale, 'request-a-prereview-page', 'doiCouldBeTechrxiv'),
                  verixiv: () => translate(locale, 'request-a-prereview-page', 'doiCouldBeVerixiv'),
                  zenodo: () => translate(locale, 'request-a-prereview-page', 'doiCouldBeZenodo'),
                  'zenodo-africarxiv': () =>
                    translate(locale, 'request-a-prereview-page', 'doiCouldBeZenodoAfricarxiv'),
                })({ doi: html`<q class="select-all" translate="no">${preprint.value}</q>`.toString() }),
              )}
            </p>

            <p>${translate(locale, 'request-a-prereview-page', 'checkCorrectDoi')()}</p>

            <p>${translate(locale, 'request-a-prereview-page', 'checkPastedDoi')()}</p>

            <p>${rawHtml(translate(locale, 'request-a-prereview-page', 'doiIsCorrect')({ contact: mailToHelp }))}</p>
          `}

      <a href="${format(requestAPrereviewMatch.formatter, {})}" class="button"
        >${translate(locale, 'forms', 'backLink')()}</a
      >
    `,
  })
}

const mailToHelp = (text: string) => html`<a href="mailto:help@prereview.org">${text}</a>`.toString()
