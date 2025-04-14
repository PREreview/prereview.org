import { expect, fixture } from '@open-wc/testing'
import * as _ from '../../assets/dom.js'
import { DefaultLocale } from '../../assets/locales/index.js'

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
  describe('when the target has a local fragment', () => {
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

  describe('when the target is a remote fragment', () => {
    it('returns null', async () => {
      const element = await fixture<HTMLAnchorElement>('<a href="something#id"/></a><div id="id"></div>')

      expect(_.getTargetElement(element)).to.be.null
    })
  })

  describe('when the target has no fragment', () => {
    it('returns null', async () => {
      const element = await fixture<HTMLAnchorElement>('<a href="something"/></a>')

      expect(_.getTargetElement(element)).to.be.null
    })
  })

  describe('when there is no target', () => {
    it('returns null', async () => {
      const element = await fixture<HTMLAnchorElement>('<a></a>')

      expect(_.getTargetElement(element)).to.be.null
    })
  })
})

describe('getLang', () => {
  describe('there is a lang', () => {
    describe('on the element', () => {
      it('finds the lang', async () => {
        const element = await fixture<HTMLDivElement>('<div lang="en-US"></div>')

        await expect(_.getLang(element)).to.equal('en-US')
      })

      describe('on the parent', () => {
        it('finds the lang', async () => {
          await fixture('<div lang="en-US"><div id="element"></div></div>')

          await expect(_.getLang(document.getElementById('element')!)).to.equal('en-US')
        })
      })

      describe('on an ancestor', () => {
        it('finds the lang', async () => {
          await fixture('<div lang="en-US"><div><div id="element"></div></div></div>')

          await expect(_.getLang(document.getElementById('element')!)).to.equal('en-US')
        })
      })
    })
  })

  describe("there isn't a lang", () => {
    describe('on the element', () => {
      it('returns an unknown lang', async () => {
        const element = await fixture<HTMLDivElement>('<div></div>')

        await expect(_.getLang(element)).to.equal('')
      })

      describe('on the parent', () => {
        it('finds the lang', async () => {
          await fixture('<div><div id="element"></div></div>')

          await expect(_.getLang(document.getElementById('element')!)).to.equal('')
        })
      })

      describe('on an ancestor', () => {
        it('finds the lang', async () => {
          await fixture('<div><div><div id="element"></div></div></div>')

          await expect(_.getLang(document.getElementById('element')!)).to.equal('')
        })
      })
    })
  })
})

describe('getLocale', () => {
  describe('there is a locale', () => {
    describe('on the element', () => {
      it('finds the locale', async () => {
        const element = await fixture<HTMLDivElement>('<div lang="lol-US"></div>')

        await expect(_.getLocale(element)).to.equal('lol-US')
      })

      describe('on the parent', () => {
        it('finds the locale', async () => {
          await fixture('<div lang="lol-US"><div id="element"></div></div>')

          await expect(_.getLocale(document.getElementById('element')!)).to.equal('lol-US')
        })
      })

      describe('on an ancestor', () => {
        it('finds the locale', async () => {
          await fixture('<div lang="lol-US"><div><div id="element"></div></div></div>')

          await expect(_.getLocale(document.getElementById('element')!)).to.equal('lol-US')
        })
      })
    })
  })

  describe("there isn't a locale", () => {
    describe('on the element', () => {
      it('returns the default locale', async () => {
        const element = await fixture<HTMLDivElement>('<div></div>')

        await expect(_.getLocale(element)).to.equal(DefaultLocale)
      })

      describe('on the parent', () => {
        it('returns the default locale', async () => {
          await fixture('<div><div id="element"></div></div>')

          await expect(_.getLocale(document.getElementById('element')!)).to.equal(DefaultLocale)
        })
      })

      describe('on an ancestor', () => {
        it('returns the default locale', async () => {
          await fixture('<div><div><div id="element"></div></div></div>')

          await expect(_.getLocale(document.getElementById('element')!)).to.equal(DefaultLocale)
        })
      })
    })
  })

  describe("the lang isn't a locale", () => {
    describe('on the element', () => {
      it('returns the default locale', async () => {
        const element = await fixture<HTMLDivElement>('<div lang="sa"></div>')

        await expect(_.getLocale(element)).to.equal(DefaultLocale)
      })

      describe('on the parent', () => {
        it('returns the default locale', async () => {
          await fixture('<div lang="sa"><div id="element"></div></div>')

          await expect(_.getLocale(document.getElementById('element')!)).to.equal(DefaultLocale)
        })
      })

      describe('on an ancestor', () => {
        it('returns the default locale', async () => {
          await fixture('<div lang="sa"><div><div id="element"></div></div></div>')

          await expect(_.getLocale(document.getElementById('element')!)).to.equal(DefaultLocale)
        })
      })
    })
  })
})
