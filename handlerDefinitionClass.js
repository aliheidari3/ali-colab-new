const myTCPClientClass = require('./myTCPClientClass')
const ExpressClass = require('./expressClass')
let general

class handlerDefinitionClass {
  express
  myTCPClient
  route

  initialize() {
    general = global.general
    this.route = "/getResponse";

    this.express = new ExpressClass();
    this.express.defineAllConfigs(
      "files/html-public",
      `${__dirname}/files/html-public/index.html`
    );

    let url = 'http://127.0.0.1:3000/getResponse'
    this.myTCPClient = new myTCPClientClass()
    this.myTCPClient.initialize(`glitch`, url)

    this.defineAllHandlers();

    this.myTCPClient.startAutomaticPolling(1000)
    this.express.startServer(3000);
  }

  defineAllHandlers() {
    this.defineAllExpressHandlers([
      "getPopulation",
      "handlePolling",
      "getColabAddress",
      "getAliveColab",

      "getDollarAndSekke",
    ]);
    this.defineAllTCPHandlers([

    ])
  }

  // ============================================================================
  // ========================  Fixed Methods  ===================================
  // ============================================================================

  bindThisToHandlers(handlerNames) {
    for (let h of handlerNames) {
      this[h] = this[h].bind(this)
    }
  }

  defineHandlerForExpress(methodName, handler) {
    this.express.defineMethod(this.route, methodName, handler)
  }

  defineHandlerForTCP(methodName, handler) {
    this.myTCPClient.defineRequestHandler(methodName, handler)
  }

  defineAllExpressHandlers(handlerNames) {
    this.bindThisToHandlers(handlerNames)
    for (let h of handlerNames) {
      this.defineHandlerForExpress(h, this[h])
    }
  }

  defineAllTCPHandlers(handlerNames) {
    this.bindThisToHandlers(handlerNames)
    for (let h of handlerNames) {
      this.defineHandlerForTCP(h, this[h])
    }
  }

  async getResponse(methodName, parameters, destinationID, ageMinutes = 5, needResponse = true, interval_ms = 1000) {
    let r = await this.myTCPClient.getResponse(methodName, parameters, destinationID, ageMinutes, needResponse, interval_ms)
    return r
  }

  // ============================================================================
  // ===========================  Handlers  =====================================
  // ============================================================================

  async handlePolling(params) {
    let r = general.handlePolling(params.pollingData, params.sourceID)
    return r
  }

  async getPopulation() {
    console.log(`=========((getPopulation))==========`);
    return "10000000";
  }

  async getColabAddress(params) {
    let password = params.password
    let colabNo = params.colabNo
    if (process.env.limitedPassword !== password) return 'Invalid Password';
    let r = await general.getColabAddress(colabNo)
    return r
  }

  async getAliveColab() {
    let r = await general.getAliveColab()
    return r
  }

  async getDollarAndSekke() {

    function convertUnixToUTC330(unixTime) {
      const date = new Date(unixTime * 1000);
      const gmt330Date = new Date(date.getTime() + (3 * 60 + 30) * 60 * 1000);
      const year = gmt330Date.getUTCFullYear();
      const month = String(gmt330Date.getUTCMonth() + 1).padStart(2, '0'); // Months are zero-based
      const day = String(gmt330Date.getUTCDate()).padStart(2, '0');
      const hours = String(gmt330Date.getUTCHours()).padStart(2, '0');
      const minutes = String(gmt330Date.getUTCMinutes()).padStart(2, '0');
      const seconds = String(gmt330Date.getUTCSeconds()).padStart(2, '0');
      const formattedDate = `${year}${month}${day}-${hours}${minutes}${seconds}`;
      return formattedDate;
    }
    let r = await general.getDollarAndSekke()  
    r.dollarTimeText = convertUnixToUTC330(r.dollarTime)
    // console.log(r)
    r.sekkeTimeText = convertUnixToUTC330(r.sekkeTime)
    let { dollarPrice, dollarTime, dollarTimeText, sekkePrice, sekkeTime, sekkeTimeText } = r
    r = { dollarPrice, dollarTime, dollarTimeText, sekkePrice, sekkeTime, sekkeTimeText }
    r = JSON.stringify(r)
    return r
  }

}

module.exports = handlerDefinitionClass;
