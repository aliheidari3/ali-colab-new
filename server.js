const general = require("./generalClass")

async function main() {
  global.general = general
  await general.initialize()
}

main()

console.log('Server is running using port 3000')



