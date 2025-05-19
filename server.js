const express = require("express");
const http = require("http");
const socketIo = require("socket.io");
const qr = require("qrcode");
const os = require("os");
const path = require("path");

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

// Phục vụ các file tĩnh
app.use(express.static("public"));
app.use("/models", express.static("models"));

// Lấy IP nội bộ trong mạng LAN
function getLocalIp() {
  const interfaces = os.networkInterfaces();
  for (const iface of Object.values(interfaces)) {
    for (const info of iface) {
      if (info.family === "IPv4" && !info.internal) {
        return info.address;
      }
    }
  }
  return "localhost";
}

const PORT = 3000;
const localIp = getLocalIp();
const serverUrl = `http://${localIp}:${PORT}`;

// Tạo QR code
qr.toFile("public/qr.png", serverUrl, (err) => {
  if (err) console.error("❌ QR Code generation failed:", err);
  else console.log("✅ QR Code created for:", serverUrl);
});

// Điều hướng mặc định
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "loadModel.html"));
});

app.get("/index.html", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// === Socket.io Logic ===
let controllerSocketId = null;

io.on("connection", (socket) => {
  console.log("🟢 User connected:", socket.id);

  // Nếu chưa có controller nào -> gán thiết bị này làm controller
  if (!controllerSocketId) {
    controllerSocketId = socket.id;
    console.log("📱 Controller connected:", socket.id);

    // Thông báo cho index.html chuyển sang viewer
    io.emit("mobile-connected");
  } else {
    // Nếu đã có controller thì đây là viewer
    console.log("🖥️ Viewer connected:", socket.id);
  }

  // Khi nhận được lệnh move từ controller, gửi broadcast tới các viewer
  socket.on("move", (data) => {
    // Phát cho tất cả ngoại trừ controller
    socket.broadcast.emit("move", data);
  });

  // Trường hợp nhấn Start từ giao diện web thủ công
  socket.on("start-3d", () => {
    console.log("🖥️ Manual start-3d from:", socket.id);
  });

  // Khi một client rời đi
  socket.on("disconnect", () => {
    console.log("🔴 User disconnected:", socket.id);

    // Nếu controller rời đi -> cho phép controller mới
    if (socket.id === controllerSocketId) {
      console.log("⚠️ Controller disconnected.");
      controllerSocketId = null;
    }
  });
});

server.listen(PORT, () => {
  console.log(`🚀 Server is running at ${serverUrl}`);
});

