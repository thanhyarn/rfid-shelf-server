const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const { echo, broadcastData } = require("./src/config/wsConfig"); // Import thêm broadcastData
const http = require("http");
const route = require("./src/routers");
const Epc = require("./src/App/models/Epc");
// const db = require("./src/config/dbConfig");
const axios = require("axios");
const path = require("path");
const fs = require("fs"); // Import module fs
const player = require("play-sound")((opts = {}));
// db.connect();

const app = express();
app.use(cors());
app.use(bodyParser.json());

const server = http.createServer(app);
echo.installHandlers(server, { prefix: "/echo" });

route(app);

const PORT = 3002;
const WS_PORT = 8091;

// API phát dữ liệu thông qua payload được truyền vào
app.post("/broadcast-shelf", (req, res) => {
  try {
    const { shelfData } = req.body; // Dữ liệu được truyền vào thông qua payload

    if (!shelfData || typeof shelfData !== "object") {
      return res.status(400).send({
        message: "Invalid payload: shelfData must be an object",
      });
    }

    // Phát dữ liệu qua WebSocket
    broadcastData({
      type: "CUSTOM_SHELF_DATA",
      data: shelfData,
    });

    res.status(200).send({
      message: "Shelf data broadcasted successfully",
    });
  } catch (error) {
    console.error(error);
    res.status(500).send({ message: "Error broadcasting shelf data" });
  }
});

// Tạo API POST để nhận dữ liệu EPC từ client
app.post("/send-epc", async (req, res) => {
  let { epc } = req.body; // Lấy dữ liệu EPC từ body của request

  // Loại bỏ tất cả các dấu cách trong chuỗi EPC
  epc = epc.replace(/\s+/g, "");

  console.log(epc);

  // Kiểm tra nếu EPC không được cung cấp
  if (!epc) {
    return res.status(400).send({ message: "EPC is required" });
  }

  try {
    // Tìm EPC trong cơ sở dữ liệu
    const epcData = await Epc.findOne({ epc });

    // Nếu không tìm thấy EPC
    if (!epcData) {
      return res.status(404).send({ message: "EPC not found in the database" });
    }

    // Gửi dữ liệu EPC đến các client qua SockJS
    broadcastData(epcData);

    // Trả về thông tin EPC
    return res.status(200).send({
      message: "EPC data retrieved successfully",
      data: epcData,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).send({ message: "Error retrieving EPC data" });
  }
});

app.listen(PORT, () => console.log(`HTTP server listening on port ${PORT}`));
server.listen(WS_PORT, () =>
  console.log(`SockJS server running on port ${WS_PORT}`)
);
