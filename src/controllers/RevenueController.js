const revenueService = require("../services/RevenueService");

class RevenueController {
  // API: Xem báo cáo doanh thu
  async getRevenueReport(req, res) {
    try {
      const report = await revenueService.getRevenueReport(req.id);
      res.status(200).json({
        status: "success",
        revenueReport: report,
      });
    } catch (error) {
      res.status(500).json({
        status: "error",
        message: "Failed to fetch revenue report",
      });
    }
  }

  // API: Xem báo cáo doanh thu theo thời gian
  async getRevenueChart(req, res) {
    try {
      const { startDate, endDate, interval } = req.query;
      console.log(req.query);
      const chartData = await revenueService.getRevenueChart(
        req.id,
        startDate,
        endDate,
        interval
      );
      res.status(200).json({
        status: "success",
        ...chartData,
      });
    } catch (error) {
      if (error.message.includes("Invalid startDate or endDate")) {
        return res.status(400).json({
          status: "error",
          message:
            "Invalid date format. Please provide valid startDate and endDate in ISO 8601 format.",
        });
      }
      res.status(500).json({
        status: "error",
        message: "Failed to fetch revenue chart report",
        err: error,
      });
    }
  }
}

module.exports = new RevenueController();
