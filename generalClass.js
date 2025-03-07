const myTCPServerClass = require('./myTCPServerClass')
const handler = require("./handlerDefinitionClass");
const TelegramData = require('./TelegramData')
const DollarSekkeData = require('./DollarSekkeData')

class generalClass {

  myTCPServer
  handlers
  dollarSekkeData

  async initialize() {

    this.dollarSekkeData = new DollarSekkeData()
    this.dollarSekkeData.startFetching()

    this.myTCPServer = new myTCPServerClass()
    this.myTCPServer.startAutoClear()
    let h = new handler();
    h.initialize();
    this.handlers = h

  }

  async handlePolling(pollingData, sourceID) {
    let r = await this.myTCPServer.handlePolling(pollingData, sourceID)
    return r
  }

  async getColabAddress(colabNo) {
    let r = await this.handlers.getResponse('getColabStatus', '', `colab-${colabNo}`, 1)
    return r
  }

  async getAliveColab() {
    general = global.general
    async function getAliveColab() {
      const promise1 = new Promise((resolve, reject) => {
        general.handlers.getResponse('getColabStatus', '', 'colab-1', 1)
          .then(result => {
            resolve(result ? 1 : undefined)
          })
      });
      const promise2 = new Promise((resolve, reject) => {
        general.handlers.getResponse('getColabStatus', '', 'colab-2', 1)
          .then(result => {
            resolve(result ? 2 : undefined)
          })
      });
      const promise3 = new Promise((resolve, reject) => {
        general.handlers.getResponse('getColabStatus', '', 'colab-3', 1)
          .then(result => {
            resolve(result ? 3 : undefined)
          })
      });
      try {
        let r = await Promise.race([promise1, promise2, promise3])
        return r
      } catch (error) {
        return undefined
      }
    }
    let r = await getAliveColab()
    return r
  }

  async getDollarAndSekke() {
    let r = this.dollarSekkeData.getDollarAndSekke()
    return r
  }

}

module.exports = new generalClass()
