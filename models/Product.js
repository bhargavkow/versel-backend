const { v4: uuidv4 } = require('uuid');

class Product {
  constructor(productData) {
    this.id = uuidv4();
    this.brand = productData.brand;
    this.description = productData.description;
    this.fabric = productData.fabric;
    this.color = productData.color;
    this.stock = productData.stock || 0;
    this.price = productData.price;
    this.size = productData.size;
    this.image = productData.image;
    this.createdAt = new Date().toISOString();
    this.updatedAt = new Date().toISOString();
  }

  update(data) {
    Object.keys(data).forEach(key => {
      if (key !== 'id' && key !== 'createdAt' && this.hasOwnProperty(key)) {
        this[key] = data[key];
      }
    });
    this.updatedAt = new Date().toISOString();
    return this;
  }

  toJSON() {
    return {
      id: this.id,
      brand: this.brand,
      description: this.description,
      fabric: this.fabric,
      color: this.color,
      stock: this.stock,
      price: this.price,
      size: this.size,
      image: this.image,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    };
  }
}

let products = [
  new Product({
    brand: "Nike",
    description: "Comfortable running shoes with breathable mesh upper",
    fabric: "Mesh, Rubber",
    color: "Black",
    stock: 25,
    price: 129.99,
    size: "10",
    image: "https://example.com/nike-shoes.jpg"
  }),
  new Product({
    brand: "Adidas",
    description: "Classic sports t-shirt made from premium cotton",
    fabric: "100% Cotton",
    color: "White",
    stock: 50,
    price: 29.99,
    size: "Large",
    image: "https://example.com/adidas-shirt.jpg"
  }),
  new Product({
    brand: "Levi's",
    description: "Classic denim jeans with comfortable fit",
    fabric: "98% Cotton, 2% Elastane",
    color: "Blue",
    stock: 15,
    price: 79.99,
    size: "32",
    image: "https://example.com/levis-jeans.jpg"
  })
];

module.exports = { Product, products };
