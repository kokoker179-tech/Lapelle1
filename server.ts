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

// Seed sample data if empty
const productCount = db.prepare("SELECT COUNT(*) as count FROM products").get() as any;
if (productCount.count === 0) {
  const insertProduct = db.prepare("INSERT INTO products (name, category, price, stock) VALUES (?, ?, ?, ?)");
  insertProduct.run("Classic Leather Bag", "Bags", 120.00, 50);
  insertProduct.run("Leather Wallet", "Accessories", 45.00, 100);
  insertProduct.run("Premium Belt", "Accessories", 35.00, 75);

  const insertArea = db.prepare("INSERT INTO distribution_areas (name, company_name, location) VALUES (?, ?, ?)");
  insertArea.run("Cairo Central", "Egypt Logistics", "Cairo, Egypt");
  insertArea.run("Alexandria Port", "Sea Trade Co", "Alexandria, Egypt");
  insertArea.run("Dubai Mall Hub", "Gulf Retail", "Dubai, UAE");

  const insertSale = db.prepare("INSERT INTO sales (product_id, area_id, quantity, total_price) VALUES (?, ?, ?, ?)");
  insertSale.run(1, 1, 5, 600.00);
  insertSale.run(2, 2, 10, 450.00);
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Routes
  app.get("/api/health", (req, res) => {
    try {
      // Simple query to check DB health
      db.prepare("SELECT 1").get();
      res.json({ status: "ok", database: "connected" });
    } catch (error) {
      console.error("Health check failed:", error);
      res.status(500).json({ status: "error", database: "disconnected" });
    }
  });

  app.get("/api/products", (req, res) => {
    const products = db.prepare("SELECT * FROM products").all();
    res.json(products);
  });

  app.post("/api/products", (req, res) => {
    console.log("Adding product:", req.body);
    const { name, category, price, stock } = req.body;
    try {
      const info = db.prepare("INSERT INTO products (name, category, price, stock) VALUES (?, ?, ?, ?)").run(name, category, price, stock);
      console.log("Product added with ID:", info.lastInsertRowid);
      res.json({ id: info.lastInsertRowid });
    } catch (error) {
      console.error("Error adding product:", error);
      res.status(500).json({ error: "Failed to add product" });
    }
  });

  app.put("/api/products/:id", (req, res) => {
    const { id } = req.params;
    const { name, category, price, stock } = req.body;
    db.prepare("UPDATE products SET name = ?, category = ?, price = ?, stock = ? WHERE id = ?").run(name, category, price, stock, id);
    res.json({ success: true });
  });

  app.delete("/api/products/:id", (req, res) => {
    const { id } = req.params;
    db.prepare("DELETE FROM products WHERE id = ?").run(id);
    res.json({ success: true });
  });

  app.get("/api/areas", (req, res) => {
    const areas = db.prepare("SELECT * FROM distribution_areas").all();
    res.json(areas);
  });

  app.post("/api/areas", (req, res) => {
    console.log("Adding area:", req.body);
    const { name, company_name, location } = req.body;
    try {
      const info = db.prepare("INSERT INTO distribution_areas (name, company_name, location) VALUES (?, ?, ?)").run(name, company_name, location);
      console.log("Area added with ID:", info.lastInsertRowid);
      res.json({ id: info.lastInsertRowid });
    } catch (error) {
      console.error("Error adding area:", error);
      res.status(500).json({ error: "Failed to add area" });
    }
  });

  app.put("/api/areas/:id", (req, res) => {
    const { id } = req.params;
    const { name, company_name, location } = req.body;
    db.prepare("UPDATE distribution_areas SET name = ?, company_name = ?, location = ? WHERE id = ?").run(name, company_name, location, id);
    res.json({ success: true });
  });

  app.delete("/api/areas/:id", (req, res) => {
    const { id } = req.params;
    db.prepare("DELETE FROM distribution_areas WHERE id = ?").run(id);
    res.json({ success: true });
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
    console.log("Processing sale:", req.body);
    const { product_id, area_id, quantity } = req.body;
    
    try {
      // Get product price
      const product = db.prepare("SELECT price, stock FROM products WHERE id = ?").get(product_id) as any;
      if (!product) {
        return res.status(404).json({ error: "Product not found" });
      }
      if (product.stock < quantity) {
        return res.status(400).json({ error: "Insufficient stock" });
      }

      const total_price = product.price * quantity;
      
      const transaction = db.transaction(() => {
        db.prepare("INSERT INTO sales (product_id, area_id, quantity, total_price) VALUES (?, ?, ?, ?)").run(product_id, area_id, quantity, total_price);
        db.prepare("UPDATE products SET stock = stock - ? WHERE id = ?").run(quantity, product_id);
      });

      transaction();
      console.log("Sale processed successfully");
      res.json({ success: true });
    } catch (error) {
      console.error("Error processing sale:", error);
      res.status(500).json({ error: "Failed to process sale" });
    }
  });

  app.delete("/api/sales/:id", (req, res) => {
    const { id } = req.params;
    const sale = db.prepare("SELECT product_id, quantity FROM sales WHERE id = ?").get(id) as any;
    if (sale) {
      const transaction = db.transaction(() => {
        db.prepare("UPDATE products SET stock = stock + ? WHERE id = ?").run(sale.quantity, sale.product_id);
        db.prepare("DELETE FROM sales WHERE id = ?").run(id);
      });
      transaction();
    }
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
