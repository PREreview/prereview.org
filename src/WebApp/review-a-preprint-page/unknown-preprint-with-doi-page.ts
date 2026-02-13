import { Match } from 'effect'
import { format } from 'fp-ts-routing'
import { html, plainText, rawHtml } from '../../html.ts'
import { translate, type SupportedLocale } from '../../locales/index.ts'
import type { IndeterminatePreprintIdWithDoi } from '../../Preprints/index.ts'
import { reviewAPreprintMatch } from '../../routes.ts'
import * as StatusCodes from '../../StatusCodes.ts'
import { PageResponse } from '../Response/index.ts'

export function createUnknownPreprintWithDoiPage(preprint: IndeterminatePreprintIdWithDoi, locale: SupportedLocale) {
  const t = translate(locale)

  return PageResponse({
    status: StatusCodes.BadRequest,
    title: plainText(t('review-a-preprint', 'dontKnowPreprint')()),
    main: html`
      <h1>${t('review-a-preprint', 'dontKnowPreprint')()}</h1>

      <p>
        ${rawHtml(
          Match.valueTags(preprint, {
            AdvancePreprintId: () => t('review-a-preprint', 'doiCouldBeAdvance'),
            AfricarxivFigsharePreprintId: () => t('review-a-preprint', 'doiCouldBeAfricarxiv'),
            AfricarxivOsfPreprintId: () => t('review-a-preprint', 'doiCouldBeAfricarxiv'),
            AfricarxivUbuntunetPreprintId: () => t('review-a-preprint', 'doiCouldBeAfricarxiv'),
            AfricarxivZenodoPreprintId: () => t('review-a-preprint', 'doiCouldBeAfricarxiv'),
            ArcadiaSciencePreprintId: () => t('review-a-preprint', 'doiCouldBeArcadiaScience'),
            ArxivPreprintId: () => t('review-a-preprint', 'doiCouldBeArxiv'),
            AuthoreaPreprintId: () => t('review-a-preprint', 'doiCouldBeAuthorea'),
            BiorxivPreprintId: () => t('review-a-preprint', 'doiCouldBeBiorxiv'),
            BiorxivOrMedrxivPreprintId: () => t('review-a-preprint', 'doiCouldBeBiorxivMedrxiv'),
            ChemrxivPreprintId: () => t('review-a-preprint', 'doiCouldBeChemrxiv'),
            CurvenotePreprintId: () => t('review-a-preprint', 'doiCouldBeCurvenote'),
            EartharxivPreprintId: () => t('review-a-preprint', 'doiCouldBeEartharxiv'),
            EcoevorxivPreprintId: () => t('review-a-preprint', 'doiCouldBeEcoevorxiv'),
            EdarxivPreprintId: () => t('review-a-preprint', 'doiCouldBeEdarxiv'),
            EngrxivPreprintId: () => t('review-a-preprint', 'doiCouldBeEngrxiv'),
            JxivPreprintId: () => t('review-a-preprint', 'doiCouldBeJxiv'),
            LifecycleJournalPreprintId: () => t('review-a-preprint', 'doiCouldBeLifecycleJournal'),
            MedrxivPreprintId: () => t('review-a-preprint', 'doiCouldBeMedrxiv'),
            MetaarxivPreprintId: () => t('review-a-preprint', 'doiCouldBeMetaarxiv'),
            NeurolibrePreprintId: () => t('review-a-preprint', 'doiCouldBeNeurolibre'),
            OsfPreprintId: () => t('review-a-preprint', 'doiCouldBeOsf'),
            OsfPreprintsPreprintId: () => t('review-a-preprint', 'doiCouldBeOsf'),
            OsfOrLifecycleJournalPreprintId: () => t('review-a-preprint', 'doiCouldBeOsfLifecycleJournal'),
            PreprintsorgPreprintId: () => t('review-a-preprint', 'doiCouldBePreprintsorg'),
            PsyarxivPreprintId: () => t('review-a-preprint', 'doiCouldBePsyarxiv'),
            PsychArchivesPreprintId: () => t('review-a-preprint', 'doiCouldBePsycharchives'),
            ResearchSquarePreprintId: () => t('review-a-preprint', 'doiCouldBeResearchSquare'),
            ScieloPreprintId: () => t('review-a-preprint', 'doiCouldBeScielo'),
            ScienceOpenPreprintId: () => t('review-a-preprint', 'doiCouldBeScienceOpen'),
            SocarxivPreprintId: () => t('review-a-preprint', 'doiCouldBeSocarxiv'),
            SsrnPreprintId: () => t('review-a-preprint', 'doiCouldBeSsrn'),
            TechrxivPreprintId: () => t('review-a-preprint', 'doiCouldBeTechrxiv'),
            UmsidaPreprintId:
              () =>
              ({ doi }: { doi: string }) =>
                `We think the DOI ${doi} could be an UMSIDA preprint, but we can’t find any details.`,
            VerixivPreprintId: () => t('review-a-preprint', 'doiCouldBeVerixiv'),
            ZenodoPreprintId: () => t('review-a-preprint', 'doiCouldBeZenodo'),
            ZenodoOrAfricarxivPreprintId: () => t('review-a-preprint', 'doiCouldBeZenodoAfricarxiv'),
          })({ doi: html`<q class="select-all" translate="no">${preprint.value}</q>`.toString() }),
        )}
      </p>

      <p>${t('review-a-preprint', 'checkCorrectDoi')()}</p>

      <p>${t('review-a-preprint', 'checkPastedDoi')()}</p>

      <p>${rawHtml(t('review-a-preprint', 'doiIsCorrect')({ contact: mailToHelp }))}</p>

      <a href="${format(reviewAPreprintMatch.formatter, {})}" class="button">${t('forms', 'backLink')()}</a>
    `,
  })
}

const mailToHelp = (text: string) => html`<a href="mailto:help@prereview.org">${text}</a>`.toString()
