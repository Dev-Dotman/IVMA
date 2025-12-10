import mongoose from 'mongoose';

// Category-specific schemas
const ClothingDetailsSchema = new mongoose.Schema({
  gender: {
    type: String,
    enum: ['Men', 'Women', 'Unisex', 'Kids', 'Babies'],
    default: 'Unisex'
  },
  productType: {
    type: String,
    enum: [
      'T-shirts', 'Polo shirts', 'Hoodies', 'Sweatshirts', 'Shirts', 'Crop tops', 'Tank tops',
      'Jeans', 'Shorts', 'Joggers', 'Cargo pants', 'Trousers', 'Leggings',
      'Jackets', 'Coats', 'Blazers', 'Windbreakers',
      'Casual dresses', 'Bodycon', 'Maxi dresses', 'Mini skirts', 'Pencil skirts',
      'Gym tops', 'Track pants', 'Sports bras', 'Performance shorts',
      'Underwear', 'Sleepwear', 'Loungewear', 'Socks', 'Other'
    ]
  },
  sizes: [{
    type: String,
    enum: ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL', 'Plus Size', 'Kids 2-4', 'Kids 5-7', 'Kids 8-12', 'Custom']
  }],
  colors: [{
    type: String,
    trim: true
  }],
  material: {
    type: String,
    enum: [
      'Cotton', 'Polyester', 'Lycra', 'Wool', 'Denim', 'Linen', 'Fleece', 'Silk', 'Velvet',
      'Ankara', 'Aso Oke', 'Kente', 'Adire', 'Kampala', 'Dashiki', 'Batik', 
      'Mixed', 'Other'
    ]
  },
  style: [{
    type: String,
    enum: ['Minimalist', 'Vintage', 'Urban/Street', 'Athleisure', 'Luxury', 'Oversized', 'Slim fit', 'Regular fit', 'Other']
  }],
  occasion: [{
    type: String,
    enum: [
      'Casual', 'Office/Corporate', 'Party', 'Streetwear', 'Sports/Fitness', 'Traditional', 'Outdoor',
      'Owambe', 'Wedding', 'Church/Religious', 'Beach', 'Formal Event', 'Other'
    ]
  }]
}, { _id: false });

const ShoesDetailsSchema = new mongoose.Schema({
  gender: {
    type: String,
    enum: ['Men', 'Women', 'Unisex', 'Kids', 'Babies'],
    default: 'Unisex'
  },
  shoeType: {
    type: String,
    enum: [
      'Sneakers', 'Sandals', 'Slippers', 'Boots', 'Heels', 'Flats', 
      'Loafers', 'Oxfords', 'Sports shoes', 'Canvas shoes', 'Slides', 'Other'
    ]
  },
  sizes: [{
    type: String // e.g., '38', '39', '40', 'UK 7', 'US 9'
  }],
  colors: [{
    type: String,
    trim: true
  }],
  material: {
    type: String,
    enum: ['Leather', 'Canvas', 'Suede', 'Rubber', 'Synthetic', 'Fabric', 'Mixed', 'Other']
  },
  occasion: [{
    type: String,
    enum: [
      'Casual', 'Office/Corporate', 'Party', 'Sports/Fitness', 'Outdoor', 'Beach',
      'Owambe', 'Wedding', 'Church/Religious', 'Formal Event', 'Other'
    ]
  }]
}, { _id: false });

const AccessoriesDetailsSchema = new mongoose.Schema({
  accessoryType: {
    type: String,
    enum: [
      'Bags', 'Handbags', 'Backpacks', 'Wallets', 'Belts', 'Watches', 
      'Jewelry', 'Sunglasses', 'Hats/Caps', 'Scarves', 'Ties', 'Other'
    ]
  },
  gender: {
    type: String,
    enum: ['Men', 'Women', 'Unisex', 'Kids'],
    default: 'Unisex'
  },
  colors: [{
    type: String,
    trim: true
  }],
  material: {
    type: String,
    enum: ['Leather', 'Metal', 'Plastic', 'Fabric', 'Gold', 'Silver', 'Stainless Steel', 'Wood', 'Mixed', 'Other']
  }
}, { _id: false });

const PerfumeDetailsSchema = new mongoose.Schema({
  fragranceType: {
    type: String,
    enum: [
      'Eau de Parfum', 'Eau de Toilette', 'Cologne', 'Body Spray', 
      'Perfume Oil', 'Body Mist', 'Other'
    ]
  },
  gender: {
    type: String,
    enum: ['Men', 'Women', 'Unisex'],
    default: 'Unisex'
  },
  volume: {
    type: String, // e.g., '50ml', '100ml', '150ml'
    trim: true
  },
  scentFamily: {
    type: String,
    enum: [
      'Floral', 'Woody', 'Fresh/Citrus', 'Oriental/Spicy', 'Fruity', 
      'Aquatic', 'Gourmand', 'Green', 'Other'
    ]
  },
  concentration: {
    type: String,
    enum: ['Light', 'Moderate', 'Strong', 'Very Strong']
  },
  occasion: [{
    type: String,
    enum: [
      'Everyday', 'Office', 'Evening/Night', 'Special Occasion', 'Sports',
      'Owambe', 'Wedding', 'Church/Religious', 'Date Night', 'Other'
    ]
  }]
}, { _id: false });

const FoodDetailsSchema = new mongoose.Schema({
  foodType: {
    type: String,
    enum: [
      'Ready-to-Eat Meals', 'Meal Prep/Packaged Food', 'Baked Goods', 
      'Snacks & Small Chops', 'Traditional Nigerian Dishes', 'Continental Dishes',
      'Fast Food', 'Healthy/Organic Meals', 'Frozen Foods', 'Other'
    ]
  },
  cuisineType: [{
    type: String,
    enum: ['Nigerian', 'Continental', 'Asian', 'Fast Food', 'Healthy/Vegan', 'Desserts', 'Other']
  }],
  servingSize: {
    type: String,
    trim: true
  },
  ingredients: [{
    type: String,
    trim: true
  }],
  allergens: [{
    type: String,
    enum: ['Nuts', 'Dairy', 'Eggs', 'Gluten', 'Soy', 'Shellfish', 'Fish', 'None']
  }],
  spiceLevel: {
    type: String,
    enum: ['Mild', 'Medium', 'Hot', 'Extra Hot', 'Not Spicy']
  },
  deliveryLocations: {
    states: [{
      stateName: String,
      cities: [String],
      coverAllCities: { type: Boolean, default: false }
    }]
  },
  orderingHours: [{
    day: {
      type: String,
      enum: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
    },
    isAvailable: { type: Boolean, default: true },
    startTime: String,
    endTime: String
  }],
  deliveryTime: {
    value: Number,
    unit: {
      type: String,
      enum: ['minutes', 'hours', 'days'],
      default: 'minutes'
    }
  },
  maxOrdersPerDay: {
    type: Number,
    min: [1, 'Max orders per day must be at least 1'],
    default: 50
  }
}, { _id: false });

const BeveragesDetailsSchema = new mongoose.Schema({
  beverageType: {
    type: String,
    enum: [
      'Soft Drinks', 'Juices', 'Energy Drinks', 'Water', 'Tea/Coffee',
      'Smoothies', 'Alcoholic Beverages', 'Traditional Drinks', 'Other'
    ]
  },
  volume: {
    type: String,
    trim: true
  },
  packaging: {
    type: String,
    enum: ['Bottle', 'Can', 'Sachet', 'Carton', 'Cup', 'Keg', 'Other']
  },
  ingredients: [{
    type: String,
    trim: true
  }],
  isAlcoholic: {
    type: Boolean,
    default: false
  },
  alcoholContent: {
    type: String,
    trim: true
  },
  isCarbonated: {
    type: Boolean,
    default: false
  },
  flavorProfile: [{
    type: String,
    enum: ['Sweet', 'Sour', 'Bitter', 'Fruity', 'Citrus', 'Herbal', 'Spicy', 'Other']
  }],
  deliveryLocations: {
    states: [{
      stateName: String,
      cities: [String],
      coverAllCities: { type: Boolean, default: false }
    }]
  },
  orderingHours: [{
    day: {
      type: String,
      enum: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
    },
    isAvailable: { type: Boolean, default: true },
    startTime: String,
    endTime: String
  }],
  deliveryTime: {
    value: Number,
    unit: {
      type: String,
      enum: ['minutes', 'hours', 'days'],
      default: 'minutes'
    }
  },
  maxOrdersPerDay: {
    type: Number,
    min: [1, 'Max orders per day must be at least 1'],
    default: 50
  }
}, { _id: false });

const ElectronicsDetailsSchema = new mongoose.Schema({
  productType: {
    type: String,
    enum: [
      'Smartphones', 'Tablets', 'Laptops', 'Desktops', 'Smartwatches', 'Headphones',
      'Speakers', 'Cameras', 'Gaming Consoles', 'TVs', 'Home Appliances',
      'Computer Accessories', 'Phone Accessories', 'Other'
    ]
  },
  brand: {
    type: String,
    trim: true
  },
  model: {
    type: String,
    trim: true
  },
  specifications: {
    processor: String,
    ram: String,
    storage: String,
    screenSize: String,
    batteryCapacity: String,
    camera: String,
    other: String
  },
  condition: {
    type: String,
    enum: ['New', 'Refurbished', 'Used - Like New', 'Used - Good', 'Used - Fair']
  },
  warranty: {
    hasWarranty: { type: Boolean, default: false },
    duration: String,
    type: String
  },
  colors: [String],
  connectivity: [{
    type: String,
    enum: ['WiFi', 'Bluetooth', '4G', '5G', 'USB-C', 'HDMI', 'Ethernet', 'Other']
  }]
}, { _id: false });

const BooksDetailsSchema = new mongoose.Schema({
  bookType: {
    type: String,
    enum: [
      'Fiction', 'Non-Fiction', 'Educational', 'Children', 'Comics/Manga',
      'Biography', 'Self-Help', 'Religious', 'Business', 'Cookbook', 'Other'
    ]
  },
  author: {
    type: String,
    trim: true
  },
  publisher: {
    type: String,
    trim: true
  },
  isbn: {
    type: String,
    trim: true
  },
  publicationYear: Number,
  language: {
    type: String,
    default: 'English'
  },
  pages: Number,
  format: {
    type: String,
    enum: ['Hardcover', 'Paperback', 'eBook', 'Audiobook']
  },
  condition: {
    type: String,
    enum: ['New', 'Like New', 'Very Good', 'Good', 'Acceptable']
  },
  genre: [String]
}, { _id: false });

const HomeGardenDetailsSchema = new mongoose.Schema({
  productType: {
    type: String,
    enum: [
      'Furniture', 'Decor', 'Kitchen & Dining', 'Bedding', 'Bathroom',
      'Lighting', 'Storage', 'Garden Tools', 'Plants', 'Outdoor Furniture',
      'Home Improvement', 'Cleaning Supplies', 'Other'
    ]
  },
  room: [{
    type: String,
    enum: ['Living Room', 'Bedroom', 'Kitchen', 'Bathroom', 'Dining Room', 
           'Office', 'Garden', 'Outdoor', 'All Rooms']
  }],
  material: {
    type: String,
    enum: ['Wood', 'Metal', 'Plastic', 'Glass', 'Fabric', 'Ceramic', 'Stone', 'Mixed', 'Other']
  },
  dimensions: {
    length: String,
    width: String,
    height: String,
    weight: String
  },
  color: [String],
  assemblyRequired: {
    type: Boolean,
    default: false
  },
  careInstructions: String
}, { _id: false });

const SportsDetailsSchema = new mongoose.Schema({
  sportType: {
    type: String,
    enum: [
      'Football/Soccer', 'Basketball', 'Tennis', 'Fitness & Gym', 'Running',
      'Swimming', 'Cycling', 'Boxing', 'Yoga', 'Outdoor Sports',
      'Team Sports', 'Water Sports', 'Other'
    ]
  },
  productType: {
    type: String,
    enum: [
      'Equipment', 'Apparel', 'Footwear', 'Accessories', 'Protective Gear',
      'Training Aids', 'Nutrition', 'Other'
    ]
  },
  brand: String,
  sizes: [String],
  colors: [String],
  material: String,
  suitableFor: [{
    type: String,
    enum: ['Men', 'Women', 'Unisex', 'Kids', 'Professional', 'Amateur']
  }],
  performanceLevel: {
    type: String,
    enum: ['Beginner', 'Intermediate', 'Advanced', 'Professional', 'All Levels']
  }
}, { _id: false });

const AutomotiveDetailsSchema = new mongoose.Schema({
  productType: {
    type: String,
    enum: [
      'Spare Parts', 'Tires', 'Batteries', 'Engine Parts', 'Body Parts',
      'Interior Accessories', 'Exterior Accessories', 'Electronics',
      'Tools', 'Oils & Fluids', 'Car Care', 'Other'
    ]
  },
  compatibleVehicles: [{
    make: String,
    model: String,
    year: String
  }],
  brand: String,
  partNumber: String,
  condition: {
    type: String,
    enum: ['New', 'OEM', 'Aftermarket', 'Refurbished', 'Used']
  },
  warranty: {
    hasWarranty: { type: Boolean, default: false },
    duration: String
  },
  specifications: {
    type: String,
    trim: true
  }
}, { _id: false });

const HealthBeautyDetailsSchema = new mongoose.Schema({
  productType: {
    type: String,
    enum: [
      'Skincare', 'Haircare', 'Makeup', 'Fragrance', 'Personal Care',
      'Health Supplements', 'Medical Supplies', 'Fitness & Nutrition',
      'Bath & Body', 'Oral Care', 'Men\'s Grooming', 'Other'
    ]
  },
  brand: String,
  skinType: [{
    type: String,
    enum: ['Normal', 'Oily', 'Dry', 'Combination', 'Sensitive', 'All Skin Types']
  }],
  ingredients: [String],
  suitableFor: [{
    type: String,
    enum: ['Men', 'Women', 'Unisex', 'Kids', 'All Ages']
  }],
  volume: String,
  scent: String,
  benefits: [String],
  applicationArea: [{
    type: String,
    enum: ['Face', 'Body', 'Hair', 'Hands', 'Feet', 'Nails', 'Eyes', 'Lips', 'Full Body']
  }],
  isOrganic: {
    type: Boolean,
    default: false
  },
  expiryDate: Date
}, { _id: false });

const inventorySchema = new mongoose.Schema({
  // User reference
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User ID is required']
  },

  // Product Information
  productName: {
    type: String,
    required: [true, 'Product name is required'],
    trim: true,
    maxlength: [100, 'Product name cannot exceed 100 characters']
  },
  category: {
    type: String,
    required: [true, 'Category is required'],
    trim: true,
    maxlength: [50, 'Category cannot exceed 50 characters']
  },
  sku: {
    type: String,
    unique: true,
    trim: true,
    uppercase: true
    // Removed required: true since we auto-generate
  },
  description: {
    type: String,
    trim: true,
    maxlength: [500, 'Description cannot exceed 500 characters'],
    default: ''
  },
  brand: {
    type: String,
    trim: true,
    maxlength: [50, 'Brand cannot exceed 50 characters'],
    default: ''
  },
  unitOfMeasure: {
    type: String,
    required: [true, 'Unit of measure is required'],
    enum: ['Piece', 'Pack', 'Carton', 'Kg', 'Liter', 'Meter', 'Box', 'Dozen', 'Plate (Takeaway)', 'Bowl', 'Wrap', 'Other'],
    default: 'Piece'
  },

  // Stock Information
  quantityInStock: {
    type: Number,
    required: [true, 'Quantity in stock is required'],
    min: [0, 'Quantity cannot be negative'],
    default: 0
  },
  totalStockedQuantity: {
    type: Number,
    required: [true, 'Total stocked quantity is required'],
    min: [0, 'Total stocked quantity cannot be negative'],
    default: 0
  },
  soldQuantity: {
    type: Number,
    required: [true, 'Sold quantity is required'],
    min: [0, 'Sold quantity cannot be negative'],
    default: 0
  },
  reorderLevel: {
    type: Number,
    required: [true, 'Reorder level is required'],
    min: [0, 'Reorder level cannot be negative'],
    default: 5
  },
  costPrice: {
    type: Number,
    required: [true, 'Cost price is required'],
    min: [0, 'Cost price cannot be negative']
  },
  sellingPrice: {
    type: Number,
    required: [true, 'Selling price is required'],
    min: [0, 'Selling price cannot be negative']
  },

  // Additional fields
  supplier: {
    type: String,
    trim: true,
    maxlength: [100, 'Supplier name cannot exceed 100 characters'],
    default: ''
  },
  location: {
    type: String,
    trim: true,
    maxlength: [100, 'Location cannot exceed 100 characters'],
    default: 'Main Store'
  },
  qrCode: {
    type: String,
    trim: true,
    default: ''
  },
  image: {
    type: String,
    default: null
  },
  notes: {
    type: String,
    trim: true,
    maxlength: [1000, 'Notes cannot exceed 1000 characters'],
    default: ''
  },
  
  // Status tracking
  status: {
    type: String,
    enum: ['Active', 'Inactive', 'Discontinued'],
    default: 'Active'
  },
  webVisibility: {
    type: Boolean,
    default: true,
    required: true // Ensure this field is always present
  },
  lastUpdated: {
    type: Date,
    default: Date.now
  },

  // Category-specific details
  clothingDetails: {
    type: ClothingDetailsSchema,
    default: null
  },
  shoesDetails: {
    type: ShoesDetailsSchema,
    default: null
  },
  accessoriesDetails: {
    type: AccessoriesDetailsSchema,
    default: null
  },
  perfumeDetails: {
    type: PerfumeDetailsSchema,
    default: null
  },
  foodDetails: {
    type: FoodDetailsSchema,
    default: null
  },
  beveragesDetails: {
    type: BeveragesDetailsSchema,
    default: null
  },
  electronicsDetails: {
    type: ElectronicsDetailsSchema,
    default: null
  },
  booksDetails: {
    type: BooksDetailsSchema,
    default: null
  },
  homeGardenDetails: {
    type: HomeGardenDetailsSchema,
    default: null
  },
  sportsDetails: {
    type: SportsDetailsSchema,
    default: null
  },
  automotiveDetails: {
    type: AutomotiveDetailsSchema,
    default: null
  },
  healthBeautyDetails: {
    type: HealthBeautyDetailsSchema,
    default: null
  },

  // Common fields for all categories
  tags: [{
    type: String,
    enum: [
      'New arrivals', 'Best sellers', 'Limited edition', 
      'Summer', 'Winter', 'Harmattan', 'Rainy season',
      'Clearance', 'Sale', 'Hot deal', 'Trending', 'Featured'
    ]
  }],
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual fields
inventorySchema.virtual('stockValue').get(function() {
  return this.quantityInStock * this.costPrice;
});

inventorySchema.virtual('totalRevenue').get(function() {
  return this.soldQuantity * this.sellingPrice;
});

inventorySchema.virtual('totalProfit').get(function() {
  return (this.sellingPrice - this.costPrice) * this.soldQuantity;
});

inventorySchema.virtual('profitMargin').get(function() {
  if (this.costPrice === 0) return 0;
  return ((this.sellingPrice - this.costPrice) / this.costPrice) * 100;
});

inventorySchema.virtual('isLowStock').get(function() {
  return this.quantityInStock <= this.reorderLevel;
});

inventorySchema.virtual('stockStatus').get(function() {
  if (this.quantityInStock === 0) return 'Out of Stock';
  if (this.quantityInStock <= this.reorderLevel) return 'Low Stock';
  return 'In Stock';
});

inventorySchema.virtual('turnoverRate').get(function() {
  if (this.totalStockedQuantity === 0) return 0;
  return (this.soldQuantity / this.totalStockedQuantity) * 100;
});

inventorySchema.virtual('remainingQuantityPercentage').get(function() {
  if (this.totalStockedQuantity === 0) return 0;
  return (this.quantityInStock / this.totalStockedQuantity) * 100;
});

// Pre-save middleware
inventorySchema.pre('save', function(next) {
  this.lastUpdated = new Date();
  
  // Ensure totalStockedQuantity is at least the sum of current stock and sold quantity
  const minimumTotal = this.quantityInStock + this.soldQuantity;
  if (this.totalStockedQuantity < minimumTotal) {
    this.totalStockedQuantity = minimumTotal;
  }
  
  next();
});

// Generate SKU if not provided - improved logic
inventorySchema.pre('save', async function(next) {
  if (!this.sku || this.sku === '' || this.sku === null) {
    try {
      // Get the first 3 characters of category, fallback to 'ITM'
      const categoryCode = this.category ? this.category.substring(0, 3).toUpperCase() : 'ITM';
      
      // Count existing items for this user to get next number
      const count = await this.constructor.countDocuments({ userId: this.userId });
      
      // Generate SKU with format: CATEGORY-001
      this.sku = `${categoryCode}-${String(count + 1).padStart(3, '0')}`;
      
      // Check if this SKU already exists (for uniqueness)
      let attempts = 0;
      while (attempts < 10) {
        const existingSku = await this.constructor.findOne({ sku: this.sku });
        if (!existingSku) break;
        
        // If SKU exists, increment and try again
        attempts++;
        this.sku = `${categoryCode}-${String(count + 1 + attempts).padStart(3, '0')}`;
      }
    } catch (error) {
      console.error('SKU generation error:', error);
      // Fallback SKU if generation fails
      this.sku = `ITM-${Date.now().toString().slice(-6)}`;
    }
  }
  next();
});

// Pre-save middleware to clean up unused category details
inventorySchema.pre('save', function(next) {
  // Clear category-specific details that don't match the category
  if (this.category !== 'Clothing') this.clothingDetails = null;
  if (this.category !== 'Shoes') this.shoesDetails = null;
  if (this.category !== 'Accessories') this.accessoriesDetails = null;
  if (this.category !== 'Perfumes') this.perfumeDetails = null;
  if (this.category !== 'Food') this.foodDetails = null;
  if (this.category !== 'Beverages') this.beveragesDetails = null;
  if (this.category !== 'Electronics') this.electronicsDetails = null;
  if (this.category !== 'Books') this.booksDetails = null;
  if (this.category !== 'Home & Garden') this.homeGardenDetails = null;
  if (this.category !== 'Sports') this.sportsDetails = null;
  if (this.category !== 'Automotive') this.automotiveDetails = null;
  if (this.category !== 'Health & Beauty') this.healthBeautyDetails = null;

  next();
});

// Instance methods
inventorySchema.methods.updateStock = async function(newQuantity, type = 'set') {
  const previousQuantity = this.quantityInStock;
  
  if (type === 'add') {
    this.quantityInStock += newQuantity;
    // When adding stock, also update total stocked quantity
    this.totalStockedQuantity += newQuantity;
  } else if (type === 'subtract') {
    this.quantityInStock = Math.max(0, this.quantityInStock - newQuantity);
  } else {
    this.quantityInStock = newQuantity;
  }
  
  this.lastUpdated = new Date();
  return await this.save();
};

inventorySchema.methods.recordSale = async function(quantitySold) {
  if (quantitySold <= 0) {
    throw new Error('Quantity sold must be greater than 0');
  }
  
  if (quantitySold > this.quantityInStock) {
    throw new Error('Cannot sell more than available stock');
  }
  
  // Update quantities
  this.quantityInStock -= quantitySold;
  this.soldQuantity += quantitySold;
  this.lastUpdated = new Date();
  
  return await this.save();
};

inventorySchema.methods.addInitialStock = async function(quantity) {
  this.quantityInStock += quantity;
  this.totalStockedQuantity += quantity;
  this.lastUpdated = new Date();
  return await this.save();
};

inventorySchema.methods.adjustPrices = async function(costPrice, sellingPrice) {
  if (costPrice !== undefined) this.costPrice = costPrice;
  if (sellingPrice !== undefined) this.sellingPrice = sellingPrice;
  this.lastUpdated = new Date();
  return await this.save();
};

// Static methods
inventorySchema.statics.getInventoryByUser = function(userId, options = {}) {
  const { 
    page = 1, 
    limit = 10, 
    sortBy = 'productName', 
    sortOrder = 1,
    category = null,
    status = 'Active',
    search = null 
  } = options;

  const query = { userId };
  
  if (category) query.category = category;
  if (status) query.status = status;
  if (search) {
    query.$or = [
      { productName: { $regex: search, $options: 'i' } },
      { sku: { $regex: search, $options: 'i' } },
      { brand: { $regex: search, $options: 'i' } },
      { description: { $regex: search, $options: 'i' } }
    ];
  }

  const skip = (page - 1) * limit;

  return this.find(query)
    .sort({ [sortBy]: sortOrder })
    .skip(skip)
    .limit(limit);
};

inventorySchema.statics.getLowStockItems = function(userId) {
  return this.find({ 
    userId,
    status: 'Active',
    $expr: { $lte: ['$quantityInStock', '$reorderLevel'] }
  }).sort({ quantityInStock: 1 });
};

inventorySchema.statics.getOutOfStockItems = function(userId) {
  return this.find({ 
    userId,
    status: 'Active',
    quantityInStock: 0 
  });
};

inventorySchema.statics.getInventoryStats = async function(userId) {
  const pipeline = [
    { $match: { userId: new mongoose.Types.ObjectId(userId), status: 'Active' } },
    {
      $group: {
        _id: null,
        totalItems: { $sum: 1 },
        totalQuantity: { $sum: '$quantityInStock' },
        totalStockedQuantity: { $sum: '$totalStockedQuantity' },
        totalSoldQuantity: { $sum: '$soldQuantity' },
        totalStockValue: { $sum: { $multiply: ['$quantityInStock', '$costPrice'] } },
        totalSellingValue: { $sum: { $multiply: ['$quantityInStock', '$sellingPrice'] } },
        totalRevenue: { $sum: { $multiply: ['$soldQuantity', '$sellingPrice'] } },
        totalProfit: { $sum: { $multiply: ['$soldQuantity', { $subtract: ['$sellingPrice', '$costPrice'] }] } },
        lowStockItems: {
          $sum: {
            $cond: [{ $lte: ['$quantityInStock', '$reorderLevel'] }, 1, 0]
          }
        },
        outOfStockItems: {
          $sum: {
            $cond: [{ $eq: ['$quantityInStock', 0] }, 1, 0]
          }
        }
      }
    }
  ];

  const result = await this.aggregate(pipeline);
  return result[0] || {
    totalItems: 0,
    totalQuantity: 0,
    totalStockedQuantity: 0,
    totalSoldQuantity: 0,
    totalStockValue: 0,
    totalSellingValue: 0,
    totalRevenue: 0,
    totalProfit: 0,
    lowStockItems: 0,
    outOfStockItems: 0
  };
};

inventorySchema.statics.getTopSellingItems = function(userId, limit = 10) {
  return this.find({ userId, status: 'Active' })
    .sort({ soldQuantity: -1 })
    .limit(limit);
};

inventorySchema.statics.getSlowMovingItems = function(userId, limit = 10) {
  return this.find({ 
    userId, 
    status: 'Active',
    totalStockedQuantity: { $gt: 0 }
  })
  .sort({ soldQuantity: 1 })
  .limit(limit);
};

inventorySchema.statics.getCategorySummary = function(userId) {
  return this.aggregate([
    { $match: { userId: new mongoose.Types.ObjectId(userId), status: 'Active' } },
    {
      $group: {
        _id: '$category',
        itemCount: { $sum: 1 },
        totalQuantity: { $sum: '$quantityInStock' },
        totalStockedQuantity: { $sum: '$totalStockedQuantity' },
        totalSoldQuantity: { $sum: '$soldQuantity' },
        totalValue: { $sum: { $multiply: ['$quantityInStock', '$costPrice'] } },
        totalRevenue: { $sum: { $multiply: ['$soldQuantity', '$sellingPrice'] } }
      }
    },
    { $sort: { totalValue: -1 } }
  ]);
};

// Indexes
inventorySchema.index({ userId: 1, status: 1 });
inventorySchema.index({ userId: 1, category: 1 });
inventorySchema.index({ userId: 1, sku: 1 }, { unique: true });
inventorySchema.index({ productName: 'text', description: 'text', brand: 'text' });
inventorySchema.index({ quantityInStock: 1, reorderLevel: 1 });

const Inventory = mongoose.models.Inventory || mongoose.model('Inventory', inventorySchema);

export default Inventory;
