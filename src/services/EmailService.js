const nodemailer = require("nodemailer");
const Product = require("../models/ProductModel");
const twilio = require("twilio");
const client = new twilio(process.env.TWILIO_SID, process.env.TWILIO_AUTH_TOKEN);
const dotenv = require("dotenv");

dotenv.config();

const sendOrderConfirmationEmail = async (orderDetails, customerEmail, status) => {
  try {
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_NAME,
        pass: process.env.EMAIL_PASSWORD,
      },
    });

    const emailHTML = await generateOrderEmailHTML(orderDetails);

    let subject;
    switch (status) {
      case "pending":
        subject = "Đơn hàng của bạn đang chờ xử lý";
        break;
      case "preparing":
        subject = "Đơn hàng của bạn đang được chuẩn bị";
        break;
      case "delivering":
        subject = "Đơn hàng của bạn đang được vận chuyển";
        break;
      case "delivered":
        subject = "Đơn hàng của bạn đã được giao";
        break;
      case "success":
        subject = "Đơn hàng của bạn đã được giao thành công";
        break;
      default:
        subject = "Xác nhận đơn hàng";
        break;
    }

    const mailOptions = {
      from: {
        name: "Phố Mua Sắm",
        address: process.env.EMAIL_NAME,
      },
      to: customerEmail,
      subject: subject,
      html: emailHTML,
    };

    await transporter.sendMail(mailOptions);
    console.log("Email đã được gửi thành công!");
  } catch (error) {
    console.error("Lỗi khi gửi email:", error);
  }
};

async function generateOrderEmailHTML(order) {
  const populatedItems = await Promise.all(
    order.items.map(async (item) => {
      const product = await Product.findById(item.product.id)
        .select("name priceAfterSale")
        .lean();

      return {
        name: product?.name || "N/A",
        priceAfterSale: product?.priceAfterSale || 0,
        quantity: item.quantity,
        SKU: item.SKU?.selected || "N/A",
      };
    })
  );

  // Tạo HTML từ populatedItems
  const itemsHTML = populatedItems
    .map(
      (item, index) => `
    <tr>
      <td style="padding: 10px; border: 1px solid #ddd; text-align: center;">${
        index + 1
      }</td>
      <td style="padding: 10px; border: 1px solid #ddd; text-align: center;">${
        item.name
      }</td>
      <td style="padding: 10px; border: 1px solid #ddd; text-align: center;">${
        item.SKU
      }</td>
      <td style="padding: 10px; border: 1px solid #ddd; text-align: center;">${
        item.quantity
      }</td>
      <td style="padding: 10px; border: 1px solid #ddd; text-align: center;">${item.priceAfterSale.toLocaleString()} VND</td>
    </tr>
  `
    )
    .join("");

  return `
    <div style="font-family: Arial, sans-serif; color: #333; max-width: 800px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 8px; background-color: #ffffff;">
      <!-- Header -->
      <div style="text-align: center; padding-bottom: 20px; border-bottom: 2px solid #4CAF50;">
        <h1 style="color: #4CAF50; font-size: 24px; margin-bottom: 5px;">Order Confirmation</h1>
        <p style="font-size: 14px; color: #777;">Thank you for shopping with us!</p>
      </div>

      <!-- Order Details -->
      <div style="margin-top: 20px; padding-bottom: 20px; border-bottom: 1px solid #ddd;">
        <h2 style="font-size: 18px; color: #333; border-bottom: 2px solid #4CAF50; padding-bottom: 8px; margin-bottom: 15px;">Order Details</h2>
        <p><strong>Order ID:</strong> ${order.orderId}</p>
        <p><strong>Order Date:</strong> ${new Date(
          order.orderDate
        ).toLocaleString()}</p>
        <p><strong>Total Price:</strong> <span style="color: #E91E63; font-weight: bold;">${order.totalPrice.toLocaleString()} VND</span></p>
        <p><strong>Payment Method:</strong> ${order.paymentMethod}</p>
        <p><strong>Delivery Method:</strong> ${order.deliveryMethod}</p>
        <p><strong>Shipping Cost:</strong> ${order.shippingCost.toLocaleString()} VND</p>
        <p><strong>Delivery Status:</strong> <span style="color: #FF9800;">${
          order.deliveryStatus
        }</span></p>
        <p><strong>Payment Status:</strong> <span style="color: ${
          order.paymentStatus === "paid" ? "#4CAF50" : "#FF5722"
        };">${order.paymentStatus}</span></p>
      </div>

      <!-- Shipping Address -->
      <div style="margin-top: 20px; padding-bottom: 20px; border-bottom: 1px solid #ddd;">
        <h2 style="font-size: 18px; color: #333; border-bottom: 2px solid #4CAF50; padding-bottom: 8px; margin-bottom: 15px;">Shipping Address</h2>
        <p><strong>Location Name:</strong> ${order.address.nameOfLocation}</p>
        <p><strong>Address:</strong> ${order.address.location}</p>
        <p><strong>Phone:</strong> ${order.address.phone}</p>
      </div>

      <!-- Order Items -->
      <div style="margin-top: 20px;">
        <h2 style="font-size: 18px; color: #333; border-bottom: 2px solid #4CAF50; padding-bottom: 8px; margin-bottom: 15px;">Order Items</h2>
        <table style="width: 100%; border-collapse: collapse; background-color: #f9f9f9; margin-bottom: 20px;">
          <thead>
            <tr style="background-color: #4CAF50; color: #fff; text-align: center;">
              <th style="padding: 10px; border: 1px solid #ddd;">STT</th>
              <th style="padding: 10px; border: 1px solid #ddd;">Product Name</th>
              <th style="padding: 10px; border: 1px solid #ddd;">SKU</th>
              <th style="padding: 10px; border: 1px solid #ddd;">Quantity</th>
              <th style="padding: 10px; border: 1px solid #ddd;">Price</th>
            </tr>
          </thead>
          <tbody>
            ${itemsHTML}
          </tbody>
        </table>
      </div>

      <!-- Footer -->
      <div style="text-align: center; padding-top: 20px; border-top: 2px solid #ddd; margin-top: 20px;">
        <p style="font-size: 14px; color: #777;">If you have any questions about your order, feel free to <a href="mailto:support@yourstore.com" style="color: #4CAF50; text-decoration: none;">contact us</a>.</p>
        <p style="font-size: 12px; color: #aaa;">&copy; 2024 Your Store. All rights reserved.</p>
      </div>
    </div>
  `;
}

const sendEmailOTP = async (to, message) => {
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.EMAIL_NAME,
      pass: process.env.EMAIL_PASSWORD,
    },
  });

  const mailOptions = {
    from: process.env.EMAIL_NAME,
    to,
    subject: "OTP Verification",
    text: message,
  };

  return transporter.sendMail(mailOptions);
};

const sendSMS = async (to, message) => {
  return client.messages.create({
    body: message,
    from: process.env.TWILIO_PHONE_NUMBER,
    to,
  });
};


module.exports = { sendOrderConfirmationEmail, sendEmailOTP, sendSMS };
