const Order = require("../models/OrderModel");
const Product = require("../models/ProductModel");
const Discount = require("../models/DiscountModel");
const Rate = require("../models/RateModel");
const User = require("../models/UserModel");
const { sendOrderConfirmationEmail } = require("./EmailService");
const MomoService = require("./MomoService");
const momoConfig = require("../config/MomoConfig");
const notificationService = require("./NotificationService");

class OrderService {
  async getOrders(
    userId,
    page = 1,
    itemsPerPage = 15,
    deliveryStatus,
    isRated
  ) {
    try {
      const skip = (page - 1) * itemsPerPage;

      // Tạo bộ lọc cơ bản
      const filter = { userId: userId };
      if (deliveryStatus) {
        filter.deliveryStatus = deliveryStatus;
      }

      // Lấy tổng số đơn hàng từ cơ sở dữ liệu
      const totalOrders = await Order.countDocuments(filter);

      const orders = await Order.find(filter)
        .populate({
          path: "items.productId",
          select: "id name price priceAfterSale image",
        })
        .populate({
          path: "items.sellerId",
          select: "shopName",
        })
        .populate("paymentMethod", "name")
        .populate("deliveryMethod", "name")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(itemsPerPage);

      const formattedOrders = await Promise.all(
        orders.map(async (order) => {
          const filteredItems = await Promise.all(
            order.items.map(async (item) => {
              // Tìm đánh giá liên quan đến orderId hiện tại
              const rates = await Rate.find({
                user: userId,
                product: item.productId?._id,
                order: order._id, // Kiểm tra orderId
              }).select("star comment reply user");

              const hasRating = rates.length > 0;
              if (isRated !== undefined && isRated !== hasRating) {
                return null; // Loại bỏ nếu không phù hợp với `isRated`
              }

              return {
                product: item.productId
                  ? {
                    id: item.productId._id,
                    name: item.productId.name,
                    price: item.productId.price,
                    priceAfterSale: item.productId.priceAfterSale,
                    thumbnail: item.productId.thumbnail,
                    rates,
                  }
                  : null,
                quantity: item.quantity,
                SKU: item.SKU,
                isRated: hasRating,
                //sellerId: item.sellerId,
              };
            })
          );

          const validItems = filteredItems.filter((item) => item !== null);

          if (!validItems.length) return null; // Bỏ qua đơn hàng không có sản phẩm hợp lệ

          return {
            orderId: order._id,
            orderDate: order.createdAt,
            totalPrice: order.totalPrice,
            paymentMethod: order.paymentMethod
              ? order.paymentMethod.name
              : null,
            deliveryMethod: order.deliveryMethod
              ? order.deliveryMethod.name
              : null,
            paymentStatus: order.paymentStatus,
            shippingCost: order.shippingCost,
            deliveryStatus: order.deliveryStatus,
            address: {
              nameOfLocation: order.address.nameOfLocation,
              location: order.address.location,
              phone: order.address.phone,
            },
            shopInfo: {
              shopId: order.items[0]?.sellerId?._id || null,
              shopName: order.items[0]?.sellerId?.shopName || "Unknown",
            },
            items: validItems,
          };
        })
      );

      const cleanedOrders = formattedOrders.filter((order) => order !== null); // Loại bỏ đơn hàng không hợp lệ
      const totalPages = Math.ceil(totalOrders / itemsPerPage);

      return {
        status: "success",
        orders: cleanedOrders,
        pagination: {
          currentPage: page,
          totalPages,
          itemsPerPage,
          totalOrders,
        },
      };
    } catch (error) {
      console.error("Error retrieving orders:", error.message);
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
    discountId
  ) {
    try {
      const orderItems = [];
      let totalPrice = 0;

      for (const item of items) {
        const product = await Product.findById(item.productId).exec();

        if (!product) throw new Error("Product not found");

        // Kiểm tra tồn kho
        if (product.inStock < item.quantity) {
          throw new Error(`Not enough stock for product: ${product.name}`);
        }

        const price = product.priceAfterSale;
        //let finalPrice = price;
        const itemTotal = price * item.quantity;
        totalPrice += itemTotal;

        orderItems.push({
          productId: item.productId,
          quantity: item.quantity,
          SKU: item.SKU,
          price: price,
          sellerId: product.seller,
        });

        product.inStock -= item.quantity;
        await product.save();
      }

      const shippingCost = this.calculateShippingCost(
        null,
        null,
        deliveryMethodId
      );
      totalPrice += shippingCost;

      let discountAmount = 0;
      let discount;

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

      const populatedOrder = await Order.findById(savedOrder._id)
        .populate("paymentMethod", "name")
        .populate("deliveryMethod", "name");

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

      const orderResponse = {
        orderId: savedOrder._id,
        orderDate: savedOrder.createdAt,
        totalPrice: savedOrder.totalPrice,
        paymentMethod: populatedOrder.paymentMethod.name,
        deliveryMethod: populatedOrder.deliveryMethod.name,
        shippingCost: savedOrder.shippingCost,
        deliveryStatus: savedOrder.deliveryStatus,
        paymentStatus: savedOrder.paymentStatus,
        address: savedOrder.address,
        items: responseItems,
      };

      // Lấy email khách hàng từ database
      const customer = await User.findById(userId).select("email fcmTokens");
      if (!customer) throw new Error("Customer not found");

      console.log("customer", customer);

      // Gửi email xác nhận
      await sendOrderConfirmationEmail(orderResponse, customer.email);

      const tokens = customer.fcmTokens?.filter(Boolean);

      console.log("tokens", tokens);

      if (tokens?.length) {
        const title = "Create Order Successful!";
        const body = `You have successfully created an order: ${savedOrder.name}`;
        const data = {
          type: "order_creation",
          orderId: savedOrder._id.toString(),
        };

        console.log("data", data);

        await notificationService.sendNotification(tokens, title, body, data);

        // Lưu thông báo vào cơ sở dữ liệu
        await notificationService.saveNotification(
          customer._id,
          "order_creation",
          title,
          body,
          data
        );
      }

      return orderResponse;
    } catch (error) {
      return {
        status: 500,
        message: error.message || "An error occurred while creating the order",
      };
    }
  }

  async getOrderDetails(orderId) {
    try {
      const order = await Order.findById(orderId)
        .populate("items.sellerId", "shopName")
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
            shopName: item.sellerId.shopName,
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
        .populate("paymentMethod", "name")
        .populate("deliveryMethod", "name")
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
        paymentMethod: order.paymentMethod ? order.paymentMethod.name : null,
        deliveryMethod: order.deliveryMethod ? order.deliveryMethod.name : null,
        paymentStatus: order.paymentStatus,
        shippingCost: order.shippingCost,
        products: order.items.map((item) => ({
          _id: item.productId ? item.productId._id : null,
          name: item.productId ? item.productId.name : null,
          description: item.productId ? item.productId.description : null,
          SKU: item.productId
            ? item.productId.SKU.map((sku) => ({
              name: sku.name,
              classifications: sku.classifications.map(
                (classification) => classification
              ),
              _id: sku._id,
            }))
            : null,
          price: item.productId ? item.productId.price : null,
          salePercent: item.productId ? item.productId.salePercent : null,
          priceAfterSale: item.productId ? item.productId.priceAfterSale : null,
          category: item.productId
            ? item.productId.category.map((cat) => ({
              id: cat._id,
              name: cat.name,
            }))
            : null,
          thumbnail: item.productId ? item.productId.thumbnail : null,
          quantity: item.quantity,
          SKU: item.SKU,
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
      const order = await Order.findById(orderId)
        .populate("items.productId")
        .populate("userId");

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

      // Gửi email thông báo cho khách hàng
      const emailDetails = {
        orderId: order._id,
        orderDate: order.createdAt,
        totalPrice: order.totalPrice,
        paymentMethod: order.paymentMethod,
        deliveryMethod: order.deliveryMethod,
        shippingCost: order.shippingCost,
        deliveryStatus: order.deliveryStatus,
        paymentStatus: order.paymentStatus,
        address: order.shippingAddress, // Địa chỉ nhận hàng
        items: order.items,
      };

      console.log(order.items);

      await sendOrderConfirmationEmail(
        emailDetails,
        order.userId.email,
        order.deliveryStatus
      );

      return { success: true };
    } catch (error) {
      console.error(error);
      return {
        success: false,
      };
    }
  }

  calculateShippingCost(shopAddress, destination, deliveryMethodId) {
    let shippingCost = 0;

    switch (deliveryMethodId) {
      case "672e2ca1bcb7d35fd0794be2":
        shippingCost = 0;
        break;
      case "672e2ca1bcb7d35fd0794be3":
        shippingCost = 60000;
        break;
      case "672e2ca1bcb7d35fd0794be4":
        shippingCost = 30000;
        break;
      default:
        throw new Error("Invalid delivery method");
    }
    return shippingCost;
  }

  async payWithMomo(orderId) {
    const order = await Order.findById(orderId);
    if (!order) {
      throw new Error("Order not found");
    }

    // Kiểm tra nếu đã có link thanh toán
    if (order.paymentData && order.paymentData.payUrl) {
      return {
        ...order.paymentData,
      };
    }

    const amount = order.totalPrice;
    const orderInfo = `Thanh toán hóa đơn`;
    const redirectUrl = momoConfig.REDIRECT_URL;

    // Tạo link thanh toán mới
    const paymentResult = await MomoService.createPayment(
      amount,
      orderInfo,
      redirectUrl
    );

    // Lưu thông tin thanh toán vào đơn hàng
    order.paymentData = paymentResult;
    await order.save();

    return paymentResult;
  }

  async getSellerMomoRevenue(sellerId, startDate, endDate) {
    try {
      // Tạo điều kiện tìm kiếm cơ bản cho người bán
      const query = {
        "items.sellerId": sellerId,
        //paymentStatus: "success",
        "paymentMethod": "680888d38bb3b5b4d57ca2db" // ID của phương thức thanh toán Momo
      };

      // Thêm điều kiện về thời gian nếu có
      if (startDate || endDate) {
        query.createdAt = {};
        if (startDate) {
          query.createdAt.$gte = new Date(startDate);
        }
        if (endDate) {
          query.createdAt.$lte = new Date(endDate);
        }
      }

      // Tìm tất cả đơn hàng thỏa mãn điều kiện
      const orders = await Order.find(query)
        .populate({
          path: "items.productId",
          select: "name price priceAfterSale"
        });

      // Tính toán tổng doanh thu
      let totalRevenue = 0;
      const orderDetails = [];

      for (const order of orders) {
        // Tính tổng giá trị các sản phẩm của người bán trong đơn hàng này
        let orderRevenue = 0;
        const sellerItems = order.items.filter(item =>
          item.sellerId.toString() === sellerId.toString()
        );


        for (const item of sellerItems) {
          orderRevenue += item.price * item.quantity;
        }

        if (orderRevenue > 0) {
          totalRevenue += orderRevenue;
          orderDetails.push({
            orderId: order._id,
            orderDate: order.createdAt,
            revenue: orderRevenue,
            items: sellerItems.map(item => ({
              productName: item.productId.name,
              quantity: item.quantity,
              price: item.price,
              subtotal: item.price * item.quantity
            }))
          });
        }
      }

      return {
        success: true,
        data: {
          totalRevenue,
          orderCount: orderDetails.length,
          orders: orderDetails
        }
      };
    } catch (error) {
      console.error("Error calculating Momo revenue:", error);
      return {
        success: false,
        message: "Failed to calculate Momo revenue",
        error: error.message
      };
    }
  }
}

module.exports = new OrderService();
