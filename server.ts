import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import Database from "better-sqlite3";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const db = new Database("lapelle.db");

// Initialize Database
db.exec(`
  CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    category TEXT,
    price REAL NOT NULL,
    stock INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS distribution_areas (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    company_name TEXT,
    location TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS sales (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    product_id INTEGER,
    area_id INTEGER,
    quantity INTEGER NOT NULL,
    total_price REAL NOT NULL,
    sale_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (product_id) REFERENCES products (id),
    FOREIGN KEY (area_id) REFERENCES distribution_areas (id)
  );
`);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Routes
  app.get("/api/products", (req, res) => {
    const products = db.prepare("SELECT * FROM products").all();
    res.json(products);
  });

  app.post("/api/products", (req, res) => {
    const { name, category, price, stock } = req.body;
    const info = db.prepare("INSERT INTO products (name, category, price, stock) VALUES (?, ?, ?, ?)").run(name, category, price, stock);
    res.json({ id: info.lastInsertRowid });
  });

  app.get("/api/areas", (req, res) => {
    const areas = db.prepare("SELECT * FROM distribution_areas").all();
    res.json(areas);
  });

  app.post("/api/areas", (req, res) => {
    const { name, company_name, location } = req.body;
    const info = db.prepare("INSERT INTO distribution_areas (name, company_name, location) VALUES (?, ?, ?)").run(name, company_name, location);
    res.json({ id: info.lastInsertRowid });
  });

  app.get("/api/sales", (req, res) => {
    const sales = db.prepare(`
      SELECT s.*, p.name as product_name, a.name as area_name 
      FROM sales s
      JOIN products p ON s.product_id = p.id
      JOIN distribution_areas a ON s.area_id = a.id
      ORDER BY s.sale_date DESC
    `).all();
    res.json(sales);
  });

  app.post("/api/sales", (req, res) => {
    const { product_id, area_id, quantity } = req.body;
    
    // Get product price
    const product = db.prepare("SELECT price, stock FROM products WHERE id = ?").get(product_id) as any;
    if (!product || product.stock < quantity) {
      return res.status(400).json({ error: "Insufficient stock or product not found" });
    }

    const total_price = product.price * quantity;
    
    const transaction = db.transaction(() => {
      db.prepare("INSERT INTO sales (product_id, area_id, quantity, total_price) VALUES (?, ?, ?, ?)").run(product_id, area_id, quantity, total_price);
      db.prepare("UPDATE products SET stock = stock - ? WHERE id = ?").run(quantity, product_id);
    });

    transaction();
    res.json({ success: true });
  });

  app.get("/api/stats", (req, res) => {
    const totalSales = db.prepare("SELECT SUM(total_price) as total FROM sales").get() as any;
    const totalProducts = db.prepare("SELECT COUNT(*) as count FROM products").get() as any;
    const totalAreas = db.prepare("SELECT COUNT(*) as count FROM distribution_areas").get() as any;
    const salesOverTime = db.prepare(`
      SELECT strftime('%Y-%m-%d', sale_date) as date, SUM(total_price) as total 
      FROM sales 
      GROUP BY date 
      ORDER BY date ASC 
      LIMIT 30
    `).all();

    res.json({
      revenue: totalSales.total || 0,
      productsCount: totalProducts.count || 0,
      areasCount: totalAreas.count || 0,
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
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
