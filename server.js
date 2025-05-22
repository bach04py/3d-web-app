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
const serverUrl = process.env.SERVER_URL || `http://localhost:${PORT}`;

// === Sinh mã QR code ===
qr.toFile("public/qr.png", serverUrl, (err) => {
  if (err) {
    console.error("❌ QR Code generation failed:", err);
  } else {
    console.log("✅ QR Code created for:", serverUrl);
  }
});

// === Phục vụ file tĩnh ===
app.use(express.static("public"));
app.use("/models", express.static("models"));

// === Routes ===
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "loadModel.html"));
});

app.get("/index.html", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// === Socket.io ===
let controllerSocketId = null;

io.on("connection", (socket) => {
  console.log("🟢 User connected:", socket.id);

  if (!controllerSocketId) {
    controllerSocketId = socket.id;
    console.log("📱 Controller connected:", socket.id);
    io.emit("mobile-connected");
  } else {
    console.log("🖥️ Viewer connected:", socket.id);
  }

  socket.on("move", (data) => {
    socket.broadcast.emit("move", data);
  });

  socket.on("start-3d", () => {
    console.log("🖥️ Manual start-3d from:", socket.id);
  });

  socket.on("disconnect", () => {
    console.log("🔴 User disconnected:", socket.id);
    if (socket.id === controllerSocketId) {
      console.log("⚠️ Controller disconnected.");
      controllerSocketId = null;
    }
  });
});

// === Khởi động server ===
server.listen(PORT, () => {
  console.log(`�� Server is running at ${serverUrl}`);
});

