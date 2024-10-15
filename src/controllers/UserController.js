const { json } = require('body-parser');
const UserService = require('../services/UserService')

const createUser = async(req, res) => {
    try{
        const {email, password, confirmPassword} = req.body;
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        const isEmail = emailRegex.test(email);

        if(!email || !password || !confirmPassword){
            return res.status(400).json({
                status: 'error',
                message: 'All fields are required!'
            });
        } else if(!isEmail){
            return res.status(400).json({
                status: 'error',
                message: 'Invalid email format'
            });
        } else if(password !== confirmPassword){
            return res.status(400).json({
                status: 'error',
                message: 'Please check the confirm password again!'
            });
        }

        const response = await UserService.createUser(req.body);
        return res.status(200).json(response);
    } catch(e) {
        return res.status(500).json({
            message: 'Internal server error',
            error: e.toString()
        });
    }
}

module.exports = {
    createUser
}
