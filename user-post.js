const uuid = require('uuid/v4')
const debug = require('debug')(__filename.split('/').slice(-1).join())

async function gotUserPost (submitted, db) {
  let { id, op, text, pw } = submitted

  if (!id) {
    id = uuid().replace(/-/g, '')
    debug('generated id', id)
  }
  if (!id.match(/^[0-9a-f]+$/)) return 'id not lowercase hex'
  let obj = await db.get(id)

  if (op === 'create') {
    if (obj) return 'id already used'
    obj = { id, text, pw }
    await db.saveNewObj(obj)
    return obj
  }

  if (!obj) return 'id not found'
  if (obj.pw !== pw) return 'incorrect password'

  if (op === 'append') {
    obj.text = obj.text + text
    await db.replaceObj(obj)
    return obj
  }

  if (op === 'replace') {
    obj.text = text
    await db.replaceObj(obj)
    return obj
  }

  if (op === 'delete') {
    obj.deleted = true
    await db.replaceObj(obj)
    return obj
  }

  return 'unimplemented value for op'
}

module.exports = { gotUserPost }
