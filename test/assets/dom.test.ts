import { expect, fixture } from '@open-wc/testing'
import * as _ from '../../assets/dom'

describe('preventDefault', () => {
  it('calls preventDefault() on an event', () => {
    const event = new Event('test', { cancelable: true })

    _.preventDefault(event)

    expect(event.defaultPrevented).to.be.true
  })
})

describe('forceFocus', () => {
  describe('when the element has a tabindex', () => {
    it('leaves the tabindex unchanged', async () => {
      const element = await fixture<HTMLDivElement>('<div tabindex="2"></div>')

      _.forceFocus(element)

      expect(element).to.have.attribute('tabindex', '2')
      expect(element).to.have.focus

      element.blur()

      expect(element).to.have.attribute('tabindex', '2')
    })
  })

  describe('when the element does not have a tabindex', () => {
    it('sets a temporary tabindex', async () => {
      const element = await fixture<HTMLDivElement>('<div></div>')

      _.forceFocus(element)

      expect(element).to.have.attribute('tabindex', '-1')
      expect(element).to.have.focus

      element.blur()

      expect(element).not.to.have.attribute('tabindex')
    })
  })
})
