const UserRouter = require('./UserRouter')
const ProductRouter = require('./ProductRouter')

const routes = (app) => {
    app.use('/', UserRouter)
    app.use('/', ProductRouter)
}

module.exports = routes