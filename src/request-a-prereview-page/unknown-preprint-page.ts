import { format } from 'fp-ts-routing'
import { Status } from 'hyper-ts'
import { match } from 'ts-pattern'
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

      ${preprint.type === 'philsci'
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
                match(preprint.type)
                  .with('advance', () => translate(locale, 'request-a-prereview-page', 'doiCouldBeAdvance'))
                  .with('africarxiv', () => translate(locale, 'request-a-prereview-page', 'doiCouldBeAfricarxiv'))
                  .with('arcadia-science', () =>
                    translate(locale, 'request-a-prereview-page', 'doiCouldBeArcadiaScience'),
                  )
                  .with('arxiv', () => translate(locale, 'request-a-prereview-page', 'doiCouldBeArxiv'))
                  .with('authorea', () => translate(locale, 'request-a-prereview-page', 'doiCouldBeAuthorea'))
                  .with('biorxiv', () => translate(locale, 'request-a-prereview-page', 'doiCouldBeBiorxiv'))
                  .with('biorxiv-medrxiv', () =>
                    translate(locale, 'request-a-prereview-page', 'doiCouldBeBiorxivMedrxiv'),
                  )
                  .with('chemrxiv', () => translate(locale, 'request-a-prereview-page', 'doiCouldBeChemrxiv'))
                  .with('curvenote', () => translate(locale, 'request-a-prereview-page', 'doiCouldBeCurvenote'))
                  .with('eartharxiv', () => translate(locale, 'request-a-prereview-page', 'doiCouldBeEartharxiv'))
                  .with('ecoevorxiv', () => translate(locale, 'request-a-prereview-page', 'doiCouldBeEcoevorxiv'))
                  .with('edarxiv', () => translate(locale, 'request-a-prereview-page', 'doiCouldBeEdarxiv'))
                  .with('engrxiv', () => translate(locale, 'request-a-prereview-page', 'doiCouldBeEngrxiv'))
                  .with('jxiv', () => translate(locale, 'request-a-prereview-page', 'doiCouldBeJxiv'))
                  .with('lifecycle-journal', () =>
                    translate(locale, 'request-a-prereview-page', 'doiCouldBeLifecycleJournal'),
                  )
                  .with('medrxiv', () => translate(locale, 'request-a-prereview-page', 'doiCouldBeMedrxiv'))
                  .with('metaarxiv', () => translate(locale, 'request-a-prereview-page', 'doiCouldBeMetaarxiv'))
                  .with('neurolibre', () => translate(locale, 'request-a-prereview-page', 'doiCouldBeNeurolibre'))
                  .with('osf', 'osf-preprints', () => translate(locale, 'request-a-prereview-page', 'doiCouldBeOsf'))
                  .with('osf-lifecycle-journal', () =>
                    translate(locale, 'request-a-prereview-page', 'doiCouldBeOsfLifecycleJournal'),
                  )
                  .with('preprints.org', () => translate(locale, 'request-a-prereview-page', 'doiCouldBePreprintsorg'))
                  .with('psyarxiv', () => translate(locale, 'request-a-prereview-page', 'doiCouldBePsyarxiv'))
                  .with('psycharchives', () => translate(locale, 'request-a-prereview-page', 'doiCouldBePsycharchives'))
                  .with('research-square', () =>
                    translate(locale, 'request-a-prereview-page', 'doiCouldBeResearchSquare'),
                  )
                  .with('scielo', () => translate(locale, 'request-a-prereview-page', 'doiCouldBeScielo'))
                  .with('science-open', () => translate(locale, 'request-a-prereview-page', 'doiCouldBeScienceOpen'))
                  .with('socarxiv', () => translate(locale, 'request-a-prereview-page', 'doiCouldBeSocarxiv'))
                  .with('ssrn', () => translate(locale, 'request-a-prereview-page', 'doiCouldBeSsrn'))
                  .with('techrxiv', () => translate(locale, 'request-a-prereview-page', 'doiCouldBeTechrxiv'))
                  .with('verixiv', () => translate(locale, 'request-a-prereview-page', 'doiCouldBeVerixiv'))
                  .with('zenodo', () => translate(locale, 'request-a-prereview-page', 'doiCouldBeZenodo'))
                  .with('zenodo-africarxiv', () =>
                    translate(locale, 'request-a-prereview-page', 'doiCouldBeZenodoAfricarxiv'),
                  )
                  .exhaustive()({ doi: html`<q class="select-all" translate="no">${preprint.value}</q>`.toString() }),
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
