const User = require("../models/UserModel");
const Order = require("../models/OrderModel");
const bcrypt = require("bcrypt"); // For password hashing
const { generalAccessToken, generalRefreshToken } = require("./Jwtservice");
const mongoose = require("mongoose");
const { deleteFromCloudinary } = require("../utils/uploadImage");

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
      const user = await User.findById(id);
      if (!user) {
        throw new Error("User not found");
      }

      // Nếu có avatar mới, xóa avatar cũ trên Cloudinary
      if (data.avatar && user.avatar) {
        const publicId = user.avatar
          .split("/")
          .slice(-2)
          .join("/")
          .split(".")[0]; // Lấy publicId từ URL
        await deleteFromCloudinary(publicId); // Xóa ảnh cũ
      }

      if (data.address) {
        try {
          data.address = JSON.parse(data.address); // Parse JSON thành mảng đối tượng
        } catch (err) {
          return {
            status: "error",
            message: "Invalid address format. Ensure it's a valid JSON string.",
          };
        }
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

const getCustomerInfors = async (sellerId, page = 1, itemsPerPage = 15) => {
  try {
    const ObjectId = mongoose.Types.ObjectId;
    sellerId = new ObjectId(sellerId);

    const orders = await Order.aggregate([
      { $match: { "items.sellerId": sellerId } },
      { $unwind: "$items" },
      { $group: { _id: "$userId", ordersCount: { $sum: 1 } } },
    ]);

    const customerIds = orders.map((order) => order._id);
    console.log("Customer IDs:", customerIds);

    const customers = await User.find({ _id: { $in: customerIds } })
      .select("_id name email phone")
      .skip((page - 1) * itemsPerPage)
      .limit(itemsPerPage);


    const totalCustomers = customerIds.length;
    const totalPages = Math.ceil(totalCustomers / itemsPerPage);

    const customersWithOrders = customers.map((customer) => {
      const customerOrders = orders.find((order) =>
        order._id.equals(customer._id)
      );
      return {
        ...customer.toObject(),
        ordersBought: customerOrders ? customerOrders.ordersCount : undefined,
      };
    });

    return {
      status: "success",
      customers: customersWithOrders,
      pagination: {
        currentPage: page,
        totalPages,
        itemsPerPage,
        totalItems: totalCustomers,
      },
    };
  } catch (error) {
    console.error("Error in getCustomerInfors:", error.message);
    throw new Error(error.message);
  }
};

const getCustomerOrderHistory = (page = 1, itemsPerPage = 15, userId) => {
  const skip = (page - 1) * itemsPerPage;

  return new Promise(async (resolve, reject) => {
    try {
      // Đếm tổng số lượng đơn hàng của user
      const totalItems = await Order.countDocuments({ userId });

      // Truy vấn các đơn hàng với phân trang
      const orders = await Order.find({ userId })
        .skip(skip)
        .limit(itemsPerPage)
        .select("createdAt totalPrice")
        .sort({ createdAt: -1 }); // Sort by date in descending order

      console.log(userId);

      // Format the orders for the response
      const orderHistory = orders.map((order) => ({
        orderId: order._id,
        orderDate: order.createdAt,
        totalPrice: order.totalPrice,
      }));

      // Tính toán tổng số trang
      const totalPages = Math.ceil(totalItems / itemsPerPage);

      resolve({
        status: "success",
        orderHistory,
        pagination: {
          currentPage: page,
          totalPages,
          itemsPerPage,
          totalItems,
        },
      });
    } catch (error) {
      reject(error);
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

const getFavoriteProducts = (page = 1, itemsPerPage = 15, userId) => {
  const skip = (page - 1) * itemsPerPage;

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

      const totalItems = user.favoriteProducts.length; // Tổng số sản phẩm yêu thích
      const totalPages = Math.ceil(totalItems / itemsPerPage); // Tổng số trang

      // Phân trang chỉ lấy sản phẩm trong phạm vi hiện tại
      const favoriteProducts = user.favoriteProducts
        .slice(skip, skip + itemsPerPage)
        .map((product) => ({
          id: product._id.toString(),
          name: product.name,
          averageStar: product.averageStar,
          description: product.description,
          price: product.price,
          salePercent: product.salePercent || 0,
          priceAfterSale: product.priceAfterSale || product.price,
          isFavorite: true,
          inStock: product.inStock,
          isDeleted: product.isDeleted,
          rateCount: product.rateCount,
          sold: product.sold,
          thumbnail: product.thumbnail,
          shopInfor: product.seller
            ? {
                shopId: product.seller._id.toString(),
                shopName: product.seller.shopName,
              }
            : null,
          category: product.category.map((cat) => ({
            id: cat._id.toString(),
            name: cat.name,
          })),
          discount: product.discount ? product.discount._id.toString() : null,
          rates: product.rates,
          image: product.image,
        }));

      // Trả về kết quả kèm thông tin phân trang
      return Promise.resolve({
        favoriteProducts,
        pagination: {
          currentPage: page,
          totalPages: totalPages,
          itemsPerPage: itemsPerPage,
          totalItems: totalItems,
        },
      });
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
  getCustomerInfors,
  getCustomerOrderHistory,
};
