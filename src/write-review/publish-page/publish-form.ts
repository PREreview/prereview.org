import { Array, flow, pipe, Struct } from 'effect'
import { format } from 'fp-ts-routing'
import rtlDetect from 'rtl-detect'
import { match, P } from 'ts-pattern'
import { fixHeadingLevels, html, plainText, rawHtml, type Html } from '../../html.ts'
import { translate, type SupportedLocale } from '../../locales/index.ts'
import type { PreprintTitle } from '../../Preprints/index.ts'
import * as PreprintServers from '../../PreprintServers/index.ts'
import { StreamlinePageResponse } from '../../response.ts'
import {
  profileMatch,
  writeReviewAddAuthorsMatch,
  writeReviewCompetingInterestsMatch,
  writeReviewConductMatch,
  writeReviewDataPresentationMatch,
  writeReviewFindingsNextStepsMatch,
  writeReviewIntroductionMatchesMatch,
  writeReviewLanguageEditingMatch,
  writeReviewMethodsAppropriateMatch,
  writeReviewNovelMatch,
  writeReviewPersonaMatch,
  writeReviewPublishMatch,
  writeReviewReadyFullReviewMatch,
  writeReviewResultsSupportedMatch,
  writeReviewReviewMatch,
  writeReviewShouldReadMatch,
  writeReviewUseOfAiMatch,
} from '../../routes.ts'
import { ProfileId } from '../../types/index.ts'
import type { OrcidId } from '../../types/OrcidId.ts'
import { isPseudonym } from '../../types/Pseudonym.ts'
import type { User } from '../../user.ts'
import type { CompletedForm } from '../completed-form.ts'
import { backNav } from '../shared-elements.ts'

export function publishForm(
  preprint: PreprintTitle,
  review: CompletedForm,
  user: User,
  locale: SupportedLocale,
  aiReviewsAsCc0 = false,
) {
  const t = translate(locale, 'write-review')

  const visuallyHidden: { visuallyHidden: (x: string) => string } = {
    visuallyHidden: s => `<span class="visually-hidden">${s}</span>`,
  }

  return StreamlinePageResponse({
    title: plainText(t('publishTitle')({ preprintTitle: preprint.title.toString() })),
    nav: backNav(locale, format(writeReviewConductMatch.formatter, { id: preprint.id })),
    main: html`
      <single-use-form>
        <form method="post" action="${format(writeReviewPublishMatch.formatter, { id: preprint.id })}" novalidate>
          <h1>${t('checkPrereview')()}</h1>

          <div class="summary-card">
            <div>
              <h2>${t('preprintDetails')()}</h2>
            </div>

            <dl class="summary-list">
              <div>
                <dt><span>${t('preprintTitle')()}</span></dt>
                <dd>
                  <cite lang="${preprint.language}" dir="${rtlDetect.getLangDir(preprint.language)}"
                    >${preprint.title}</cite
                  >
                </dd>
              </div>
              <div>
                <dt><span>${t('preprintServer')()}</span></dt>
                <dd>${PreprintServers.getName(preprint.id)}</dd>
              </div>
            </dl>
          </div>

          <div class="summary-card">
            <div>
              <h2>
                ${match(review.moreAuthors)
                  .with('yes', t('authorDetails'))
                  .with('no', 'yes-private', t('yourDetails'))
                  .exhaustive()}
              </h2>
            </div>

            <dl class="summary-list">
              <div>
                <dt>
                  <span
                    >${match(review.moreAuthors)
                      .with('yes', t('yourPublishedName'))
                      .with('no', 'yes-private', t('publishedName'))
                      .exhaustive()}</span
                  >
                </dt>
                <dd>${displayAuthor(review.persona === 'public' ? user : { name: user.pseudonym })}</dd>
                <dd>
                  <a href="${format(writeReviewPersonaMatch.formatter, { id: preprint.id })}"
                    >${rawHtml(t('changeName')(visuallyHidden))}</a
                  >
                </dd>
              </div>

              ${review.moreAuthors === 'yes' && Array.isNonEmptyReadonlyArray(review.otherAuthors)
                ? html`
                    <div>
                      <dt><span>${t('invitedAuthors')({ number: review.otherAuthors.length })}</span></dt>
                      <dd>${pipe(review.otherAuthors, Array.map(Struct.get('name')), formatList(locale))}</dd>
                      <dd>
                        <a href="${format(writeReviewAddAuthorsMatch.formatter, { id: preprint.id })}"
                          >${rawHtml(t('changeInvitedAuthors')(visuallyHidden))}</a
                        >
                      </dd>
                    </div>
                  `
                : ''}

              <div>
                <dt><span>${t('useOfAiShort')()}</span></dt>
                <dd>
                  ${match([review.generativeAiIdeas, review.moreAuthors])
                    .with(['yes', P.union('yes', 'yes-private')], () => t('aiIdeasAuthorsStatement')())
                    .with(['yes', 'no'], () => t('aiIdeasStatement')())
                    .with(['no', P.string], () => t('aiNotUsed')())
                    .exhaustive()}
                </dd>
                <dd>
                  <a href="${format(writeReviewUseOfAiMatch.formatter, { id: preprint.id })}"
                    >${rawHtml(t('changeUseOfAi')(visuallyHidden))}</a
                  >
                </dd>
              </div>

              <div>
                <dt><span>${t('competingInterests')()}</span></dt>
                <dd>${getCompetingInterests(review, locale)}</dd>
                <dd>
                  <a href="${format(writeReviewCompetingInterestsMatch.formatter, { id: preprint.id })}"
                    >${rawHtml(t('changeCompetingInterests')(visuallyHidden))}</a
                  >
                </dd>
              </div>
            </dl>
          </div>

          <div class="summary-card">
            <div>
              <h2 id="review-label">${t('yourReview')()}</h2>

              ${review.reviewType === 'freeform'
                ? html`
                    <a href="${format(writeReviewReviewMatch.formatter, { id: preprint.id })}"
                      >${rawHtml(t('changePrereview')(visuallyHidden))}</a
                    >
                  `
                : ''}
            </div>

            <div
              aria-labelledby="review-label"
              role="region"
              ${review.reviewType === 'freeform' ? rawHtml('tabindex="0"') : ''}
            >
              ${review.reviewType === 'freeform'
                ? fixHeadingLevels(2, review.review)
                : html`
                    <dl class="summary-list">
                      <div>
                        <dt><span>${t('doesIntroductionExplain')()}</span></dt>
                        <dd>
                          ${match(review.introductionMatches)
                            .with('yes', () => t('yes')())
                            .with('partly', () => t('partly')())
                            .with('no', () => t('no')())
                            .with('skip', () => t('iDoNotKnow')())
                            .exhaustive()}
                        </dd>
                        ${review.introductionMatches !== 'skip' && review.introductionMatchesDetails
                          ? html` <dd>${review.introductionMatchesDetails}</dd>`
                          : ''}
                        <dd>
                          <a href="${format(writeReviewIntroductionMatchesMatch.formatter, { id: preprint.id })}"
                            >${rawHtml(t('changeIfIntroExplains')(visuallyHidden))}
                          </a>
                        </dd>
                      </div>
                      <div>
                        <dt><span>${t('methodsWellSuited')()}</span></dt>
                        <dd>
                          ${match(review.methodsAppropriate)
                            .with('inappropriate', () => t('methodsHighlyInappropriate')())
                            .with('somewhat-inappropriate', () => t('methodsSomewhatInappropriate')())
                            .with('adequate', () => t('methodsNeitherAppropriateNorInappropriate')())
                            .with('mostly-appropriate', () => t('methodsSomewhatAppropriate')())
                            .with('highly-appropriate', () => t('methodsHighlyAppropriate')())
                            .with('skip', () => t('iDoNotKnow')())
                            .exhaustive()}
                        </dd>
                        ${review.methodsAppropriate !== 'skip' && review.methodsAppropriateDetails
                          ? html` <dd>${review.methodsAppropriateDetails}</dd>`
                          : ''}
                        <dd>
                          <a href="${format(writeReviewMethodsAppropriateMatch.formatter, { id: preprint.id })}"
                            >${rawHtml(t('changeMethodsWellSuited')(visuallyHidden))}
                          </a>
                        </dd>
                      </div>
                      <div>
                        <dt><span>${t('conclusionsSupported')()}</span></dt>
                        <dd>
                          ${match(review.resultsSupported)
                            .with('not-supported', () => t('conclusionsHighlyUnsupported')())
                            .with('partially-supported', () => t('conclusionsSomewhatUnsupported')())
                            .with('neutral', () => t('conclusionsNeitherSupportedNorUnsupported')())
                            .with('well-supported', () => t('conclusionsSomewhatSupported')())
                            .with('strongly-supported', () => t('conclusionsHighlySupported')())
                            .with('skip', () => t('iDoNotKnow')())
                            .exhaustive()}
                        </dd>
                        ${review.resultsSupported !== 'skip' && review.resultsSupportedDetails
                          ? html` <dd>${review.resultsSupportedDetails}</dd>`
                          : ''}
                        <dd>
                          <a href="${format(writeReviewResultsSupportedMatch.formatter, { id: preprint.id })}"
                            >${rawHtml(t('changeConclusionsSupported')(visuallyHidden))}</a
                          >
                        </dd>
                      </div>
                      <div>
                        <dt><span>${t('dataPresentationWellSuited')()}</span></dt>
                        <dd>
                          ${match(review.dataPresentation)
                            .with('inappropriate-unclear', () => t('highlyInappropriate')())
                            .with('somewhat-inappropriate-unclear', () => t('somewhatInappropriate')())
                            .with('neutral', () => t('neitherAppropriateOrClear')())
                            .with('mostly-appropriate-clear', () => t('somewhatAppropriate')())
                            .with('highly-appropriate-clear', () => t('highlyAppropriateAndClear')())
                            .with('skip', () => t('iDoNotKnow')())
                            .exhaustive()}
                        </dd>
                        ${review.dataPresentation !== 'skip' && review.dataPresentationDetails
                          ? html` <dd>${review.dataPresentationDetails}</dd>`
                          : ''}
                        <dd>
                          <a href="${format(writeReviewDataPresentationMatch.formatter, { id: preprint.id })}"
                            >${rawHtml(t('changeDataPresentationWellSuited')(visuallyHidden))}</a
                          >
                        </dd>
                      </div>
                      <div>
                        <dt><span>${t('clearDiscussion')()}</span></dt>
                        <dd>
                          ${match(review.findingsNextSteps)
                            .with('inadequately', () => t('veryUnclearly')())
                            .with('insufficiently', () => t('somewhatUnclearly')())
                            .with('adequately', () => t('neitherClearlyNorUnclearly')())
                            .with('clearly-insightfully', () => t('somewhatClearly')())
                            .with('exceptionally', () => t('veryClearly')())
                            .with('skip', () => t('iDoNotKnow')())
                            .exhaustive()}
                        </dd>
                        ${review.findingsNextSteps !== 'skip' && review.findingsNextStepsDetails
                          ? html` <dd>${review.findingsNextStepsDetails}</dd>`
                          : ''}
                        <dd>
                          <a href="${format(writeReviewFindingsNextStepsMatch.formatter, { id: preprint.id })}"
                            >${rawHtml(t('changeClearDiscussion')(visuallyHidden))}
                          </a>
                        </dd>
                      </div>
                      <div>
                        <dt><span>${t('advanceKnowledge')()}</span></dt>
                        <dd>
                          ${match(review.novel)
                            .with('no', () => t('advanceKnowledgeNotAtAllLikely')())
                            .with('limited', () => t('advanceKnowledgeNotLikely')())
                            .with('some', () => t('advanceKnowledgeModeratelyLikely')())
                            .with('substantial', () => t('advanceKnowledgeSomewhatLikely')())
                            .with('highly', () => t('advanceKnowledgeHighlyLikely')())
                            .with('skip', () => t('iDoNotKnow')())
                            .exhaustive()}
                        </dd>
                        ${review.novel !== 'skip' && review.novelDetails ? html` <dd>${review.novelDetails}</dd>` : ''}
                        <dd>
                          <a href="${format(writeReviewNovelMatch.formatter, { id: preprint.id })}"
                            >${rawHtml(t('changeAdvanceKnowledge')(visuallyHidden))}</a
                          >
                        </dd>
                      </div>
                      <div>
                        <dt><span>${t('benefitFromEditing')()}</span></dt>
                        <dd>
                          ${match(review.languageEditing)
                            .with('no', () => t('no')())
                            .with('yes', () => t('yes')())
                            .exhaustive()}
                        </dd>
                        ${review.languageEditingDetails ? html` <dd>${review.languageEditingDetails}</dd>` : ''}
                        <dd>
                          <a href="${format(writeReviewLanguageEditingMatch.formatter, { id: preprint.id })}"
                            >${rawHtml(t('changeBenefitFromEditing')(visuallyHidden))}</a
                          >
                        </dd>
                      </div>
                      <div>
                        <dt><span>${t('wouldRecommend')()}</span></dt>
                        <dd>
                          ${match(review.shouldRead)
                            .with('no', () => t('wouldRecommendNo')())
                            .with('yes-but', () => t('wouldRecommendYesImproved')())
                            .with('yes', () => t('wouldRecommendYes')())
                            .exhaustive()}
                        </dd>
                        ${review.shouldReadDetails ? html` <dd>${review.shouldReadDetails}</dd>` : ''}
                        <dd>
                          <a href="${format(writeReviewShouldReadMatch.formatter, { id: preprint.id })}"
                            >${rawHtml(t('changeWouldRecommend')(visuallyHidden))}
                          </a>
                        </dd>
                      </div>
                      <div>
                        <dt><span>${t('readyForAttention')()}</span></dt>
                        <dd>
                          ${match(review.readyFullReview)
                            .with('no', () => t('readyForAttentionNo')())
                            .with('yes-changes', () => t('readyForAttentionMinorChanges')())
                            .with('yes', () => t('readyForAttentionYes')())
                            .exhaustive()}
                        </dd>
                        ${review.readyFullReviewDetails ? html` <dd>${review.readyFullReviewDetails}</dd>` : ''}
                        <dd>
                          <a href="${format(writeReviewReadyFullReviewMatch.formatter, { id: preprint.id })}"
                            >${rawHtml(t('changeReadyForAttention')(visuallyHidden))}</a
                          >
                        </dd>
                      </div>
                    </dl>
                  `}
            </div>
          </div>

          <h2>${t('nowPublish')()}</h2>

          <p>
            ${rawHtml(
              t('weWillAssignLicense')({
                licenseLink: match([aiReviewsAsCc0, review.generativeAiIdeas])
                  .with(
                    [true, 'yes'],
                    () => '<a href="https://creativecommons.org/publicdomain/zero/1.0/">CC0&nbsp;1.0</a>',
                  )
                  .with(
                    [false, 'yes'],
                    [P.boolean, 'no'],
                    () => '<a href="https://creativecommons.org/licenses/by/4.0/">CC&nbsp;BY&nbsp;4.0</a>',
                  )
                  .exhaustive(),
              }),
            )}
          </p>

          <button>${t('publishButton')()}</button>
        </form>
      </single-use-form>
    `,
    skipToLabel: 'form',
    js: ['single-use-form.js', 'error-summary.js', 'notification-banner.js'],
  })
}

function displayAuthor({ name, orcid }: { name: string; orcid?: OrcidId }) {
  if (orcid) {
    return html`<a href="${format(profileMatch.formatter, { profile: ProfileId.forOrcid(orcid) })}" class="orcid"
      >${name}</a
    >`
  }

  if (isPseudonym(name)) {
    return html`<a href="${format(profileMatch.formatter, { profile: ProfileId.forPseudonym(name) })}">${name}</a>`
  }

  return name
}

function formatList(
  ...args: ConstructorParameters<typeof Intl.ListFormat>
): (list: Array.NonEmptyReadonlyArray<Html | string>) => Html {
  const formatter = new Intl.ListFormat(...args)

  return flow(
    Array.map(item => html`${item}`.toString()),
    list => formatter.format(list),
    rawHtml,
  )
}

export const getCompetingInterests = (form: CompletedForm, locale: SupportedLocale) =>
  match(form)
    .with({ competingInterests: 'yes' }, form => form.competingInterestsDetails)
    .with({ competingInterests: 'no', moreAuthors: P.union('yes', 'yes-private') }, () =>
      translate(locale, 'write-review', 'competingInterestsAuthorsNo')(),
    )
    .with({ competingInterests: 'no', moreAuthors: 'no' }, () =>
      translate(locale, 'write-review', 'competingInterestsNo')(),
    )
    .exhaustive()
