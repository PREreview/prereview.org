import { defineCE, expect, fixture } from '@open-wc/testing'
import * as _ from '../../assets/skip-link'

describe('when a link is clicked', () => {
  it('sets focus to the target', async () => {
    const element = defineCE(class extends _.SkipLink {})
    const skipLink = await fixture<_.SkipLink>(`<${element}><a href="#target"/></${element}>`)
    const target = await fixture<HTMLDivElement>('<div id="target"/>')

    skipLink.querySelector('a')?.click()

    expect(target).to.have.focus
    expect(document.location.hash).to.be.empty
  })
})
