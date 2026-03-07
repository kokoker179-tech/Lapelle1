import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import "dotenv/config";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// In-memory Data Store
interface Product {
  id: number;
  name: string;
  category: string;
  price: number;
  stock: number;
  created_at: string;
}

interface DistributionArea {
  id: number;
  name: string;
  company_name: string;
  location: string;
  created_at: string;
}

interface Sale {
  id: number;
  product_id: number;
  area_id: number;
  quantity: number;
  total_price: number;
  sale_date: string;
}

let products: Product[] = [
  { id: 1, name: 'Classic Leather Bag', category: 'Bags', price: 120.00, stock: 50, created_at: new Date().toISOString() },
  { id: 2, name: 'Leather Wallet', category: 'Accessories', price: 45.00, stock: 100, created_at: new Date().toISOString() },
  { id: 3, name: 'Premium Belt', category: 'Accessories', price: 35.00, stock: 75, created_at: new Date().toISOString() }
];

let distributionAreas: DistributionArea[] = [
  { id: 1, name: 'Cairo Central', company_name: 'Egypt Logistics', location: 'Cairo, Egypt', created_at: new Date().toISOString() },
  { id: 2, name: 'Alexandria Port', company_name: 'Sea Trade Co', location: 'Alexandria, Egypt', created_at: new Date().toISOString() },
  { id: 3, name: 'Dubai Mall Hub', company_name: 'Gulf Retail', location: 'Dubai, UAE', created_at: new Date().toISOString() }
];

let sales: Sale[] = [
  { id: 1, product_id: 1, area_id: 1, quantity: 5, total_price: 600.00, sale_date: new Date().toISOString() },
  { id: 2, product_id: 2, area_id: 2, quantity: 10, total_price: 450.00, sale_date: new Date().toISOString() }
];

let nextProductId = 4;
let nextAreaId = 4;
let nextSaleId = 3;

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Routes
  app.get("/api/health", (req, res) => {
    res.json({ 
      status: "ok", 
      database: "in-memory",
      ready: true
    });
  });

  app.get("/api/products", (req, res) => {
    res.json(products);
  });

  app.post("/api/products", (req, res) => {
    const { name, category, price, stock } = req.body;
    const newProduct: Product = {
      id: nextProductId++,
      name,
      category,
      price: parseFloat(price),
      stock: parseInt(stock),
      created_at: new Date().toISOString()
    };
    products.push(newProduct);
    res.json({ id: newProduct.id });
  });

  app.put("/api/products/:id", (req, res) => {
    const { id } = req.params;
    const { name, category, price, stock } = req.body;
    const index = products.findIndex(p => p.id === parseInt(id));
    if (index !== -1) {
      products[index] = {
        ...products[index],
        name,
        category,
        price: parseFloat(price),
        stock: parseInt(stock)
      };
      res.json({ success: true });
    } else {
      res.status(404).json({ error: "Product not found" });
    }
  });

  app.delete("/api/products/:id", (req, res) => {
    const { id } = req.params;
    products = products.filter(p => p.id !== parseInt(id));
    res.json({ success: true });
  });

  app.get("/api/areas", (req, res) => {
    res.json(distributionAreas);
  });

  app.post("/api/areas", (req, res) => {
    const { name, company_name, location } = req.body;
    const newArea: DistributionArea = {
      id: nextAreaId++,
      name,
      company_name,
      location,
      created_at: new Date().toISOString()
    };
    distributionAreas.push(newArea);
    res.json({ id: newArea.id });
  });

  app.put("/api/areas/:id", (req, res) => {
    const { id } = req.params;
    const { name, company_name, location } = req.body;
    const index = distributionAreas.findIndex(a => a.id === parseInt(id));
    if (index !== -1) {
      distributionAreas[index] = {
        ...distributionAreas[index],
        name,
        company_name,
        location
      };
      res.json({ success: true });
    } else {
      res.status(404).json({ error: "Area not found" });
    }
  });

  app.delete("/api/areas/:id", (req, res) => {
    const { id } = req.params;
    distributionAreas = distributionAreas.filter(a => a.id !== parseInt(id));
    res.json({ success: true });
  });

  app.get("/api/sales", (req, res) => {
    const enrichedSales = sales.map(s => ({
      ...s,
      product_name: products.find(p => p.id === s.product_id)?.name || "Unknown Product",
      area_name: distributionAreas.find(a => a.id === s.area_id)?.name || "Unknown Area"
    }));
    res.json(enrichedSales);
  });

  app.post("/api/sales", (req, res) => {
    const { product_id, area_id, quantity } = req.body;
    const productIndex = products.findIndex(p => p.id === parseInt(product_id));
    
    if (productIndex === -1) {
      return res.status(404).json({ error: "Product not found" });
    }
    
    if (products[productIndex].stock < quantity) {
      return res.status(400).json({ error: "Insufficient stock" });
    }

    const total_price = products[productIndex].price * quantity;
    
    const newSale: Sale = {
      id: nextSaleId++,
      product_id: parseInt(product_id),
      area_id: parseInt(area_id),
      quantity: parseInt(quantity),
      total_price,
      sale_date: new Date().toISOString()
    };

    sales.push(newSale);
    products[productIndex].stock -= quantity;

    res.json({ success: true });
  });

  app.delete("/api/sales/:id", (req, res) => {
    const { id } = req.params;
    const saleIndex = sales.findIndex(s => s.id === parseInt(id));
    if (saleIndex !== -1) {
      const sale = sales[saleIndex];
      const productIndex = products.findIndex(p => p.id === sale.product_id);
      if (productIndex !== -1) {
        products[productIndex].stock += sale.quantity;
      }
      sales.splice(saleIndex, 1);
      res.json({ success: true });
    } else {
      res.status(404).json({ error: "Sale not found" });
    }
  });

  app.get("/api/stats", (req, res) => {
    const revenue = sales.reduce((acc, s) => acc + s.total_price, 0);
    const productsCount = products.length;
    const areasCount = distributionAreas.length;
    
    const salesByDate: Record<string, number> = {};
    sales.forEach(s => {
      const date = s.sale_date.split('T')[0];
      salesByDate[date] = (salesByDate[date] || 0) + s.total_price;
    });

    const salesOverTime = Object.entries(salesByDate)
      .map(([date, total]) => ({ date, total }))
      .sort((a, b) => a.date.localeCompare(b.date));

    res.json({
      revenue,
      productsCount,
      areasCount,
      salesOverTime
    });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.resolve(__dirname, "dist", "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`\n🚀 Server running on http://localhost:${PORT} (In-memory mode)`);
  });
}

startServer();
