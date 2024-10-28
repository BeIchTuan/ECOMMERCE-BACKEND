const { json } = require("body-parser");
const jwt = require("jsonwebtoken");
const UserService = require("../services/UserService");
const User = require("../models/UserModel");

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
      // const accessToken = jwt.sign(
      //   { id: response.userId, role: response.role },
      //   process.env.ACCESS_TOKEN, // Lấy từ biến môi trường
      //   { expiresIn: "1h" }
      // );

      // // Lưu accessToken vào cookie
      // res.cookie("accessToken", accessToken, {
      //   httpOnly: true,
      //   secure: false,
      //   sameSite: 'None',
      //   maxAge: 3600000, // 1 hour
      // });

      res.cookie("accessToken", response.access_token, {
        httpOnly: true,
        secure: false,
        sameSite: 'None',
        maxAge: 8640000000000000, // 24 hour
      });

      //console.log('controller', accessToken)

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
        token: response.access_token,
        user: userData
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
    const userId = req.id;
    const data = req.body;

    if (!userId) {
      return res.status(400).json({
        status: "error",
        message: "userID is required",
      });
    }

    // Tìm user theo ID trước để kiểm tra role
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        status: "error",
        message: "User not found",
      });
    }

    // Kiểm tra role của user và lọc dữ liệu cho phép cập nhật
    let fieldsToUpdate = {};
    if (user.role === "user") {
      // Chỉ cho phép cập nhật các trường này cho người dùng có role là "user"
      const { name, avatar, birthday, gender, phone, address } = data;
      fieldsToUpdate = { name, avatar, birthday, gender, phone, address };
    } else if (user.role === "seller") {
      // Chỉ cho phép cập nhật các trường này cho người dùng có role là "seller"
      const { shopName, shopDescription, shopAddress } = data;
      fieldsToUpdate = { shopName, shopDescription, shopAddress };
    } else {
      return res.status(400).json({
        status: "error",
        message: "Invalid role",
      });
    }

    const response = await UserService.updateUser(userId, fieldsToUpdate);
    return res.status(200).json({
      status: "success",
      message: "User updated successfully",
      data: response.data
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
