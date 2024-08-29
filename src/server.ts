import express from "express";
import http from "http";
import { Server as SocketIoServer } from "socket.io";
import bodyParser from "body-parser";
import cors from "cors";
const path = require("path");

const app = express();

const server = http.createServer(app);
const io = new SocketIoServer(server, {
  cors: {
    origin: "*", // Consider restricting origins in production
    methods: ["GET", "POST"],
  },
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(cors());

const viewsDir = path.join(__dirname, "views");
app.use(express.static(viewsDir));
app.use(express.static(path.join(__dirname, "../public")));
app.use(express.static(path.join(__dirname, "../images")));
app.use(express.static(path.join(__dirname, "../media")));
app.use(express.static(path.join(__dirname, "../weights")));
app.use(express.static(path.join(__dirname, "../dist")));

app.get("/webcam_face_detection", (req, res) =>
  res.sendFile(path.join(viewsDir, "webcamFaceDetection.html"))
);

interface FaceData {
  name: string;
  faceDescriptor: number[];
}

const faceDatabase: FaceData[] = [];

// Validate face data
const isValidFaceData = (data: any): data is FaceData => {
  return (
    data && typeof data.name === "string" && Array.isArray(data.faceDescriptor)
  );
};

// Euclidean distance calculation
const euclideanDistance = (desc1: number[], desc2: number[]): number => {
  let sum = 0;
  for (let i = 0; i < desc1.length; i++) {
    sum += Math.pow(desc1[i] - desc2[i], 2);
  }
  return Math.sqrt(sum);
};

// Distance threshold for face matching
const DISTANCE_THRESHOLD = 0.5; // Adjust this value based on your model's characteristics

// Save face data
app.post("/save-face", (req, res) => {
  const { name, faceDescriptor } = req.body;
  if (!isValidFaceData(req.body)) {
    return res.status(400).send("Invalid face data");
  }
  faceDatabase.push({ name, faceDescriptor });
  res.status(200).send("Face data saved successfully");
});

// Check attendance
app.post("/check-attendance", (req, res) => {
  const { faceDescriptor } = req.body;
  if (!Array.isArray(faceDescriptor)) {
    return res.status(400).send("Invalid face descriptor");
  }

  let bestMatch = null;
  let smallestDistance = Infinity;

  faceDatabase.forEach((faceData) => {
    const distance = euclideanDistance(faceDescriptor, faceData.faceDescriptor);
    if (distance < smallestDistance) {
      smallestDistance = distance;
      bestMatch = faceData.name;
    }
  });

  if (smallestDistance <= DISTANCE_THRESHOLD && bestMatch) {
    res.status(200).json({ name: bestMatch });
  } else {
    res.status(404).send("No matching face found");
  }
});

// Get face database
app.get("/face", (req, res) => {
  res.send(faceDatabase);
});

// Socket.IO connection handling
io.on("connection", (socket) => {
  console.log("a user connected");
  socket.on("disconnect", () => {
    console.log("user disconnected");
  });
});

// Start server
server.listen(3001, () => {
  console.log("Server is running on port 3001");
});
