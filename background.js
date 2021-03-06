'use strict'

// Storage for per-domain JS configs.
const CS = chrome.contentSettings.javascript
const CS_ENUM = chrome.contentSettings.JavascriptContentSetting

// We cache known pattens and their configs because we can't query
// `chrome.contentSettings.javascript` for ALL of them.
const STORAGE = chrome.storage.local
const STORAGE_KEY = 'javascriptContentSettings'

/**
 * Init
 */

chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({
        id: 'goto-js-settings',
        title: 'Chrome JavaScript Settings',
        contexts: ['browser_action'],
    })
})

chrome.contextMenus.onClicked.addListener(onContextItemClick)

chrome.browserAction.onClicked.addListener(onExtensionClick)

/**
 * Logic
 */

function onContextItemClick({menuItemId}) {
    if (menuItemId === 'goto-js-settings') {
        chrome.tabs.create({
            url: 'chrome://settings/content/javascript'
        })
    }
}

async function onExtensionClick(tab) {
    const {url, id} = tab

    if (chromeRegex.test(url)) return

    let pattern

    if (fileRegex.test(url)) pattern = url
    else if (url.match(ipRegex)) pattern = `*://${url.match(ipRegex)[1]}/*`
    else if (url.match(dnsRegex)) pattern = `*://*.${url.match(dnsRegex)[1]}/*`

    if (!pattern) return

    const config = await toggleConfig(url, pattern)

    await Promise.all([
        new Promise(done => chrome.tabs.reload(id, done)),
        cacheConfig(config),
    ])
}

async function toggleConfig(url, pattern) {
    const config = await new Promise(done => CS.get({primaryUrl: url}, done))
    const isEnabled = config.setting === CS_ENUM.ALLOW
    const newConfig = {primaryPattern: pattern, setting: isEnabled ? CS_ENUM.BLOCK : CS_ENUM.ALLOW}
    await new Promise(done => CS.set(newConfig, done))
    return newConfig
}

async function cacheConfig(config) {
    let {[STORAGE_KEY]: configs} = await new Promise(done => STORAGE.get(STORAGE_KEY, done))
    if (!Array.isArray(configs)) configs = []

    const index = configs.findIndex(({primaryPattern}) => (
        primaryPattern === config.primaryPattern
    ))
    if (index === -1) configs.push(config)
    else configs[index] = config

    await new Promise(done => STORAGE.set({[STORAGE_KEY]: configs}, done))
}

/**
 * Utils
 */

const chromeRegex = /^chrome:/
const fileRegex = /^file:/
const ipRegex = /^[A-z]+:\/\/\/?(\d+.\d+.\d+.\d+)[\s/?#:]/
const dnsRegex = /^[A-z]+:\/\/\/?([^\s/?#:]+)/

/**
 * REPL
 */

self.log   = console.log.bind(console)
self.info  = console.info.bind(console)
self.debug = console.debug.bind(console)
self.warn  = console.warn.bind(console)
self.error = console.error.bind(console)
self.clear = console.clear.bind(console)
