require('dotenv').config();

const express=require('express');const cors=require('cors');
const app=express();

app.use(cors({origin:process.env.FRONTEND_URL||'http://localhost:5173'}));
app.use(express.json());
app.get('/api/health',(req,res)=>res.json({ok:true,service:'barlounge-backend'}));
app.use('/api/auth',require('./routes/authRoutes'));
app.use('/api/dashboard',require('./routes/dashboardRoutes'));
app.use('/api/users',require('./routes/userRoutes'));
app.use('/api/sites',require('./routes/siteRoutes'));
app.use('/api/roles',require('./routes/roleRoutes'));
app.use('/api/products',require('./routes/productRoutes'));
app.use('/api/suppliers',require('./routes/supplierRoutes'));
app.use('/api/product-types',require('./routes/productTypeRoutes'));
app.use('/api/inventory',require('./routes/inventoryRoutes'));
app.use('/api/tables', require('./routes/tableRoutes'));
app.use('/api/orders', require('./routes/orderRoutes'));
app.use('/api/cash-register', require('./routes/cashRegisterRoutes'));
app.use(require('./middleware/errorMiddleware').notFound);
app.use(require('./middleware/errorMiddleware').errorHandler);

const PORT=Number(process.env.PORT||8080);app.listen(PORT,()=>console.log(`BARLOUNGE backend running on http://localhost:${PORT}`));
