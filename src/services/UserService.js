const User = require("../models/UserModel");
const bcrypt = require("bcrypt"); // For password hashing
const { generalAccessToken, generalRefreshToken } = require("./Jwtservice");

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

      //     const createdUser = await User.create({
      //         email,
      //         password: hashedPassword
      //     })

      //     if (createdUser) {
      //         resolve({
      //             status: 'success',
      //             message: 'User registered successfully',
      //             data: createdUser
      //         })
      //     }
      // } catch (e) {
      //     reject(e)
      // }

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

      resolve({
        status: "success",
        message: "Login successful",
        role: checkUser.role,
        access_token: access_token,
      });
    } catch (e) {
      reject(e);
    }
  });
};

const updateUser = (id, data) => {
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

      const updatedUser = await User.findByIdAndUpdate(id, data, { new: true });

      console.log('update user: ', updatedUser)

      resolve({
        status: "success",
        message: "Updated",
        data: updatedUser,
      });
    } catch (e) {
      reject(e);
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
      const user = await User.findOne({
        _id: id,
      });

      if (user === null) {
        return resolve({
          status: "error",
          message: "User not found",
        });
      }

       // Kiểm tra nếu address tồn tại và là một mảng
      //  const address = Array.isArray(user.address) ? user.address.map(addr => ({
      //   nameOfLocation: addr.nameOfLocation,
      //   location: addr.location,
      //   phone: addr.phone
      // })) : [];

      // Trả về dữ liệu từ cơ sở dữ liệu
      resolve({
        status: "success",
        user: {
          email: user.email,
          name: user.name,
          avatar: user.avatar, 
          birthday: user.birthday, 
          gender: user.gender,
          phone: user.phone,
          address: user.address
          }
      });
    } catch (e) {
      reject(e);
    }
  });
};

module.exports = {
  createUser,
  loginUser,
  updateUser,
  deleteUser,
  getUser,
};
