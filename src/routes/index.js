const UserRouter = require('./UserRouter')
const ProductRouter = require('./ProductRouter')
const CategoryRouter = require('./CategoryRouter')

const routes = (app) => {
    app.use('/', UserRouter)
    app.use('/', ProductRouter)
    app.use('/', CategoryRouter)
}

module.exports = routes