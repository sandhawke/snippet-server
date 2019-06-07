/*
  Version 3 an object with key xyz are stored with keys like 'xyz 3'

  At 'xyz' would be '3' if that's the latest version */

const level = require('level')
const EventEmitter = require('eventemitter3')

const start = async (dbname) => {
  const db = new EventEmitter()
  const objdb = level(dbname, { valueEncoding: 'json' })
  // const objs = new Map() // for now we keep all objs in memory trivially

  async function close () {
    await objdb.close()
  }
  
  async function saveNewObj (post) {
    if (!post.timestamp_ms) {
      if (post.created_at) {
        post.timestamp_ms = Date.parse(post.created_at)
      }
    }
    post.version = 1
    // objs.set(post.id, post)
    db.emit('new', post)
    await objdb.put(post.id + ' ' + post.version, post)
    await objdb.put(post.id, post.version)
  }

  async function replaceObj (post) {
    // do something about version history? like save the old version
    // at some new URL?

    post.version = post.version + 1
    // objs.set(post.id, post)
    db.emit('updated', post)
    await objdb.put(post.id + ' ' + post.version, post)
    await objdb.put(post.id, post.version)
  }

  function each (version, versionPointer) {
    return new Promise((resolve, reject) => {
      console.log('reloading saved objs')
      objdb.createReadStream()
        .on('data', function (data) {
          // console.log('RELOADED', data.key, '=', data.value)
          // process.stderr.write('.')
          const post = data.value
          if (typeof post === 'object') {
            version(post)
          } else {
            if (versionPointer) {
              versionPointer(data.key, data.value)
            }
          }
        })
        .on('error', function (err) {
          console.log('Oh my!', err)
        })
        .on('close', function () {
          // console.log('Stream closed')
        })
        .on('end', function () {
          // console.log('reloading complete, %i objs', objs.size)
          resolve()
        })
    })
  }

  async function startDB () {
  }

  async function getVersion (id) {
    try {
      const version = await objdb.get(id)
      if (!version) return undefined
      return version
    } catch (e) {
      if (e.type === 'NotFoundError') return undefined
      throw e
    }
  }

  async function get (id, version) {
    try {
      if (!version) {
        version = await objdb.get(id)
        if (!version) return undefined
      }
      const obj = await objdb.get(id + ' ' + version)
      return obj
    } catch (e) {
      if (e.type === 'NotFoundError') return undefined
      throw e
    }
  }

  Object.assign(db, { saveNewObj, replaceObj, get, each, getVersion, close })
  return db
}

module.exports = { start }
