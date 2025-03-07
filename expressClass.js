
const express = require('express')
const bodyParser = require('body-parser');

class ExpressClass {

  app
  methods = {}

  initialize() {
    this.app = express()
    this.app.use(bodyParser.urlencoded({ extended: true }));
  }

  setStaticFilesPath(path) {
    this.app.use(express.static(path))
  }

  setMainHtml(htmlPath) {
    this.app.all('/', (req, res) => {
      res.sendFile(htmlPath);
    })
  }

  defineAllConfigs(staticFilesPath, mainHtml) {
    this.initialize()
    this.setStaticFilesPath(staticFilesPath)
    this.setMainHtml(mainHtml)
  }

  defineRoute(route, callback) {
    this.app.post(route, async (req, res) => {
      let r = await callback(req.body)
      if (typeof (r) === 'number') r = `${r}`;
      res.send(r)
    })
  }

  defineMethod(route, methodName, callback) {
    if (this.methods[route] === undefined) {
      this.methods[route] = {}
      this.defineRoute(route, async (body) => {
        try {
          let data = JSON.parse(body.data)
          for (let key in this.methods[route]) {
            if (data.methodName === key) {
              let r = ''
              try {
                r = await this.methods[route][key](data.parameters)
              } catch (error) { }
              return r
            }
          }
        } catch (error) { }
      })
    }
    this.methods[route][methodName] = callback

    // =========================Front end function:============================
    // async function getResponse(route, methodName, parameters) {
    //   let data = {}
    //   data.methodName = methodName
    //   data.parameters = parameters
    //   let p = new Promise((res, rej) => {
    //     $.post(route, {
    //       data: JSON.stringify(data)
    //     }, (data, status) => {
    //       if (status === 'success') {
    //         res(data)
    //       } else {
    //         res(undefined)
    //       }
    //     });
    //   })
    //   return await p
    // }
    // ==========================================================================

  }

  startServer(port) {
    this.app.listen(port)
  }

}

module.exports = ExpressClass
