import { defineCE, expect, fixture } from '@open-wc/testing'
import * as _ from '../../assets/notification-banner'

describe('when it loads', () => {
  it('has temporary focus', async () => {
    const element = defineCE(class extends _.NotificationBanner {})
    const notificationBanner = await fixture<_.NotificationBanner>(`<${element}></${element}>`)

    expect(notificationBanner).to.have.attribute('tabindex', '-1')
    expect(notificationBanner).to.have.focus

    notificationBanner.blur()

    expect(notificationBanner).not.to.have.attribute('tabindex')
  })
})
