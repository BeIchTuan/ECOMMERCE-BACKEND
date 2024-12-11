const revenueService = require('../services/RevenueService');

class RevenueController {
  // API: Xem báo cáo doanh thu
  async getRevenueReport(req, res) {
    try {
      const report = await revenueService.getRevenueReport(req.user.id);
      res.status(200).json({
        status: 'success',
        revenueReport: report,
      });
    } catch (error) {
      res.status(500).json({
        status: 'error',
        message: 'Failed to fetch revenue report',
      });
    }
  }

  // API: Xem báo cáo doanh thu theo thời gian
  async getRevenueChart(req, res) {
    try {
      const { startDate, endDate, interval } = req.query;
      const chartData = await revenueService.getRevenueChart(req.user.id, startDate, endDate, interval);
      res.status(200).json({
        status: 'success',
        ...chartData,
      });
    } catch (error) {
      res.status(500).json({
        status: 'error',
        message: 'Failed to fetch revenue chart report',
      });
    }
  }
}

module.exports = new RevenueController();
