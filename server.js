const express = require("express");
const http = require("http");
const socketIo = require("socket.io");
const qr = require("qrcode");
const path = require("path");

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

// === Cấu hình PORT và URL ===
const PORT = process.env.PORT || 3000;
const serverUrl = 'https://threed-web-app-1.onrender.com'; // ✅ sửa lỗi dấu nháy

// === Tạo mã QR trỏ đến giao diện điều khiển ===
const controllerUrl = `${serverUrl}/controller.html`;
qr.toFile("public/qr.png", controllerUrl, (err) => {
  if (err) {
    console.error("❌ QR Code generation failed:", err);
  } else {
    console.log("✅ QR Code created for controller:", controllerUrl);
  }
});

// === Phục vụ file tĩnh ===
app.use(express.static("public"));
app.use("/models", express.static("models"));

// === Routes ===
app.get("/", (req, res) => {
  const userAgent = req.headers["user-agent"];
  const isMobile = /mobile/i.test(userAgent);
  if (isMobile) {
    // Nếu là thiết bị di động, chuyển sang trang controller
    res.redirect("/controller.html");
  } else {
    // Nếu là máy tính, load viewer
    res.sendFile(path.join(__dirname, "public", "loadModel.html"));
  }
});


// === Socket.io ===
let controllerSocketId = null;

io.on("connection", (socket) => {
  console.log("🟢 User connected:", socket.id);

  socket.on("identify", (role) => {
    if (role === "controller") {
      controllerSocketId = socket.id;
      console.log("📱 Controller connected:", socket.id);
      io.emit("mobile-connected");
    } else if (role === "viewer") {
      console.log("🖥️ Viewer connected:", socket.id);
    }
  });

  socket.on("move", (data) => {
    socket.broadcast.emit("move", data);
  });

  socket.on("disconnect", () => {
    console.log("🔴 User disconnected:", socket.id);
    if (socket.id === controllerSocketId) {
      console.log("⚠️ Controller disconnected.");
      controllerSocketId = null;
    }
  });
});

server.listen(PORT, () => {
  console.log(`✅ Server is running at ${serverUrl}`);
});

