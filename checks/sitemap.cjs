const assert = require('node:assert/strict')
const { test } = require('node:test')
const path = require('node:path')
const { createJiti } = require('jiti')

const root = path.resolve(__dirname, '..')
const jiti = createJiti(__filename, { alias: { '@': path.join(root, 'src') } })
const { buildSitemapEntries } = jiti('../src/app/lib/seo/sitemap-builder.ts')
const { getLocalizedURL } = jiti('../src/app/lib/seo/site-url.ts')
const { resolveRouteData } = require('next/dist/build/webpack/loaders/metadata/resolve-route-data')
const now = new Date('2026-10-16T00:00:00Z')
const publishedAt = new Date('2026-10-12T09:30:00Z')
const entity = {
    type: 'post', slug: 'school-news', createdAt: new Date('2026-10-01T12:00:00Z'),
    lastPublishedAt: publishedAt, contentPublishedEN: 'English', contentPublishedZH: '中文',
    coverImagePublished: { sha1: 'abc123', mediaType: 'image' }
}
const build = (overrides = {}) => buildSitemapEntries([
    { ...entity, ...overrides }
], 'https://school.example/', '/uploads/', now)

test('both languages have reciprocal alternates and publication dates in valid XML', () => {
    const entries = build()
    assert.equal(entries.length, 2)
    assert.match(entries[0].url, /\/en\/content\//)
    assert.match(entries[1].url, /\/zh\/content\//)
    for (const entry of entries) {
        assert.equal(entry.alternates.languages.en, entries[0].url)
        assert.equal(entry.alternates.languages.zh, entries[1].url)
        assert.equal(entry.alternates.languages['x-default'], entries[0].url)
        assert.equal(entry.lastModified.toISOString(), publishedAt.toISOString())
        assert.deepEqual(entry.images, [ 'https://school.example/uploads/abc123.webp' ])
        assert.equal(entry.priority, 0.7)
        assert.equal(entry.changeFrequency, 'never')
    }
    const xml = resolveRouteData(entries, 'sitemap')
    assert.equal((xml.match(/<lastmod>/g) ?? []).length, 2)
    assert.equal((xml.match(/<image:loc>/g) ?? []).length, 2)
    assert.match(xml, /xmlns:xhtml=/)
    assert.match(xml, /xmlns:image=/)
})

test('each available language is listed, while unpublished versions are excluded', () => {
    const [ zh ] = build({ contentPublishedEN: null })
    assert.match(zh.url, /\/zh\//)
    assert.deepEqual(zh.alternates.languages, { 'x-default': zh.url, zh: zh.url })
    assert.equal(build({ contentPublishedEN: null, contentPublishedZH: null }).length, 0)
})

test('homepage sitemap and canonical addresses share the final URL', () => {
    const entries = build({ type: 'page', slug: '/', contentPublishedEN: '{}', contentPublishedZH: '{}' })
    const previousHost = process.env.HOST
    try {
        process.env.HOST = 'https://school.example/'
        assert.equal(entries[0].url, getLocalizedURL('en', '/'))
        assert.equal(entries[1].url, getLocalizedURL('zh', '/'))
        assert.equal(entries[0].url, 'https://school.example/en')
        assert.equal(entries[0].priority, 1)
        assert.equal(entries[0].changeFrequency, 'daily')
    } finally {
        if (previousHost === undefined) delete process.env.HOST
        else process.env.HOST = previousHost
    }
})

test('unknown and invalid modification dates are omitted from XML', () => {
    for (const date of [ new Date(0), 'invalid', '2027-01-01T00:00:00Z' ]) {
        const entries = build({ lastPublishedAt: date })
        assert.equal(entries[0].lastModified, undefined)
        assert.doesNotMatch(resolveRouteData(entries, 'sitemap'), /<lastmod>/)
    }
})

test('automatic listings omit dates per language, including nested components', () => {
    const dynamicDocument = JSON.stringify({
        zones: {
            main: [ {
                type: 'ContainerConfig', props: {
                    content: [ { type: 'LatestNewsConfig', props: {} } ]
                }
            } ]
        }
    })
    const entries = build({ type: 'page', contentPublishedEN: dynamicDocument, contentPublishedZH: '{}' })
    assert.equal(entries[0].lastModified, undefined)
    assert.equal(entries[1].lastModified.toISOString(), publishedAt.toISOString())
})

test('video covers and missing covers produce no image sitemap entries', () => {
    for (const image of [ null, { sha1: 'video', mediaType: 'video' } ]) {
        assert.equal(build({ coverImagePublished: image })[0].images, undefined)
    }
})
