import { defineCE, expect, fixture } from '@open-wc/testing'
import * as _ from '../../assets/error-summary'

describe('when it loads', () => {
  it('has temporary focus', async () => {
    const element = defineCE(class extends _.ErrorSummary {})
    const errorSummary = await fixture<_.ErrorSummary>(`<${element}></${element}>`)

    expect(errorSummary).to.have.attribute('tabindex', '-1')
    expect(errorSummary).to.have.focus

    errorSummary.blur()

    expect(errorSummary).not.to.have.attribute('tabindex')
  })
})

describe('when a link is clicked', () => {
  it('sets focus to the target', async () => {
    const element = defineCE(class extends _.ErrorSummary {})
    const errorSummary = await fixture<_.ErrorSummary>(`<${element}><a href="#target"/></${element}>`)
    const target = await fixture<HTMLInputElement>('<input id="target"/><label for="target"/>')

    errorSummary.querySelector('a')?.click()

    expect(target).to.have.focus
    expect(errorSummary.ownerDocument.location.hash).to.be.empty
  })
})
