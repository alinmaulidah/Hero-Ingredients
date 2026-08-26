const express = require('express');
const cors = require('cors');

const productRoutes = require('./routes/productRoutes');

const app = express();

const PORT = 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/products', productRoutes);

// Test API
app.get('/api', (req, res) => {
  res.json({
    success: true,
    message: 'MAGNA API is running'
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`Backend running at http://localhost:${PORT}`);
});