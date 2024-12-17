const nodemailer = require("nodemailer");
const dotenv = require("dotenv");
const Product = require("../models/ProductModel");
dotenv.config();

const sendOrderConfirmationEmail = async (orderDetails, customerEmail) => {
  try {
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_NAME,
        pass: process.env.EMAIL_PASSWORD,
      },
    });

    const emailHTML = await generateOrderEmailHTML(orderDetails); // Đảm bảo gọi await

    const mailOptions = {
      from: {
        name: "Phố Mua Sắm",
        address: process.env.EMAIL_NAME,
      },
      to: customerEmail,
      subject: "Xác nhận đơn hàng của bạn",
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
    <div style="font-family: Arial, sans-serif; color: #333; max-width: 800px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 8px; background-color: #f9f9f9;">
      <h2 style="color: #4CAF50; border-bottom: 2px solid #4CAF50; padding-bottom: 10px; text-align: center;">Order Confirmation</h2>
      
      <div style="margin-bottom: 20px;">
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
      
      <h3 style="color: #4CAF50; border-bottom: 2px solid #4CAF50; padding-bottom: 10px;">Shipping Address</h3>
      <div style="margin-bottom: 20px;">
        <p><strong>Location Name:</strong> ${order.address.nameOfLocation}</p>
        <p><strong>Address:</strong> ${order.address.location}</p>
        <p><strong>Phone:</strong> ${order.address.phone}</p>
      </div>
  
      <h3 style="color: #4CAF50; border-bottom: 2px solid #4CAF50; padding-bottom: 10px;">Order Items</h3>
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px; background-color: #fff;">
        <thead>
            <tr style="background-color: #f2f2f2; text-align: center; border-bottom: 2px solid #ddd;">
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
      <p style="text-align: center; font-size: 14px; color: #888;">Thank you for shopping with us!</p>
    </div>
  `;
}

module.exports = { sendOrderConfirmationEmail };
