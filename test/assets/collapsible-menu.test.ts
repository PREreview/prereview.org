import { defineCE, expect, fixture } from '@open-wc/testing'
import { setViewport } from '@web/test-runner-commands'
import * as _ from '../../assets/collapsible-menu.js'

describe('when the screen is large', () => {
  it('keeps the menu open', async () => {
    await setViewport({ width: 640, height: 700 })

    const element = defineCE(class extends _.CollapsibleMenu {})
    await fixture<_.CollapsibleMenu>(
      `<${element}>
        <nav id="nav">
          <ul><li><a href="#">Item</a></li></ul>
        </nav>
      </${element}>`,
    )

    expect(document.getElementById('nav')).not.to.have.attribute('hidden')
  })
})

describe('when the screen is small', () => {
  it('collapses the menu', async () => {
    await setViewport({ width: 639, height: 700 })

    const element = defineCE(class extends _.CollapsibleMenu {})
    const collapsibleMenu = await fixture<_.CollapsibleMenu>(
      `<${element}>
        <nav id="nav">
          <ul><li><a href="#">Item</a></li></ul>
        </nav>
      </${element}>`,
    )

    expect(collapsibleMenu.querySelector('button')).to.have.attribute('aria-controls', 'nav')
    expect(collapsibleMenu.querySelector('button')).to.have.attribute('aria-expanded', 'false')
    expect(document.getElementById('nav')).to.have.attribute('hidden')

    collapsibleMenu.querySelector('button')?.click()

    expect(collapsibleMenu.querySelector('button')).to.have.attribute('aria-expanded', 'true')
    expect(document.getElementById('nav')).not.to.have.attribute('hidden')

    collapsibleMenu.querySelector('button')?.click()

    expect(collapsibleMenu.querySelector('button')).to.have.attribute('aria-expanded', 'false')
    expect(document.getElementById('nav')).to.have.attribute('hidden')
  })
})
