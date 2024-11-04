const UserRouter = require('./UserRouter')
const ProductRouter = require('./ProductRouter')
const CategoryRouter = require('./CategoryRouter')
const CartRouter = require('./CartRouter')
const OrderRouter = require('./OrderRouter')
const ConversationRouter = require("./ConversationRouter")
const RateRouter = require('./RateRouter')


const routes = (app) => {
    app.use('/', UserRouter)
    app.use('/', ProductRouter)
    app.use('/', CategoryRouter)
    app.use('/', CartRouter)
    app.use('/', OrderRouter)
    app.use('/', ConversationRouter)
    app.use('/', RateRouter)
}

module.exports = routes