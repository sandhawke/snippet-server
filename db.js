const level = require('level')
const EventEmitter = require('eventemitter3')

const objdb = level('pages', { valueEncoding: 'json' })
const objs = new Map() // for now we keep all objs in memory trivially
const events = new EventEmitter()

async function saveNewObj (post) {
  if (!post.timestamp_ms) {
    if (post.created_at) {
      post.timestamp_ms = Date.parse(post.created_at)
    }
  }
  objs.set(post.id, post)
  events.emit('new', post)
  await objdb.put(post.id, post)
}

async function replaceObj (post) {
  // do something about version history? like save the old version
  // at some new URL?
  
  objs.set(post.id, post)
  // events.emit('replace', post)
  await objdb.put(post.id, post)
}

function startDB () {
  return new Promise((resolve, reject) => {
  console.log('reloading saved objs')
  objdb.createReadStream()
    .on('data', function (data) {
      // console.log('RELOADED', data.key, '=', data.value)
      // process.stderr.write('.')
      const post = data.value
      objs.set(post.id, post)
    })
    .on('error', function (err) {
      console.log('Oh my!', err)
    })
    .on('close', function () {
      // console.log('Stream closed')
    })
    .on('end', function () {
      console.log('reloading complete, %i objs', objs.size)
      resolve()
    })
  })
}

module.exports = { objs, events, saveNewObj, replaceObj, startDB}
