import { defineCE, expect, fixture } from '@open-wc/testing'
import * as _ from '../../assets/conditional-inputs'

describe('when an option is selected', () => {
  it('sets focus to the target', async () => {
    const element = defineCE(class extends _.ConditionalInputs {})
    const target1 = await fixture<HTMLDivElement>('<div id="target1"/>')
    const target2 = await fixture<HTMLDivElement>('<div id="target2"/>')
    const conditionalInputs = await fixture<_.ConditionalInputs>(
      `<${element}>
        <input type="radio" name="controls" aria-controls="target1" id="control1">
        <input type="radio" name="controls" aria-controls="target2" id="control2">
      </${element}>`,
    )

    expect(target1).to.have.attribute('hidden')
    expect(target2).to.have.attribute('hidden')

    conditionalInputs.ownerDocument.getElementById('control1')?.click()

    expect(target1).not.to.have.attribute('hidden')
    expect(target2).to.have.attribute('hidden')

    conditionalInputs.ownerDocument.getElementById('control2')?.click()

    expect(target1).to.have.attribute('hidden')
    expect(target2).not.to.have.attribute('hidden')
  })
})
