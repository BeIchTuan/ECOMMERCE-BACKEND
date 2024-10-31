const User = require("../models/UserModel");
const bcrypt = require("bcrypt"); // For password hashing
const { generalAccessToken, generalRefreshToken } = require("./Jwtservice");
const mongoose = require("mongoose");

const createUser = (newUser) => {
  return new Promise(async (resolve, reject) => {
    const { email, password, role, shopName, shopDescription, address } =
      newUser;

    try {
      const checkUser = await User.findOne({
        email: email,
      });

      if (checkUser !== null) {
        resolve({
          status: "error",
          message: "The email already exists",
        });
      }

      // Hash the password before storing
      const hashedPassword = await bcrypt.hash(password, 10); // Use 10 as salt rounds for hashing

      const userData = {
        email,
        password: hashedPassword,
        role,
      };

      // If the user is registering as a seller, add additional seller fields
      if (role === "seller") {
        if (!shopName || !shopDescription || !address) {
          return resolve({
            status: "error",
            message: "Seller-specific fields are required",
          });
        }
        // Add seller-specific data to userData
        userData.shopName = shopName;
        userData.shopDescription = shopDescription;
        userData.address = address;
      }

      // Create the user in the database
      const createdUser = await User.create(userData);

      if (createdUser) {
        resolve({
          status: "success",
          message: "User registered successfully",
          data: createdUser,
        });
      }
    } catch (e) {
      reject(e);
    }
  });
};

const loginUser = (userLogin) => {
  return new Promise(async (resolve, reject) => {
    const { email, password } = userLogin;

    try {
      const checkUser = await User.findOne({
        email: email,
      });

      if (checkUser === null) {
        resolve({
          status: "error",
          message: "The user is not defined",
        });
      }

      const comparePassword = bcrypt.compareSync(password, checkUser.password);

      if (!comparePassword) {
        resolve({
          status: "error",
          message: "Invalid email or password",
        });
      }

      // const access_token = await generalAccessToken({
      //   id: checkUser.id,
      //   role: checkUser.role
      // })

      // const refresh_token = await generalRefreshToken({
      //   id: checkUser.id,
      //   role: checkUser.role
      // })

      // resolve({
      //   status: "success",
      //   message: "Login successful",
      //   access_token: access_token,
      //   refresh_token: refresh_token
      // });

      const access_token = await generalAccessToken({
        id: checkUser.id,
        role: checkUser.role,
      });

      //console.log('service', access_token)

      // Trường hợp nếu người dùng có vai trò là seller
      let shopInfo = {};
      if (checkUser.role === "seller") {
        shopInfo = {
          shopName: checkUser.shopName,
          shopDescription: checkUser.shopDescription,
          shopAddress: checkUser.shopAddress,
        };
      }

      resolve({
        status: "success",
        message: "Login successful",
        userId: checkUser._id,
        role: checkUser.role,
        name: checkUser.name,
        avatar: checkUser.avatar,
        birthday: checkUser.birthday,
        gender: checkUser.gender,
        phone: checkUser.phone,
        address: checkUser.address,
        access_token: access_token,
        ...shopInfo, // Thêm thông tin cửa hàng nếu có
      });
    } catch (e) {
      reject(e);
    }
  });
};

const updateUser = (id, data) => {
  return new Promise(async (resolve, reject) => {
    try {
      //   const checkUser = await User.findOne({
      //     _id: id,
      //   });

      //   if (checkUser === null) {
      //     resolve({
      //       status: "error",
      //       message: "The user is not defined",
      //     });
      //   }

      //   const updatedUser = await User.findByIdAndUpdate(id, data, { new: true });

      //   console.log('update user: ', updatedUser)

      //   resolve({
      //     status: "success",
      //     message: "Updated",
      //     data: updatedUser,
      //   });
      // } catch (e) {
      //   reject(e);
      // }
      const user = await User.findById(id);
      if (!user) {
        throw new Error("User not found");
      }

      // Cập nhật các trường hợp lệ đã được lọc trong controller
      Object.assign(user, data);
      const updatedUser = await user.save();

      resolve({
        status: "success",
        message: "Updated",
        data: updatedUser,
      });
    } catch (error) {
      reject(new Error("Failed to update user: " + error.message));
    }
  });
};

const deleteUser = (id, data) => {
  return new Promise(async (resolve, reject) => {
    try {
      const checkUser = await User.findOne({
        _id: id,
      });

      if (checkUser === null) {
        resolve({
          status: "error",
          message: "The user is not defined",
        });
      }

      await User.findByIdAndDelete(id);
      resolve({
        status: "success",
        message: "Delete success",
      });
    } catch (e) {
      reject(e);
    }
  });
};

const getUser = (id) => {
  return new Promise(async (resolve, reject) => {
    try {
      const user = await User.findOne({ _id: id });

      if (user === null) {
        return resolve({
          status: "error",
          message: "User not found",
        });
      }

      // Dữ liệu chung cho tất cả người dùng
      const userData = {
        email: user.email,
        name: user.name,
        avatar: user.avatar,
        birthday: user.birthday,
        gender: user.gender,
        phone: user.phone,
        address: user.address,
      };

      // Nếu role là "seller", thêm các trường liên quan đến cửa hàng
      if (user.role === "seller") {
        userData.shopName = user.shopName;
        userData.shopDescription = user.shopDescription;
        userData.shopAddress = user.shopAddress;
      }

      // Trả về dữ liệu người dùng với thông tin bổ sung nếu là seller
      resolve({
        status: "success",
        user: userData,
      });
    } catch (e) {
      reject(e);
    }
  });
};

const addFavoriteProduct = (userId, productId) => {
  if (!mongoose.Types.ObjectId.isValid(productId)) {
    return Promise.reject("Invalid product ID");
  }

  return User.findById(userId)
    .then((user) => {
      if (!user) return Promise.reject("User not found");

      if (user.favoriteProducts.includes(productId)) {
        return Promise.reject("Product already in favorites");
      }

      user.favoriteProducts.push(productId);
      return user.save().then(() => Promise.resolve(user.favoriteProducts));
    })
    .catch((error) => Promise.reject(error.message));
};

const deleteFavoriteProduct = (userId, productId) => {
  if (!mongoose.Types.ObjectId.isValid(productId)) {
    return Promise.reject("Invalid product ID");
  }

  return User.findById(userId)
    .then((user) => {
      if (!user) return Promise.reject("User not found");

      user.favoriteProducts = user.favoriteProducts.filter(
        (favProductId) => favProductId.toString() !== productId
      );

      return user.save().then(() => Promise.resolve(user.favoriteProducts));
    })
    .catch((error) => Promise.reject(error.message));
};

const getFavoriteProducts = (userId) => {
  return User.findById(userId)
    .populate({
      path: "favoriteProducts",
      populate: [
        { path: "category", select: "id name" },
        { path: "seller", select: "id shopName" },
      ],
    })
    .then((user) => {
      if (!user) return Promise.reject("User not found");

      const formattedFavorites = user.favoriteProducts.map((product) => ({
        id: product._id.toString(),
        name: product.name,
        description: product.description,
        price: product.price,
        shop: product.seller
          ? {
              id: product.seller._id.toString(),
              name: product.seller.shopName,
            }
          : null,
        category: product.category.map((cat) => ({
          id: cat._id.toString(),
          name: cat.name,
        })),
        discount: product.discount ? product.discount._id.toString() : null,
        rates: {
          star: product.rate || 0,
        },
        image: product.thumbnail || "",
      }));

      return Promise.resolve(formattedFavorites);
    })
    .catch((error) => Promise.reject(error.message));
};

module.exports = {
  createUser,
  loginUser,
  updateUser,
  deleteUser,
  getUser,
  addFavoriteProduct,
  deleteFavoriteProduct,
  getFavoriteProducts,
};
