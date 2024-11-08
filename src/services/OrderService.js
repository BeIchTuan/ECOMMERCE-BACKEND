const Order = require("../models/OrderModel");
const Product = require("../models/ProductModel");
const Discount = require("../models/DiscountModel");

class OrderService {
  async getOrders(userId, page = 1, itemsPerPage = 15) {
    try {
      const skip = (page - 1) * itemsPerPage;
      // Get the total count of orders for pagination
      const totalOrders = await Order.countDocuments({ userId: userId });
      const totalPages = Math.ceil(totalOrders / itemsPerPage);

      const orders = await Order.find({ userId: userId })
        .populate({
          path: "items.productId",
          select: "id name price priceAfterSale image",
        })
        .populate("paymentMethod", "name") // Populate `name` field from `PaymentMethod` collection
        .populate("deliveryMethod", "name") // Populate `name` field from `DeliveryMethod` collection
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(itemsPerPage);

      const formattedOrders = orders.map((order) => ({
        orderId: order._id,
        orderDate: order.createdAt,
        totalPrice: order.totalPrice,
        paymentMethod: order.paymentMethod ? order.paymentMethod.name : null, // Access `name` if `paymentMethod` is populated
        deliveryMethod: order.deliveryMethod ? order.deliveryMethod.name : null, // Access `name` if `deliveryMethod` is populated
        paymentStatus: order.paymentStatus,
        shippingCost: order.shippingCost,
        deliveryStatus: order.deliveryStatus,
        address: {
          nameOfLocation: order.address.nameOfLocation,
          location: order.address.location,
          phone: order.address.phone,
        },
        items: order.items.map((item) => {
          const product = item.productId?.toJSON(); // Convert to JSON to include virtuals
          return {
            product: product
              ? {
                  id: item.productId._id,
                  name: product.name,
                  price: product.price,
                  priceAfterSale: product.priceAfterSale,
                  thumbnail: product.thumbnail, // Assuming thumbnail is a virtual field
                }
              : null,
            quantity: item.quantity,
            SKU: item.SKU,
          };
        }),
      }));

      return {
        status: "success",
        orders: formattedOrders,
        pagination: {
          currentPage: page,
          totalPages,
          itemsPerPage,
          totalOrders,
        },
      };
    } catch (error) {
      console.error("Error retrieving orders:", error.message); // Log error details
      return {
        status: "error",
        message: "Failed to retrieve orders",
        error: error.message,
      };
    }
  }

  async createOrder(
    userId,
    items,
    address,
    paymentMethodId,
    deliveryMethodId,
    shippingCost,
    discountId
  ) {
    try {
      const orderItems = [];
      let totalPrice = 0;

      for (const item of items) {
        const product = await Product.findById(item.productId).exec();

        if (!product) throw new Error("Product not found");

        const price = product.priceAfterSale;
        //let finalPrice = price;
        const itemTotal = price * item.quantity;
        totalPrice += itemTotal;

        // const itemTotal = finalPrice * item.quantity;
        // totalPrice += itemTotal;

        orderItems.push({
          productId: item.productId,
          quantity: item.quantity,
          SKU: item.SKU,
          price: price,
          sellerId: product.seller,
        });
      }

      totalPrice += shippingCost;

      let discountAmount = 0;
      let discount;

      // Kiểm tra và áp dụng mã giảm giá nếu có
      // Kiểm tra và áp dụng mã giảm giá nếu có
      if (discountId) {
        discount = await Discount.findById(discountId);

        if (discount) {
          // Kiểm tra điều kiện để áp dụng mã giảm giá cho đơn hàng
          if (
            totalPrice >= discount.minOrderValue &&
            discount.expireDate > new Date() &&
            discount.usageLimit > 0
          ) {
            const calculatedDiscount =
              (totalPrice * discount.discountInPercent) / 100;
            discountAmount = Math.min(
              calculatedDiscount,
              discount.maxDiscountValue || calculatedDiscount
            );

            // Cập nhật lại tổng giá sau khi áp dụng giảm giá
            totalPrice -= discountAmount;
          } else {
            throw new Error(
              "Discount code is invalid or does not meet the order conditions"
            );
          }
        } else {
          throw new Error("Discount not found");
        }
      }

      const newOrder = new Order({
        userId,
        items: orderItems,
        address,
        totalPrice,
        paymentMethod: paymentMethodId,
        deliveryMethod: deliveryMethodId,
        discount: discount ? discount._id : null,
        shippingCost,
        deliveryStatus: "pending",
        paymentStatus: "pending",
      });

      const savedOrder = await newOrder.save();

      if (discount) {
        discount.usageLimit -= 1;
        await discount.save();
      }

      const responseItems = await Promise.all(
        orderItems.map(async (item) => {
          const product = await Product.findById(item.productId);
          return {
            product: {
              id: product._id,
              name: product.name,
              price: item.price,
              image: product.thumbnail,
            },
            quantity: item.quantity,
            SKU: item.SKU,
          };
        })
      );

      return {
        orderId: savedOrder._id,
        orderDate: savedOrder.createdAt,
        totalPrice: savedOrder.totalPrice,
        paymentMethod: savedOrder.paymentMethod,
        deliveryMethod: savedOrder.deliveryMethod,
        shippingCost: savedOrder.shippingCost,
        deliveryStatus: savedOrder.deliveryStatus,
        paymentStatus: savedOrder.paymentStatus,
        address: savedOrder.address,
        items: responseItems,
      };
    } catch (error) {
      throw new Error("Failed to create order");
    }
  }

  async getOrderDetails(orderId) {
    try {
      const order = await Order.findById(orderId)
        .populate("items.productId")
        .populate("paymentMethod", "name") // Lấy field `name` từ `PaymentMethod`
        .populate("deliveryMethod", "name"); // Lấy field `name` từ `DeliveryMethod`; // Populate product details

      if (!order) {
        throw new Error("Order not found");
      }

      return {
        orderId: order._id,
        orderDate: order.createdAt,
        totalPrice: order.totalPrice,
        paymentMethod: order.paymentMethod ? order.paymentMethod.name : null, // Access `name` if `paymentMethod` is populated
        deliveryMethod: order.deliveryMethod ? order.deliveryMethod.name : null, // Access `name` if `deliveryMethod` is populated
        shippingCost: order.shippingCost,
        deliveryStatus: order.deliveryStatus,
        paymentStatus: order.paymentStatus,
        address: {
          nameOfLocation: order.address.nameOfLocation,
          location: order.address.location,
          phone: order.address.phone,
        },
        items: order.items.map((item) => ({
          productId: {
            id: item.productId._id,
            name: item.productId.name,
            price: item.productId.price,
            salePercent: item.productId.salePercent,
            priceAfterSale: item.productId.priceAfterSale,
            image: item.productId.thumbnail, // Assuming product has an image field
          },
          quantity: item.quantity,
          SKU: item.SKU,
        })),
      };
    } catch (error) {
      return {
        status: "error",
        message: "Failed to retrieve orders",
      };
    }
  }

  async cancelOrder(orderId) {
    try {
      const order = await Order.findById(orderId);

      if (!order) {
        return { success: false, message: "Order not found" };
      }

      // Check if the order is within the 6-hour cancellation window
      const sixHoursInMilliseconds = 6 * 60 * 60 * 1000;
      const timeSinceOrder = Date.now() - new Date(order.createdAt).getTime();

      if (timeSinceOrder > sixHoursInMilliseconds) {
        return {
          success: false,
          message: "Order can only be canceled within 6 hours",
        };
      }

      // Assuming there's a 'canceled' status in your deliveryStatus options
      order.deliveryStatus = "canceled";
      await order.save();

      return { success: true };
    } catch (error) {
      return {
        status: "error",
        message: "Failed to retrieve orders",
      };
    }
  }

  async getOrdersBySeller(sellerId, page = 1, itemsPerPage = 15) {
    try {
      const skip = (page - 1) * itemsPerPage;

      // Get total count for pagination metadata
      const totalOrders = await Order.countDocuments({
        "items.sellerId": sellerId,
      });
      const totalPages = Math.ceil(totalOrders / itemsPerPage);

      // Fetch paginated orders
      const orders = await Order.find({ "items.sellerId": sellerId })
        .skip(skip)
        .sort({ createdAt: -1 })
        .limit(itemsPerPage)
        .populate("paymentMethod", "name") // Lấy field `name` từ `PaymentMethod`
        .populate("deliveryMethod", "name") // Lấy field `name` từ `DeliveryMethod`
        .populate({
          path: "userId",
          select: "name avatar phone email",
        })
        .populate({
          path: "items.productId",
          select:
            "id name description SKU price salePercent priceAfterSale category image",
          populate: [
            { path: "category", select: "name" },
            { path: "SKU.classifications", select: "_id" },
          ],
        });

      // Định dạng kết quả để tránh lặp dữ liệu
      const formattedOrders = orders.map((order) => ({
        id: order._id,
        orderDate: order.createdAt,
        customer: {
          name: order.userId.name,
          avatar: order.userId.avatar,
          phone: order.userId.phone,
          email: order.userId.email,
        },
        totalPrice: order.totalPrice,
        status: order.deliveryStatus,
        paymentMethod: order.paymentMethod ? order.paymentMethod.name : null, // Access `name` if `paymentMethod` is populated
        deliveryMethod: order.deliveryMethod ? order.deliveryMethod.name : null, // Access `name` if `deliveryMethod` is populated
        paymentStatus: order.paymentStatus,
        products: order.items.map((item) => {
          const product = item.productId
            ? {
                id: item.productId._id,
                name: item.productId.name,
                description: item.productId.description,
                SKU: item.productId.SKU.map((sku) => ({
                  name: sku.name,
                  classifications: sku.classifications.map(
                    (classification) => classification
                  ),
                  _id: sku._id,
                })),
                price: item.productId.price,
                salePercent: item.productId.salePercent,
                priceAfterSale: item.productId.priceAfterSale,
                category: item.productId.category.map((cat) => ({
                  id: cat._id,
                  name: cat.name,
                })),
                thumbnail: item.productId.thumbnail, // Lấy ảnh đầu tiên hoặc điều chỉnh theo yêu cầu
              }
            : null;

          return {
            product,
            quantity: item.quantity,
            SKU: item.SKU,
          };
        }),
      }));

      return {
        orders: formattedOrders,
        pagination: {
          currentPage: page,
          totalPages,
          itemsPerPage,
          totalOrders,
        },
      };
    } catch (error) {
      return {
        status: "error",
        message: "Failed to retrieve orders",
        error: error.message,
      };
    }
  }

  async updateOrderStatus(orderId, status) {
    try {
      const order = await Order.findById(orderId).populate("items.productId");

      if (!order) {
        return { success: false };
      }

      // Update the delivery status
      order.deliveryStatus = status;

      // If the status is "success," increase the sold count for each product
      if (status === "success") {
        for (const item of order.items) {
          const product = item.productId;
          const quantity = item.quantity || 1; // Use the ordered quantity, default to 1 if not provided

          // Increment the sold count by the quantity ordered
          await Product.findByIdAndUpdate(
            product._id,
            { $inc: { sold: quantity } },
            { new: true }
          );
        }
      }

      await order.save();

      return { success: true };
    } catch (error) {
      console.error(error);
      return {
        success: false,
      };
    }
  }
}

module.exports = new OrderService();
