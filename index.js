const express = require("express");
const cors = require("cors");
require("./db");

const app = express();



app.use(cors({
  origin: "*", 
}));
app.use(express.json());

// Health check
app.get("/", (req, res) => {
  res.send("Inventory POC Backend is running");
});

// Routes
app.use("/sites", require("./routes/sites"));
app.use("/inventory", require("./routes/inventory"));
app.use("/request", require("./routes/request"));
app.use("/materials", require("./routes/materials"));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Backend running on port ${PORT}`);
});


