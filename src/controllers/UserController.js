const { json } = require("body-parser");
const jwt = require('jsonwebtoken');
const UserService = require("../services/UserService");

const createUser = async (req, res) => {
  try {
    const { email, password, confirmPassword } = req.body;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const isEmail = emailRegex.test(email);

    if (!email || !password || !confirmPassword) {
      return res.status(422).json({
        status: "error",
        message: "All fields are required!",
      });
    } else if (!isEmail) {
      return res.status(422).json({
        status: "error",
        message: "Invalid email format",
      });
    } else if (password !== confirmPassword) {
      return res.status(422).json({
        status: "error",
        message: "Please check the confirm password again!",
      });
    }

    const response = await UserService.createUser(req.body);
    return res.status(201).json(response);
  } catch (e) {
    return res.status(500).json({
      message: "Internal server error",
      error: e.toString(),
    });
  }
};

const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const isEmail = emailRegex.test(email);

    if (!email || !password) {
      return res.status(422).json({
        status: "error",
        message: "All fields are required!",
      });
    } else if (!isEmail) {
      return res.status(422).json({
        status: "error",
        message: "Invalid email format",
      });
    }

    const response = await UserService.loginUser(req.body);

    if (response.status === "success") {
      // res.cookie('accessToken', response.access_token, {
      //     httpOnly: true,
      //     //secure: process.env.NODE_ENV === 'production', // Chỉ sử dụng cookie secure trong môi trường production
      //     maxAge: 3600000 // 1 giờ
      // });

      // Tạo accessToken chứa userId và role
      const accessToken = jwt.sign(
        { id: response.userId, role: response.role },
        process.env.ACCESS_TOKEN, // Lấy từ biến môi trường
        { expiresIn: "1h" }
      );

      // Lưu accessToken vào cookie
      res.cookie("accessToken", accessToken, {
        httpOnly: true,
        maxAge: 3600000, // 1 hour
      });

       // Chuẩn bị thông tin phản hồi cho người dùng
       const userData = {
        id: response.userId,
        email: email,
        role: response.role,
        name: response.name,
        avatar: response.avatar,
        birthday: response.birthday,
        gender: response.gender,
        phone: response.phone,
        address: response.address,
      };

      // Nếu role là seller, thêm thông tin cửa hàng vào phản hồi
      if (response.role === "seller") {
        userData.shopName = response.shopName;
        userData.shopDescription = response.shopDescription;
        userData.shopAddress = response.shopAddress;
      }

      return res.status(200).json({
        status: "success",
        message: "Login successful",
        //role: response.role,
        token: accessToken,
        user: userData
        // user: {
        //   id: response.userId,
        //   email: email,
        //   role: response.role,
        // },
      });
    } else {
      return res.status(401).json({
        status: "error",
        message: response.message,
      });
    }
  } catch (e) {
    return res.status(500).json({
      message: "Internal server error",
      error: e.toString(),
    });
  }
};

const updateUser = async (req, res) => {
  try {
    const userId = req.params.id;
    const data = req.body;

    if (!userId) {
      return res.status(400).json({
        status: "error",
        message: "userID is required",
      });
    }

    const response = await UserService.updateUser(userId, data);
    return res.status(200).json({
      status: "success",
      message: "User updated successfully",
    });
  } catch (e) {
    return res.status(500).json({
      message: "Internal server error",
      error: e.toString(),
    });
  }
};

const deleteUser = async (req, res) => {
  try {
    const userId = req.params.id;

    if (!userId) {
      return res.status(400).json({
        status: "error",
        message: "userID is required",
      });
    }

    const response = await UserService.deleteUser(userId);
    return res.status(200).json(response);
  } catch (e) {
    return res.status(500).json({
      message: "Internal server error",
      error: e.toString(),
    });
  }
};

const getUser = async (req, res) => {
  try {
    const userId = req.params.id;

    if (!userId) {
      return res.status(400).json({
        status: "error",
        message: "userID is required",
      });
    }

    const response = await UserService.getUser(userId);
    return res.status(200).json(response);
  } catch (e) {
    return res.status(500).json({
      message: "Internal server error",
      error: e.toString(),
    });
  }
};

module.exports = {
  createUser,
  loginUser,
  updateUser,
  deleteUser,
  getUser,
};
