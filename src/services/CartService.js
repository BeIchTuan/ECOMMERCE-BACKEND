const { Cart } = require("../models/CartModel");
// class CartService {
// async getCart(userId) {
//   try {
//     const cart = await Cart.findOne({ user: userId }).populate({
//       path: "cartItem",
//       populate: {
//         path: "product",
//         model: "Product",
//         populate: {
//           path: "seller",
//           model: "User",
//           select: "shopName",
//         },
//       },
//     });

//     if (!cart) {
//       return {
//         totalAmount: 0,
//         totalSelectedAmount: null,
//         products: [],
//       };
//     }

//     let totalAmount = 0;
//     const products = cart.cartItem
//       .map((item) => {
//         const product = item.product;

//         // Kiểm tra nếu `product` hoặc `seller` là null
//         if (!product) {
//           return null;
//         }
//         if (!product.seller) {
//           return null;
//         }

//         const discount = (product.price * (product.salePercent || 0)) / 100;
//         const finalPrice =
//           product.priceAfterSale !== undefined
//             ? product.priceAfterSale
//             : product.price - discount;
//         const totalPrice = finalPrice * item.quantity;
//         totalAmount += totalPrice;

//         return {
//           cartItemId: item._id.toString(),
//           isSelected: item.isSelected,
//           id: product._id.toString(),
//           name: product.name,
//           shopInfo: {
//             id: product.seller._id.toString(),
//             name: product.seller.shopName,
//           },
//           price: product.price,
//           totalPrice,
//           isDiscount: !!product.salePercent,
//           discount,
//           inStock: product.inStock,
//           thumbnail: product.thumbnail,
//           quantity: item.quantity,
//           SKU: item.SKU.map((sku) => ({
//             name: sku.name,
//             classifications: sku.classifications,
//             selected: sku.selected,
//           })),
//         };
//       })
//       .filter((item) => item !== null); // Lọc bỏ các mục null

//     return {
//       totalAmount,
//       totalSelectedAmount: null,
//       products,
//     };
//   } catch (error) {
//     console.error("Error in getCart:", error.message);
//     throw new Error(error.message);
//   }
// }

//   async replaceCart(userId, cartBody) {
//     try {
//       // Kiểm tra nếu `products` không phải là một mảng, báo lỗi ngay lập tức
//       if (!Array.isArray(cartBody.products)) {
//         throw new Error(
//           "Invalid cart body format: 'products' should be an array."
//         );
//       }

//       // Tìm giỏ hàng của người dùng dựa trên userId
//       let cart = await Cart.findOne({ user: userId });

//       // Nếu giỏ hàng chưa tồn tại, tạo mới một giỏ hàng cho user
//       if (!cart) {
//         cart = new Cart({ user: userId, cartItem: [] });
//       } else {
//         // Nếu giỏ hàng đã tồn tại, xóa các mục hiện có trong giỏ hàng
//         await CartItem.deleteMany({ _id: { $in: cart.cartItem } });
//         cart.cartItem = [];
//       }

//       // Duyệt qua từng sản phẩm trong `products` từ FE gửi đến
//       for (const product of cartBody.products) {
//         const skuData = product.SKU.map((sku) => ({
//           name: sku.name,
//           classifications: sku.classifications,
//           selected: sku.selected,
//         }));

//         const cartItem = new CartItem({
//           product: product.id,
//           quantity: product.quantity,
//           SKU: skuData,
//           isSelected: product.isSelected || false,
//         });

//         // Lưu CartItem vào database
//         await cartItem.save();

//         // Thêm CartItem mới vào giỏ hàng
//         cart.cartItem.push(cartItem._id);
//       }

//       // Lưu giỏ hàng cập nhật
//       await cart.save();

//       return cart;
//     } catch (error) {
//       throw Error(error.message);
//     }
//   }
// }

class CartService {
  async getCart(userId) {
    try {
      const cart = await Cart.findOne({ user: userId }).populate({
        path: "cartItems.product",
        populate: {
          path: "seller",
          model: "User",
          select: "shopName",
        },
      });

      if (!cart) {
        return {
          status: "success",
          data: {
            totalAmount: 0,
            totalSelectedAmount: 0,
            shops: [],
          },
        };
      }

      let totalAmount = 0;
      let totalSelectedAmount = 0;

      const shopMap = new Map();

      cart.cartItems.forEach((item) => {
        const product = item.product;

        // Bỏ qua nếu product hoặc seller không tồn tại
        if (!product || !product.seller) return;

        const discount = (product.price * (product.salePercent || 0)) / 100;
        const finalPrice =
          product.priceAfterSale !== undefined
            ? product.priceAfterSale
            : product.price - discount;
        const totalPrice = finalPrice * item.quantity;

        totalAmount += totalPrice;
        if (item.isSelected) {
          totalSelectedAmount += totalPrice;
        }

        // Tạo sản phẩm
        const productData = {
          cartItemId: item._id.toString(),
          productId: product._id.toString(),
          name: product.name,
          SKU:
            item.SKU.map((sku) => ({
              name: sku.name,
              selected: sku.selected,
            })) || null,
          thumbnail: product.thumbnail,
          quantity: item.quantity,
          priceAfterSale: finalPrice,
          totalPrice,
          inStock: product.inStock,
          isSelected: item.isSelected,
        };

        const shopId = product.seller._id.toString();
        const shopName = product.seller.shopName;

        if (!shopMap.has(shopId)) {
          shopMap.set(shopId, {
            shopId,
            shopName,
            products: [],
          });
        }

        shopMap.get(shopId).products.push(productData);
      });

      return {
        status: "success",
        data: {
          totalAmount,
          totalSelectedAmount,
          shops: Array.from(shopMap.values()),
        },
      };
    } catch (error) {
      console.error("Error in getCart:", error.message);
      throw new Error("Failed to get cart");
    }
  }

  async addToCart(userId, productDetails) {
    try {
      let cart = await Cart.findOne({ user: userId });

      if (!cart) {
        cart = new Cart({ user: userId, cartItems: [] });
      }

      // Tìm sản phẩm trùng với `product` và `SKU`
      const existingCartItem = cart.cartItems.find((item) => {
        return (
          item.product.toString() === productDetails.product.toString() &&
          JSON.stringify(item.SKU) === JSON.stringify(productDetails.SKU)
        );
      });

      if (existingCartItem) {
        existingCartItem.quantity += productDetails.quantity || 1;
      } else {
        cart.cartItems.push({
          product: productDetails.product,
          quantity: productDetails.quantity || 1,
          SKU: productDetails.SKU,
          isSelected: productDetails.isSelected || false,
        });
      }

      await cart.save();

      return { message: "Product added to cart" };
    } catch (error) {
      console.error("Error in addToCart:", error.message);
      throw new Error("Failed to add product to cart");
    }
  }

  async removeFromCart(userId, cartItemId) {
    try {
      // Tìm giỏ hàng của người dùng
      const cart = await Cart.findOne({ user: userId });

      if (!cart) {
        throw new Error("Cart not found");
      }

      // Lọc bỏ item có cartItemId khỏi mảng cartItems
      const index = cart.cartItems.findIndex(
        (item) => item._id.toString() === cartItemId
      );
      if (index === -1) {
        throw new Error("Cart item not found");
      }

      // Loại bỏ phần tử khỏi mảng cartItems
      cart.cartItems.splice(index, 1);

      // Lưu lại giỏ hàng sau khi thay đổi
      await cart.save();

      return { message: "Product removed from cart" };
    } catch (error) {
      console.error("Error in removeFromCart:", error.message);
      throw new Error("Failed to remove product from cart");
    }
  }

  async updateCartItemQuantity(userId, cartItemId, quantity) {
    try {
      const cart = await Cart.findOne({ user: userId });

      if (!cart) {
        throw new Error("Cart not found");
      }

      // Tìm phần tử cartItem cần cập nhật
      const cartItem = cart.cartItems.find(
        (item) => item._id.toString() === cartItemId
      );

      if (!cartItem) {
        throw new Error("Cart item not found");
      }

      // Cập nhật số lượng sản phẩm
      cartItem.quantity = quantity;
      await cart.save();

      return { message: "Cart item quantity updated" };
    } catch (error) {
      throw new Error("Failed to update cart item quantity");
    }
  }

  async selectCartItem(userId, cartItemId, isSelected) {
    try {
      const cart = await Cart.findOne({ user: userId });

      if (!cart) {
        throw new Error("Cart not found");
      }

      // Tìm phần tử cartItem cần thay đổi trạng thái chọn/bỏ chọn
      const cartItem = cart.cartItems.find(
        (item) => item._id.toString() === cartItemId
      );

      if (!cartItem) {
        throw new Error("Cart item not found");
      }

      cartItem.isSelected = isSelected;
      await cart.save();

      return { message: "Cart item selection updated" };
    } catch (error) {
      throw new Error("Failed to update cart item selection");
    }
  }

  async removeSelectedItems(userId) {
    try {
      // Tìm giỏ hàng của người dùng
      const cart = await Cart.findOne({ user: userId });

      if (!cart) {
        throw new Error("Cart not found");
      }

      // Kiểm tra nếu giỏ hàng không có sản phẩm nào được chọn
      const selectedItems = cart.cartItems.filter((item) => item.isSelected);

      if (selectedItems.length === 0) {
        return { message: "No selected items found in the cart" };
      }

      // Lọc ra các phần tử chưa được chọn
      cart.cartItems = cart.cartItems.filter((item) => !item.isSelected);

      await cart.save();

      return { message: "Selected items removed from cart" };
    } catch (error) {
      console.error("Error in removeSelectedItems:", error.message);
      throw new Error("Failed to remove selected items from cart");
    }
  }

  async selectAllItems(userId) {
    try {
      const cart = await Cart.findOne({ user: userId });

      if (!cart) {
        throw new Error("Cart not found");
      }

      // Set all items' isSelected to true
      cart.cartItems.forEach((item) => {
        item.isSelected = true;
      });

      await cart.save();

      return { message: 'All products selected' };
    } catch (error) {
      throw new Error("Failed to select all products in the cart");
    }
  }

  // Unselect all products in the cart
  async unselectAllItems(userId) {
    try {
      const cart = await Cart.findOne({ user: userId });

      if (!cart) {
        throw new Error("Cart not found");
      }

      // Set all items' isSelected to false
      cart.cartItems.forEach((item) => {
        item.isSelected = false;
      });

      await cart.save();

      return { message: 'All products unselected' };
    } catch (error) {
      throw new Error(error + "Failed to unselect all products in the cart");
    }
  }
}

module.exports = new CartService();
