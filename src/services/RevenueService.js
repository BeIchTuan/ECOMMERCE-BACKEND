const OrderModel = require("../models/OrderModel");
const {
  parseISO,
  format,
  startOfDay,
  startOfWeek,
  startOfMonth,
  startOfYear,
  differenceInDays,
  addDays,
  addMonths,
  addYears,
  isBefore,
  isAfter,
} = require("date-fns");

class RevenueService {
  // Xem báo cáo doanh thu
  async getRevenueReport(sellerId) {
    const orders = await OrderModel.find({ "items.sellerId": sellerId });
    const totalRevenue = orders.reduce(
      (sum, order) => sum + order.totalPrice,
      0
    );
    const totalOrders = orders.length;
    const averageOrderValue = totalOrders ? totalRevenue / totalOrders : 0;

    return {
      totalRevenue,
      totalOrders,
      averageOrderValue,
    };
  }

  // Xem báo cáo doanh thu theo thời gian
  async getRevenueChart(sellerId, startDate, endDate, interval = "day") {
    const start = startDate ? parseISO(startDate) : addMonths(new Date(), -1);
    const end = endDate ? parseISO(endDate) : new Date();

    // Fetch orders in the date range
    const orders = await OrderModel.find({
      "items.sellerId": sellerId,
      createdAt: { $gte: start, $lte: end },
    });

    // Determine grouping function based on interval
    const getGroupKey = (date) => {
      switch (interval) {
        case "day":
          return format(startOfDay(date), "yyyy-MM-dd");
        case "week":
          return format(startOfWeek(date), "yyyy-MM-dd");
        case "month":
          return format(startOfMonth(date), "yyyy-MM");
        case "year":
          return format(startOfYear(date), "yyyy");
        default:
          throw new Error("Invalid interval");
      }
    };

    // Group orders by interval
    const groupedData = {};
    orders.forEach((order) => {
      const dateKey = getGroupKey(order.createdAt);
      if (!groupedData[dateKey]) {
        groupedData[dateKey] = { revenue: 0, orders: 0, customers: new Set() };
      }
      groupedData[dateKey].revenue += order.totalPrice;
      groupedData[dateKey].orders += 1;
      groupedData[dateKey].customers.add(order.userId.toString());
    });

    // Prepare response data
    const labels = [];
    const revenue = [];
    const ordersCount = [];
    const customersCount = [];

    Object.keys(groupedData)
      .sort((a, b) => new Date(a) - new Date(b))
      .forEach((key) => {
        labels.push(key);
        revenue.push(groupedData[key].revenue);
        ordersCount.push(groupedData[key].orders);
        customersCount.push(groupedData[key].customers.size);
      });

    // Calculate totals
    const total = {
      totalRevenue: revenue.reduce((sum, val) => sum + val, 0),
      totalOrders: ordersCount.reduce((sum, val) => sum + val, 0),
      totalCustomers: [
        ...new Set(orders.flatMap((order) => order.userId.toString())),
      ].length,
    };

    return {
      chartData: {
        labels,
        revenue,
        orders: ordersCount,
        customers: customersCount,
      },
      total,
    };
  }
}

module.exports = new RevenueService();
