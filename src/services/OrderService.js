const Order = require("../models/OrderModel");
const Product = require("../models/ProductModel");
const Discount = require("../models/DiscountModel");

class OrderService {
  async getOrders(userId, page = 1, itemsPerPage = 15) {
    try {
      const skip = (page - 1) * itemsPerPage;
      // Lấy tổng số lượng đơn hàng để tính tổng trang
      const totalOrders = await Order.countDocuments({ userId: userId });
      const totalPages = Math.ceil(totalOrders / itemsPerPage);

      const orders = await Order.find({ userId: userId })
        .populate({
          path: "items.productId",
          select: "id name price thumbnail",
        })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(itemsPerPage);

      const formattedOrders = orders.map((order) => ({
        orderId: order._id,
        orderDate: order.createdAt,
        totalPrice: order.totalPrice,
        paymentMethod: order.paymentMethod,
        paymentStatus: order.paymentStatus,
        shippingCost: order.shippingCost,
        deliveryStatus: order.deliveryStatus,
        address: {
          nameOfLocation: order.address.nameOfLocation,
          location: order.address.location,
          phone: order.address.phone,
        },
        items: order.items.map((item) => ({
          product: item.productId
            ? {
                // Check if `product` is defined
                id: item.productId,
                name: item.productId.name,
                price: item.productId.price,
                priceAfterSale: item.productId.priceAfterSale,
                thumbail: item.productId.thumbnail,
              }
            : null, // Set to null or an empty object if undefined
          quantity: item.quantity,
        })),
      }));

      return Promise.resolve({
        status: "success",
        orders: formattedOrders,
        pagination: {
          currentPage: page,
          totalPages,
          itemsPerPage,
          totalOrders,
        },
      });
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
    paymentMethod,
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
            discount.expireDate > new Date()
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
        discount: discount ? discount._id : null,
        paymentMethod,
        shippingCost,
        deliveryStatus: "pending",
        paymentStatus: "pending",
      });

      const savedOrder = await newOrder.save();

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
          };
        })
      );

      return {
        orderId: savedOrder._id,
        orderDate: savedOrder.createdAt,
        totalPrice: savedOrder.totalPrice,
        paymentMethod: savedOrder.paymentMethod,
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
      const order = await Order.findById(orderId).populate("items.productId"); // Populate product details

      if (!order) {
        throw new Error("Order not found");
      }

      return {
        orderId: order._id,
        orderDate: order.createdAt,
        totalPrice: order.totalPrice,
        paymentMethod: order.paymentMethod,
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
        .limit(itemsPerPage)
        .populate({
          path: "userId",
          select: "name avatar phone email",
        })
        .populate({
          path: "items.productId",
          select: "name description SKU price category image",
          populate: [
            { path: "category", select: "name" },
            { path: "SKU.classifications", select: "_id name" },
          ],
        });

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
        paymentStatus: order.paymentStatus,
        products: order.items.map((item) => ({
          product: item.productId
            ? {
                // Check if `product` is defined
                id: item.productId,
                name: item.productId.name,
                price: item.productId.price,
                salePercent: item.productId.salePercent,
                priceAfterSale: item.productId.priceAfterSale,
                image: item.productId.thumbnail,
              }
            : null, // Set to null or an empty object if undefined
          quantity: item.quantity,
        })),
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
