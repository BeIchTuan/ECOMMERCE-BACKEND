// const { json } = require("body-parser");
// const jwt = require("jsonwebtoken");
const UserService = require("../services/UserService");
const User = require("../models/UserModel");
// const cloudinary = require("../config/cloudinary");
const { uploadToCloudinary } = require("../utils/uploadImage");
const redisClient = require("../config/redisClient");
const { sendEmailOTP, sendSMS } = require("../services/EmailService");

// const createUser = async (req, res) => {
//   try {
//     const { email, password, confirmPassword } = req.body;
//     const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
//     const isEmail = emailRegex.test(email);

//     if (!email || !password || !confirmPassword) {
//       return res.status(422).json({
//         status: "error",
//         message: "All fields are required!",
//       });
//     } else if (!isEmail) {
//       return res.status(422).json({
//         status: "error",
//         message: "Invalid email format",
//       });
//     } else if (password !== confirmPassword) {
//       return res.status(422).json({
//         status: "error",
//         message: "Please check the confirm password again!",
//       });
//     }

//     const response = await UserService.createUser(req.body);
//     return res.status(201).json(response);
//   } catch (e) {
//     return res.status(500).json({
//       message: "Internal server error",
//       error: e.toString(),
//     });
//   }
// };

const sendOTP = async (req, res) => {
  try {
    const {
      email: account,
      password,
      confirmPassword,
      role,
      shopName,
      shopDescription,
      shopAddress,
    } = req.body;

    if (!account) {
      return res.status(400).json({ message: "Email or phone are required" });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({ message: "Passwords do not match" });
    }

    let isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(account);
    let existingUser = await User.findOne(
      isEmail ? { email: account } : { email: account }
    );

    if (existingUser) {
      return res.status(400).json({ message: "Account already exists" });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    console.log("OTP: ", otp);

    await redisClient.setEx(
      `OTP:${account}`,
      300,
      JSON.stringify({
        otp,
        password,
        role,
        shopName,
        shopDescription,
        shopAddress,
      })
    );

    const redisData = await redisClient.get(`OTP:${account}`);
    console.log("Dữ liệu đã lưu trong Redis:", redisData);

    if (isEmail) {
      await sendEmailOTP(account, `Your OTP is: ${otp}`);
    } else {
      await sendSMS(account, `Your OTP is: ${otp}`);
    }

    return res.status(200).json({ message: "OTP sent successfully" });
  } catch (error) {
    return res.status(500).json({ message: "Internal Server Error", error });
  }
};

const verifyOTP = async (req, res) => {
  try {
    const { account, otp } = req.body;

    if (!otp || !account) {
      return res.status(400).json({ message: "OTP and account are required" });
    }

    const storedData = await redisClient.get(`OTP:${account}`);
    if (!storedData) {
      return res.status(400).json({ message: "OTP expired or invalid" });
    }

    const {
      otp: storedOTP,
      password,
      role,
      shopName,
      shopDescription,
      shopAddress,
    } = JSON.parse(storedData);
    if (storedOTP !== otp) {
      return res.status(400).json({ message: "Invalid OTP" });
    }

    await redisClient.del(`OTP:${account}`);

    const newUser = await UserService.createUser({
      email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(account) ? account : undefined,
      phone: /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(account) ? undefined : account,
      password,
      role,
      shopName,
      shopDescription,
      shopAddress,
    });

    return res.status(201).json(newUser);
  } catch (error) {
    return res.status(500).json({ message: "Internal Server Error", error });
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
      res.cookie("accessToken", response.access_token, {
        httpOnly: true,
        secure: false,
        sameSite: "None",
        maxAge: 86400000, // 24 hour
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
        token: response.access_token,
        user: userData,
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

const loginGoogle = async (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({
        status: "error",
        message: "Token is required",
      });
    }

    const response = await UserService.loginGoogle(token);

    res.cookie("accessToken", response.access_token, {
      httpOnly: true,
      secure: false,
      sameSite: "None",
      maxAge: 86400000,
    });

    return res.status(200).json(response);
  } catch (error) {
    return res.status(401).json({
      status: "error",
      message: error.message || "Google login failed",
    });
  }
};

const resetPassword = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res
        .status(400)
        .json({ success: false, message: "Email is required" });
    }

    const result = await UserService.resetPassword(email);
    return res.status(200).json({ success: true, message: result.message });
  } catch (error) {
    console.error("Error in PasswordController:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
}

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
      const { shopName, shopDescription, address } = data;
      fieldsToUpdate = { shopName, shopDescription, address };
    } else {
      return res.status(400).json({
        status: "error",
        message: "Invalid role",
      });
    }

    // Nếu có file ảnh được gửi, tải lên Cloudinary
    if (req.file) {
      const uploadResult = await uploadToCloudinary(req.file, "avatar");
      fieldsToUpdate.avatar = uploadResult.secure_url; // Lưu URL của ảnh vào avatar
    } else {
      // Nếu không có ảnh mới, giữ nguyên avatar cũ
      fieldsToUpdate.avatar = user.avatar;
    }

    const response = await UserService.updateUser(userId, fieldsToUpdate);
    return res.status(200).json({
      status: "success",
      message: "User updated successfully",
      data: response.data,
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

const getCustomerInfors = async (req, res) => {
  const sellerId = req.id; // Assuming the seller's ID is in the token
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 15;
  try {
    const data = await UserService.getCustomerInfors(sellerId, page, limit);
    res.status(200).json(data);
  } catch (error) {
    res.status(500).json({ status: "error", message: error.message });
  }
};

const getOrderCustomerHistory = async (req, res) => {
  try {
    const customerId = req.params.customerId; // Assuming the user ID is provided as a URL parameter
    const sellerId = req.id;

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 15;
    const deliveryStatus = req.query.deliveryStatus
      ? req.query.deliveryStatus
      : undefined;
    const isRated = req.query.isRated
      ? req.query.isRated === "true"
      : undefined;

    const result = await UserService.getCustomerOrderHistory(
      page,
      limit,
      customerId,
      deliveryStatus,
      isRated,
      sellerId
    );

    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({ status: "error", message: error.message });
  }
};

const addFavouriteProduct = async (req, res) => {
  try {
    const userId = req.id;
    const productId = req.params.productId;

    const favoriteProducts = await UserService.addFavoriteProduct(
      userId,
      productId
    );

    res.json({
      status: "success",
      message: "Product added to favorites",
      favoriteProducts,
    });
  } catch (error) {
    res.status(500).json({
      status: "error",
      message: "Failed to add product to favorites",
    });
  }
};

const deleteFavoriteProduct = (req, res) => {
  const userId = req.id;
  const productId = req.params.productId;

  UserService.deleteFavoriteProduct(userId, productId)
    .then((favoriteProducts) => {
      res.json({
        status: "success",
        message: "Product removed from favorites",
      });
    })
    .catch((error) => {
      res.status(500).json({
        status: "error",
        message: "Failed to remove product from favorites",
        error,
      });
    });
};

const getFavoriteProducts = (req, res) => {
  const userId = req.id;

  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 15;

  UserService.getFavoriteProducts(page, limit, userId)
    .then((data) => {
      res.json({
        status: "success",
        data,
      });
    })
    .catch((error) => {
      res.status(500).json({
        status: "error",
        message: "Failed to retrieve favorite products",
        error,
      });
    });
};

module.exports = {
  //createUser,
  loginUser,
  loginGoogle,
  sendOTP,
  verifyOTP,
  resetPassword,
  updateUser,
  deleteUser,
  getUser,
  addFavouriteProduct,
  deleteFavoriteProduct,
  getFavoriteProducts,
  getCustomerInfors,
  getOrderCustomerHistory,
};
