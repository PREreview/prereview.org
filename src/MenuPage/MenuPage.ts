import { Boolean, Option, Struct } from 'effect'
import { format } from 'fp-ts-routing'
import { html, plainText } from '../html.ts'
import { type SupportedLocale, translate } from '../locales/index.ts'
import { PageResponse } from '../Response/index.ts'
import * as Routes from '../routes.ts'
import type { UserOnboarding } from '../user-onboarding.ts'
import type { User } from '../user.ts'

export const createMenuPage = ({
  canLogInAsDemoUser = false,
  locale,
  user,
  userOnboarding,
}: {
  canLogInAsDemoUser?: boolean
  locale: SupportedLocale
  user: Option.Option<User>
  userOnboarding: Option.Option<UserOnboarding>
}) => {
  const t = translate(locale, 'header')

  return PageResponse({
    title: plainText(t('menu')()),
    main: html`
      <h1 class="visually-hidden">${t('menu')()}</h1>

      <div class="menu">
        <div>
          <h3>${t('getInvolved')()}</h3>
          <ul>
            <li>
              <a href="${format(Routes.reviewsMatch.formatter, {})}">${t('menuReviews')()}</a>
              <p>${t('menuReviewsHint')()}</p>
            </li>
            <li>
              <a href="${format(Routes.reviewRequestsMatch.formatter, {})}">${t('menuRequests')()}</a>
              <p>${t('menuRequestsHint')()}</p>
            </li>
            <li>
              <a href="${Routes.Clubs}">${t('menuClubs')()}</a>
              <p>${t('menuClubsHint')()}</p>
            </li>
            <li>
              <a href="${Routes.Trainings}">${t('menuTrainings')()}</a>
              <p>${t('menuTrainingsHint')()}</p>
            </li>
          </ul>
        </div>

        <div>
          <h3>${t('findOutMore')()}</h3>
          <ul>
            <li>
              <a href="https://content.prereview.org/">${t('menuBlog')()}</a>
            </li>
            <li>
              <a href="${Routes.AboutUs}">${t('menuAboutUs')()}</a>
            </li>
            <li>
              <a href="${format(Routes.partnersMatch.formatter, {})}">${t('menuPartners')()}</a>
            </li>
            <li>
              <a href="https://donorbox.org/prereview">${t('menuDonate')()}</a>
            </li>
            <li>
              <a href="${Routes.LiveReviews}">${t('menuLiveReviews')()}</a>
            </li>
            <li>
              <a href="${Routes.Resources}">${t('menuResources')()}</a>
            </li>
          </ul>
        </div>

        <div>
          <h3>${t('myAccount')()}</h3>
          <ul>
            ${Option.match(user, {
              onSome: () => html`
                <li>
                  <a href="${format(Routes.myDetailsMatch.formatter, {})}"
                    >${t('menuMyDetails')()}${Option.match(
                      Option.filter(userOnboarding, Struct.get('seenMyDetailsPage')),
                      {
                        onSome: () => '',
                        onNone: () =>
                          html` <span role="status"
                            ><span class="visually-hidden">${t('menuNewNotification')()}</span></span
                          >`,
                      },
                    )}</a
                  >
                </li>
                <li>
                  <a href="${format(Routes.myPrereviewsMatch.formatter, {})}">${t('menuMyPrereviews')()}</a>
                </li>
                <li>
                  <a href="${Routes.LogOut}">${t('menuLogOut')()}</a>
                </li>
              `,
              onNone: () => html`
                <li>
                  <a href="${Routes.LogIn}">${t('menuLogIn')()}</a>
                </li>
                ${Boolean.match(canLogInAsDemoUser, {
                  onFalse: () => '',
                  onTrue: () => html`
                    <li>
                      <a href="${Routes.LogInDemo}">${t('menuLogInDemoUser')()}</a>
                    </li>
                  `,
                })}
              `,
            })}
          </ul>
        </div>
      </div>
    `,
    canonical: Routes.Menu,
    current: 'menu',
  })
}
