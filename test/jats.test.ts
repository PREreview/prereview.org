import { describe, expect, test } from '@jest/globals'
import { rawHtml } from '../src/html'
import * as _ from '../src/jats'

describe('transformJatsToHtml', () => {
  test.each([
    ['<jats:abbrev>', '<jats:abbrev>abbrev</jats:abbrev>', rawHtml('abbrev')],
    [
      '<jats:abbrev-journal-title>',
      '<jats:abbrev-journal-title>abbrev-journal-title</jats:abbrev-journal-title>',
      rawHtml('abbrev-journal-title'),
    ],
    ['<jats:abstract>', '<jats:abstract>abstract</jats:abstract>', rawHtml('abstract')],
    ['<jats:access-date>', '<jats:access-date>access-date</jats:access-date>', rawHtml('access-date')],
    ['<jats:ack>', '<jats:ack>ack</jats:ack>', rawHtml('ack')],
    ['<jats:addr-line>', '<jats:addr-line>addr-line</jats:addr-line>', rawHtml('addr-line')],
    ['<jats:address>', '<jats:address>address</jats:address>', rawHtml('address')],
    ['<jats:aff>', '<jats:aff>aff</jats:aff>', rawHtml('aff')],
    [
      '<jats:aff-alternatives>',
      '<jats:aff-alternatives>aff-alternatives</jats:aff-alternatives>',
      rawHtml('aff-alternatives'),
    ],
    [
      '<jats:ali:free_to_read>',
      '<jats:ali:free_to_read>ali:free_to_read</jats:ali:free_to_read>',
      rawHtml('ali:free_to_read'),
    ],
    [
      '<jats:ali:license_ref>',
      '<jats:ali:license_ref>ali:license_ref</jats:ali:license_ref>',
      rawHtml('ali:license_ref'),
    ],
    ['<jats:alt-text>', '<jats:alt-text>alt-text</jats:alt-text>', rawHtml('alt-text')],
    ['<jats:alt-title>', '<jats:alt-title>alt-title</jats:alt-title>', rawHtml('alt-title')],
    ['<jats:alternatives>', '<jats:alternatives>alternatives</jats:alternatives>', rawHtml('alternatives')],
    ['<jats:annotation>', '<jats:annotation>annotation</jats:annotation>', rawHtml('annotation')],
    ['<jats:anonymous>', '<jats:anonymous>anonymous</jats:anonymous>', rawHtml('anonymous')],
    ['<jats:answer>', '<jats:answer>answer</jats:answer>', rawHtml('answer')],
    ['<jats:answer-set>', '<jats:answer-set>answer-set</jats:answer-set>', rawHtml('answer-set')],
    ['<jats:app>', '<jats:app>app</jats:app>', rawHtml('app')],
    ['<jats:app-group>', '<jats:app-group>app-group</jats:app-group>', rawHtml('app-group')],
    ['<jats:array>', '<jats:array>array</jats:array>', rawHtml('array')],
    ['<jats:article>', '<jats:article>article</jats:article>', rawHtml('article')],
    [
      '<jats:article-categories>',
      '<jats:article-categories>article-categories</jats:article-categories>',
      rawHtml('article-categories'),
    ],
    ['<jats:article-id>', '<jats:article-id>article-id</jats:article-id>', rawHtml('article-id')],
    ['<jats:article-meta>', '<jats:article-meta>article-meta</jats:article-meta>', rawHtml('article-meta')],
    ['<jats:article-title>', '<jats:article-title>article-title</jats:article-title>', rawHtml('article-title')],
    [
      '<jats:article-version>',
      '<jats:article-version>article-version</jats:article-version>',
      rawHtml('article-version'),
    ],
    [
      '<jats:article-version-alternatives>',
      '<jats:article-version-alternatives>article-version-alternatives</jats:article-version-alternatives>',
      rawHtml('article-version-alternatives'),
    ],
    ['<jats:attrib>', '<jats:attrib>attrib</jats:attrib>', rawHtml('attrib')],
    ['<jats:author-comment>', '<jats:author-comment>author-comment</jats:author-comment>', rawHtml('author-comment')],
    ['<jats:author-notes>', '<jats:author-notes>author-notes</jats:author-notes>', rawHtml('author-notes')],
    ['<jats:award-desc>', '<jats:award-desc>award-desc</jats:award-desc>', rawHtml('award-desc')],
    ['<jats:award-group>', '<jats:award-group>award-group</jats:award-group>', rawHtml('award-group')],
    ['<jats:award-id>', '<jats:award-id>award-id</jats:award-id>', rawHtml('award-id')],
    ['<jats:award-name>', '<jats:award-name>award-name</jats:award-name>', rawHtml('award-name')],
    ['<jats:back>', '<jats:back>back</jats:back>', rawHtml('back')],
    ['<jats:bio>', '<jats:bio>bio</jats:bio>', rawHtml('bio')],
    [
      '<jats:block-alternatives>',
      '<jats:block-alternatives>block-alternatives</jats:block-alternatives>',
      rawHtml('block-alternatives'),
    ],
    ['<jats:body>', '<jats:body>body</jats:body>', rawHtml('body')],
    ['<jats:bold>', '<jats:bold>bold</jats:bold>', rawHtml('bold')],
    ['<jats:boxed-text>', '<jats:boxed-text>boxed-text</jats:boxed-text>', rawHtml('boxed-text')],
    ['<jats:break>', '<jats:break>break</jats:break>', rawHtml('break')],
    ['<jats:caption>', '<jats:caption>caption</jats:caption>', rawHtml('caption')],
    ['<jats:chapter-title>', '<jats:chapter-title>chapter-title</jats:chapter-title>', rawHtml('chapter-title')],
    ['<jats:chem-struct>', '<jats:chem-struct>chem-struct</jats:chem-struct>', rawHtml('chem-struct')],
    [
      '<jats:chem-struct-wrap>',
      '<jats:chem-struct-wrap>chem-struct-wrap</jats:chem-struct-wrap>',
      rawHtml('chem-struct-wrap'),
    ],
    [
      '<jats:citation-alternatives>',
      '<jats:citation-alternatives>citation-alternatives</jats:citation-alternatives>',
      rawHtml('citation-alternatives'),
    ],
    ['<jats:city>', '<jats:city>city</jats:city>', rawHtml('city')],
    ['<jats:code>', '<jats:code>code</jats:code>', rawHtml('code')],
    ['<jats:col>', '<jats:col>col</jats:col>', rawHtml('col')],
    ['<jats:colgroup>', '<jats:colgroup>colgroup</jats:colgroup>', rawHtml('colgroup')],
    ['<jats:collab>', '<jats:collab>collab</jats:collab>', rawHtml('collab')],
    [
      '<jats:collab-alternatives>',
      '<jats:collab-alternatives>collab-alternatives</jats:collab-alternatives>',
      rawHtml('collab-alternatives'),
    ],
    ['<jats:comment>', '<jats:comment>comment</jats:comment>', rawHtml('comment')],
    ['<jats:compound-kwd>', '<jats:compound-kwd>compound-kwd</jats:compound-kwd>', rawHtml('compound-kwd')],
    [
      '<jats:compound-kwd-part>',
      '<jats:compound-kwd-part>compound-kwd-part</jats:compound-kwd-part>',
      rawHtml('compound-kwd-part'),
    ],
    [
      '<jats:compound-subject>',
      '<jats:compound-subject>compound-subject</jats:compound-subject>',
      rawHtml('compound-subject'),
    ],
    [
      '<jats:compound-subject-part>',
      '<jats:compound-subject-part>compound-subject-part</jats:compound-subject-part>',
      rawHtml('compound-subject-part'),
    ],
    ['<jats:conf-acronym>', '<jats:conf-acronym>conf-acronym</jats:conf-acronym>', rawHtml('conf-acronym')],
    ['<jats:conf-date>', '<jats:conf-date>conf-date</jats:conf-date>', rawHtml('conf-date')],
    ['<jats:conf-loc>', '<jats:conf-loc>conf-loc</jats:conf-loc>', rawHtml('conf-loc')],
    ['<jats:conf-name>', '<jats:conf-name>conf-name</jats:conf-name>', rawHtml('conf-name')],
    ['<jats:conf-num>', '<jats:conf-num>conf-num</jats:conf-num>', rawHtml('conf-num')],
    ['<jats:conf-sponsor>', '<jats:conf-sponsor>conf-sponsor</jats:conf-sponsor>', rawHtml('conf-sponsor')],
    ['<jats:conf-theme>', '<jats:conf-theme>conf-theme</jats:conf-theme>', rawHtml('conf-theme')],
    ['<jats:conference>', '<jats:conference>conference</jats:conference>', rawHtml('conference')],
    ['<jats:contrib>', '<jats:contrib>contrib</jats:contrib>', rawHtml('contrib')],
    ['<jats:contrib-group>', '<jats:contrib-group>contrib-group</jats:contrib-group>', rawHtml('contrib-group')],
    ['<jats:contrib-id>', '<jats:contrib-id>contrib-id</jats:contrib-id>', rawHtml('contrib-id')],
    [
      '<jats:contributed-resource-group>',
      '<jats:contributed-resource-group>contributed-resource-group</jats:contributed-resource-group>',
      rawHtml('contributed-resource-group'),
    ],
    [
      '<jats:copyright-holder>',
      '<jats:copyright-holder>copyright-holder</jats:copyright-holder>',
      rawHtml('copyright-holder'),
    ],
    [
      '<jats:copyright-statement>',
      '<jats:copyright-statement>copyright-statement</jats:copyright-statement>',
      rawHtml('copyright-statement'),
    ],
    ['<jats:copyright-year>', '<jats:copyright-year>copyright-year</jats:copyright-year>', rawHtml('copyright-year')],
    ['<jats:corresp>', '<jats:corresp>corresp</jats:corresp>', rawHtml('corresp')],
    ['<jats:count>', '<jats:count>count</jats:count>', rawHtml('count')],
    ['<jats:country>', '<jats:country>country</jats:country>', rawHtml('country')],
    ['<jats:counts>', '<jats:counts>counts</jats:counts>', rawHtml('counts')],
    ['<jats:custom-meta>', '<jats:custom-meta>custom-meta</jats:custom-meta>', rawHtml('custom-meta')],
    [
      '<jats:custom-meta-group>',
      '<jats:custom-meta-group>custom-meta-group</jats:custom-meta-group>',
      rawHtml('custom-meta-group'),
    ],
    ['<jats:data-title>', '<jats:data-title>data-title</jats:data-title>', rawHtml('data-title')],
    ['<jats:date>', '<jats:date>date</jats:date>', rawHtml('date')],
    [
      '<jats:date-in-citation>',
      '<jats:date-in-citation>date-in-citation</jats:date-in-citation>',
      rawHtml('date-in-citation'),
    ],
    ['<jats:day>', '<jats:day>day</jats:day>', rawHtml('day')],
    ['<jats:def>', '<jats:def>def</jats:def>', rawHtml('def')],
    ['<jats:def-head>', '<jats:def-head>def-head</jats:def-head>', rawHtml('def-head')],
    ['<jats:def-item>', '<jats:def-item>def-item</jats:def-item>', rawHtml('def-item')],
    ['<jats:def-list>', '<jats:def-list>def-list</jats:def-list>', rawHtml('def-list')],
    ['<jats:degrees>', '<jats:degrees>degrees</jats:degrees>', rawHtml('degrees')],
    ['<jats:disp-formula>', '<jats:disp-formula>disp-formula</jats:disp-formula>', rawHtml('disp-formula')],
    [
      '<jats:disp-formula-group>',
      '<jats:disp-formula-group>disp-formula-group</jats:disp-formula-group>',
      rawHtml('disp-formula-group'),
    ],
    ['<jats:disp-quote>', '<jats:disp-quote>disp-quote</jats:disp-quote>', rawHtml('disp-quote')],
    ['<jats:edition>', '<jats:edition>edition</jats:edition>', rawHtml('edition')],
    [
      '<jats:element-citation>',
      '<jats:element-citation>element-citation</jats:element-citation>',
      rawHtml('element-citation'),
    ],
    ['<jats:elocation-id>', '<jats:elocation-id>elocation-id</jats:elocation-id>', rawHtml('elocation-id')],
    ['<jats:email>', '<jats:email>email</jats:email>', rawHtml('email')],
    ['<jats:equation-count>', '<jats:equation-count>equation-count</jats:equation-count>', rawHtml('equation-count')],
    ['<jats:era>', '<jats:era>era</jats:era>', rawHtml('era')],
    ['<jats:etal>', '<jats:etal>etal</jats:etal>', rawHtml('etal')],
    ['<jats:event>', '<jats:event>event</jats:event>', rawHtml('event')],
    ['<jats:event-desc>', '<jats:event-desc>event-desc</jats:event-desc>', rawHtml('event-desc')],
    ['<jats:explanation>', '<jats:explanation>explanation</jats:explanation>', rawHtml('explanation')],
    ['<jats:ext-link>', '<jats:ext-link>ext-link</jats:ext-link>', rawHtml('<a>ext-link</a>')],
    [
      '<jats:ext-link> with attributes',
      '<jats:ext-link ext-link-type="uri" xlink:href="http://example.com/" xml:lang="en" id="a" foo="a">ext-link</jats:ext-link>',
      rawHtml('<a href="http://example.com/">ext-link</a>'),
    ],
    [
      '<jats:ext-link> with a protocol-relative link',
      '<jats:ext-link ext-link-type="uri" xlink:href="//example.com/">a</jats:ext-link>',
      '<a>a</a>',
    ],
    [
      '<jats:ext-link> with a HTTPS link',
      '<jats:ext-link ext-link-type="uri" xlink:href="https://example.com/">a</jats:ext-link>',
      '<a href="https://example.com/">a</a>',
    ],
    [
      '<jats:ext-link> with an FTP link',
      '<jats:ext-link ext-link-type="uri" xlink:href="ftp://example.com/">a</jats:ext-link>',
      '<a href="ftp://example.com/">a</a>',
    ],
    [
      '<jats:ext-link> with an email link',
      '<jats:ext-link ext-link-type="uri" xlink:href="mailto:hello@example.com">a</jats:ext-link>',
      '<a href="mailto:hello@example.com">a</a>',
    ],
    [
      '<jats:ext-link> with a fragment link',
      '<jats:ext-link ext-link-type="uri" xlink:href="#foo">a</jats:ext-link>',
      '<a>a</a>',
    ],
    [
      '<jats:ext-link> with a relative link',
      '<jats:ext-link ext-link-type="uri" xlink:href="/foo">a</jats:ext-link>',
      '<a>a</a>',
    ],
    [
      '<jats:ext-link> with a javascript link',
      '<jats:ext-link ext-link-type="uri" xlink:href="javascript:alert(\'foo\')">a</jats:ext-link>',
      '<a>a</a>',
    ],
    ['<jats:extended-by>', '<jats:extended-by>extended-by</jats:extended-by>', rawHtml('extended-by')],
    ['<jats:fax>', '<jats:fax>fax</jats:fax>', rawHtml('fax')],
    ['<jats:fig>', '<jats:fig>fig</jats:fig>', rawHtml('fig')],
    ['<jats:fig-count>', '<jats:fig-count>fig-count</jats:fig-count>', rawHtml('fig-count')],
    ['<jats:fig-group>', '<jats:fig-group>fig-group</jats:fig-group>', rawHtml('fig-group')],
    ['<jats:fixed-case>', '<jats:fixed-case>fixed-case</jats:fixed-case>', rawHtml('fixed-case')],
    ['<jats:floats-group>', '<jats:floats-group>floats-group</jats:floats-group>', rawHtml('floats-group')],
    ['<jats:fn>', '<jats:fn>fn</jats:fn>', rawHtml('fn')],
    ['<jats:fn-group>', '<jats:fn-group>fn-group</jats:fn-group>', rawHtml('fn-group')],
    ['<jats:fpage>', '<jats:fpage>fpage</jats:fpage>', rawHtml('fpage')],
    ['<jats:front>', '<jats:front>front</jats:front>', rawHtml('front')],
    ['<jats:front-stub>', '<jats:front-stub>front-stub</jats:front-stub>', rawHtml('front-stub')],
    ['<jats:funding-group>', '<jats:funding-group>funding-group</jats:funding-group>', rawHtml('funding-group')],
    ['<jats:funding-source>', '<jats:funding-source>funding-source</jats:funding-source>', rawHtml('funding-source')],
    [
      '<jats:funding-statement>',
      '<jats:funding-statement>funding-statement</jats:funding-statement>',
      rawHtml('funding-statement'),
    ],
    ['<jats:given-names>', '<jats:given-names>given-names</jats:given-names>', rawHtml('given-names')],
    ['<jats:glossary>', '<jats:glossary>glossary</jats:glossary>', rawHtml('glossary')],
    ['<jats:glyph-data>', '<jats:glyph-data>glyph-data</jats:glyph-data>', rawHtml('glyph-data')],
    ['<jats:glyph-ref>', '<jats:glyph-ref>glyph-ref</jats:glyph-ref>', rawHtml('glyph-ref')],
    ['<jats:gov>', '<jats:gov>gov</jats:gov>', rawHtml('gov')],
    ['<jats:graphic>', '<jats:graphic>graphic</jats:graphic>', rawHtml('graphic')],
    ['<jats:history>', '<jats:history>history</jats:history>', rawHtml('history')],
    ['<jats:hr>', '<jats:hr>hr</jats:hr>', rawHtml('hr')],
    ['<jats:index-term>', '<jats:index-term>index-term</jats:index-term>', rawHtml('index-term')],
    [
      '<jats:index-term-range-end>',
      '<jats:index-term-range-end>index-term-range-end</jats:index-term-range-end>',
      rawHtml('index-term-range-end'),
    ],
    ['<jats:inline-formula>', '<jats:inline-formula>inline-formula</jats:inline-formula>', rawHtml('inline-formula')],
    ['<jats:inline-graphic>', '<jats:inline-graphic>inline-graphic</jats:inline-graphic>', rawHtml('inline-graphic')],
    ['<jats:inline-media>', '<jats:inline-media>inline-media</jats:inline-media>', rawHtml('inline-media')],
    [
      '<jats:inline-supplementary-material>',
      '<jats:inline-supplementary-material>inline-supplementary-material</jats:inline-supplementary-material>',
      rawHtml('inline-supplementary-material'),
    ],
    ['<jats:institution>', '<jats:institution>institution</jats:institution>', rawHtml('institution')],
    ['<jats:institution-id>', '<jats:institution-id>institution-id</jats:institution-id>', rawHtml('institution-id')],
    [
      '<jats:institution-wrap>',
      '<jats:institution-wrap>institution-wrap</jats:institution-wrap>',
      rawHtml('institution-wrap'),
    ],
    ['<jats:isbn>', '<jats:isbn>isbn</jats:isbn>', rawHtml('isbn')],
    ['<jats:issn>', '<jats:issn>issn</jats:issn>', rawHtml('issn')],
    ['<jats:issn-l>', '<jats:issn-l>issn-l</jats:issn-l>', rawHtml('issn-l')],
    ['<jats:issue>', '<jats:issue>issue</jats:issue>', rawHtml('issue')],
    ['<jats:issue-id>', '<jats:issue-id>issue-id</jats:issue-id>', rawHtml('issue-id')],
    ['<jats:issue-part>', '<jats:issue-part>issue-part</jats:issue-part>', rawHtml('issue-part')],
    ['<jats:issue-sponsor>', '<jats:issue-sponsor>issue-sponsor</jats:issue-sponsor>', rawHtml('issue-sponsor')],
    ['<jats:issue-subtitle>', '<jats:issue-subtitle>issue-subtitle</jats:issue-subtitle>', rawHtml('issue-subtitle')],
    ['<jats:issue-title>', '<jats:issue-title>issue-title</jats:issue-title>', rawHtml('issue-title')],
    [
      '<jats:issue-title-group>',
      '<jats:issue-title-group>issue-title-group</jats:issue-title-group>',
      rawHtml('issue-title-group'),
    ],
    ['<jats:italic>', '<jats:italic>italic</jats:italic>', rawHtml('<i>italic</i>')],
    [
      '<jats:italic> with attributes',
      '<jats:italic xml:lang="en" id="a" foo="a">italic</jats:italic>',
      rawHtml('<i>italic</i>'),
    ],
    ['<jats:journal-id>', '<jats:journal-id>journal-id</jats:journal-id>', rawHtml('journal-id')],
    ['<jats:journal-meta>', '<jats:journal-meta>journal-meta</jats:journal-meta>', rawHtml('journal-meta')],
    [
      '<jats:journal-subtitle>',
      '<jats:journal-subtitle>journal-subtitle</jats:journal-subtitle>',
      rawHtml('journal-subtitle'),
    ],
    ['<jats:journal-title>', '<jats:journal-title>journal-title</jats:journal-title>', rawHtml('journal-title')],
    [
      '<jats:journal-title-group>',
      '<jats:journal-title-group>journal-title-group</jats:journal-title-group>',
      rawHtml('journal-title-group'),
    ],
    ['<jats:kwd>', '<jats:kwd>kwd</jats:kwd>', rawHtml('kwd')],
    ['<jats:kwd-group>', '<jats:kwd-group>kwd-group</jats:kwd-group>', rawHtml('kwd-group')],
    ['<jats:label>', '<jats:label>label</jats:label>', rawHtml('label')],
    ['<jats:license>', '<jats:license>license</jats:license>', rawHtml('license')],
    ['<jats:license-p>', '<jats:license-p>license-p</jats:license-p>', rawHtml('license-p')],
    ['<jats:list>', '<jats:list>list</jats:list>', rawHtml('list')],
    ['<jats:list-item>', '<jats:list-item>list-item</jats:list-item>', rawHtml('list-item')],
    ['<jats:long-desc>', '<jats:long-desc>long-desc</jats:long-desc>', rawHtml('long-desc')],
    ['<jats:lpage>', '<jats:lpage>lpage</jats:lpage>', rawHtml('lpage')],
    ['<jats:media>', '<jats:media>media</jats:media>', rawHtml('media')],
    ['<jats:meta-name>', '<jats:meta-name>meta-name</jats:meta-name>', rawHtml('meta-name')],
    ['<jats:meta-value>', '<jats:meta-value>meta-value</jats:meta-value>', rawHtml('meta-value')],
    ['<jats:milestone-end>', '<jats:milestone-end>milestone-end</jats:milestone-end>', rawHtml('milestone-end')],
    [
      '<jats:milestone-start>',
      '<jats:milestone-start>milestone-start</jats:milestone-start>',
      rawHtml('milestone-start'),
    ],
    ['<jats:mixed-citation>', '<jats:mixed-citation>mixed-citation</jats:mixed-citation>', rawHtml('mixed-citation')],
    ['<jats:mml:math>', '<jats:mml:math>mml:math</jats:mml:math>', rawHtml('mml:math')],
    ['<jats:monospace>', '<jats:monospace>monospace</jats:monospace>', rawHtml('monospace')],
    ['<jats:month>', '<jats:month>month</jats:month>', rawHtml('month')],
    ['<jats:name>', '<jats:name>name</jats:name>', rawHtml('name')],
    [
      '<jats:name-alternatives>',
      '<jats:name-alternatives>name-alternatives</jats:name-alternatives>',
      rawHtml('name-alternatives'),
    ],
    ['<jats:named-content>', '<jats:named-content>named-content</jats:named-content>', rawHtml('named-content')],
    ['<jats:nested-kwd>', '<jats:nested-kwd>nested-kwd</jats:nested-kwd>', rawHtml('nested-kwd')],
    ['<jats:nlm-citation>', '<jats:nlm-citation>nlm-citation</jats:nlm-citation>', rawHtml('nlm-citation')],
    ['<jats:note>', '<jats:note>note</jats:note>', rawHtml('note')],
    ['<jats:notes>', '<jats:notes>notes</jats:notes>', rawHtml('notes')],
    ['<jats:object-id>', '<jats:object-id>object-id</jats:object-id>', rawHtml('object-id')],
    ['<jats:on-behalf-of>', '<jats:on-behalf-of>on-behalf-of</jats:on-behalf-of>', rawHtml('on-behalf-of')],
    ['<jats:open-access>', '<jats:open-access>open-access</jats:open-access>', rawHtml('open-access')],
    ['<jats:option>', '<jats:option>option</jats:option>', rawHtml('option')],
    ['<jats:overline>', '<jats:overline>overline</jats:overline>', rawHtml('overline')],
    ['<jats:p>', '<jats:p>p</jats:p>', rawHtml('<p>p</p>')],
    ['<jats:p> with attributes', '<jats:p xml:lang="en" id="a" foo="a">p</jats:p>', rawHtml('<p>p</p>')],
    ['<jats:page-count>', '<jats:page-count>page-count</jats:page-count>', rawHtml('page-count')],
    ['<jats:page-range>', '<jats:page-range>page-range</jats:page-range>', rawHtml('page-range')],
    ['<jats:part-title>', '<jats:part-title>part-title</jats:part-title>', rawHtml('part-title')],
    ['<jats:patent>', '<jats:patent>patent</jats:patent>', rawHtml('patent')],
    ['<jats:permissions>', '<jats:permissions>permissions</jats:permissions>', rawHtml('permissions')],
    ['<jats:person-group>', '<jats:person-group>person-group</jats:person-group>', rawHtml('person-group')],
    ['<jats:phone>', '<jats:phone>phone</jats:phone>', rawHtml('phone')],
    ['<jats:postal-code>', '<jats:postal-code>postal-code</jats:postal-code>', rawHtml('postal-code')],
    ['<jats:prefix>', '<jats:prefix>prefix</jats:prefix>', rawHtml('prefix')],
    ['<jats:preformat>', '<jats:preformat>preformat</jats:preformat>', rawHtml('preformat')],
    ['<jats:price>', '<jats:price>price</jats:price>', rawHtml('price')],
    [
      '<jats:principal-award-recipient>',
      '<jats:principal-award-recipient>principal-award-recipient</jats:principal-award-recipient>',
      rawHtml('principal-award-recipient'),
    ],
    [
      '<jats:principal-investigator>',
      '<jats:principal-investigator>principal-investigator</jats:principal-investigator>',
      rawHtml('principal-investigator'),
    ],
    ['<jats:private-char>', '<jats:private-char>private-char</jats:private-char>', rawHtml('private-char')],
    [
      '<jats:processing-meta>',
      '<jats:processing-meta>processing-meta</jats:processing-meta>',
      rawHtml('processing-meta'),
    ],
    ['<jats:product>', '<jats:product>product</jats:product>', rawHtml('product')],
    ['<jats:pub-date>', '<jats:pub-date>pub-date</jats:pub-date>', rawHtml('pub-date')],
    [
      '<jats:pub-date-not-available>',
      '<jats:pub-date-not-available>pub-date-not-available</jats:pub-date-not-available>',
      rawHtml('pub-date-not-available'),
    ],
    ['<jats:pub-history>', '<jats:pub-history>pub-history</jats:pub-history>', rawHtml('pub-history')],
    ['<jats:pub-id>', '<jats:pub-id>pub-id</jats:pub-id>', rawHtml('pub-id')],
    ['<jats:publisher>', '<jats:publisher>publisher</jats:publisher>', rawHtml('publisher')],
    ['<jats:publisher-loc>', '<jats:publisher-loc>publisher-loc</jats:publisher-loc>', rawHtml('publisher-loc')],
    ['<jats:publisher-name>', '<jats:publisher-name>publisher-name</jats:publisher-name>', rawHtml('publisher-name')],
    ['<jats:question>', '<jats:question>question</jats:question>', rawHtml('question')],
    [
      '<jats:question-preamble>',
      '<jats:question-preamble>question-preamble</jats:question-preamble>',
      rawHtml('question-preamble'),
    ],
    ['<jats:question-wrap>', '<jats:question-wrap>question-wrap</jats:question-wrap>', rawHtml('question-wrap')],
    [
      '<jats:question-wrap-group>',
      '<jats:question-wrap-group>question-wrap-group</jats:question-wrap-group>',
      rawHtml('question-wrap-group'),
    ],
    ['<jats:rb>', '<jats:rb>rb</jats:rb>', rawHtml('rb')],
    ['<jats:ref>', '<jats:ref>ref</jats:ref>', rawHtml('ref')],
    ['<jats:ref-count>', '<jats:ref-count>ref-count</jats:ref-count>', rawHtml('ref-count')],
    ['<jats:ref-list>', '<jats:ref-list>ref-list</jats:ref-list>', rawHtml('ref-list')],
    [
      '<jats:related-article>',
      '<jats:related-article>related-article</jats:related-article>',
      rawHtml('related-article'),
    ],
    [
      '<jats:related-object>',
      '<jats:related-object>related-object</jats:related-object>',
      rawHtml('<a>related-object</a>'),
    ],
    [
      '<jats:related-object> with attributes',
      '<jats:related-object ext-link-type="uri" xlink:href="http://example.com/" xml:lang="en" id="a" foo="a">related-object</jats:related-object>',
      rawHtml('<a href="http://example.com/">related-object</a>'),
    ],
    [
      '<jats:related-object> with a protocol-relative link',
      '<jats:related-object ext-link-type="uri" xlink:href="//example.com/">a</jats:related-object>',
      '<a>a</a>',
    ],
    [
      '<jats:related-object> with a HTTPS link',
      '<jats:related-object ext-link-type="uri" xlink:href="https://example.com/">a</jats:related-object>',
      '<a href="https://example.com/">a</a>',
    ],
    [
      '<jats:related-object> with an FTP link',
      '<jats:related-object ext-link-type="uri" xlink:href="ftp://example.com/">a</jats:related-object>',
      '<a href="ftp://example.com/">a</a>',
    ],
    [
      '<jats:related-object> with an email link',
      '<jats:related-object ext-link-type="uri" xlink:href="mailto:hello@example.com">a</jats:related-object>',
      '<a href="mailto:hello@example.com">a</a>',
    ],
    [
      '<jats:related-object> with a fragment link',
      '<jats:related-object ext-link-type="uri" xlink:href="#foo">a</jats:related-object>',
      '<a>a</a>',
    ],
    [
      '<jats:related-object> with a relative link',
      '<jats:related-object ext-link-type="uri" xlink:href="/foo">a</jats:related-object>',
      '<a>a</a>',
    ],
    [
      '<jats:related-object> with a javascript link',
      '<jats:related-object ext-link-type="uri" xlink:href="javascript:alert(\'foo\')">a</jats:related-object>',
      '<a>a</a>',
    ],
    ['<jats:resource-group>', '<jats:resource-group>resource-group</jats:resource-group>', rawHtml('resource-group')],
    ['<jats:resource-id>', '<jats:resource-id>resource-id</jats:resource-id>', rawHtml('resource-id')],
    ['<jats:resource-name>', '<jats:resource-name>resource-name</jats:resource-name>', rawHtml('resource-name')],
    ['<jats:resource-wrap>', '<jats:resource-wrap>resource-wrap</jats:resource-wrap>', rawHtml('resource-wrap')],
    ['<jats:response>', '<jats:response>response</jats:response>', rawHtml('response')],
    ['<jats:restricted-by>', '<jats:restricted-by>restricted-by</jats:restricted-by>', rawHtml('restricted-by')],
    ['<jats:role>', '<jats:role>role</jats:role>', rawHtml('role')],
    ['<jats:roman>', '<jats:roman>roman</jats:roman>', rawHtml('roman')],
    ['<jats:rt>', '<jats:rt>rt</jats:rt>', rawHtml('rt')],
    ['<jats:ruby>', '<jats:ruby>ruby</jats:ruby>', rawHtml('ruby')],
    ['<jats:sans-serif>', '<jats:sans-serif>sans-serif</jats:sans-serif>', rawHtml('sans-serif')],
    ['<jats:sc>', '<jats:sc>sc</jats:sc>', rawHtml('sc')],
    ['<jats:season>', '<jats:season>season</jats:season>', rawHtml('season')],
    ['<jats:sec>', '<jats:sec>sec</jats:sec>', rawHtml('sec')],
    ['<jats:sec-meta>', '<jats:sec-meta>sec-meta</jats:sec-meta>', rawHtml('sec-meta')],
    ['<jats:see>', '<jats:see>see</jats:see>', rawHtml('see')],
    ['<jats:see-also>', '<jats:see-also>see-also</jats:see-also>', rawHtml('see-also')],
    ['<jats:self-uri>', '<jats:self-uri>self-uri</jats:self-uri>', rawHtml('self-uri')],
    ['<jats:series>', '<jats:series>series</jats:series>', rawHtml('series')],
    ['<jats:series-text>', '<jats:series-text>series-text</jats:series-text>', rawHtml('series-text')],
    ['<jats:series-title>', '<jats:series-title>series-title</jats:series-title>', rawHtml('series-title')],
    ['<jats:sig>', '<jats:sig>sig</jats:sig>', rawHtml('sig')],
    ['<jats:sig-block>', '<jats:sig-block>sig-block</jats:sig-block>', rawHtml('sig-block')],
    ['<jats:size>', '<jats:size>size</jats:size>', rawHtml('size')],
    ['<jats:source>', '<jats:source>source</jats:source>', rawHtml('source')],
    ['<jats:speaker>', '<jats:speaker>speaker</jats:speaker>', rawHtml('speaker')],
    ['<jats:speech>', '<jats:speech>speech</jats:speech>', rawHtml('speech')],
    ['<jats:state>', '<jats:state>state</jats:state>', rawHtml('state')],
    ['<jats:statement>', '<jats:statement>statement</jats:statement>', rawHtml('statement')],
    ['<jats:std>', '<jats:std>std</jats:std>', rawHtml('std')],
    [
      '<jats:std-organization>',
      '<jats:std-organization>std-organization</jats:std-organization>',
      rawHtml('std-organization'),
    ],
    ['<jats:strike>', '<jats:strike>strike</jats:strike>', rawHtml('strike')],
    ['<jats:string-date>', '<jats:string-date>string-date</jats:string-date>', rawHtml('string-date')],
    ['<jats:string-name>', '<jats:string-name>string-name</jats:string-name>', rawHtml('string-name')],
    ['<jats:styled-content>', '<jats:styled-content>styled-content</jats:styled-content>', rawHtml('styled-content')],
    ['<jats:sub>', '<jats:sub>sub</jats:sub>', rawHtml('<sub>sub</sub>')],
    ['<jats:sub> with attributes', '<jats:sub xml:lang="en" id="a" foo="a">sub</jats:sub>', rawHtml('<sub>sub</sub>')],
    ['<jats:sub-article>', '<jats:sub-article>sub-article</jats:sub-article>', rawHtml('sub-article')],
    ['<jats:subj-group>', '<jats:subj-group>subj-group</jats:subj-group>', rawHtml('subj-group')],
    ['<jats:subject>', '<jats:subject>subject</jats:subject>', rawHtml('subject')],
    ['<jats:subtitle>', '<jats:subtitle>subtitle</jats:subtitle>', rawHtml('subtitle')],
    ['<jats:suffix>', '<jats:suffix>suffix</jats:suffix>', rawHtml('suffix')],
    ['<jats:sup>', '<jats:sup>sup</jats:sup>', rawHtml('<sup>sup</sup>')],
    ['<jats:sup>', '<jats:sup xml:lang="en" id="a" foo="a">sup</jats:sup>', rawHtml('<sup>sup</sup>')],
    ['<jats:supplement>', '<jats:supplement>supplement</jats:supplement>', rawHtml('supplement')],
    [
      '<jats:supplementary-material>',
      '<jats:supplementary-material>supplementary-material</jats:supplementary-material>',
      rawHtml('supplementary-material'),
    ],
    [
      '<jats:support-description>',
      '<jats:support-description>support-description</jats:support-description>',
      rawHtml('support-description'),
    ],
    ['<jats:support-group>', '<jats:support-group>support-group</jats:support-group>', rawHtml('support-group')],
    ['<jats:support-source>', '<jats:support-source>support-source</jats:support-source>', rawHtml('support-source')],
    ['<jats:surname>', '<jats:surname>surname</jats:surname>', rawHtml('surname')],
    ['<jats:table>', '<jats:table>table</jats:table>', rawHtml('table')],
    ['<jats:table-count>', '<jats:table-count>table-count</jats:table-count>', rawHtml('table-count')],
    ['<jats:table-wrap>', '<jats:table-wrap>table-wrap</jats:table-wrap>', rawHtml('table-wrap')],
    [
      '<jats:table-wrap-foot>',
      '<jats:table-wrap-foot>table-wrap-foot</jats:table-wrap-foot>',
      rawHtml('table-wrap-foot'),
    ],
    [
      '<jats:table-wrap-group>',
      '<jats:table-wrap-group>table-wrap-group</jats:table-wrap-group>',
      rawHtml('table-wrap-group'),
    ],
    ['<jats:target>', '<jats:target>target</jats:target>', rawHtml('target')],
    ['<jats:tbody>', '<jats:tbody>tbody</jats:tbody>', rawHtml('tbody')],
    ['<jats:td>', '<jats:td>td</jats:td>', rawHtml('td')],
    ['<jats:term>', '<jats:term>term</jats:term>', rawHtml('term')],
    ['<jats:term-head>', '<jats:term-head>term-head</jats:term-head>', rawHtml('term-head')],
    ['<jats:tex-math>', '<jats:tex-math>tex-math</jats:tex-math>', rawHtml('tex-math')],
    ['<jats:textual-form>', '<jats:textual-form>textual-form</jats:textual-form>', rawHtml('textual-form')],
    ['<jats:tfoot>', '<jats:tfoot>tfoot</jats:tfoot>', rawHtml('tfoot')],
    ['<jats:th>', '<jats:th>th</jats:th>', rawHtml('th')],
    ['<jats:thead>', '<jats:thead>thead</jats:thead>', rawHtml('thead')],
    ['<jats:time-stamp>', '<jats:time-stamp>time-stamp</jats:time-stamp>', rawHtml('time-stamp')],
    ['<jats:title>', '<jats:title>title</jats:title>', rawHtml('<h4>title</h4>')],
    [
      '<jats:title> with attributes',
      '<jats:title xml:lang="en" id="a" foo="a">title</jats:title>',
      rawHtml('<h4>title</h4>'),
    ],
    ["<jats:title> with 'Abstract' title", '<jats:title>Abstract</jats:title>', rawHtml('')],
    ["<jats:title> with 'Graphical Abstract' title", '<jats:title>Graphical Abstract</jats:title>', rawHtml('')],
    ['<jats:title-group>', '<jats:title-group>title-group</jats:title-group>', rawHtml('title-group')],
    ['<jats:tr>', '<jats:tr>tr</jats:tr>', rawHtml('tr')],
    ['<jats:trans-abstract>', '<jats:trans-abstract>trans-abstract</jats:trans-abstract>', rawHtml('trans-abstract')],
    ['<jats:trans-source>', '<jats:trans-source>trans-source</jats:trans-source>', rawHtml('trans-source')],
    ['<jats:trans-subtitle>', '<jats:trans-subtitle>trans-subtitle</jats:trans-subtitle>', rawHtml('trans-subtitle')],
    ['<jats:trans-title>', '<jats:trans-title>trans-title</jats:trans-title>', rawHtml('trans-title')],
    [
      '<jats:trans-title-group>',
      '<jats:trans-title-group>trans-title-group</jats:trans-title-group>',
      rawHtml('trans-title-group'),
    ],
    ['<jats:underline>', '<jats:underline>underline</jats:underline>', rawHtml('underline')],
    ['<jats:uri>', '<jats:uri>uri</jats:uri>', rawHtml('uri')],
    ['<jats:verse-group>', '<jats:verse-group>verse-group</jats:verse-group>', rawHtml('verse-group')],
    ['<jats:verse-line>', '<jats:verse-line>verse-line</jats:verse-line>', rawHtml('verse-line')],
    ['<jats:version>', '<jats:version>version</jats:version>', rawHtml('version')],
    ['<jats:volume>', '<jats:volume>volume</jats:volume>', rawHtml('volume')],
    ['<jats:volume-id>', '<jats:volume-id>volume-id</jats:volume-id>', rawHtml('volume-id')],
    [
      '<jats:volume-issue-group>',
      '<jats:volume-issue-group>volume-issue-group</jats:volume-issue-group>',
      rawHtml('volume-issue-group'),
    ],
    ['<jats:volume-series>', '<jats:volume-series>volume-series</jats:volume-series>', rawHtml('volume-series')],
    ['<jats:word-count>', '<jats:word-count>word-count</jats:word-count>', rawHtml('word-count')],
    ['<jats:xref>', '<jats:xref>xref</jats:xref>', rawHtml('xref')],
    ['<jats:year>', '<jats:year>year</jats:year>', rawHtml('year')],
  ])('%s', (_name, input, expected) => {
    const actual = _.transformJatsToHtml(input)

    expect(actual.toString()).toStrictEqual(expected.toString())
  })
})
