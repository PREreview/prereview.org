import type { Doi } from 'doi-ts'
import { format } from 'fp-ts-routing'
import { Status } from 'hyper-ts'
import { match } from 'ts-pattern'
import { html, plainText, rawHtml } from '../html.js'
import { translate, type SupportedLocale } from '../locales/index.js'
import { PageResponse } from '../response.js'
import { reviewAPreprintMatch } from '../routes.js'
import type { IndeterminatePreprintId } from '../types/preprint-id.js'

export function createUnknownPreprintWithDoiPage(
  preprint: Extract<IndeterminatePreprintId, { value: Doi }>,
  locale: SupportedLocale,
) {
  const t = translate(locale)

  return PageResponse({
    status: Status.BadRequest,
    title: plainText(t('review-a-preprint', 'dontKnowPreprint')()),
    main: html`
      <h1>${t('review-a-preprint', 'dontKnowPreprint')()}</h1>

      <p>
        ${rawHtml(
          match(preprint.type)
            .with('advance', () => t('review-a-preprint', 'doiCouldBeAdvance'))
            .with('africarxiv', () => t('review-a-preprint', 'doiCouldBeAfricarxiv'))
            .with('arcadia-science', () => t('review-a-preprint', 'doiCouldBeArcadiaScience'))
            .with('arxiv', () => t('review-a-preprint', 'doiCouldBeArxiv'))
            .with('authorea', () => t('review-a-preprint', 'doiCouldBeAuthorea'))
            .with('biorxiv', () => t('review-a-preprint', 'doiCouldBeBiorxiv'))
            .with('biorxiv-medrxiv', () => t('review-a-preprint', 'doiCouldBeBiorxivMedrxiv'))
            .with('chemrxiv', () => t('review-a-preprint', 'doiCouldBeChemrxiv'))
            .with('curvenote', () => t('review-a-preprint', 'doiCouldBeCurvenote'))
            .with('eartharxiv', () => t('review-a-preprint', 'doiCouldBeEartharxiv'))
            .with('ecoevorxiv', () => t('review-a-preprint', 'doiCouldBeEcoevorxiv'))
            .with('edarxiv', () => t('review-a-preprint', 'doiCouldBeEdarxiv'))
            .with('engrxiv', () => t('review-a-preprint', 'doiCouldBeEngrxiv'))
            .with('jxiv', () => t('review-a-preprint', 'doiCouldBeJxiv'))
            .with('medrxiv', () => t('review-a-preprint', 'doiCouldBeMedrxiv'))
            .with('metaarxiv', () => t('review-a-preprint', 'doiCouldBeMetaarxiv'))
            .with('neurolibre', () => t('review-a-preprint', 'doiCouldBeNeurolibre'))
            .with('osf', 'osf-preprints', () => t('review-a-preprint', 'doiCouldBeOsf'))
            .with('preprints.org', () => t('review-a-preprint', 'doiCouldBePreprintsorg'))
            .with('psyarxiv', () => t('review-a-preprint', 'doiCouldBePsyarxiv'))
            .with('psycharchives', () => t('review-a-preprint', 'doiCouldBePsycharchives'))
            .with('research-square', () => t('review-a-preprint', 'doiCouldBeResearchSquare'))
            .with('scielo', () => t('review-a-preprint', 'doiCouldBeScielo'))
            .with('science-open', () => t('review-a-preprint', 'doiCouldBeScienceOpen'))
            .with('socarxiv', () => t('review-a-preprint', 'doiCouldBeSocarxiv'))
            .with('ssrn', () => t('review-a-preprint', 'doiCouldBeSsrn'))
            .with('techrxiv', () => t('review-a-preprint', 'doiCouldBeTechrxiv'))
            .with('verixiv', () => t('review-a-preprint', 'doiCouldBeVerixiv'))
            .with('zenodo', () => t('review-a-preprint', 'doiCouldBeZenodo'))
            .with('zenodo-africarxiv', () => t('review-a-preprint', 'doiCouldBeZenodoAfricarxiv'))
            .exhaustive()({ doi: html`<q class="select-all" translate="no">${preprint.value}</q>`.toString() }),
        )}
      </p>

      <p>${t('review-a-preprint', 'checkCorrectDoi')()}</p>

      <p>${t('review-a-preprint', 'checkPastedDoi')()}</p>

      <p>${rawHtml(t('review-a-preprint', 'doiIsCorrect')({ contact: mailToHelp }))}</p>

      <a href="${format(reviewAPreprintMatch.formatter, {})}" class="button">${t('review-a-preprint', 'back')()}</a>
    `,
  })
}

const mailToHelp = (text: string) => html`<a href="mailto:help@prereview.org">${text}</a>`.toString()
