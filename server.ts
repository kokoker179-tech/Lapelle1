import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import { neon } from '@neondatabase/serverless';
import Database from 'better-sqlite3';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Initialize Database
const dbUrl = process.env.DATABASE_URL || process.env.NETLIFY_DATABASE_URL;
let dbType: 'neon' | 'sqlite' = 'sqlite';
let neonSql: any;
let sqlite: any;

if (dbUrl) {
  dbType = 'neon';
  neonSql = neon(dbUrl);
  console.log("🔗 Using Neon PostgreSQL database");
} else {
  dbType = 'sqlite';
  sqlite = new Database('data.db');
  console.log("📁 Using local SQLite database (data.db)");
}

// Universal SQL Tagged Template
async function sql(strings: TemplateStringsArray, ...values: any[]) {
  if (dbType === 'neon') {
    return await neonSql(strings, ...values);
  } else {
    // Convert PostgreSQL style placeholders ($1, $2) or tagged template to SQLite (?)
    // The neon driver uses tagged templates directly.
    // We'll build a standard query and params array.
    const query = strings.reduce((acc, str, i) => acc + (i > 0 ? '?' : '') + str, '');
    
    // Handle specific PostgreSQL syntax that SQLite doesn't like
    let sqliteQuery = query
      .replace(/SERIAL PRIMARY KEY/gi, 'INTEGER PRIMARY KEY AUTOINCREMENT')
      .replace(/DECIMAL\(\d+,\d+\)/gi, 'REAL')
      .replace(/TIMESTAMP DEFAULT CURRENT_TIMESTAMP/gi, 'DATETIME DEFAULT CURRENT_TIMESTAMP')
      .replace(/RETURNING id/gi, '')
      .replace(/::date::text/gi, ''); // For stats query

    try {
      const stmt = sqlite.prepare(sqliteQuery);
      if (sqliteQuery.trim().toUpperCase().startsWith('SELECT')) {
        const results = stmt.all(...values);
        // Normalize count results for PostgreSQL compatibility
        return results.map((r: any) => {
          if (r['count(*)'] !== undefined) return { ...r, count: r['count(*)'].toString() };
          return r;
        });
      } else {
        const result = stmt.run(...values);
        return [{ id: result.lastInsertRowid }];
      }
    } catch (err) {
      console.error("SQLite Error:", err, "Query:", sqliteQuery);
      throw err;
    }
  }
}

async function initDb() {
  try {
    console.log(`🚀 Initializing ${dbType === 'neon' ? 'Netlify/Neon' : 'Local SQLite'} Database...`);
    
    await sql`
      CREATE TABLE IF NOT EXISTS products (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        category TEXT,
        price DECIMAL(10,2) NOT NULL,
        stock INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS distribution_areas (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        company_name TEXT,
        location TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS sales (
        id SERIAL PRIMARY KEY,
        product_id INTEGER REFERENCES products(id),
        area_id INTEGER REFERENCES distribution_areas(id),
        quantity INTEGER NOT NULL,
        total_price DECIMAL(10,2) NOT NULL,
        sale_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `;

    // Seed sample data if empty
    const products = await sql`SELECT count(*) FROM products`;
    const count = dbType === 'neon' ? parseInt(products[0].count) : products[0].count;
    
    if (parseInt(count) === 0) {
      console.log("🌱 Seeding sample data...");
      await sql`
        INSERT INTO products (name, category, price, stock) VALUES 
        ('Classic Leather Bag', 'Bags', 120.00, 50),
        ('Leather Wallet', 'Accessories', 45.00, 100),
        ('Premium Belt', 'Accessories', 35.00, 75);
      `;

      await sql`
        INSERT INTO distribution_areas (name, company_name, location) VALUES 
        ('Cairo Central', 'Egypt Logistics', 'Cairo, Egypt'),
        ('Alexandria Port', 'Sea Trade Co', 'Alexandria, Egypt'),
        ('Dubai Mall Hub', 'Gulf Retail', 'Dubai, UAE');
      `;

      await sql`
        INSERT INTO sales (product_id, area_id, quantity, total_price) VALUES 
        (1, 1, 5, 600.00),
        (2, 2, 10, 450.00);
      `;
    }
    console.log("Database initialized successfully");
  } catch (error) {
    console.error("Failed to initialize database:", error);
  }
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Initialize DB
  await initDb();

  // API Routes
  app.get("/api/health", async (req, res) => {
    try {
      await sql`SELECT 1`;
      res.json({ 
        status: "ok", 
        database: dbType === 'neon' ? "connected" : "local",
        type: dbType
      });
    } catch (error) {
      console.error("Health check failed:", error);
      res.status(500).json({ status: "error", database: "disconnected" });
    }
  });

  app.get("/api/products", async (req, res) => {
    try {
      const products = await sql`SELECT * FROM products ORDER BY id ASC`;
      res.json(products);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch products" });
    }
  });

  app.post("/api/products", async (req, res) => {
    const { name, category, price, stock } = req.body;
    try {
      const result = await sql`
        INSERT INTO products (name, category, price, stock) 
        VALUES (${name}, ${category}, ${price}, ${stock}) 
        RETURNING id
      `;
      res.json({ id: result[0].id });
    } catch (error) {
      console.error("Error adding product:", error);
      res.status(500).json({ error: "Failed to add product" });
    }
  });

  app.put("/api/products/:id", async (req, res) => {
    const { id } = req.params;
    const { name, category, price, stock } = req.body;
    try {
      await sql`
        UPDATE products 
        SET name = ${name}, category = ${category}, price = ${price}, stock = ${stock} 
        WHERE id = ${id}
      `;
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to update product" });
    }
  });

  app.delete("/api/products/:id", async (req, res) => {
    const { id } = req.params;
    try {
      await sql`DELETE FROM products WHERE id = ${id}`;
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete product" });
    }
  });

  app.get("/api/areas", async (req, res) => {
    try {
      const areas = await sql`SELECT * FROM distribution_areas ORDER BY id ASC`;
      res.json(areas);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch areas" });
    }
  });

  app.post("/api/areas", async (req, res) => {
    const { name, company_name, location } = req.body;
    try {
      const result = await sql`
        INSERT INTO distribution_areas (name, company_name, location) 
        VALUES (${name}, ${company_name}, ${location}) 
        RETURNING id
      `;
      res.json({ id: result[0].id });
    } catch (error) {
      res.status(500).json({ error: "Failed to add area" });
    }
  });

  app.put("/api/areas/:id", async (req, res) => {
    const { id } = req.params;
    const { name, company_name, location } = req.body;
    try {
      await sql`
        UPDATE distribution_areas 
        SET name = ${name}, company_name = ${company_name}, location = ${location} 
        WHERE id = ${id}
      `;
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to update area" });
    }
  });

  app.delete("/api/areas/:id", async (req, res) => {
    const { id } = req.params;
    try {
      await sql`DELETE FROM distribution_areas WHERE id = ${id}`;
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete area" });
    }
  });

  app.get("/api/sales", async (req, res) => {
    try {
      const sales = await sql`
        SELECT s.*, p.name as product_name, a.name as area_name 
        FROM sales s
        JOIN products p ON s.product_id = p.id
        JOIN distribution_areas a ON s.area_id = a.id
        ORDER BY s.sale_date DESC
      `;
      res.json(sales);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch sales" });
    }
  });

  app.post("/api/sales", async (req, res) => {
    const { product_id, area_id, quantity } = req.body;
    try {
      const product = await sql`SELECT price, stock FROM products WHERE id = ${product_id}`;
      if (product.length === 0) {
        return res.status(404).json({ error: "Product not found" });
      }
      if (product[0].stock < quantity) {
        return res.status(400).json({ error: "Insufficient stock" });
      }

      const total_price = product[0].price * quantity;
      
      // Neon/HTTP doesn't support traditional transactions in the same way as better-sqlite3
      // But we can use a single query with CTEs or just run them sequentially for this demo
      // For a real app, we'd use a transaction if the driver supports it or a stored procedure
      await sql`
        INSERT INTO sales (product_id, area_id, quantity, total_price) 
        VALUES (${product_id}, ${area_id}, ${quantity}, ${total_price})
      `;
      await sql`
        UPDATE products SET stock = stock - ${quantity} WHERE id = ${product_id}
      `;

      res.json({ success: true });
    } catch (error) {
      console.error("Error processing sale:", error);
      res.status(500).json({ error: "Failed to process sale" });
    }
  });

  app.delete("/api/sales/:id", async (req, res) => {
    const { id } = req.params;
    try {
      const sale = await sql`SELECT product_id, quantity FROM sales WHERE id = ${id}`;
      if (sale.length > 0) {
        await sql`UPDATE products SET stock = stock + ${sale[0].quantity} WHERE id = ${sale[0].product_id}`;
        await sql`DELETE FROM sales WHERE id = ${id}`;
      }
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete sale" });
    }
  });

  app.get("/api/stats", async (req, res) => {
    try {
      const totalSales = await sql`SELECT SUM(total_price) as total FROM sales`;
      const totalProducts = await sql`SELECT COUNT(*) as count FROM products`;
      const totalAreas = await sql`SELECT COUNT(*) as count FROM distribution_areas`;
      
      // Handle date grouping differently for SQLite vs PostgreSQL
      let salesOverTime;
      if (dbType === 'neon') {
        salesOverTime = await sql`
          SELECT sale_date::date::text as date, SUM(total_price) as total 
          FROM sales 
          GROUP BY date 
          ORDER BY date ASC 
          LIMIT 30
        `;
      } else {
        salesOverTime = await sql`
          SELECT date(sale_date) as date, SUM(total_price) as total 
          FROM sales 
          GROUP BY date 
          ORDER BY date ASC 
          LIMIT 30
        `;
      }

      res.json({
        revenue: parseFloat(totalSales[0].total || 0),
        productsCount: parseInt(totalProducts[0].count || 0),
        areasCount: parseInt(totalAreas[0].count || 0),
        salesOverTime
      });
    } catch (error) {
      console.error("Stats error:", error);
      res.status(500).json({ error: "Failed to fetch stats" });
    }
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
    console.log(`\n🚀 Server running on http://localhost:${PORT}`);
    if (!dbUrl) {
      console.log("--------------------------------------------------");
      console.log("💡 TIP: To connect your Netlify/Neon database:");
      console.log("1. Go to your project settings");
      console.log("2. Add a DATABASE_URL environment variable");
      console.log("3. Restart the server");
      console.log("--------------------------------------------------\n");
    }
  });
}

startServer();
