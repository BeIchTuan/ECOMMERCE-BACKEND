const UserRouter = require('./UserRouter')

const routes = (app) => {
    app.use('/auth/register', UserRouter)
}

module.exports = routes