const UserRouter = require('./UserRouter')
const ProductRouter = require('./ProductRouter')
const CategoryRouter = require('./CategoryRouter')
const CartRouter = require('./CartRouter')
const OrderRouter = require('./OrderRouter')
const ConversationRouter = require("./ConversationRouter")
const RateRouter = require('./RateRouter')
const DiscountRouter = require('./DiscountRouter')
const RevenueRouter = require('./RevenueRouter')
const PaymentRouter = require('./PaymentRouter')
const LivestreamRouter = require('./LivestreamRouter')
const NotificationRouter = require('./NotificationRouter')

const routes = (app) => {
    app.use('/', UserRouter)
    app.use('/', ProductRouter)
    app.use('/', CategoryRouter)
    app.use('/', CartRouter)
    app.use('/', OrderRouter)
    app.use('/', ConversationRouter)
    app.use('/', RateRouter)
    app.use('/', DiscountRouter)
    app.use('/', RevenueRouter)
    app.use('/', PaymentRouter)
    app.use('/', LivestreamRouter)
    app.use('/', NotificationRouter)
}

module.exports = routes