import https from 'node:https';

const nodeFetch = async (url) => {
  return new Promise((resolve, reject) => {
    const req = https.request(url, (res) => {
      const body = []
      let isStarted = false

      res.on('data', (chunk) => {
        if (!isStarted && !String(chunk).startsWith('/*O_o*/')) return resolve(null)
        isStarted = true

        body.push(chunk)
      })

      res.on('end', () => {
        const response = { ok: true, text: () => Buffer.concat(body).toString() }
        resolve(response)
      })
    })

    req.on('error', reject)
    req.end()
  })
}

export default nodeFetch