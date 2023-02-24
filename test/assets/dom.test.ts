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

describe('disableButton', () => {
  it('disables the button', async () => {
    const element = await fixture<HTMLButtonElement>('<button/>')

    _.disableButton(element)

    expect(element).to.have.attribute('aria-disabled', 'true')
  })

  it('prevents the button from being clicked', async () => {
    const element = await fixture<HTMLButtonElement>('<button/>')
    const event = new MouseEvent('click', { cancelable: true })

    _.disableButton(element)
    element.dispatchEvent(event)

    expect(event.defaultPrevented).to.be.true
  })
})

describe('enableButton', () => {
  it('enables the button', async () => {
    const element = await fixture<HTMLButtonElement>('<button aria-disabled="true"/>')

    _.enableButton(element)

    expect(element).to.have.attribute('aria-disabled', 'false')
  })

  it('does not prevent the button from being clicked', async () => {
    const element = await fixture<HTMLButtonElement>('<button/>')
    const event = new MouseEvent('click', { cancelable: true })
    element.addEventListener('click', _.preventDefault)

    _.enableButton(element)
    element.dispatchEvent(event)

    expect(event.defaultPrevented).to.be.false
  })
})

describe('getTargetElement', () => {
  describe('when the target has fragment', () => {
    describe('when it exists', () => {
      it('finds the target element', async () => {
        const element = await fixture<HTMLAnchorElement>('<a href="#id"/></a><div id="id"></div>')

        expect(_.getTargetElement(element)).to.have.id('id')
      })

      describe('when does not exist', () => {
        it('returns null', async () => {
          const element = await fixture<HTMLAnchorElement>('<a href="#id"/></a>')

          expect(_.getTargetElement(element)).to.be.null
        })
      })
    })
  })

  describe('when the target has no fragment', () => {
    it('returns null', async () => {
      const element = await fixture<HTMLAnchorElement>('<a href="something"/></a>')

      expect(_.getTargetElement(element)).to.be.null
    })
  })
})
