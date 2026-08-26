const express = require('express');
const cors = require('cors');

const app = express();

const PORT = 5000;

// ================================
// MIDDLEWARE
// ================================

app.use(cors());
app.use(express.json());


// ================================
// TEST API
// ================================

app.get('/api', (req, res) => {
  res.json({
    success: true,
    message: 'MAGNA API is running'
  });
});


// ================================
// START SERVER
// ================================

app.listen(PORT, () => {
  console.log(`Backend running at http://localhost:${PORT}`);
});