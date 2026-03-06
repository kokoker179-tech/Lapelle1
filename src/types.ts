export interface Product {
  id: number;
  name: string;
  category: string;
  price: number;
  stock: number;
  created_at: string;
}

export interface Area {
  id: number;
  name: string;
  company_name: string;
  location: string;
  created_at: string;
}

export interface Sale {
  id: number;
  product_id: number;
  area_id: number;
  quantity: number;
  total_price: number;
  sale_date: string;
  product_name?: string;
  area_name?: string;
}

export interface Stats {
  revenue: number;
  productsCount: number;
  areasCount: number;
  salesOverTime: { date: string; total: number }[];
}
