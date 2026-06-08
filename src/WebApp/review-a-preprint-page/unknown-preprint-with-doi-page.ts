import { Match } from 'effect'
import { format } from 'fp-ts-routing'
import { html, plainText, rawHtml } from '../../html.ts'
import { translate, type SupportedLocale } from '../../locales/index.ts'
import type { IndeterminatePreprintIdWithDoi } from '../../Preprints/index.ts'
import { reviewAPreprintMatch } from '../../routes.ts'
import * as StatusCodes from '../../StatusCodes.ts'
import { PageResponse } from '../Response/index.ts'

export function createUnknownPreprintWithDoiPage(preprint: IndeterminatePreprintIdWithDoi, locale: SupportedLocale) {
  const t = translate(locale, 'review-a-preprint')

  return PageResponse({
    status: StatusCodes.BadRequest,
    title: plainText(t('doNotKnowPreprint')()),
    main: html`
      <h1>${t('doNotKnowPreprint')()}</h1>

      <p>
        ${rawHtml(
          Match.valueTags(preprint, {
            AdvancePreprintId: () => t('doiCouldBeAdvance'),
            AfricarxivFigsharePreprintId: () => t('doiCouldBeAfricarxiv'),
            AfricarxivOsfPreprintId: () => t('doiCouldBeAfricarxiv'),
            AfricarxivUbuntunetPreprintId: () => t('doiCouldBeAfricarxiv'),
            AfricarxivZenodoPreprintId: () => t('doiCouldBeAfricarxiv'),
            ArcadiaSciencePreprintId: () => t('doiCouldBeArcadiaScience'),
            ArxivPreprintId: () => t('doiCouldBeArxiv'),
            AuthoreaPreprintId: () => t('doiCouldBeAuthorea'),
            BiorxivPreprintId: () => t('doiCouldBeBiorxiv'),
            BiorxivOrMedrxivPreprintId: () => t('doiCouldBeBiorxivMedrxiv'),
            ChemrxivPreprintId: () => t('doiCouldBeChemrxiv'),
            CurvenotePreprintId: () => t('doiCouldBeCurvenote'),
            EartharxivPreprintId: () => t('doiCouldBeEartharxiv'),
            EcoevorxivPreprintId: () => t('doiCouldBeEcoevorxiv'),
            EdarxivPreprintId: () => t('doiCouldBeEdarxiv'),
            EngrxivPreprintId: () => t('doiCouldBeEngrxiv'),
            JmirPreprintId: () => t('doiCouldBeJmir'),
            JxivPreprintId: () => t('doiCouldBeJxiv'),
            LifecycleJournalPreprintId: () => t('doiCouldBeLifecycleJournal'),
            MedrxivPreprintId: () => t('doiCouldBeMedrxiv'),
            MetaarxivPreprintId: () => t('doiCouldBeMetaarxiv'),
            NeurolibrePreprintId: () => t('doiCouldBeNeurolibre'),
            OsfPreprintId: () => t('doiCouldBeOsf'),
            OsfPreprintsPreprintId: () => t('doiCouldBeOsf'),
            OsfOrLifecycleJournalPreprintId: () => t('doiCouldBeOsfLifecycleJournal'),
            PreprintsorgPreprintId: () => t('doiCouldBePreprintsorg'),
            PsyarxivPreprintId: () => t('doiCouldBePsyarxiv'),
            PsychArchivesPreprintId: () => t('doiCouldBePsycharchives'),
            ResearchSquarePreprintId: () => t('doiCouldBeResearchSquare'),
            ScieloPreprintId: () => t('doiCouldBeScielo'),
            ScienceOpenPreprintId: () => t('doiCouldBeScienceOpen'),
            SocarxivPreprintId: () => t('doiCouldBeSocarxiv'),
            SsrnPreprintId: () => t('doiCouldBeSsrn'),
            TechrxivPreprintId: () => t('doiCouldBeTechrxiv'),
            UmsidaPreprintId: () => t('doiCouldBeUmsida'),
            VerixivPreprintId: () => t('doiCouldBeVerixiv'),
            ZenodoPreprintId: () => t('doiCouldBeZenodo'),
            ZenodoOrAfricarxivPreprintId: () => t('doiCouldBeZenodoAfricarxiv'),
          })({ doi: html`<q class="select-all" translate="no">${preprint.value}</q>`.toString() }),
        )}
      </p>

      <p>${t('checkCorrectDoi')()}</p>

      <p>${t('checkPastedDoi')()}</p>

      <p>${rawHtml(t('doiIsCorrect')({ contact: mailToHelp }))}</p>

      <a href="${format(reviewAPreprintMatch.formatter, {})}" class="button">${t('forms', 'backLink')()}</a>
    `,
  })
}

const mailToHelp = (text: string) => html`<a href="mailto:help@prereview.org">${text}</a>`.toString()
