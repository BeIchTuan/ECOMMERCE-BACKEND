const express = require("express");
const NotificationController = require("../controllers/NotificationController");
const router = express.Router();
const { authMiddleware } = require("../middlewares/authMiddleware");

router.post("/", NotificationController.sendNotification);

router.get(
  "/notifications",
  authMiddleware(["seller", "user"]),
  NotificationController.getAllNotifications
);

router.patch(
  "/notifications/:notificationId/mark-as-read",
  authMiddleware(["seller", "user"]),
  NotificationController.markAsRead
);

router.patch(
  "/notifications/mark-all-as-read",
  authMiddleware(["seller", "user"]),
  NotificationController.markAllAsRead
);

router.post(
  "/test",
  NotificationController.sendNotification
);

module.exports = router;
