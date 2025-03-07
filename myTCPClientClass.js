const crypto = require('crypto')
const axios = require('axios')

class myTCPClientClass {

  sourceID
  serverUrl

  outRequests = []
  outResponses = []
  inResponses = []

  handlers = {}

  autoPolling = false
  autoPollingInterval = undefined

  initialize(sourceID, serverUrl) {
    this.sourceID = sourceID
    this.serverUrl = serverUrl
  }

  getNow() {
    // get current time in UTC
    let date = new Date();
    let year = date.getUTCFullYear();
    let month = (date.getUTCMonth() + 1).toString().padStart(2, '0');
    let day = date.getUTCDate().toString().padStart(2, '0');
    let hours = date.getUTCHours().toString().padStart(2, '0');
    let minutes = date.getUTCMinutes().toString().padStart(2, '0');
    let seconds = date.getUTCSeconds().toString().padStart(2, '0');
    // apply UTC offset of +3 hours and 30 minutes
    let offsetHours = 3;
    let offsetMinutes = 30;
    let offsetMilliseconds = (offsetHours * 60 + offsetMinutes) * 60 * 1000;
    date.setTime(date.getTime() + offsetMilliseconds);
    // format date in required format
    year = date.getUTCFullYear();
    month = (date.getUTCMonth() + 1).toString().padStart(2, '0');
    day = date.getUTCDate().toString().padStart(2, '0');
    hours = date.getUTCHours().toString().padStart(2, '0');
    minutes = date.getUTCMinutes().toString().padStart(2, '0');
    seconds = date.getUTCSeconds().toString().padStart(2, '0');
    const formattedDate = `${year}${month}${day}-${hours}${minutes}${seconds}`;

    return formattedDate
  }

  getExpirationTime(ageMinutes) {
    const now = new Date();
    const expiration = new Date(now.getTime() + ageMinutes * 60000 + 3.5 * 3600 * 1000);
    const year = expiration.getUTCFullYear();
    const month = (expiration.getUTCMonth() + 1).toString().padStart(2, '0');
    const day = expiration.getUTCDate().toString().padStart(2, '0');
    const hours = expiration.getUTCHours().toString().padStart(2, '0');
    const minutes = expiration.getUTCMinutes().toString().padStart(2, '0');
    const seconds = expiration.getUTCSeconds().toString().padStart(2, '0');
    return `${year}${month}${day}-${hours}${minutes}${seconds}`;
  }

  getRandomHash() {
    let current_date = (new Date()).valueOf().toString();
    let random = Math.random().toString();
    return crypto.createHash('md5').update(current_date + random).digest('hex');
  }

  sendRequest(methodName, parameters, destinationID, ageMinutes = 60, needResponse = true) {
    let requestTime = this.getNow()
    let expirationTime = this.getExpirationTime(ageMinutes)
    let requestID = this.getRandomHash()
    let request = {}
    request.methodName = methodName
    request.parameters = parameters
    request.sourceID = this.sourceID
    request.destinationID = destinationID
    request.requestID = requestID
    request.requestTime = requestTime
    request.expirationTime = expirationTime
    request.needResponse = needResponse
    this.outRequests.push(request)
    this.clearInResponses()
    return request
  }

  getResponseByRequestID(requestID) {
    for (let i = 0; i < this.inResponses.length; i++) {
      if (this.inResponses[i].requestID === requestID) {
        let response = this.inResponses[i]
        this.inResponses.splice(i, 1)
        return response
      }
    }
    return undefined;
  }

  async getResponse(methodName, parameters, destinationID, ageMinutes = 60, needResponse = true, interval_ms = 1000) {
    let delay = ms => new Promise(res => setTimeout(res, ms));
    let timedOut = false
    delay(ageMinutes * 60 * 1000).then(() => {
      timedOut = true
    })
    let request = this.sendRequest(methodName, parameters, destinationID, ageMinutes, needResponse)
    if (needResponse === false) return undefined;
    while (true) {
      await delay(interval_ms)
      let response = this.getResponseByRequestID(request.requestID)
      if (response) {
        try {
          let r = response.content
          r = JSON.parse(r)
          return r
        } catch (error) {
          return undefined
        }
      }
      if (timedOut) return undefined
    }
  }

  async getExpressResponse(url, methodName, parameters) {
    const data = {
      methodName,
      parameters,
    };
    let response
    try {
      response = await axios.post(url, `data=${JSON.stringify(data)}`, { responseType: 'text' })
      response = JSON.parse(response.data)
    } catch (error) {
      response = undefined
    }
    return response
  }

  async doPolling() {
    let outData
    if (this.outRequests.length === 0 && this.outResponses.length === 0) {
      outData = ''
    } else {
      outData = {}
      outData.requests = this.outRequests
      this.outRequests = []
      outData.responses = this.outResponses
      this.outResponses = []
    }
    try {
      let inData = await this.getExpressResponse(`${this.serverUrl}`, 'handlePolling', { pollingData: outData, sourceID: this.sourceID })
      if (inData !== '') {
        inData.responses.forEach((response) => {
          this.inResponses.push(response)
        })
        this.handleAllInRequests(inData.requests)
      }
    } catch (error) { }
  }

  clearInResponses() {
    let now = this.getNow()
    for (let i = this.inResponses.length - 1; i >= 0; i--) {
      let response = this.inResponses[i]
      if (now > response.expirationTime) {
        this.requests.splice(i, 1)
      }
    }
  }

  async handleAllInRequests(requests) {
    for (let request of requests) {
      this.handleRequest(request)
    }
  }

  async handleRequest(request) {
    for (let key in this.handlers) {
      if (request.methodName === key) {
        let r
        try {
          r = await this.handlers[key](request.parameters, request)
          if (request.needResponse) {
            let response = {}
            response.content = JSON.stringify(r)
            response.requestID = request.requestID
            response.destinationID = request.sourceID
            response.expirationTime = request.expirationTime
            this.outResponses.push(response)
          }
        } catch (error) { }
      }
    }
  }

  defineRequestHandler(methodName, handler) {  // handler(request.parameters, request)
    this.handlers[methodName] = handler
  }

  startAutomaticPolling(interval_ms) {
    if (this.autoPolling === true) {
      clearInterval(this.autoReceiveInterval)
    }
    this.autoPolling = true
    this.autoPollingInterval = setInterval(() => {
      this.doPolling()
    }, interval_ms)
  }

  stopAutomaticPolling(interval_ms) {
    if (this.autoPolling === true) {
      clearInterval(this.autoPollingInterval)
    }
    this.autoPolling = false
  }

}

module.exports = myTCPClientClass

